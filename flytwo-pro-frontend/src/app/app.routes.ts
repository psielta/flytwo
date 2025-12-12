import { Routes } from '@angular/router';

import { AuthLayoutComponent, MainLayoutComponent } from './shared/layouts';
import { LoginComponent, RegisterComponent } from './features/auth';
import { DashboardComponent } from './features/dashboard';
import {
  CatmatImportComponent,
  CatserImportComponent,
  CatmatSearchComponent,
  CatserSearchComponent,
} from './features/catalog';
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
      // Catalog routes
      { path: 'catalog/catmat/import', component: CatmatImportComponent },
      { path: 'catalog/catser/import', component: CatserImportComponent },
      { path: 'catalog/catmat/search', component: CatmatSearchComponent },
      { path: 'catalog/catser/search', component: CatserSearchComponent },
    ],
  },
  // Fallback
  { path: '**', redirectTo: 'dashboard' },
];
