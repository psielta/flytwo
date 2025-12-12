import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';

@Component({
  selector: 'app-file-upload',
  standalone: true,
  imports: [MatCardModule, MatIconModule, MatButtonModule, MatProgressBarModule],
  template: `
    <div
      class="upload-zone"
      [class.drag-over]="isDragOver()"
      [class.has-file]="selectedFile()"
      (dragover)="onDragOver($event)"
      (dragleave)="onDragLeave($event)"
      (drop)="onDrop($event)"
    >
      @if (isUploading) {
        <mat-progress-bar mode="indeterminate"></mat-progress-bar>
        <div class="upload-content">
          <mat-icon>cloud_upload</mat-icon>
          <p>Enviando arquivo...</p>
        </div>
      } @else if (selectedFile()) {
        <div class="upload-content">
          <mat-icon>description</mat-icon>
          <p class="file-name">{{ selectedFile()?.name }}</p>
          <p class="file-size">{{ formatFileSize(selectedFile()?.size || 0) }}</p>
          <div class="file-actions">
            <button mat-raised-button color="primary" (click)="onUpload()">
              <mat-icon>upload</mat-icon>
              Enviar
            </button>
            <button mat-button (click)="clearSelection()">
              <mat-icon>close</mat-icon>
              Cancelar
            </button>
          </div>
        </div>
      } @else {
        <div class="upload-content">
          <mat-icon>cloud_upload</mat-icon>
          <p>Arraste um arquivo .xlsx aqui</p>
          <p class="or-text">ou</p>
          <button mat-stroked-button (click)="fileInput.click()">
            <mat-icon>folder_open</mat-icon>
            Escolher arquivo
          </button>
          <input
            #fileInput
            type="file"
            [accept]="accept"
            (change)="onFileInputChange($event)"
            hidden
          />
        </div>
      }
      @if (error()) {
        <p class="error-message">{{ error() }}</p>
      }
    </div>
  `,
  styles: [
    `
      .upload-zone {
        border: 2px dashed var(--mat-sys-outline);
        border-radius: 8px;
        padding: 48px 24px;
        text-align: center;
        transition: all 0.2s ease;
        background-color: var(--mat-sys-surface-container-lowest);
      }

      .upload-zone.drag-over {
        border-color: var(--mat-sys-primary);
        background-color: var(--mat-sys-primary-container);
      }

      .upload-zone.has-file {
        border-style: solid;
        border-color: var(--mat-sys-primary);
      }

      .upload-content {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
      }

      .upload-content mat-icon {
        font-size: 64px;
        width: 64px;
        height: 64px;
        color: var(--mat-sys-primary);
      }

      .upload-content p {
        margin: 0;
        color: var(--mat-sys-on-surface-variant);
      }

      .or-text {
        font-size: 0.875rem;
      }

      .file-name {
        font-weight: 500;
        color: var(--mat-sys-on-surface) !important;
        word-break: break-all;
      }

      .file-size {
        font-size: 0.875rem;
      }

      .file-actions {
        display: flex;
        gap: 8px;
        margin-top: 8px;
      }

      .error-message {
        color: var(--mat-sys-error);
        margin-top: 16px;
        font-size: 0.875rem;
      }

      mat-progress-bar {
        margin-bottom: 24px;
      }
    `,
  ],
})
export class FileUploadComponent {
  @Input() accept = '.xlsx';
  @Input() maxSizeMB = 64;
  @Input() isUploading = false;
  @Output() fileSelected = new EventEmitter<File>();

  readonly isDragOver = signal(false);
  readonly selectedFile = signal<File | null>(null);
  readonly error = signal<string | null>(null);

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.processFile(files[0]);
    }
  }

  onFileInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.processFile(input.files[0]);
      input.value = '';
    }
  }

  private processFile(file: File): void {
    this.error.set(null);

    // Validate file extension
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (extension !== 'xlsx') {
      this.error.set('Apenas arquivos .xlsx sao aceitos');
      return;
    }

    // Validate file size
    const maxBytes = this.maxSizeMB * 1024 * 1024;
    if (file.size > maxBytes) {
      this.error.set(`Arquivo muito grande. Maximo: ${this.maxSizeMB}MB`);
      return;
    }

    this.selectedFile.set(file);
  }

  onUpload(): void {
    const file = this.selectedFile();
    if (file) {
      this.fileSelected.emit(file);
    }
  }

  clearSelection(): void {
    this.selectedFile.set(null);
    this.error.set(null);
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
