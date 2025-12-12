import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { CatmatSearchComponent } from './catmat-search.component';
import { CatalogService } from '../services';
import { CatmatSearchResponse, CatmatSearchItem } from '../models';

describe('CatmatSearchComponent', () => {
  let component: CatmatSearchComponent;
  let fixture: ComponentFixture<CatmatSearchComponent>;
  let catalogServiceMock: {
    searchCatmat: ReturnType<typeof vi.fn>;
    isLoading: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
  };

  const mockCatmatItem: CatmatSearchItem = {
    id: 1,
    item_code: 123456,
    item_description: 'Test item 1',
    group_code: 1,
    group_name: 'Group 1',
    class_code: 10,
    class_name: 'Class 10',
    pdm_code: 100,
    pdm_name: 'PDM 100',
    ncm_code: '84719000',
    rank: 0.5,
  };

  const mockCatmatItem2: CatmatSearchItem = {
    id: 2,
    item_code: 789012,
    item_description: 'Test item 2',
    group_code: 2,
    group_name: 'Group 2',
    class_code: 20,
    class_name: 'Class 20',
    pdm_code: 200,
    pdm_name: 'PDM 200',
    rank: 0.4,
  };

  const mockSearchResponse: CatmatSearchResponse = {
    data: [mockCatmatItem, mockCatmatItem2],
    total: 2,
    limit: 25,
    offset: 0,
  };

  beforeEach(async () => {
    catalogServiceMock = {
      searchCatmat: vi.fn().mockReturnValue(of(mockSearchResponse)),
      isLoading: vi.fn().mockReturnValue(false),
      error: vi.fn().mockReturnValue(null),
    };

    await TestBed.configureTestingModule({
      imports: [CatmatSearchComponent, NoopAnimationsModule],
      providers: [{ provide: CatalogService, useValue: catalogServiceMock }],
    }).compileComponents();

    fixture = TestBed.createComponent(CatmatSearchComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display title', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain(
      'Pesquisar CATMAT'
    );
  });

  it('should have empty search results initially', () => {
    expect(component.searchResults()).toEqual([]);
    expect(component.totalResults()).toBe(0);
  });

  it('should not display results card before search', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.results-card')).toBeFalsy();
  });

  describe('search form', () => {
    it('should have search input field', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const searchInput = compiled.querySelector('input[formControlName="q"]');
      expect(searchInput).toBeTruthy();
    });

    it('should have filter fields in expansion panel', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      expect(
        compiled.querySelector('input[formControlName="group_code"]')
      ).toBeTruthy();
      expect(
        compiled.querySelector('input[formControlName="class_code"]')
      ).toBeTruthy();
      expect(
        compiled.querySelector('input[formControlName="pdm_code"]')
      ).toBeTruthy();
      expect(
        compiled.querySelector('input[formControlName="ncm_code"]')
      ).toBeTruthy();
    });
  });

  describe('onSearch', () => {
    it('should call searchCatmat with form values', () => {
      component.searchForm.patchValue({ q: 'test query' });

      component.onSearch();

      expect(catalogServiceMock.searchCatmat).toHaveBeenCalledWith(
        expect.objectContaining({
          q: 'test query',
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

    it('should reset page to 0 on new search', () => {
      component['currentPage'].set(5);

      component.onSearch();

      expect(component.currentPage()).toBe(0);
    });

    it('should include filter values in search params', () => {
      component.searchForm.patchValue({
        q: 'test',
        group_code: 1,
        class_code: 10,
        pdm_code: 100,
        ncm_code: '84719000',
      });

      component.onSearch();

      expect(catalogServiceMock.searchCatmat).toHaveBeenCalledWith(
        expect.objectContaining({
          q: 'test',
          group_code: 1,
          class_code: 10,
          pdm_code: 100,
          ncm_code: '84719000',
        })
      );
    });
  });

  describe('pagination', () => {
    it('should update currentPage on page change', () => {
      component.onPageChange({ pageIndex: 2, pageSize: 25, length: 100 });

      expect(component.currentPage()).toBe(2);
    });

    it('should call search with new offset on page change', () => {
      component.onPageChange({ pageIndex: 2, pageSize: 25, length: 100 });

      expect(catalogServiceMock.searchCatmat).toHaveBeenCalledWith(
        expect.objectContaining({
          offset: 50, // pageIndex * pageSize
        })
      );
    });
  });

  describe('clearFilters', () => {
    it('should reset form and search state', () => {
      component.searchForm.patchValue({ q: 'test', group_code: 1 });
      component['searchResults'].set(mockSearchResponse.data);
      component['totalResults'].set(100);
      component['currentPage'].set(5);
      component['hasSearched'].set(true);

      component.clearFilters();

      expect(component.searchForm.value).toEqual({
        q: '',
        group_code: null,
        class_code: null,
        pdm_code: null,
        ncm_code: '',
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

      const rows = table?.querySelectorAll('tbody tr');
      expect(rows?.length).toBe(2);
    });

    it('should display all columns', () => {
      expect(component.displayedColumns).toEqual([
        'item_code',
        'item_description',
        'group_name',
        'class_name',
        'pdm_name',
        'ncm_code',
      ]);
    });
  });
});
