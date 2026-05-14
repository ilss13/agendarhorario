import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import type { ActionPreviewDto, ActionResultDto } from '@agendarhorario/contracts';
import { WEB_ENV } from './web-env.token';

@Injectable({ providedIn: 'root' })
export class ActionTokenApi {
  private readonly http = inject(HttpClient);
  private readonly env = inject(WEB_ENV);

  preview(token: string): Observable<ActionPreviewDto> {
    return this.http.get<ActionPreviewDto>(
      `${this.env.apiBaseUrl}/public/appointments/action/${encodeURIComponent(token)}`,
    );
  }

  confirm(token: string, kind: 'CONFIRM' | 'CANCEL'): Observable<ActionResultDto> {
    return this.http.post<ActionResultDto>(
      `${this.env.apiBaseUrl}/public/appointments/action/${encodeURIComponent(token)}`,
      { kind },
    );
  }
}
