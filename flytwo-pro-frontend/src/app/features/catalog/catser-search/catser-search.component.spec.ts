import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { CatserSearchComponent } from './catser-search.component';
import { CatalogService } from '../services';
import { CatserSearchResponse, CatserSearchItem } from '../models';

describe('CatserSearchComponent', () => {
  let component: CatserSearchComponent;
  let fixture: ComponentFixture<CatserSearchComponent>;
  let catalogServiceMock: {
    searchCatser: ReturnType<typeof vi.fn>;
    isLoading: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
  };

  const mockCatserItem: CatserSearchItem = {
    id: 1,
    service_code: 654321,
    service_description: 'Test service 1',
    material_service_type: 'S',
    group_code: 1,
    group_name: 'Group 1',
    class_code: 10,
    class_name: 'Class 10',
    status: 'Ativo',
    rank: 0.5,
  };

  const mockCatserItem2: CatserSearchItem = {
    id: 2,
    service_code: 987654,
    service_description: 'Test service 2',
    material_service_type: 'S',
    group_code: 2,
    group_name: 'Group 2',
    class_code: 20,
    class_name: 'Class 20',
    status: 'Inativo',
    rank: 0.4,
  };

  const mockSearchResponse: CatserSearchResponse = {
    data: [mockCatserItem, mockCatserItem2],
    total: 2,
    limit: 25,
    offset: 0,
  };

  beforeEach(async () => {
    catalogServiceMock = {
      searchCatser: vi.fn().mockReturnValue(of(mockSearchResponse)),
      isLoading: vi.fn().mockReturnValue(false),
      error: vi.fn().mockReturnValue(null),
    };

    await TestBed.configureTestingModule({
      imports: [CatserSearchComponent, NoopAnimationsModule],
      providers: [{ provide: CatalogService, useValue: catalogServiceMock }],
    }).compileComponents();

    fixture = TestBed.createComponent(CatserSearchComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display title', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain(
      'Pesquisar CATSER'
    );
  });

  it('should have empty search results initially', () => {
    expect(component.searchResults()).toEqual([]);
    expect(component.totalResults()).toBe(0);
  });

  describe('search form', () => {
    it('should have search input field', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const searchInput = compiled.querySelector('input[formControlName="q"]');
      expect(searchInput).toBeTruthy();
    });

    it('should have status select in filters', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      expect(
        compiled.querySelector('mat-select[formControlName="status"]')
      ).toBeTruthy();
    });

    it('should have service_code filter', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      expect(
        compiled.querySelector('input[formControlName="service_code"]')
      ).toBeTruthy();
    });
  });

  describe('onSearch', () => {
    it('should call searchCatser with form values', () => {
      component.searchForm.patchValue({ q: 'service test' });

      component.onSearch();

      expect(catalogServiceMock.searchCatser).toHaveBeenCalledWith(
        expect.objectContaining({
          q: 'service test',
          limit: 25,
          offset: 0,
        })
      );
    });

    it('should update search results after search', () => {
      component.onSearch();

      expect(component.searchResults()).toEqual(mockSearchResponse.data);
      expect(component.totalResults()).toBe(2);
      expect(component.hasSearched()).toBe(true);
    });

    it('should include status filter in search params', () => {
      component.searchForm.patchValue({
        q: 'test',
        status: 'Ativo',
      });

      component.onSearch();

      expect(catalogServiceMock.searchCatser).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'Ativo',
        })
      );
    });

    it('should include service_code filter', () => {
      component.searchForm.patchValue({
        service_code: 123456,
      });

      component.onSearch();

      expect(catalogServiceMock.searchCatser).toHaveBeenCalledWith(
        expect.objectContaining({
          service_code: 123456,
        })
      );
    });
  });

  describe('pagination', () => {
    it('should update currentPage on page change', () => {
      component.onPageChange({ pageIndex: 3, pageSize: 25, length: 100 });

      expect(component.currentPage()).toBe(3);
    });

    it('should call search with correct offset', () => {
      component.onPageChange({ pageIndex: 3, pageSize: 25, length: 100 });

      expect(catalogServiceMock.searchCatser).toHaveBeenCalledWith(
        expect.objectContaining({
          offset: 75,
        })
      );
    });
  });

  describe('clearFilters', () => {
    it('should reset form and search state', () => {
      component.searchForm.patchValue({
        q: 'test',
        group_code: 1,
        status: 'Ativo',
      });
      component['searchResults'].set(mockSearchResponse.data);
      component['totalResults'].set(100);
      component['currentPage'].set(5);
      component['hasSearched'].set(true);

      component.clearFilters();

      expect(component.searchForm.value).toEqual({
        q: '',
        group_code: null,
        class_code: null,
        service_code: null,
        status: '',
      });
      expect(component.searchResults()).toEqual([]);
      expect(component.totalResults()).toBe(0);
      expect(component.currentPage()).toBe(0);
      expect(component.hasSearched()).toBe(false);
    });
  });

  describe('results table', () => {
    it('should display results in table after search', () => {
      component.onSearch();
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const table = compiled.querySelector('table');
      expect(table).toBeTruthy();
    });

    it('should display all columns', () => {
      expect(component.displayedColumns).toEqual([
        'service_code',
        'service_description',
        'group_name',
        'class_name',
        'status',
      ]);
    });

    it('should display status badges', () => {
      component.onSearch();
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const statusBadges = compiled.querySelectorAll('.status-badge');
      expect(statusBadges.length).toBe(2);
    });
  });
});
