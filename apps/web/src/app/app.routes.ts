import { Route } from '@angular/router';
import { authGuard, guestGuard } from './core/auth/auth.guard';

export const appRoutes: Route[] = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'login',
  },
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login.page').then((m) => m.LoginPageComponent),
  },
  {
    path: 'registrar-empresa',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/register-company.page').then((m) => m.RegisterCompanyPageComponent),
  },
  {
    path: 'admin',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/admin/admin-layout.page').then((m) => m.AdminLayoutPageComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'empresa' },
      {
        path: 'empresa',
        loadComponent: () =>
          import('./features/admin/settings/settings.page').then((m) => m.SettingsPageComponent),
      },
      {
        path: 'servicos',
        loadComponent: () =>
          import('./features/admin/services/services-list.page').then(
            (m) => m.ServicesListPageComponent,
          ),
      },
      {
        path: 'servicos/novo',
        loadComponent: () =>
          import('./features/admin/services/service-form.page').then(
            (m) => m.ServiceFormPageComponent,
          ),
      },
      {
        path: 'servicos/:id',
        loadComponent: () =>
          import('./features/admin/services/service-form.page').then(
            (m) => m.ServiceFormPageComponent,
          ),
      },
      {
        path: 'horarios',
        loadComponent: () =>
          import('./features/admin/hours/business-hours.page').then(
            (m) => m.BusinessHoursPageComponent,
          ),
      },
      {
        path: 'excecoes',
        loadComponent: () =>
          import('./features/admin/hours/business-exceptions.page').then(
            (m) => m.BusinessExceptionsPageComponent,
          ),
      },
    ],
  },
  {
    path: 'p/:slug',
    loadComponent: () =>
      import('./features/public/public-company.page').then((m) => m.PublicCompanyPageComponent),
  },
  {
    path: 'p/:slug/agendar/:serviceId',
    loadComponent: () =>
      import('./features/public/booking-flow.page').then((m) => m.BookingFlowPageComponent),
  },
  {
    path: 'a/:token',
    loadComponent: () =>
      import('./features/public/action-confirm.page').then((m) => m.ActionConfirmPageComponent),
  },
  { path: '**', redirectTo: 'login' },
];
