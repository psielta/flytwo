import { Component, inject, signal } from '@angular/core';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { FileUploadComponent } from '../components/file-upload';
import { ImportResultComponent } from '../components/import-result';
import { CatalogService } from '../services';
import { ImportResult } from '../models';

@Component({
  selector: 'app-catmat-import',
  standalone: true,
  imports: [MatSnackBarModule, FileUploadComponent, ImportResultComponent],
  template: `
    <div class="import-container">
      <h1>Importar CATMAT</h1>
      <p class="description">
        Envie uma planilha XLSX com os itens do catalogo CATMAT. A planilha deve
        conter as colunas padrao: Codigo do Grupo, Nome do Grupo, Codigo da
        Classe, Nome da Classe, Codigo do PDM, Nome do PDM, Codigo do Item,
        Descricao do Item, Codigo NCM.
      </p>

      @if (!importResult()) {
        <app-file-upload
          accept=".xlsx"
          [isUploading]="catalogService.isLoading()"
          (fileSelected)="onFileSelected($event)"
        />
      } @else {
        <app-import-result
          [result]="importResult()!"
          (importAnother)="resetImport()"
        />
      }
    </div>
  `,
  styles: [
    `
      .import-container {
        max-width: 800px;
        margin: 0 auto;
      }

      h1 {
        margin-bottom: 8px;
        color: var(--mat-sys-on-surface);
      }

      .description {
        margin-bottom: 24px;
        color: var(--mat-sys-on-surface-variant);
        line-height: 1.5;
      }
    `,
  ],
})
export class CatmatImportComponent {
  readonly catalogService = inject(CatalogService);
  private readonly snackBar = inject(MatSnackBar);

  readonly importResult = signal<ImportResult | null>(null);

  onFileSelected(file: File): void {
    this.catalogService.importCatmat(file).subscribe({
      next: (result) => {
        if (result) {
          this.importResult.set(result);
          this.snackBar.open(
            `Importacao concluida: ${result.rows_saved} registros salvos`,
            'Fechar',
            { duration: 5000 }
          );
        } else {
          this.snackBar.open(
            this.catalogService.error() || 'Falha na importacao',
            'Fechar',
            { duration: 5000, panelClass: 'error-snackbar' }
          );
        }
      },
    });
  }

  resetImport(): void {
    this.importResult.set(null);
    this.catalogService.clearError();
  }
}
