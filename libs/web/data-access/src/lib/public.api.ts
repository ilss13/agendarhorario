import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import type {
  AppointmentDto,
  AvailabilityResponseDto,
  ConfirmVerificationRequest,
  CreateAppointmentRequest,
  PublicCompanyDto,
  RequestVerificationRequest,
  VerificationTokenResponse,
} from '@agendarhorario/contracts';
import { WEB_ENV } from './web-env.token';

@Injectable({ providedIn: 'root' })
export class PublicCompaniesApi {
  private readonly http = inject(HttpClient);
  private readonly env = inject(WEB_ENV);

  getBySlug(slug: string): Observable<PublicCompanyDto> {
    return this.http.get<PublicCompanyDto>(`${this.env.apiBaseUrl}/public/companies/${slug}`);
  }

  availability(
    slug: string,
    serviceId: string,
    from: string,
    to?: string,
  ): Observable<AvailabilityResponseDto> {
    let params = new HttpParams().set('serviceId', serviceId).set('from', from);
    if (to) params = params.set('to', to);
    return this.http.get<AvailabilityResponseDto>(
      `${this.env.apiBaseUrl}/public/companies/${slug}/availability`,
      { params },
    );
  }

  createAppointment(slug: string, input: CreateAppointmentRequest): Observable<AppointmentDto> {
    return this.http.post<AppointmentDto>(
      `${this.env.apiBaseUrl}/public/companies/${slug}/appointments`,
      input,
    );
  }
}

@Injectable({ providedIn: 'root' })
export class PublicVerificationApi {
  private readonly http = inject(HttpClient);
  private readonly env = inject(WEB_ENV);

  request(input: RequestVerificationRequest): Observable<void> {
    return this.http.post<void>(`${this.env.apiBaseUrl}/public/verification/request`, input);
  }

  confirm(input: ConfirmVerificationRequest): Observable<VerificationTokenResponse> {
    return this.http.post<VerificationTokenResponse>(
      `${this.env.apiBaseUrl}/public/verification/confirm`,
      input,
    );
  }
}
