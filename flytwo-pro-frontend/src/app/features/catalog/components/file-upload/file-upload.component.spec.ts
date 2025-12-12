import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { FileUploadComponent } from './file-upload.component';

describe('FileUploadComponent', () => {
  let component: FileUploadComponent;
  let fixture: ComponentFixture<FileUploadComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FileUploadComponent, NoopAnimationsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(FileUploadComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have default accept value of .xlsx', () => {
    expect(component.accept).toBe('.xlsx');
  });

  it('should not be uploading initially', () => {
    expect(component.isUploading).toBe(false);
  });

  it('should not be dragging initially', () => {
    expect(component.isDragOver()).toBe(false);
  });

  it('should have no selected file initially', () => {
    expect(component.selectedFile()).toBeNull();
  });

  describe('drag events', () => {
    it('should set isDragOver to true on dragover', () => {
      const event = {
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
      } as unknown as DragEvent;

      component.onDragOver(event);

      expect(component.isDragOver()).toBe(true);
    });

    it('should set isDragOver to false on dragleave', () => {
      // First set to true
      const overEvent = {
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
      } as unknown as DragEvent;
      component.onDragOver(overEvent);

      // Then leave
      const leaveEvent = {
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
      } as unknown as DragEvent;

      component.onDragLeave(leaveEvent);

      expect(component.isDragOver()).toBe(false);
    });
  });

  describe('file input change', () => {
    it('should select valid xlsx file', () => {
      const mockFile = new File(['content'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const event = {
        target: { files: [mockFile], value: '' },
      } as unknown as Event;

      component.onFileInputChange(event);

      expect(component.selectedFile()).toBe(mockFile);
      expect(component.error()).toBeNull();
    });

    it('should reject non-xlsx file', () => {
      const mockFile = new File(['content'], 'test.txt', {
        type: 'text/plain',
      });

      const event = {
        target: { files: [mockFile], value: '' },
      } as unknown as Event;

      component.onFileInputChange(event);

      expect(component.selectedFile()).toBeNull();
      expect(component.error()).toBe('Apenas arquivos .xlsx sao aceitos');
    });

    it('should reject file larger than max size', () => {
      component.maxSizeMB = 1; // 1MB max
      const largeContent = new Array(2 * 1024 * 1024).fill('a').join('');
      const mockFile = new File([largeContent], 'large.xlsx');

      const event = {
        target: { files: [mockFile], value: '' },
      } as unknown as Event;

      component.onFileInputChange(event);

      expect(component.selectedFile()).toBeNull();
      expect(component.error()).toContain('Arquivo muito grande');
    });
  });

  describe('file selection and upload', () => {
    it('should emit fileSelected when onUpload is called', () => {
      const mockFile = new File(['content'], 'test.xlsx');
      const fileSelectedSpy = vi.fn();
      component.fileSelected.subscribe(fileSelectedSpy);

      // First select the file
      const event = {
        target: { files: [mockFile], value: '' },
      } as unknown as Event;
      component.onFileInputChange(event);

      // Then upload
      component.onUpload();

      expect(fileSelectedSpy).toHaveBeenCalledWith(mockFile);
    });

    it('should not emit if no file is selected', () => {
      const fileSelectedSpy = vi.fn();
      component.fileSelected.subscribe(fileSelectedSpy);

      component.onUpload();

      expect(fileSelectedSpy).not.toHaveBeenCalled();
    });
  });

  describe('clearSelection', () => {
    it('should clear selected file and error', () => {
      const mockFile = new File(['content'], 'test.xlsx');
      const event = {
        target: { files: [mockFile], value: '' },
      } as unknown as Event;
      component.onFileInputChange(event);

      component.clearSelection();

      expect(component.selectedFile()).toBeNull();
      expect(component.error()).toBeNull();
    });
  });

  describe('formatFileSize', () => {
    it('should format bytes correctly', () => {
      expect(component.formatFileSize(0)).toBe('0 Bytes');
      expect(component.formatFileSize(1024)).toBe('1 KB');
      expect(component.formatFileSize(1024 * 1024)).toBe('1 MB');
      expect(component.formatFileSize(1536)).toBe('1.5 KB');
    });
  });

  describe('drop event', () => {
    it('should process dropped xlsx file', () => {
      const mockFile = new File(['content'], 'test.xlsx');
      const event = {
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
        dataTransfer: {
          files: [mockFile],
        },
      } as unknown as DragEvent;

      component.onDrop(event);

      expect(component.isDragOver()).toBe(false);
      expect(component.selectedFile()).toBe(mockFile);
    });
  });
});
