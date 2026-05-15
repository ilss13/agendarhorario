import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import type {
  ChangePlanRequest,
  CheckoutSessionRequest,
  InvoiceDto,
  PlanDto,
  SubscriptionSummaryDto,
} from '@agendarhorario/contracts';
import { WEB_ENV } from './web-env.token';

@Injectable({ providedIn: 'root' })
export class BillingApi {
  private readonly http = inject(HttpClient);
  private readonly env = inject(WEB_ENV);

  plans(): Observable<PlanDto[]> {
    return this.http.get<PlanDto[]>(`${this.env.apiBaseUrl}/billing/plans`);
  }

  subscription(): Observable<SubscriptionSummaryDto> {
    return this.http.get<SubscriptionSummaryDto>(
      `${this.env.apiBaseUrl}/company/billing/subscription`,
    );
  }

  invoices(): Observable<InvoiceDto[]> {
    return this.http.get<InvoiceDto[]>(`${this.env.apiBaseUrl}/company/billing/invoices`);
  }

  checkout(input: CheckoutSessionRequest): Observable<{ url: string }> {
    return this.http.post<{ url: string }>(
      `${this.env.apiBaseUrl}/company/billing/checkout-session`,
      input,
    );
  }

  portal(): Observable<{ url: string }> {
    return this.http.post<{ url: string }>(
      `${this.env.apiBaseUrl}/company/billing/portal-session`,
      {},
    );
  }

  changePlan(input: ChangePlanRequest): Observable<SubscriptionSummaryDto> {
    return this.http.post<SubscriptionSummaryDto>(
      `${this.env.apiBaseUrl}/company/billing/change-plan`,
      input,
    );
  }

  cancel(): Observable<SubscriptionSummaryDto> {
    return this.http.post<SubscriptionSummaryDto>(
      `${this.env.apiBaseUrl}/company/billing/cancel`,
      {},
    );
  }
}
