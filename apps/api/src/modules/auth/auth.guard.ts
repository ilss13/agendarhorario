import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FirebaseAdminService } from '../../shared/infra/firebase/firebase-admin.service';
import { User } from '../users/user.entity';
import type { AuthenticatedRequest, AuthenticatedUser } from './auth.types';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = (): MethodDecorator & ClassDecorator => SetMetadata(IS_PUBLIC_KEY, true);

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly firebase: FirebaseAdminService,
    private readonly config: ConfigService,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;

    const req = ctx.switchToHttp().getRequest<Request>();
    const cookieName = this.config.get<string>('SESSION_COOKIE_NAME') ?? '__session';
    const cookie = req.cookies?.[cookieName];
    if (!cookie) throw new UnauthorizedException('Sessão ausente');

    let decoded;
    try {
      decoded = await this.firebase.auth.verifySessionCookie(cookie, true);
    } catch (err) {
      this.logger.debug(`Falha verificando session cookie: ${(err as Error).message}`);
      throw new UnauthorizedException('Sessão inválida');
    }

    const user = await this.users.findOne({ where: { firebaseUid: decoded.uid } });
    if (!user) throw new UnauthorizedException('Usuário não encontrado');

    const authenticated: AuthenticatedUser = {
      id: user.id,
      firebaseUid: user.firebaseUid,
      email: user.email,
      name: user.name,
      role: user.role,
      companyId: user.companyId,
      emailVerified: user.emailVerified,
      phoneVerified: user.phoneVerified,
    };
    (req as AuthenticatedRequest).user = authenticated;
    return true;
  }
}
