import type { MeResponse } from '@agendarhorario/contracts';

export const defaultRouteForUser = (user: Pick<MeResponse, 'role'>): string => {
  switch (user.role) {
    case 'OWNER':
    case 'STAFF':
      return '/admin';
    case 'CUSTOMER':
      return '/me/agendamentos';
  }
};
