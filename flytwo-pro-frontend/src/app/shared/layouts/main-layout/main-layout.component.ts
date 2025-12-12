import { Component, inject, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatExpansionModule } from '@angular/material/expansion';

import { LogoComponent } from '../../components/logo';
import { ThemeService } from '../../../core/services';
import { AuthService } from '../../../core/auth';

interface NavItem {
  label: string;
  icon: string;
  route?: string;
  children?: NavItem[];
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
    MatExpansionModule,
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
          @for (item of navItems; track item.label) {
            @if (item.children) {
              <mat-expansion-panel class="nav-expansion-panel">
                <mat-expansion-panel-header>
                  <mat-panel-title>
                    <mat-icon>{{ item.icon }}</mat-icon>
                    <span>{{ item.label }}</span>
                  </mat-panel-title>
                </mat-expansion-panel-header>
                @for (child of item.children; track child.route) {
                  <a
                    mat-list-item
                    [routerLink]="child.route"
                    routerLinkActive="active"
                    class="child-nav-item"
                  >
                    <mat-icon matListItemIcon>{{ child.icon }}</mat-icon>
                    <span matListItemTitle>{{ child.label }}</span>
                  </a>
                }
              </mat-expansion-panel>
            } @else {
              <a
                mat-list-item
                [routerLink]="item.route"
                routerLinkActive="active"
              >
                <mat-icon matListItemIcon>{{ item.icon }}</mat-icon>
                <span matListItemTitle>{{ item.label }}</span>
              </a>
            }
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

      :host-context(.dark-theme) .sidenav ::ng-deep .mat-mdc-list-item,
      :host-context(.dark-theme) .sidenav ::ng-deep .mat-mdc-list-item .mdc-list-item__primary-text,
      :host-context(.dark-theme) .sidenav ::ng-deep .mat-mdc-list-item .mat-mdc-list-item-title,
      :host-context(.dark-theme) .sidenav ::ng-deep .mat-mdc-list-item span {
        color: var(--mat-sys-on-surface-variant) !important;
      }

      :host-context(.dark-theme) .sidenav ::ng-deep .mat-mdc-list-item:hover {
        background-color: var(--mat-sys-surface-container-high) !important;
      }

      :host-context(.dark-theme) .sidenav ::ng-deep .mat-mdc-list-item.active,
      :host-context(.dark-theme) .sidenav ::ng-deep .mat-mdc-list-item.active .mdc-list-item__primary-text,
      :host-context(.dark-theme) .sidenav ::ng-deep .mat-mdc-list-item.active span {
        background-color: var(--mat-sys-primary-container);
        color: var(--mat-sys-on-primary-container) !important;
      }

      :host-context(.dark-theme) .sidenav ::ng-deep .mat-icon,
      :host-context(.dark-theme) .sidenav ::ng-deep .mat-mdc-list-item .mat-icon {
        color: var(--mat-sys-on-surface-variant) !important;
      }

      :host-context(.dark-theme) .sidenav ::ng-deep .mat-mdc-list-item.active .mat-icon {
        color: var(--mat-sys-on-primary-container) !important;
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

      .sidenav ::ng-deep .mat-mdc-list-item,
      .sidenav ::ng-deep .mat-mdc-list-item .mdc-list-item__primary-text,
      .sidenav ::ng-deep .mat-mdc-list-item .mat-mdc-list-item-title,
      .sidenav ::ng-deep .mat-mdc-list-item span {
        color: rgba(255, 255, 255, 0.8) !important;
      }

      .sidenav ::ng-deep .mat-mdc-list-item:hover {
        background-color: rgba(255, 255, 255, 0.1) !important;
      }

      .sidenav ::ng-deep .mat-mdc-list-item.active,
      .sidenav ::ng-deep .mat-mdc-list-item.active .mdc-list-item__primary-text,
      .sidenav ::ng-deep .mat-mdc-list-item.active span {
        background-color: rgba(255, 255, 255, 0.2);
        color: #fff !important;
      }

      .sidenav ::ng-deep .mat-icon,
      .sidenav ::ng-deep .mat-mdc-list-item .mat-icon {
        color: rgba(255, 255, 255, 0.8) !important;
      }

      .sidenav ::ng-deep .mat-mdc-list-item.active .mat-icon {
        color: #fff !important;
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

      /* Light theme - expansion panel */
      .nav-expansion-panel {
        --mat-expansion-container-background-color: transparent;
        --mat-expansion-header-text-color: rgba(255, 255, 255, 0.8);
        --mat-expansion-header-indicator-color: rgba(255, 255, 255, 0.8);
        --mat-expansion-container-text-color: rgba(255, 255, 255, 0.8);
        background: transparent !important;
        box-shadow: none !important;
        color: rgba(255, 255, 255, 0.8) !important;
      }

      .nav-expansion-panel ::ng-deep .mat-expansion-panel-header {
        padding: 0 16px;
        height: 48px;
        background: transparent !important;
      }

      .nav-expansion-panel ::ng-deep .mat-expansion-panel-header:hover {
        background-color: rgba(255, 255, 255, 0.1) !important;
      }

      .nav-expansion-panel ::ng-deep .mat-expansion-panel-body {
        padding: 0;
        background: transparent;
      }

      .nav-expansion-panel ::ng-deep .mat-panel-title,
      .nav-expansion-panel ::ng-deep .mat-panel-title span,
      .nav-expansion-panel ::ng-deep .mat-panel-title mat-icon,
      .nav-expansion-panel ::ng-deep .mat-content,
      .nav-expansion-panel ::ng-deep .mat-expansion-panel-header-title {
        display: flex;
        align-items: center;
        gap: 16px;
        color: rgba(255, 255, 255, 0.8) !important;
      }

      .nav-expansion-panel ::ng-deep .mat-expansion-indicator,
      .nav-expansion-panel ::ng-deep .mat-expansion-indicator::after,
      .nav-expansion-panel ::ng-deep .mat-expansion-indicator svg {
        color: rgba(255, 255, 255, 0.8) !important;
        fill: rgba(255, 255, 255, 0.8) !important;
        border-color: rgba(255, 255, 255, 0.8) !important;
      }

      /* Dark theme - expansion panel */
      :host-context(.dark-theme) .nav-expansion-panel {
        --mat-expansion-container-background-color: transparent;
        --mat-expansion-header-text-color: var(--mat-sys-on-surface-variant);
        --mat-expansion-header-indicator-color: var(--mat-sys-on-surface-variant);
        --mat-expansion-container-text-color: var(--mat-sys-on-surface-variant);
        color: var(--mat-sys-on-surface-variant) !important;
      }

      :host-context(.dark-theme) .nav-expansion-panel ::ng-deep .mat-expansion-panel-header {
        background: transparent !important;
      }

      :host-context(.dark-theme) .nav-expansion-panel ::ng-deep .mat-expansion-panel-header:hover {
        background-color: var(--mat-sys-surface-container-high) !important;
      }

      :host-context(.dark-theme) .nav-expansion-panel ::ng-deep .mat-panel-title,
      :host-context(.dark-theme) .nav-expansion-panel ::ng-deep .mat-panel-title span,
      :host-context(.dark-theme) .nav-expansion-panel ::ng-deep .mat-panel-title mat-icon,
      :host-context(.dark-theme) .nav-expansion-panel ::ng-deep .mat-content,
      :host-context(.dark-theme) .nav-expansion-panel ::ng-deep .mat-expansion-panel-header-title {
        color: var(--mat-sys-on-surface-variant) !important;
      }

      :host-context(.dark-theme) .nav-expansion-panel ::ng-deep .mat-expansion-indicator,
      :host-context(.dark-theme) .nav-expansion-panel ::ng-deep .mat-expansion-indicator::after,
      :host-context(.dark-theme) .nav-expansion-panel ::ng-deep .mat-expansion-indicator svg {
        color: var(--mat-sys-on-surface-variant) !important;
        fill: var(--mat-sys-on-surface-variant) !important;
        border-color: var(--mat-sys-on-surface-variant) !important;
      }

      .child-nav-item {
        padding-left: 32px !important;
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
    {
      label: 'Catalogo',
      icon: 'inventory_2',
      children: [
        {
          label: 'Importar CATMAT',
          icon: 'upload_file',
          route: '/catalog/catmat/import',
        },
        {
          label: 'Importar CATSER',
          icon: 'upload_file',
          route: '/catalog/catser/import',
        },
        {
          label: 'Pesquisar CATMAT',
          icon: 'search',
          route: '/catalog/catmat/search',
        },
        {
          label: 'Pesquisar CATSER',
          icon: 'search',
          route: '/catalog/catser/search',
        },
      ],
    },
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
