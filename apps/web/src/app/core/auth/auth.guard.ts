import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import type { MeResponse } from '@agendarhorario/contracts';
import { AuthService } from './auth.service';
import { defaultRouteForUser } from './redirect-after-login';

export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isAuthenticated()) return true;
  return router.createUrlTree(['/login'], {
    queryParams: { returnUrl: state.url },
  });
};

export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const user = auth.user();
  if (!user) return true;
  return router.createUrlTree([defaultRouteForUser(user)]);
};

export const requireRoleGuard = (allowed: MeResponse['role'][]): CanActivateFn => {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    const user = auth.user();
    if (!user) return router.createUrlTree(['/login']);
    if (allowed.includes(user.role)) return true;
    return router.createUrlTree([defaultRouteForUser(user)]);
  };
};
