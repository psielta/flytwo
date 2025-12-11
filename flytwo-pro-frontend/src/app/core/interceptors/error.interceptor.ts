import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';

import { AuthService } from '../auth/auth.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);

  return next(req).pipe(
    catchError((error) => {
      // Handle 401 only if not a checkAuth request (to avoid loops)
      if (error.status === 401 && !req.url.includes('/users/me')) {
        authService.handleUnauthorized();
      }
      return throwError(() => error);
    })
  );
};
