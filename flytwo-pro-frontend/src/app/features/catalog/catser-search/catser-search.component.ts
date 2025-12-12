import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSelectModule } from '@angular/material/select';
import { CatalogService } from '../services';
import { CatserSearchItem, CatserSearchParams } from '../models';

@Component({
  selector: 'app-catser-search',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatExpansionModule,
    MatSnackBarModule,
    MatSelectModule,
  ],
  template: `
    <div class="search-container">
      <h1>Pesquisar CATSER</h1>

      <mat-card class="search-card">
        <mat-card-content>
          <form [formGroup]="searchForm" (ngSubmit)="onSearch()">
            <mat-form-field appearance="outline" class="search-field">
              <mat-label>Termo de busca</mat-label>
              <input
                matInput
                formControlName="q"
                placeholder="Digite para pesquisar..."
              />
              <mat-icon matSuffix>search</mat-icon>
            </mat-form-field>

            <mat-expansion-panel class="filters-panel">
              <mat-expansion-panel-header>
                <mat-panel-title>Filtros avancados</mat-panel-title>
              </mat-expansion-panel-header>

              <div class="filters-grid">
                <mat-form-field appearance="outline">
                  <mat-label>Codigo do Grupo</mat-label>
                  <input matInput type="number" formControlName="group_code" />
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Codigo da Classe</mat-label>
                  <input matInput type="number" formControlName="class_code" />
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Codigo do Servico</mat-label>
                  <input
                    matInput
                    type="number"
                    formControlName="service_code"
                  />
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Situacao</mat-label>
                  <mat-select formControlName="status">
                    <mat-option value="">Todas</mat-option>
                    <mat-option value="Ativo">Ativo</mat-option>
                    <mat-option value="Inativo">Inativo</mat-option>
                  </mat-select>
                </mat-form-field>
              </div>
            </mat-expansion-panel>

            <div class="search-actions">
              <button
                mat-raised-button
                color="primary"
                type="submit"
                [disabled]="catalogService.isLoading()"
              >
                @if (catalogService.isLoading()) {
                  <mat-spinner diameter="20"></mat-spinner>
                } @else {
                  <ng-container>
                    <mat-icon>search</mat-icon>
                    Pesquisar
                  </ng-container>
                }
              </button>
              <button mat-button type="button" (click)="clearFilters()">
                Limpar filtros
              </button>
            </div>
          </form>
        </mat-card-content>
      </mat-card>

      @if (searchResults().length > 0 || hasSearched()) {
        <mat-card class="results-card">
          <mat-card-header>
            <mat-card-title>Resultados ({{ totalResults() }})</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            @if (searchResults().length > 0) {
              <div class="table-container">
                <table mat-table [dataSource]="searchResults()" class="results-table">
                  <ng-container matColumnDef="service_code">
                    <th mat-header-cell *matHeaderCellDef>Codigo</th>
                    <td mat-cell *matCellDef="let item">{{ item.service_code }}</td>
                  </ng-container>

                  <ng-container matColumnDef="service_description">
                    <th mat-header-cell *matHeaderCellDef>Descricao</th>
                    <td mat-cell *matCellDef="let item">{{ item.service_description }}</td>
                  </ng-container>

                  <ng-container matColumnDef="group_name">
                    <th mat-header-cell *matHeaderCellDef>Grupo</th>
                    <td mat-cell *matCellDef="let item">{{ item.group_name }}</td>
                  </ng-container>

                  <ng-container matColumnDef="class_name">
                    <th mat-header-cell *matHeaderCellDef>Classe</th>
                    <td mat-cell *matCellDef="let item">{{ item.class_name }}</td>
                  </ng-container>

                  <ng-container matColumnDef="status">
                    <th mat-header-cell *matHeaderCellDef>Situacao</th>
                    <td mat-cell *matCellDef="let item">
                      <span [class]="'status-badge status-' + (item.status?.toLowerCase() || 'unknown')">
                        {{ item.status || '-' }}
                      </span>
                    </td>
                  </ng-container>

                  <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
                  <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
                </table>
              </div>

              <mat-paginator
                [length]="totalResults()"
                [pageSize]="pageSize"
                [pageIndex]="currentPage()"
                [pageSizeOptions]="[10, 25, 50, 100]"
                (page)="onPageChange($event)"
                showFirstLastButtons
              />
            } @else {
              <p class="no-results">Nenhum resultado encontrado.</p>
            }
          </mat-card-content>
        </mat-card>
      }
    </div>
  `,
  styles: [
    `
      .search-container {
        max-width: 1200px;
        margin: 0 auto;
      }

      h1 {
        margin-bottom: 24px;
        color: var(--mat-sys-on-surface);
      }

      .search-card {
        margin-bottom: 24px;
      }

      .search-field {
        width: 100%;
        margin-bottom: 16px;
      }

      .filters-panel {
        margin-bottom: 16px;
      }

      .filters-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 16px;
        padding-top: 16px;
      }

      .search-actions {
        display: flex;
        gap: 8px;
        align-items: center;
      }

      .search-actions button mat-spinner {
        display: inline-block;
        margin-right: 8px;
      }

      .results-card mat-card-header {
        margin-bottom: 16px;
      }

      .table-container {
        overflow-x: auto;
      }

      .results-table {
        width: 100%;
      }

      .no-results {
        text-align: center;
        color: var(--mat-sys-on-surface-variant);
        padding: 48px;
      }

      mat-paginator {
        margin-top: 16px;
      }

      .status-badge {
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: 500;
      }

      .status-ativo {
        background-color: var(--mat-sys-primary-container);
        color: var(--mat-sys-on-primary-container);
      }

      .status-inativo {
        background-color: var(--mat-sys-error-container);
        color: var(--mat-sys-on-error-container);
      }

      .status-unknown {
        background-color: var(--mat-sys-surface-variant);
        color: var(--mat-sys-on-surface-variant);
      }
    `,
  ],
})
export class CatserSearchComponent {
  private readonly fb = inject(FormBuilder);
  readonly catalogService = inject(CatalogService);
  private readonly snackBar = inject(MatSnackBar);

  readonly searchResults = signal<CatserSearchItem[]>([]);
  readonly totalResults = signal(0);
  readonly currentPage = signal(0);
  readonly hasSearched = signal(false);
  readonly pageSize = 25;

  readonly displayedColumns = [
    'service_code',
    'service_description',
    'group_name',
    'class_name',
    'status',
  ];

  readonly searchForm = this.fb.nonNullable.group({
    q: [''],
    group_code: [null as number | null],
    class_code: [null as number | null],
    service_code: [null as number | null],
    status: [''],
  });

  onSearch(): void {
    this.currentPage.set(0);
    this.executeSearch();
  }

  onPageChange(event: PageEvent): void {
    this.currentPage.set(event.pageIndex);
    this.executeSearch();
  }

  private executeSearch(): void {
    const formValue = this.searchForm.getRawValue();
    const params: CatserSearchParams = {
      q: formValue.q || undefined,
      group_code: formValue.group_code ?? undefined,
      class_code: formValue.class_code ?? undefined,
      service_code: formValue.service_code ?? undefined,
      status: formValue.status || undefined,
      limit: this.pageSize,
      offset: this.currentPage() * this.pageSize,
    };

    this.catalogService.searchCatser(params).subscribe({
      next: (result) => {
        this.hasSearched.set(true);
        if (result) {
          this.searchResults.set(result.data);
          this.totalResults.set(result.total);
        } else {
          this.snackBar.open(
            this.catalogService.error() || 'Falha na pesquisa',
            'Fechar',
            { duration: 5000, panelClass: 'error-snackbar' }
          );
        }
      },
    });
  }

  clearFilters(): void {
    this.searchForm.reset();
    this.searchResults.set([]);
    this.totalResults.set(0);
    this.currentPage.set(0);
    this.hasSearched.set(false);
  }
}
