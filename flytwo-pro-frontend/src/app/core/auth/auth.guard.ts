import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, take } from 'rxjs';

import { AuthService } from './auth.service';

/**
 * Guard for protected routes - requires authentication
 */
export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // If already initialized and authenticated, allow
  if (authService.initialized() && authService.isAuthenticated()) {
    return true;
  }

  // If already initialized but not authenticated, redirect to login
  if (authService.initialized() && !authService.isAuthenticated()) {
    return router.createUrlTree(['/login']);
  }

  // Otherwise check auth and decide
  return authService.checkAuth().pipe(
    take(1),
    map((isAuthenticated) => {
      if (isAuthenticated) {
        return true;
      }
      return router.createUrlTree(['/login']);
    })
  );
};
