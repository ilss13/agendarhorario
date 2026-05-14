import { InjectionToken } from '@angular/core';

export interface WebEnv {
  apiBaseUrl: string;
  csrfCookieName: string;
}

export const WEB_ENV = new InjectionToken<WebEnv>('WEB_ENV');
