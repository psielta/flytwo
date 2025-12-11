import { Routes } from '@angular/router';

import { AuthLayoutComponent, MainLayoutComponent } from './shared/layouts';
import { LoginComponent, RegisterComponent } from './features/auth';
import { DashboardComponent } from './features/dashboard';
import { authGuard, guestGuard } from './core/auth';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full',
  },
  // Guest routes (login, register)
  {
    path: '',
    component: AuthLayoutComponent,
    canActivate: [guestGuard],
    children: [
      { path: 'login', component: LoginComponent },
      { path: 'register', component: RegisterComponent },
    ],
  },
  // Protected routes
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: 'dashboard', component: DashboardComponent },
      // Add more protected routes here
    ],
  },
  // Fallback
  { path: '**', redirectTo: 'dashboard' },
];
