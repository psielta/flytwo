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
import { CatalogService } from '../services';
import { CatmatSearchItem, CatmatSearchParams } from '../models';

@Component({
  selector: 'app-catmat-search',
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
  ],
  template: `
    <div class="search-container">
      <h1>Pesquisar CATMAT</h1>

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
                  <mat-label>Codigo do PDM</mat-label>
                  <input matInput type="number" formControlName="pdm_code" />
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Codigo NCM</mat-label>
                  <input matInput formControlName="ncm_code" />
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
                  <ng-container matColumnDef="item_code">
                    <th mat-header-cell *matHeaderCellDef>Codigo</th>
                    <td mat-cell *matCellDef="let item">{{ item.item_code }}</td>
                  </ng-container>

                  <ng-container matColumnDef="item_description">
                    <th mat-header-cell *matHeaderCellDef>Descricao</th>
                    <td mat-cell *matCellDef="let item">{{ item.item_description }}</td>
                  </ng-container>

                  <ng-container matColumnDef="group_name">
                    <th mat-header-cell *matHeaderCellDef>Grupo</th>
                    <td mat-cell *matCellDef="let item">{{ item.group_name }}</td>
                  </ng-container>

                  <ng-container matColumnDef="class_name">
                    <th mat-header-cell *matHeaderCellDef>Classe</th>
                    <td mat-cell *matCellDef="let item">{{ item.class_name }}</td>
                  </ng-container>

                  <ng-container matColumnDef="pdm_name">
                    <th mat-header-cell *matHeaderCellDef>PDM</th>
                    <td mat-cell *matCellDef="let item">{{ item.pdm_name }}</td>
                  </ng-container>

                  <ng-container matColumnDef="ncm_code">
                    <th mat-header-cell *matHeaderCellDef>NCM</th>
                    <td mat-cell *matCellDef="let item">{{ item.ncm_code || '-' }}</td>
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
    `,
  ],
})
export class CatmatSearchComponent {
  private readonly fb = inject(FormBuilder);
  readonly catalogService = inject(CatalogService);
  private readonly snackBar = inject(MatSnackBar);

  readonly searchResults = signal<CatmatSearchItem[]>([]);
  readonly totalResults = signal(0);
  readonly currentPage = signal(0);
  readonly hasSearched = signal(false);
  readonly pageSize = 25;

  readonly displayedColumns = [
    'item_code',
    'item_description',
    'group_name',
    'class_name',
    'pdm_name',
    'ncm_code',
  ];

  readonly searchForm = this.fb.nonNullable.group({
    q: [''],
    group_code: [null as number | null],
    class_code: [null as number | null],
    pdm_code: [null as number | null],
    ncm_code: [''],
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
    const params: CatmatSearchParams = {
      q: formValue.q || undefined,
      group_code: formValue.group_code ?? undefined,
      class_code: formValue.class_code ?? undefined,
      pdm_code: formValue.pdm_code ?? undefined,
      ncm_code: formValue.ncm_code || undefined,
      limit: this.pageSize,
      offset: this.currentPage() * this.pageSize,
    };

    this.catalogService.searchCatmat(params).subscribe({
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
