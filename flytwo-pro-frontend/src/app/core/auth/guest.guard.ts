import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, take } from 'rxjs';

import { AuthService } from './auth.service';

/**
 * Guard for guest routes (login, register) - redirects authenticated users to dashboard
 */
export const guestGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // If already initialized and authenticated, redirect to dashboard
  if (authService.initialized() && authService.isAuthenticated()) {
    return router.createUrlTree(['/dashboard']);
  }

  // If already initialized and not authenticated, allow
  if (authService.initialized() && !authService.isAuthenticated()) {
    return true;
  }

  // Otherwise check auth and decide
  return authService.checkAuth().pipe(
    take(1),
    map((isAuthenticated) => {
      if (isAuthenticated) {
        return router.createUrlTree(['/dashboard']);
      }
      return true;
    })
  );
};
