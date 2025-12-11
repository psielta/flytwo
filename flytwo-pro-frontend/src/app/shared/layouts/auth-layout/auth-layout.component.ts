import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

import { LogoComponent } from '../../components/logo';
import { ThemeService } from '../../../core/services';

@Component({
  selector: 'app-auth-layout',
  standalone: true,
  imports: [RouterOutlet, MatCardModule, MatIconModule, MatButtonModule, LogoComponent],
  template: `
    <div class="auth-container">
      <div class="auth-header">
        <div class="brand">
          <app-logo [size]="40" color="var(--mat-sys-primary)" />
          <span class="brand-name">FlyTwo Pro</span>
        </div>
        <button mat-icon-button (click)="toggleTheme()" aria-label="Toggle theme">
          <mat-icon>{{ themeService.isDarkMode() ? 'brightness_7' : 'brightness_4' }}</mat-icon>
        </button>
      </div>
      <div class="auth-content">
        <router-outlet />
      </div>
    </div>
  `,
  styles: [
    `
      .auth-container {
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        background-color: var(--mat-sys-surface-container);
      }

      .auth-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 24px;
      }

      .brand {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .brand-name {
        font-size: 1.5rem;
        font-weight: 500;
        color: var(--mat-sys-on-surface);
      }

      .auth-content {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 24px;
      }
    `,
  ],
})
export class AuthLayoutComponent {
  readonly themeService = inject(ThemeService);

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }
}
