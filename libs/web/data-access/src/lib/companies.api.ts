import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import type { CompanyDto, UpdateCompanyRequest } from '@agendarhorario/contracts';
import { WEB_ENV } from './web-env.token';

@Injectable({ providedIn: 'root' })
export class CompaniesApi {
  private readonly http = inject(HttpClient);
  private readonly env = inject(WEB_ENV);

  get(): Observable<CompanyDto> {
    return this.http.get<CompanyDto>(`${this.env.apiBaseUrl}/company`);
  }

  update(input: UpdateCompanyRequest): Observable<CompanyDto> {
    return this.http.patch<CompanyDto>(`${this.env.apiBaseUrl}/company`, input);
  }
}
