import { Component, EventEmitter, Input, Output, computed } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatTableModule } from '@angular/material/table';
import { ImportResult } from '../../models';

@Component({
  selector: 'app-import-result',
  standalone: true,
  imports: [
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatExpansionModule,
    MatTableModule,
  ],
  template: `
    <mat-card class="result-card" [class.has-errors]="hasErrors()">
      <mat-card-header>
        <mat-icon mat-card-avatar [class.success]="!hasErrors()" [class.warning]="hasErrors()">
          {{ hasErrors() ? 'warning' : 'check_circle' }}
        </mat-icon>
        <mat-card-title>
          {{ hasErrors() ? 'Importacao com avisos' : 'Importacao concluida' }}
        </mat-card-title>
        <mat-card-subtitle>
          {{ result.rows_saved }} de {{ result.rows_read }} registros salvos
        </mat-card-subtitle>
      </mat-card-header>

      <mat-card-content>
        <div class="stats">
          <div class="stat">
            <span class="stat-value">{{ result.rows_read }}</span>
            <span class="stat-label">Lidos</span>
          </div>
          <div class="stat success">
            <span class="stat-value">{{ result.rows_saved }}</span>
            <span class="stat-label">Salvos</span>
          </div>
          @if (result.rows_skipped > 0) {
            <div class="stat warning">
              <span class="stat-value">{{ result.rows_skipped }}</span>
              <span class="stat-label">Ignorados</span>
            </div>
          }
        </div>

        @if (result.errors && result.errors.length > 0) {
          <mat-expansion-panel class="errors-panel">
            <mat-expansion-panel-header>
              <mat-panel-title>
                <mat-icon>error_outline</mat-icon>
                {{ result.errors.length }} erro(s) encontrado(s)
              </mat-panel-title>
            </mat-expansion-panel-header>

            <table mat-table [dataSource]="result.errors" class="errors-table">
              <ng-container matColumnDef="row">
                <th mat-header-cell *matHeaderCellDef>Linha</th>
                <td mat-cell *matCellDef="let error">{{ error.row }}</td>
              </ng-container>

              <ng-container matColumnDef="reason">
                <th mat-header-cell *matHeaderCellDef>Motivo</th>
                <td mat-cell *matCellDef="let error">{{ error.reason }}</td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="['row', 'reason']"></tr>
              <tr mat-row *matRowDef="let row; columns: ['row', 'reason']"></tr>
            </table>
          </mat-expansion-panel>
        }
      </mat-card-content>

      <mat-card-actions>
        <button mat-raised-button color="primary" (click)="importAnother.emit()">
          <mat-icon>upload_file</mat-icon>
          Importar outro arquivo
        </button>
      </mat-card-actions>
    </mat-card>
  `,
  styles: [
    `
      .result-card {
        max-width: 600px;
      }

      mat-card-header {
        margin-bottom: 16px;
      }

      mat-icon[mat-card-avatar] {
        font-size: 40px;
        width: 40px;
        height: 40px;
      }

      mat-icon.success {
        color: var(--mat-sys-primary);
      }

      mat-icon.warning {
        color: var(--mat-sys-tertiary);
      }

      .stats {
        display: flex;
        gap: 24px;
        margin-bottom: 16px;
      }

      .stat {
        text-align: center;
        padding: 16px 24px;
        border-radius: 8px;
        background-color: var(--mat-sys-surface-container);
      }

      .stat.success {
        background-color: var(--mat-sys-primary-container);
      }

      .stat.warning {
        background-color: var(--mat-sys-tertiary-container);
      }

      .stat-value {
        display: block;
        font-size: 2rem;
        font-weight: 500;
        color: var(--mat-sys-on-surface);
      }

      .stat.success .stat-value {
        color: var(--mat-sys-on-primary-container);
      }

      .stat.warning .stat-value {
        color: var(--mat-sys-on-tertiary-container);
      }

      .stat-label {
        font-size: 0.875rem;
        color: var(--mat-sys-on-surface-variant);
      }

      .errors-panel {
        margin-top: 16px;
      }

      .errors-panel mat-panel-title {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .errors-panel mat-panel-title mat-icon {
        color: var(--mat-sys-error);
      }

      .errors-table {
        width: 100%;
      }

      mat-card-actions {
        padding: 16px;
      }
    `,
  ],
})
export class ImportResultComponent {
  @Input({ required: true }) result!: ImportResult;
  @Output() importAnother = new EventEmitter<void>();

  readonly hasErrors = computed(
    () => this.result?.errors && this.result.errors.length > 0
  );
}
