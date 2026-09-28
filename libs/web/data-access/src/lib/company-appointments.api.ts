import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import type { CompanyAppointmentsDto } from '@agendarhorario/contracts';
import { WEB_ENV } from './web-env.token';

@Injectable({ providedIn: 'root' })
export class CompanyAppointmentsApi {
  private readonly http = inject(HttpClient);
  private readonly env = inject(WEB_ENV);

  list(date: string): Observable<CompanyAppointmentsDto> {
    const params = new HttpParams().set('date', date);
    return this.http.get<CompanyAppointmentsDto>(`${this.env.apiBaseUrl}/company/appointments`, {
      params,
    });
  }
}
