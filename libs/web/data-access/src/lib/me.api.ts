import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import type {
  CancelRequest,
  MyAppointmentDto,
  MyAppointmentsQuery,
  RescheduleRequest,
} from '@agendarhorario/contracts';
import { WEB_ENV } from './web-env.token';

@Injectable({ providedIn: 'root' })
export class MyAppointmentsApi {
  private readonly http = inject(HttpClient);
  private readonly env = inject(WEB_ENV);

  list(query: Partial<MyAppointmentsQuery> = {}): Observable<{
    items: MyAppointmentDto[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    let params = new HttpParams();
    if (query.range) params = params.set('range', query.range);
    if (query.page) params = params.set('page', String(query.page));
    if (query.pageSize) params = params.set('pageSize', String(query.pageSize));
    return this.http.get<{
      items: MyAppointmentDto[];
      total: number;
      page: number;
      pageSize: number;
    }>(`${this.env.apiBaseUrl}/me/appointments`, { params });
  }

  getById(id: string): Observable<MyAppointmentDto> {
    return this.http.get<MyAppointmentDto>(`${this.env.apiBaseUrl}/me/appointments/${id}`);
  }

  cancel(id: string, body: CancelRequest): Observable<MyAppointmentDto> {
    return this.http.patch<MyAppointmentDto>(
      `${this.env.apiBaseUrl}/me/appointments/${id}/cancel`,
      body,
    );
  }

  reschedule(id: string, body: RescheduleRequest): Observable<MyAppointmentDto> {
    return this.http.patch<MyAppointmentDto>(
      `${this.env.apiBaseUrl}/me/appointments/${id}/reschedule`,
      body,
    );
  }
}
