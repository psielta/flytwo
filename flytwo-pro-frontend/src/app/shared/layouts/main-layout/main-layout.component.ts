import { Component, inject, signal } from '@angular/core';
import { Router, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';

import { LogoComponent } from '../../components/logo';
import { ThemeService } from '../../../core/services';
import { AuthService } from '../../../core/auth';

interface NavItem {
  label: string;
  icon: string;
  route: string;
}

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatToolbarModule,
    MatSidenavModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatDividerModule,
    LogoComponent,
  ],
  template: `
    <mat-sidenav-container class="sidenav-container">
      <mat-sidenav
        #sidenav
        mode="side"
        [opened]="sidenavOpened()"
        class="sidenav"
      >
        <div class="sidenav-header">
          <app-logo [size]="32" [color]="themeService.isDarkMode() ? 'var(--mat-sys-primary)' : '#fff'" />
          <span class="brand-name">FlyTwo Pro</span>
        </div>
        <mat-nav-list>
          @for (item of navItems; track item.route) {
            <a
              mat-list-item
              [routerLink]="item.route"
              routerLinkActive="active"
            >
              <mat-icon matListItemIcon>{{ item.icon }}</mat-icon>
              <span matListItemTitle>{{ item.label }}</span>
            </a>
          }
        </mat-nav-list>
      </mat-sidenav>

      <mat-sidenav-content class="sidenav-content">
        <mat-toolbar color="primary" class="toolbar">
          <button mat-icon-button (click)="toggleSidenav()">
            <mat-icon>menu</mat-icon>
          </button>
          <span class="toolbar-spacer"></span>
          <button mat-icon-button (click)="toggleTheme()" aria-label="Toggle theme">
            <mat-icon>{{ themeService.isDarkMode() ? 'brightness_7' : 'brightness_4' }}</mat-icon>
          </button>
          <button mat-icon-button [matMenuTriggerFor]="userMenu">
            <mat-icon>account_circle</mat-icon>
          </button>
          <mat-menu #userMenu="matMenu">
            <div class="user-info">
              <strong>{{ authService.user()?.user_name }}</strong>
              <small>{{ authService.user()?.email }}</small>
            </div>
            <mat-divider></mat-divider>
            <button mat-menu-item (click)="logout()">
              <mat-icon>logout</mat-icon>
              <span>Logout</span>
            </button>
          </mat-menu>
        </mat-toolbar>
        <main class="main-content">
          <router-outlet />
        </main>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: [
    `
      .sidenav-container {
        height: 100vh;
      }

      .sidenav {
        width: 250px;
        background-color: var(--mat-sys-primary);
      }

      :host-context(.dark-theme) .sidenav {
        background-color: var(--mat-sys-surface-container);
      }

      :host-context(.dark-theme) .sidenav-header {
        color: var(--mat-sys-on-surface);
      }

      :host-context(.dark-theme) .sidenav ::ng-deep .mat-mdc-list-item {
        color: var(--mat-sys-on-surface-variant);
      }

      :host-context(.dark-theme) .sidenav ::ng-deep .mat-mdc-list-item:hover {
        background-color: var(--mat-sys-surface-container-high);
      }

      :host-context(.dark-theme) .sidenav ::ng-deep .mat-mdc-list-item.active {
        background-color: var(--mat-sys-primary-container);
        color: var(--mat-sys-on-primary-container);
      }

      .sidenav-header {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 16px;
        color: #fff;
      }

      .brand-name {
        font-size: 1.25rem;
        font-weight: 500;
      }

      .sidenav ::ng-deep .mat-mdc-list-item {
        color: rgba(255, 255, 255, 0.8);
      }

      .sidenav ::ng-deep .mat-mdc-list-item:hover {
        background-color: rgba(255, 255, 255, 0.1);
      }

      .sidenav ::ng-deep .mat-mdc-list-item.active {
        background-color: rgba(255, 255, 255, 0.2);
        color: #fff;
      }

      .sidenav ::ng-deep .mat-icon {
        color: inherit;
      }

      .sidenav-content {
        display: flex;
        flex-direction: column;
      }

      .toolbar {
        position: sticky;
        top: 0;
        z-index: 1;
      }

      .toolbar-spacer {
        flex: 1 1 auto;
      }

      .main-content {
        flex: 1;
        padding: 24px;
        overflow: auto;
      }

      .user-info {
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .user-info small {
        color: var(--mat-sys-on-surface-variant);
      }
    `,
  ],
})
export class MainLayoutComponent {
  readonly themeService = inject(ThemeService);
  readonly authService = inject(AuthService);

  readonly sidenavOpened = signal(true);

  readonly navItems: NavItem[] = [
    { label: 'Dashboard', icon: 'dashboard', route: '/dashboard' },
    // Add more nav items here as needed
  ];

  toggleSidenav(): void {
    this.sidenavOpened.update((opened) => !opened);
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  logout(): void {
    this.authService.logout().subscribe();
  }
}
