import type { MeResponse } from '@agendarhorario/contracts';

export const COMPANY_APP_BASE = '/dashboard';

export const defaultRouteForUser = (user: Pick<MeResponse, 'role'>): string => {
  switch (user.role) {
    case 'OWNER':
    case 'STAFF':
      return COMPANY_APP_BASE;
    case 'CUSTOMER':
      return '/me/agendamentos';
  }
};
