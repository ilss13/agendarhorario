import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import type {
  BusinessExceptionDto,
  BusinessExceptionInput,
  BusinessHourDto,
  ReplaceBusinessHoursRequest,
} from '@agendarhorario/contracts';
import { WEB_ENV } from './web-env.token';

@Injectable({ providedIn: 'root' })
export class BusinessHoursApi {
  private readonly http = inject(HttpClient);
  private readonly env = inject(WEB_ENV);

  list(): Observable<BusinessHourDto[]> {
    return this.http.get<BusinessHourDto[]>(`${this.env.apiBaseUrl}/company/business-hours`);
  }

  replace(input: ReplaceBusinessHoursRequest): Observable<BusinessHourDto[]> {
    return this.http.put<BusinessHourDto[]>(`${this.env.apiBaseUrl}/company/business-hours`, input);
  }
}

@Injectable({ providedIn: 'root' })
export class BusinessExceptionsApi {
  private readonly http = inject(HttpClient);
  private readonly env = inject(WEB_ENV);

  list(opts: { from?: string; to?: string } = {}): Observable<BusinessExceptionDto[]> {
    let params = new HttpParams();
    if (opts.from) params = params.set('from', opts.from);
    if (opts.to) params = params.set('to', opts.to);
    return this.http.get<BusinessExceptionDto[]>(
      `${this.env.apiBaseUrl}/company/business-exceptions`,
      { params },
    );
  }

  create(input: BusinessExceptionInput): Observable<BusinessExceptionDto> {
    return this.http.post<BusinessExceptionDto>(
      `${this.env.apiBaseUrl}/company/business-exceptions`,
      input,
    );
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.env.apiBaseUrl}/company/business-exceptions/${id}`);
  }
}
