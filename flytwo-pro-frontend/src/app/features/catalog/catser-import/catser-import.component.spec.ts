import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { CatserImportComponent } from './catser-import.component';
import { CatalogService } from '../services';
import { ImportResult } from '../models';

describe('CatserImportComponent', () => {
  let component: CatserImportComponent;
  let fixture: ComponentFixture<CatserImportComponent>;
  let catalogServiceMock: {
    importCatser: ReturnType<typeof vi.fn>;
    isLoading: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
    clearError: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    catalogServiceMock = {
      importCatser: vi.fn(),
      isLoading: vi.fn().mockReturnValue(false),
      error: vi.fn().mockReturnValue(null),
      clearError: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [CatserImportComponent, NoopAnimationsModule],
      providers: [{ provide: CatalogService, useValue: catalogServiceMock }],
    }).compileComponents();

    fixture = TestBed.createComponent(CatserImportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display title', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Importar CATSER');
  });

  it('should display file upload component when no import result', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-file-upload')).toBeTruthy();
    expect(compiled.querySelector('app-import-result')).toBeFalsy();
  });

  it('should call importCatser when file is selected', () => {
    const mockFile = new File(['content'], 'catser.xlsx');
    const mockResult: ImportResult = {
      rows_read: 50,
      rows_saved: 48,
      rows_skipped: 2,
    };
    catalogServiceMock.importCatser.mockReturnValue(of(mockResult));

    component.onFileSelected(mockFile);

    expect(catalogServiceMock.importCatser).toHaveBeenCalledWith(mockFile);
  });

  it('should show import result after successful import', () => {
    const mockResult: ImportResult = {
      rows_read: 50,
      rows_saved: 48,
      rows_skipped: 2,
    };
    catalogServiceMock.importCatser.mockReturnValue(of(mockResult));

    const mockFile = new File(['content'], 'catser.xlsx');
    component.onFileSelected(mockFile);
    fixture.detectChanges();

    expect(component.importResult()).toEqual(mockResult);
  });

  it('should reset import state when resetImport is called', () => {
    component['importResult'].set({
      rows_read: 50,
      rows_saved: 48,
      rows_skipped: 2,
    });

    component.resetImport();

    expect(component.importResult()).toBeNull();
    expect(catalogServiceMock.clearError).toHaveBeenCalled();
  });
});
