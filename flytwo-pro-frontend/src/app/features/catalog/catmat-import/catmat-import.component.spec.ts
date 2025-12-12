import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { CatmatImportComponent } from './catmat-import.component';
import { CatalogService } from '../services';
import { ImportResult } from '../models';

describe('CatmatImportComponent', () => {
  let component: CatmatImportComponent;
  let fixture: ComponentFixture<CatmatImportComponent>;
  let catalogServiceMock: {
    importCatmat: ReturnType<typeof vi.fn>;
    isLoading: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
    clearError: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    catalogServiceMock = {
      importCatmat: vi.fn(),
      isLoading: vi.fn().mockReturnValue(false),
      error: vi.fn().mockReturnValue(null),
      clearError: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [CatmatImportComponent, NoopAnimationsModule],
      providers: [{ provide: CatalogService, useValue: catalogServiceMock }],
    }).compileComponents();

    fixture = TestBed.createComponent(CatmatImportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display title', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Importar CATMAT');
  });

  it('should display file upload component when no import result', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-file-upload')).toBeTruthy();
    expect(compiled.querySelector('app-import-result')).toBeFalsy();
  });

  it('should call importCatmat when file is selected', () => {
    const mockFile = new File(['content'], 'catmat.xlsx');
    const mockResult: ImportResult = {
      rows_read: 100,
      rows_saved: 95,
      rows_skipped: 5,
    };
    catalogServiceMock.importCatmat.mockReturnValue(of(mockResult));

    component.onFileSelected(mockFile);

    expect(catalogServiceMock.importCatmat).toHaveBeenCalledWith(mockFile);
  });

  it('should show import result after successful import', () => {
    const mockResult: ImportResult = {
      rows_read: 100,
      rows_saved: 95,
      rows_skipped: 5,
    };
    catalogServiceMock.importCatmat.mockReturnValue(of(mockResult));

    const mockFile = new File(['content'], 'catmat.xlsx');
    component.onFileSelected(mockFile);
    fixture.detectChanges();

    expect(component.importResult()).toEqual(mockResult);
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-import-result')).toBeTruthy();
    expect(compiled.querySelector('app-file-upload')).toBeFalsy();
  });

  it('should reset import state when resetImport is called', () => {
    component['importResult'].set({
      rows_read: 100,
      rows_saved: 95,
      rows_skipped: 5,
    });

    component.resetImport();

    expect(component.importResult()).toBeNull();
    expect(catalogServiceMock.clearError).toHaveBeenCalled();
  });
});
