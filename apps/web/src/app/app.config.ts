import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { APP_INITIALIZER, ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { appRoutes } from './app.routes';
import { WEB_ENV } from '@agendarhorario/web-data-access';
import { AuthService } from './core/auth/auth.service';
import { credentialsInterceptor } from './core/http/credentials.interceptor';
import { csrfInterceptor } from './core/http/csrf.interceptor';
import { errorInterceptor } from './core/http/error.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(appRoutes, withComponentInputBinding()),
    provideHttpClient(
      withFetch(),
      withInterceptors([credentialsInterceptor, csrfInterceptor, errorInterceptor]),
    ),
    {
      provide: WEB_ENV,
      useValue: {
        apiBaseUrl: 'http://localhost:3000/api',
        csrfCookieName: 'XSRF-TOKEN',
      },
    },
    {
      provide: APP_INITIALIZER,
      multi: true,
      deps: [AuthService],
      useFactory: (auth: AuthService) => () => firstValueFrom(auth.initialize()),
    },
  ],
};
