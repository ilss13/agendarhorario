import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import type { LoginRequest, MeResponse, RegisterCompanyRequest } from '@agendarhorario/contracts';
import { FirebaseAdminService } from '../../shared/infra/firebase/firebase-admin.service';
import { FirebaseIdentityToolkitClient } from '../../shared/infra/firebase/firebase-identity-toolkit.client';
import { Company } from '../companies/company.entity';
import { User } from '../users/user.entity';
import type { AuthenticatedUser } from './auth.types';

export interface SessionResult {
  sessionCookie: string;
  expiresInMs: number;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly firebase: FirebaseAdminService,
    private readonly identity: FirebaseIdentityToolkitClient,
    private readonly config: ConfigService,
    private readonly dataSource: DataSource,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Company) private readonly companies: Repository<Company>,
  ) {}

  async login(input: LoginRequest): Promise<{ session: SessionResult; me: MeResponse }> {
    const { idToken } = await this.identity.signInWithPassword(input.email, input.password);
    const session = await this.createSession(idToken);
    const decoded = await this.firebase.auth.verifyIdToken(idToken);
    const user = await this.users.findOne({ where: { firebaseUid: decoded.uid } });
    if (!user) throw new UnauthorizedException('Usuário não encontrado');
    return { session, me: toMeResponse(user) };
  }

  async registerCompany(
    input: RegisterCompanyRequest,
  ): Promise<{ session: SessionResult; me: MeResponse }> {
    const slugExists = await this.companies.findOne({
      where: { slug: input.company.slug },
    });
    if (slugExists) throw new ConflictException('Slug já está em uso');

    const emailExists = await this.users.findOne({ where: { email: input.owner.email } });
    if (emailExists) throw new ConflictException('Email já cadastrado');

    let firebaseUid: string | null = null;
    try {
      const { idToken, localId } = await this.identity.signUpWithPassword(
        input.owner.email,
        input.owner.password,
      );
      firebaseUid = localId;

      const { user } = await this.dataSource.transaction(async (manager) => {
        const company = manager.create(Company, {
          name: input.company.name,
          slug: input.company.slug,
          phone: input.company.phone ?? null,
          email: input.owner.email,
          timezone: 'America/Sao_Paulo',
          notificationPrefs: { email: true, secondaryChannel: 'NONE' },
        });
        const savedCompany = await manager.save(company);

        const newUser = manager.create(User, {
          firebaseUid: localId,
          email: input.owner.email,
          name: input.owner.name,
          phone: input.owner.phone ?? null,
          role: 'OWNER',
          emailVerified: false,
          phoneVerified: false,
          companyId: savedCompany.id,
        });
        const savedUser = await manager.save(newUser);
        return { company: savedCompany, user: savedUser };
      });

      await this.firebase.auth.setCustomUserClaims(localId, {
        role: 'OWNER',
        companyId: user.companyId,
      });

      const session = await this.createSession(idToken);
      return { session, me: toMeResponse(user) };
    } catch (err) {
      if (firebaseUid) {
        try {
          await this.firebase.auth.deleteUser(firebaseUid);
        } catch (cleanupErr) {
          this.logger.error(
            `Falha ao limpar usuário Firebase após erro: ${(cleanupErr as Error).message}`,
          );
        }
      }
      throw err;
    }
  }

  async logout(sessionCookie: string | undefined): Promise<void> {
    if (!sessionCookie) return;
    try {
      const decoded = await this.firebase.auth.verifySessionCookie(sessionCookie);
      await this.firebase.auth.revokeRefreshTokens(decoded.sub);
    } catch (err) {
      this.logger.debug(`logout: cookie inválido, ignorando (${(err as Error).message})`);
    }
  }

  me(user: AuthenticatedUser): MeResponse {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      companyId: user.companyId,
      emailVerified: user.emailVerified,
      phoneVerified: user.phoneVerified,
    };
  }

  private async createSession(idToken: string): Promise<SessionResult> {
    const expiresInMs =
      this.config.get<number>('SESSION_COOKIE_MAX_AGE_DAYS', 5) * 24 * 60 * 60 * 1000;
    if (!Number.isFinite(expiresInMs) || expiresInMs <= 0) {
      throw new BadRequestException('Configuração de sessão inválida');
    }
    const sessionCookie = await this.firebase.auth.createSessionCookie(idToken, {
      expiresIn: expiresInMs,
    });
    return { sessionCookie, expiresInMs };
  }
}

const toMeResponse = (user: User): MeResponse => ({
  id: user.id,
  email: user.email,
  name: user.name,
  role: user.role,
  companyId: user.companyId,
  emailVerified: user.emailVerified,
  phoneVerified: user.phoneVerified,
});
