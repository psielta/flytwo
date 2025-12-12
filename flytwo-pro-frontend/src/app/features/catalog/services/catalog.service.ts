import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';
import { ApiConfiguration } from '../../../api/api-configuration';
import {
  ImportResult,
  CatmatSearchParams,
  CatmatSearchResponse,
  CatserSearchParams,
  CatserSearchResponse,
} from '../models';

@Injectable({ providedIn: 'root' })
export class CatalogService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ApiConfiguration);

  private readonly _isLoading = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();

  private get rootUrl(): string {
    return this.config.rootUrl;
  }

  /**
   * Import CATMAT spreadsheet
   */
  importCatmat(file: File): Observable<ImportResult | null> {
    this._isLoading.set(true);
    this._error.set(null);

    const formData = new FormData();
    formData.append('file', file);

    return this.http
      .post<ImportResult>(`${this.rootUrl}/catmat/import`, formData)
      .pipe(
        map((result) => {
          this._isLoading.set(false);
          return result;
        }),
        catchError((err: HttpErrorResponse) => {
          this._isLoading.set(false);
          const errorMessage =
            err.error?.error || 'Falha ao importar arquivo CATMAT';
          this._error.set(errorMessage);
          return of(null);
        })
      );
  }

  /**
   * Import CATSER spreadsheet
   */
  importCatser(file: File): Observable<ImportResult | null> {
    this._isLoading.set(true);
    this._error.set(null);

    const formData = new FormData();
    formData.append('file', file);

    return this.http
      .post<ImportResult>(`${this.rootUrl}/catser/import`, formData)
      .pipe(
        map((result) => {
          this._isLoading.set(false);
          return result;
        }),
        catchError((err: HttpErrorResponse) => {
          this._isLoading.set(false);
          const errorMessage =
            err.error?.error || 'Falha ao importar arquivo CATSER';
          this._error.set(errorMessage);
          return of(null);
        })
      );
  }

  /**
   * Search CATMAT items
   */
  searchCatmat(
    params: CatmatSearchParams
  ): Observable<CatmatSearchResponse | null> {
    this._isLoading.set(true);
    this._error.set(null);

    const httpParams = this.buildHttpParams(params);

    return this.http
      .get<CatmatSearchResponse>(`${this.rootUrl}/catmat/search`, {
        params: httpParams,
      })
      .pipe(
        map((result) => {
          this._isLoading.set(false);
          return result;
        }),
        catchError((err: HttpErrorResponse) => {
          this._isLoading.set(false);
          const errorMessage =
            err.error?.error || 'Falha ao pesquisar CATMAT';
          this._error.set(errorMessage);
          return of(null);
        })
      );
  }

  /**
   * Search CATSER items
   */
  searchCatser(
    params: CatserSearchParams
  ): Observable<CatserSearchResponse | null> {
    this._isLoading.set(true);
    this._error.set(null);

    const httpParams = this.buildHttpParams(params);

    return this.http
      .get<CatserSearchResponse>(`${this.rootUrl}/catser/search`, {
        params: httpParams,
      })
      .pipe(
        map((result) => {
          this._isLoading.set(false);
          return result;
        }),
        catchError((err: HttpErrorResponse) => {
          this._isLoading.set(false);
          const errorMessage =
            err.error?.error || 'Falha ao pesquisar CATSER';
          this._error.set(errorMessage);
          return of(null);
        })
      );
  }

  clearError(): void {
    this._error.set(null);
  }

  private buildHttpParams(
    params: CatmatSearchParams | CatserSearchParams
  ): HttpParams {
    let httpParams = new HttpParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        httpParams = httpParams.set(key, String(value));
      }
    }
    return httpParams;
  }
}
