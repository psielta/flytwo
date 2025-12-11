import { Injectable, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, from, catchError, of, map, shareReplay, switchMap } from 'rxjs';

import { Api, usersLoginPost, usersLogoutPost, usersMeGet, usersSignupPost } from '../../api';
import { UserProfileResponse as DtoUserProfileResponse } from '../../api/models/dto/user-profile-response';
import { LoginUserReq as DtoLoginUserReq } from '../../api/models/dto/login-user-req';
import { CreateUserReq as DtoCreateUserReq } from '../../api/models/dto/create-user-req';

export interface AuthState {
  user: DtoUserProfileResponse | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(Api);
  private readonly router = inject(Router);

  // State signals
  private readonly _user = signal<DtoUserProfileResponse | null>(null);
  private readonly _isLoading = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _initialized = signal(false);

  // Cache for pending checkAuth request
  private checkAuthRequest$: Observable<boolean> | null = null;

  // Public readonly signals
  readonly user = this._user.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly initialized = this._initialized.asReadonly();
  readonly isAuthenticated = computed(() => this._user() !== null);

  /**
   * Check authentication status on app init
   * Uses shareReplay to avoid multiple concurrent requests
   */
  checkAuth(): Observable<boolean> {
    // Already initialized, return current state
    if (this._initialized()) {
      return of(this.isAuthenticated());
    }

    // Return cached request if one is in progress
    if (this.checkAuthRequest$) {
      return this.checkAuthRequest$;
    }

    this._isLoading.set(true);

    // Create and cache the request
    this.checkAuthRequest$ = from(this.api.invoke(usersMeGet)).pipe(
      map((user) => {
        this._user.set(user);
        this._initialized.set(true);
        this._isLoading.set(false);
        this.checkAuthRequest$ = null;
        return true;
      }),
      catchError(() => {
        this._user.set(null);
        this._initialized.set(true);
        this._isLoading.set(false);
        this.checkAuthRequest$ = null;
        return of(false);
      }),
      shareReplay(1)
    );

    return this.checkAuthRequest$;
  }

  /**
   * Login user
   */
  login(credentials: DtoLoginUserReq): Observable<boolean> {
    this._isLoading.set(true);
    this._error.set(null);

    return from(this.api.invoke(usersLoginPost, { body: credentials })).pipe(
      // After login, fetch user profile before completing
      switchMap(() => from(this.api.invoke(usersMeGet))),
      map((user) => {
        this._user.set(user);
        this._initialized.set(true);
        this._isLoading.set(false);
        return true;
      }),
      catchError((err) => {
        this._isLoading.set(false);
        const errorMessage = err.error?.error || 'Login failed';
        this._error.set(errorMessage);
        return of(false);
      })
    );
  }

  /**
   * Register new user
   */
  register(data: DtoCreateUserReq): Observable<boolean> {
    this._isLoading.set(true);
    this._error.set(null);

    return from(this.api.invoke(usersSignupPost, { body: data })).pipe(
      map(() => {
        this._isLoading.set(false);
        return true;
      }),
      catchError((err) => {
        this._isLoading.set(false);
        const errorMessage = err.error?.error || 'Registration failed';
        this._error.set(errorMessage);
        return of(false);
      })
    );
  }

  /**
   * Logout user (called on 401 or manual logout)
   */
  logout(): Observable<boolean> {
    // Clear local state first to prevent loops
    this._user.set(null);
    this._initialized.set(true);

    return from(this.api.invoke(usersLogoutPost)).pipe(
      map(() => {
        this._isLoading.set(false);
        this.router.navigate(['/login']);
        return true;
      }),
      catchError(() => {
        // Even if logout fails on server, state is already cleared
        this._isLoading.set(false);
        this.router.navigate(['/login']);
        return of(true);
      })
    );
  }

  /**
   * Handle 401 error - clear state and redirect
   */
  handleUnauthorized(): void {
    // Only handle if we thought we were authenticated
    if (this._user() !== null || !this._initialized()) {
      this._user.set(null);
      this._initialized.set(true);
      this.router.navigate(['/login']);
    }
  }

  /**
   * Clear error state
   */
  clearError(): void {
    this._error.set(null);
  }
}
