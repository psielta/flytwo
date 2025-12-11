import { Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';

import { AuthService } from '../../core/auth';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [DatePipe, MatCardModule, MatIconModule, MatDividerModule],
  template: `
    <div class="dashboard-container">
      <h1>Dashboard</h1>
      <p class="welcome-text">Welcome back, {{ authService.user()?.user_name }}!</p>

      <div class="cards-grid">
        <mat-card class="profile-card">
          <mat-card-header>
            <mat-icon mat-card-avatar class="avatar-icon">account_circle</mat-icon>
            <mat-card-title>{{ authService.user()?.user_name }}</mat-card-title>
            <mat-card-subtitle>{{ authService.user()?.email }}</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <mat-divider></mat-divider>
            <div class="profile-info">
              <div class="info-row">
                <mat-icon>badge</mat-icon>
                <div class="info-content">
                  <span class="info-label">User ID</span>
                  <span class="info-value">{{ authService.user()?.id }}</span>
                </div>
              </div>
              <div class="info-row">
                <mat-icon>email</mat-icon>
                <div class="info-content">
                  <span class="info-label">Email</span>
                  <span class="info-value">{{ authService.user()?.email }}</span>
                </div>
              </div>
              <div class="info-row">
                <mat-icon>calendar_today</mat-icon>
                <div class="info-content">
                  <span class="info-label">Member since</span>
                  <span class="info-value">{{ authService.user()?.created_at | date: 'mediumDate' }}</span>
                </div>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="stats-card">
          <mat-card-header>
            <mat-card-title>Quick Stats</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="stats-grid">
              <div class="stat-item">
                <mat-icon color="primary">flight</mat-icon>
                <span class="stat-value">0</span>
                <span class="stat-label">Flights</span>
              </div>
              <div class="stat-item">
                <mat-icon color="primary">attach_money</mat-icon>
                <span class="stat-value">$0</span>
                <span class="stat-label">Total Spent</span>
              </div>
              <div class="stat-item">
                <mat-icon color="primary">star</mat-icon>
                <span class="stat-value">0</span>
                <span class="stat-label">Points</span>
              </div>
            </div>
          </mat-card-content>
        </mat-card>
      </div>
    </div>
  `,
  styles: [
    `
      .dashboard-container {
        max-width: 1200px;
        margin: 0 auto;
      }

      h1 {
        margin: 0 0 8px 0;
        font-size: 2rem;
        font-weight: 500;
      }

      .welcome-text {
        margin: 0 0 24px 0;
        color: var(--mat-sys-on-surface-variant);
        font-size: 1.1rem;
      }

      .cards-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
        gap: 24px;
      }

      .profile-card .avatar-icon {
        font-size: 40px;
        width: 40px;
        height: 40px;
        color: var(--mat-sys-primary);
      }

      .profile-info {
        padding-top: 16px;
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .info-row {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .info-row mat-icon {
        color: var(--mat-sys-on-surface-variant);
      }

      .info-content {
        display: flex;
        flex-direction: column;
      }

      .info-label {
        font-size: 0.75rem;
        color: var(--mat-sys-on-surface-variant);
      }

      .info-value {
        font-size: 0.875rem;
        word-break: break-all;
      }

      .stats-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 16px;
        text-align: center;
        padding-top: 8px;
      }

      .stat-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
      }

      .stat-item mat-icon {
        font-size: 32px;
        width: 32px;
        height: 32px;
      }

      .stat-value {
        font-size: 1.5rem;
        font-weight: 500;
      }

      .stat-label {
        font-size: 0.75rem;
        color: var(--mat-sys-on-surface-variant);
      }
    `,
  ],
})
export class DashboardComponent {
  readonly authService = inject(AuthService);
}
