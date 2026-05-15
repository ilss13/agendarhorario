import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, DataSource, IsNull, Repository } from 'typeorm';
import { randomBytes } from 'node:crypto';
import { Appointment } from '../appointments/appointment.entity';
import { AuditService } from '../audit/audit.service';
import { Customer } from '../customers/customer.entity';
import { FirebaseAdminService } from '../../shared/infra/firebase/firebase-admin.service';
import { User } from '../users/user.entity';
import { Verification } from '../verification/verification.entity';

export interface DataExportDto {
  user: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    role: string;
    createdAt: string;
  };
  customers: Array<{
    id: string;
    companyId: string;
    name: string;
    email: string | null;
    phone: string | null;
    createdAt: string;
  }>;
  appointments: Array<{
    id: string;
    companyId: string;
    serviceId: string;
    startsAt: string;
    endsAt: string;
    status: string;
    cancelReason: string | null;
    createdAt: string;
  }>;
  exportedAt: string;
}

@Injectable()
export class MeAccountService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Customer) private readonly customers: Repository<Customer>,
    @InjectRepository(Appointment) private readonly appointments: Repository<Appointment>,
    @InjectRepository(Verification) private readonly verifications: Repository<Verification>,
    private readonly firebase: FirebaseAdminService,
    private readonly audit: AuditService,
    private readonly dataSource: DataSource,
  ) {}

  async export(user: Pick<User, 'id' | 'email' | 'phone'>): Promise<DataExportDto> {
    const dbUser = await this.users.findOne({ where: { id: user.id } });
    if (!dbUser) throw new NotFoundException('Usuário não encontrado');

    const customers = await this.findOwnedCustomers(user);
    const customerIds = customers.map((c) => c.id);
    const appointments =
      customerIds.length > 0
        ? await this.appointments.find({
            where: customerIds.map((id) => ({ customerId: id })),
            order: { startsAt: 'DESC' },
          })
        : [];

    await this.audit.log({
      action: 'LGPD_EXPORT',
      entityType: 'User',
      entityId: dbUser.id,
      actorUserId: dbUser.id,
      actorEmail: dbUser.email,
      metadata: { appointmentCount: appointments.length, customerCount: customers.length },
    });

    return {
      user: {
        id: dbUser.id,
        name: dbUser.name,
        email: dbUser.email,
        phone: dbUser.phone,
        role: dbUser.role,
        createdAt: dbUser.createdAt.toISOString(),
      },
      customers: customers.map((c) => ({
        id: c.id,
        companyId: c.companyId,
        name: c.name,
        email: c.email,
        phone: c.phone,
        createdAt: c.createdAt.toISOString(),
      })),
      appointments: appointments.map((a) => ({
        id: a.id,
        companyId: a.companyId,
        serviceId: a.serviceId,
        startsAt: a.startsAt.toISOString(),
        endsAt: a.endsAt.toISOString(),
        status: a.status,
        cancelReason: a.cancelReason,
        createdAt: a.createdAt.toISOString(),
      })),
      exportedAt: new Date().toISOString(),
    };
  }

  /**
   * Apaga a conta do usuário do Firebase e anonimiza PII em `User` + `Customer`.
   * Appointments passados são mantidos (necessários para a empresa), mas seus customers
   * têm nome/email/phone substituídos por valores anônimos.
   */
  async deleteAccount(user: Pick<User, 'id' | 'firebaseUid' | 'email' | 'phone'>): Promise<void> {
    const dbUser = await this.users.findOne({ where: { id: user.id } });
    if (!dbUser) throw new NotFoundException('Usuário não encontrado');

    // Bloqueia se for OWNER de uma empresa ativa — empresas precisam transferir o owner antes
    if (dbUser.role === 'OWNER' && dbUser.companyId) {
      throw new NotFoundException(
        'Donos de empresa devem cancelar a assinatura e contatar o suporte para deletar a conta.',
      );
    }

    const customers = await this.findOwnedCustomers(user);

    await this.dataSource.transaction(async (manager) => {
      const customerRepo = manager.getRepository(Customer);
      for (const customer of customers) {
        customer.name = `Cliente anonimizado #${randomBytes(4).toString('hex')}`;
        customer.email = null;
        customer.phone = null;
        customer.userId = null;
        customer.notes = null;
        await customerRepo.save(customer);
      }
      await manager.getRepository(Verification).softDelete(
        new Brackets((qb) => {
          if (dbUser.email) qb.where('target = :email', { email: dbUser.email });
          if (dbUser.phone) qb.orWhere('target = :phone', { phone: dbUser.phone });
        }) as unknown as Record<string, unknown>,
      );
      await manager.getRepository(User).softRemove(dbUser);
    });

    try {
      await this.firebase.auth.deleteUser(user.firebaseUid);
    } catch (err) {
      // não bloqueia — usuário continua removido no nosso lado
    }

    await this.audit.log({
      action: 'LGPD_DELETE',
      entityType: 'User',
      entityId: dbUser.id,
      actorUserId: dbUser.id,
      actorEmail: dbUser.email,
      metadata: { anonymizedCustomerCount: customers.length },
    });
  }

  private async findOwnedCustomers(
    user: Pick<User, 'id' | 'email' | 'phone'>,
  ): Promise<Customer[]> {
    return this.customers
      .createQueryBuilder('c')
      .where('c.deletedAt IS NULL')
      .andWhere(
        new Brackets((qb) => {
          qb.where('c.userId = :userId', { userId: user.id });
          if (user.email)
            qb.orWhere('LOWER(c.email) = :email', { email: user.email.toLowerCase() });
          if (user.phone) qb.orWhere('c.phone = :phone', { phone: user.phone });
        }),
      )
      .getMany();
  }
}
