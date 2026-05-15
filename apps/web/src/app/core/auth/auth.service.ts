import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, of, switchMap, tap, throwError } from 'rxjs';
import type {
  LoginRequest,
  MeResponse,
  RegisterCompanyRequest,
  RegisterCustomerRequest,
} from '@agendarhorario/contracts';
import { WEB_ENV } from '@agendarhorario/web-data-access';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly env = inject(WEB_ENV);

  private readonly userSignal = signal<MeResponse | null>(null);
  private readonly loadingSignal = signal<boolean>(false);
  private readonly initializedSignal = signal<boolean>(false);

  readonly user = this.userSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly initialized = this.initializedSignal.asReadonly();
  readonly isAuthenticated = computed(() => this.userSignal() !== null);

  initialize(): Observable<MeResponse | null> {
    return this.fetchMe().pipe(tap(() => this.initializedSignal.set(true)));
  }

  login(input: LoginRequest): Observable<MeResponse> {
    this.loadingSignal.set(true);
    return this.http.post<MeResponse>(`${this.env.apiBaseUrl}/auth/login`, input).pipe(
      tap((me) => this.userSignal.set(me)),
      tap({ finalize: () => this.loadingSignal.set(false) }),
    );
  }

  registerCompany(input: RegisterCompanyRequest): Observable<MeResponse> {
    this.loadingSignal.set(true);
    return this.http.post<MeResponse>(`${this.env.apiBaseUrl}/auth/register-company`, input).pipe(
      tap((me) => this.userSignal.set(me)),
      tap({ finalize: () => this.loadingSignal.set(false) }),
    );
  }

  registerCustomer(input: RegisterCustomerRequest): Observable<MeResponse> {
    this.loadingSignal.set(true);
    return this.http.post<MeResponse>(`${this.env.apiBaseUrl}/auth/register-customer`, input).pipe(
      tap((me) => this.userSignal.set(me)),
      tap({ finalize: () => this.loadingSignal.set(false) }),
    );
  }

  logout(): Observable<void> {
    return this.http.post<void>(`${this.env.apiBaseUrl}/auth/logout`, null).pipe(
      tap(() => this.userSignal.set(null)),
      catchError((err) => {
        this.userSignal.set(null);
        return throwError(() => err);
      }),
    );
  }

  private fetchMe(): Observable<MeResponse | null> {
    return this.http.get<MeResponse>(`${this.env.apiBaseUrl}/auth/me`).pipe(
      tap((me) => this.userSignal.set(me)),
      catchError(() => {
        this.userSignal.set(null);
        return of(null);
      }),
      switchMap((value) => of(value)),
    );
  }
}
