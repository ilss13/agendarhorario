import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import type {
  CreateServiceRequest,
  PaginatedResult,
  ServiceDto,
  UpdateServiceRequest,
} from '@agendarhorario/contracts';
import { WEB_ENV } from './web-env.token';

@Injectable({ providedIn: 'root' })
export class ServicesApi {
  private readonly http = inject(HttpClient);
  private readonly env = inject(WEB_ENV);

  list(
    opts: { page?: number; pageSize?: number; q?: string } = {},
  ): Observable<PaginatedResult<ServiceDto>> {
    let params = new HttpParams();
    if (opts.page) params = params.set('page', String(opts.page));
    if (opts.pageSize) params = params.set('pageSize', String(opts.pageSize));
    if (opts.q) params = params.set('q', opts.q);
    return this.http.get<PaginatedResult<ServiceDto>>(`${this.env.apiBaseUrl}/company/services`, {
      params,
    });
  }

  get(id: string): Observable<ServiceDto> {
    return this.http.get<ServiceDto>(`${this.env.apiBaseUrl}/company/services/${id}`);
  }

  create(input: CreateServiceRequest): Observable<ServiceDto> {
    return this.http.post<ServiceDto>(`${this.env.apiBaseUrl}/company/services`, input);
  }

  update(id: string, input: UpdateServiceRequest): Observable<ServiceDto> {
    return this.http.patch<ServiceDto>(`${this.env.apiBaseUrl}/company/services/${id}`, input);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.env.apiBaseUrl}/company/services/${id}`);
  }
}
