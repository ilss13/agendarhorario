import { InjectionToken } from '@angular/core';

export interface WebEnv {
  apiBaseUrl: string;
  csrfCookieName: string;
  firebase?: {
    apiKey: string;
    authDomain: string;
    projectId: string;
  };
}

export const WEB_ENV = new InjectionToken<WebEnv>('WEB_ENV');
