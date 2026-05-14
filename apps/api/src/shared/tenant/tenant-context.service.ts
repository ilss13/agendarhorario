import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';
import type { UserRole } from '../../modules/users/user.entity';

export interface TenantContext {
  userId: string;
  companyId: string | null;
  role: UserRole;
}

@Injectable()
export class TenantContextService {
  private readonly storage = new AsyncLocalStorage<TenantContext>();

  run<T>(ctx: TenantContext, fn: () => T): T {
    return this.storage.run(ctx, fn);
  }

  get(): TenantContext | undefined {
    return this.storage.getStore();
  }

  getOrThrow(): TenantContext {
    const ctx = this.storage.getStore();
    if (!ctx) {
      throw new Error('TenantContext não inicializado');
    }
    return ctx;
  }

  requireCompanyId(): string {
    const ctx = this.getOrThrow();
    if (!ctx.companyId) {
      throw new Error('Usuário não vinculado a uma empresa');
    }
    return ctx.companyId;
  }
}
