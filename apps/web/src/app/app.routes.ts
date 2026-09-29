import { inject } from '@angular/core';
import { CanActivateFn, Route, Router } from '@angular/router';
import { authGuard, guestGuard, requireRoleGuard } from './core/auth/auth.guard';

const redirectLegacyAdmin: CanActivateFn = (_route, state) => {
  const router = inject(Router);
  return router.parseUrl(state.url.replace(/^\/admin(?=\/|$)/, '/dashboard'));
};

export const appRoutes: Route[] = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () =>
      import('./features/landing/landing.page').then((m) => m.LandingPageComponent),
  },
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login.page').then((m) => m.LoginPageComponent),
  },
  {
    path: 'esqueci-senha',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/forgot-password.page').then((m) => m.ForgotPasswordPageComponent),
  },
  {
    path: 'redefinir-senha',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/reset-password.page').then((m) => m.ResetPasswordPageComponent),
  },
  {
    path: 'registrar-empresa',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/register-company.page').then((m) => m.RegisterCompanyPageComponent),
  },
  {
    path: 'registrar-cliente',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/register-customer.page').then((m) => m.RegisterCustomerPageComponent),
  },
  {
    path: 'me/agendamentos',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/me/my-appointments-list.page').then(
        (m) => m.MyAppointmentsListPageComponent,
      ),
  },
  {
    path: 'me/agendamentos/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/me/my-appointment-detail.page').then(
        (m) => m.MyAppointmentDetailPageComponent,
      ),
  },
  {
    path: 'dashboard',
    canActivate: [authGuard, requireRoleGuard(['OWNER', 'STAFF'])],
    loadComponent: () =>
      import('./features/admin/admin-layout.page').then((m) => m.AdminLayoutPageComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'agenda' },
      {
        path: 'agenda',
        loadComponent: () =>
          import('./features/admin/agenda/agenda-week.page').then((m) => m.AgendaWeekPageComponent),
      },
      {
        path: 'agenda/mes',
        loadComponent: () =>
          import('./features/admin/agenda/agenda.page').then((m) => m.AgendaPageComponent),
      },
      {
        path: 'agenda/historico',
        loadComponent: () =>
          import('./features/admin/agenda/agenda-history.page').then(
            (m) => m.AgendaHistoryPageComponent,
          ),
      },
      {
        path: 'agenda/:date',
        loadComponent: () =>
          import('./features/admin/agenda/agenda-day.page').then((m) => m.AgendaDayPageComponent),
      },
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
        path: 'clientes',
        loadComponent: () =>
          import('./features/admin/customers/customers.page').then((m) => m.CustomersPageComponent),
      },
      {
        path: 'mais',
        loadComponent: () =>
          import('./features/admin/more/more.page').then((m) => m.MorePageComponent),
      },
      {
        path: 'excecoes',
        loadComponent: () =>
          import('./features/admin/hours/business-exceptions.page').then(
            (m) => m.BusinessExceptionsPageComponent,
          ),
      },
      {
        path: 'assinatura',
        loadComponent: () =>
          import('./features/admin/subscription/subscription.page').then(
            (m) => m.SubscriptionPageComponent,
          ),
      },
    ],
  },
  {
    path: 'admin',
    canActivate: [redirectLegacyAdmin],
    children: [{ path: '**', children: [] }],
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
