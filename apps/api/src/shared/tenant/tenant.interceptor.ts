import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { from, switchMap } from 'rxjs';
import type { AuthenticatedRequest } from '../../modules/auth/auth.types';
import { TenantContextService } from './tenant-context.service';

@Injectable()
export class TenantInterceptor implements NestInterceptor {
  constructor(private readonly tenant: TenantContextService) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = ctx.switchToHttp().getRequest<AuthenticatedRequest | undefined>();
    const user = req?.user;
    if (!user) {
      return next.handle();
    }
    return from(
      Promise.resolve().then(
        () =>
          new Promise<Observable<unknown>>((resolve) => {
            this.tenant.run({ userId: user.id, companyId: user.companyId, role: user.role }, () =>
              resolve(next.handle()),
            );
          }),
      ),
    ).pipe(switchMap((obs) => obs));
  }
}
