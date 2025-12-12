import { Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { NgxChartsModule, Color, ScaleType } from '@swimlane/ngx-charts';

import { AuthService } from '../../core/auth';
import { CatalogService } from '../catalog/services/catalog.service';
import { CatalogStats } from '../catalog/models';

interface ChartDataItem {
  name: string;
  value: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    DatePipe,
    DecimalPipe,
    MatCardModule,
    MatIconModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    NgxChartsModule,
  ],
  template: `
    <div class="dashboard-container">
      <h1>Dashboard</h1>
      <p class="welcome-text">Welcome back, {{ authService.user()?.user_name }}!</p>

      @if (isLoading()) {
        <div class="loading-container">
          <mat-spinner diameter="48"></mat-spinner>
          <p>Carregando estatísticas...</p>
        </div>
      } @else {
        <!-- Totals Cards -->
        <div class="totals-grid">
          <mat-card class="total-card catmat-card">
            <mat-card-content>
              <div class="total-content">
                <mat-icon class="total-icon">inventory_2</mat-icon>
                <div class="total-info">
                  <span class="total-value">{{ catmatTotal() | number }}</span>
                  <span class="total-label">Itens CATMAT</span>
                </div>
              </div>
            </mat-card-content>
          </mat-card>

          <mat-card class="total-card catser-card">
            <mat-card-content>
              <div class="total-content">
                <mat-icon class="total-icon">engineering</mat-icon>
                <div class="total-info">
                  <span class="total-value">{{ catserTotal() | number }}</span>
                  <span class="total-label">Itens CATSER</span>
                </div>
              </div>
            </mat-card-content>
          </mat-card>
        </div>

        <!-- Charts Grid -->
        <div class="charts-grid">
          <!-- CATMAT by Group Chart -->
          <mat-card class="chart-card">
            <mat-card-header>
              <mat-card-title>Top 10 Grupos CATMAT</mat-card-title>
              <mat-card-subtitle>Distribuição por grupo de material</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              @if (catmatByGroup().length > 0) {
                <ngx-charts-bar-horizontal
                  [results]="catmatByGroup()"
                  [xAxisLabel]="'Quantidade'"
                  [yAxisLabel]="'Grupo'"
                  [showXAxisLabel]="true"
                  [showYAxisLabel]="false"
                  [xAxis]="true"
                  [yAxis]="true"
                  [gradient]="true"
                  [scheme]="catmatColorScheme"
                  [view]="[chartWidth, 320]">
                </ngx-charts-bar-horizontal>
              } @else {
                <div class="no-data">
                  <mat-icon>inbox</mat-icon>
                  <p>Nenhum dado CATMAT disponível</p>
                </div>
              }
            </mat-card-content>
          </mat-card>

          <!-- CATSER by Group Chart -->
          <mat-card class="chart-card">
            <mat-card-header>
              <mat-card-title>Top 10 Grupos CATSER</mat-card-title>
              <mat-card-subtitle>Distribuição por grupo de serviço</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              @if (catserByGroup().length > 0) {
                <ngx-charts-bar-horizontal
                  [results]="catserByGroup()"
                  [xAxisLabel]="'Quantidade'"
                  [yAxisLabel]="'Grupo'"
                  [showXAxisLabel]="true"
                  [showYAxisLabel]="false"
                  [xAxis]="true"
                  [yAxis]="true"
                  [gradient]="true"
                  [scheme]="catserColorScheme"
                  [view]="[chartWidth, 320]">
                </ngx-charts-bar-horizontal>
              } @else {
                <div class="no-data">
                  <mat-icon>inbox</mat-icon>
                  <p>Nenhum dado CATSER disponível</p>
                </div>
              }
            </mat-card-content>
          </mat-card>
        </div>

        <!-- Bottom Row: Status Pie + Profile -->
        <div class="bottom-grid">
          <!-- CATSER Status Pie Chart -->
          <mat-card class="chart-card pie-card">
            <mat-card-header>
              <mat-card-title>Status CATSER</mat-card-title>
              <mat-card-subtitle>Distribuição por status</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              @if (catserByStatus().length > 0) {
                <div class="pie-chart-container">
                  <ngx-charts-pie-chart
                    [results]="catserByStatus()"
                    [legend]="false"
                    [labels]="true"
                    [doughnut]="true"
                    [scheme]="statusColorScheme"
                    [view]="[280, 280]">
                  </ngx-charts-pie-chart>
                  <div class="pie-legend">
                    @for (item of catserByStatus(); track item.name; let i = $index) {
                      <div class="legend-item">
                        <span class="legend-color" [style.background-color]="statusColorScheme.domain[i]"></span>
                        <span class="legend-label">{{ item.name }}</span>
                        <span class="legend-value">{{ item.value | number }}</span>
                      </div>
                    }
                  </div>
                </div>
              } @else {
                <div class="no-data">
                  <mat-icon>inbox</mat-icon>
                  <p>Nenhum dado de status disponível</p>
                </div>
              }
            </mat-card-content>
          </mat-card>

          <!-- Profile Card -->
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
        </div>
      }
    </div>
  `,
  styles: [
    `
      .dashboard-container {
        max-width: 1400px;
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

      .loading-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 48px;
        gap: 16px;
        color: var(--mat-sys-on-surface-variant);
      }

      /* Totals Grid */
      .totals-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 24px;
        margin-bottom: 24px;
      }

      .total-card {
        background: linear-gradient(135deg, var(--mat-sys-primary-container), var(--mat-sys-surface));
      }

      .total-card .total-content {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 8px 0;
      }

      .total-card .total-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        color: var(--mat-sys-primary);
      }

      .total-card .total-info {
        display: flex;
        flex-direction: column;
      }

      .total-card .total-value {
        font-size: 2.5rem;
        font-weight: 600;
        color: var(--mat-sys-on-surface);
        line-height: 1;
      }

      .total-card .total-label {
        font-size: 0.875rem;
        color: var(--mat-sys-on-surface-variant);
        margin-top: 4px;
      }

      /* Charts Grid */
      .charts-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 24px;
        margin-bottom: 24px;
      }

      .chart-card {
        min-height: 400px;
      }

      .chart-card mat-card-content {
        display: flex;
        justify-content: center;
        align-items: center;
        padding-top: 16px;
      }

      /* Bottom Grid */
      .bottom-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 24px;
      }

      .pie-card mat-card-content {
        min-height: 300px;
      }

      /* Pie Chart Container with Custom Legend */
      .pie-chart-container {
        display: flex;
        align-items: center;
        gap: 24px;
        width: 100%;
        justify-content: center;
      }

      .pie-legend {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .legend-item {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .legend-color {
        width: 16px;
        height: 16px;
        border-radius: 4px;
        flex-shrink: 0;
      }

      .legend-label {
        font-size: 0.875rem;
        color: var(--mat-sys-on-surface);
        min-width: 80px;
      }

      .legend-value {
        font-size: 0.875rem;
        font-weight: 500;
        color: var(--mat-sys-on-surface);
      }

      .no-data {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 48px;
        color: var(--mat-sys-on-surface-variant);
      }

      .no-data mat-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        margin-bottom: 8px;
      }

      /* Profile Card */
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

      /* Responsive */
      @media (max-width: 900px) {
        .totals-grid,
        .charts-grid,
        .bottom-grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class DashboardComponent implements OnInit {
  readonly authService = inject(AuthService);
  private readonly catalogService = inject(CatalogService);

  readonly isLoading = signal(true);
  readonly catmatTotal = signal(0);
  readonly catserTotal = signal(0);
  readonly catmatByGroup = signal<ChartDataItem[]>([]);
  readonly catserByGroup = signal<ChartDataItem[]>([]);
  readonly catserByStatus = signal<ChartDataItem[]>([]);

  readonly chartWidth = 500;

  readonly catmatColorScheme: Color = {
    name: 'catmat',
    selectable: true,
    group: ScaleType.Ordinal,
    domain: ['#5AA454', '#A10A28', '#C7B42C', '#AAAAAA', '#1E88E5', '#43A047', '#FB8C00', '#8E24AA', '#3949AB', '#00ACC1'],
  };

  readonly catserColorScheme: Color = {
    name: 'catser',
    selectable: true,
    group: ScaleType.Ordinal,
    domain: ['#1E88E5', '#43A047', '#FB8C00', '#8E24AA', '#3949AB', '#00ACC1', '#5AA454', '#A10A28', '#C7B42C', '#AAAAAA'],
  };

  readonly statusColorScheme: Color = {
    name: 'status',
    selectable: true,
    group: ScaleType.Ordinal,
    domain: ['#43A047', '#FB8C00', '#E53935'],
  };

  ngOnInit(): void {
    this.loadStats();
  }

  private loadStats(): void {
    this.isLoading.set(true);
    this.catalogService.getCatalogStats().subscribe((stats) => {
      if (stats) {
        this.updateChartData(stats);
      }
      this.isLoading.set(false);
    });
  }

  private updateChartData(stats: CatalogStats): void {
    this.catmatTotal.set(stats.catmat_total);
    this.catserTotal.set(stats.catser_total);

    // Transform catmat_by_group to chart format
    this.catmatByGroup.set(
      stats.catmat_by_group.map((g) => ({
        name: `${g.group_code} - ${this.truncateText(g.group_name, 30)}`,
        value: g.count,
      }))
    );

    // Transform catser_by_group to chart format
    this.catserByGroup.set(
      stats.catser_by_group.map((g) => ({
        name: `${g.group_code} - ${this.truncateText(g.group_name, 30)}`,
        value: g.count,
      }))
    );

    // Transform catser_by_status to chart format
    this.catserByStatus.set(
      stats.catser_by_status.map((s) => ({
        name: s.status || 'Sem Status',
        value: s.count,
      }))
    );
  }

  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }
}
