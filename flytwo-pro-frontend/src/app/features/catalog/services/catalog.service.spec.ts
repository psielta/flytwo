import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { CatalogService } from './catalog.service';
import { ApiConfiguration } from '../../../api/api-configuration';
import {
  ImportResult,
  CatmatSearchResponse,
  CatserSearchResponse,
  CatmatSearchItem,
  CatserSearchItem,
  CatalogStats,
} from '../models';

describe('CatalogService', () => {
  let service: CatalogService;
  let httpMock: HttpTestingController;
  const mockRootUrl = 'http://localhost:8080/api';

  const mockCatmatItem: CatmatSearchItem = {
    id: 1,
    item_code: 123456,
    item_description: 'Test item',
    group_code: 1,
    group_name: 'Group 1',
    class_code: 10,
    class_name: 'Class 10',
    pdm_code: 100,
    pdm_name: 'PDM 100',
    ncm_code: '84719000',
    rank: 0.5,
  };

  const mockCatserItem: CatserSearchItem = {
    id: 1,
    service_code: 654321,
    service_description: 'Test service',
    material_service_type: 'S',
    group_code: 2,
    group_name: 'Group 2',
    class_code: 20,
    class_name: 'Class 20',
    status: 'Ativo',
    rank: 0.5,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        CatalogService,
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ApiConfiguration,
          useValue: { rootUrl: mockRootUrl },
        },
      ],
    });
    service = TestBed.inject(CatalogService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('initial state', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should have isLoading as false initially', () => {
      expect(service.isLoading()).toBe(false);
    });

    it('should have error as null initially', () => {
      expect(service.error()).toBeNull();
    });
  });

  describe('importCatmat', () => {
    it('should upload file and return result on success', async () => {
      const mockFile = new File(['test'], 'catmat.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const mockResult: ImportResult = {
        rows_read: 100,
        rows_saved: 95,
        rows_skipped: 5,
      };

      const resultPromise = firstValueFrom(service.importCatmat(mockFile));

      expect(service.isLoading()).toBe(true);

      const req = httpMock.expectOne(`${mockRootUrl}/catmat/import`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body instanceof FormData).toBe(true);
      req.flush(mockResult);

      const result = await resultPromise;

      expect(result).toEqual(mockResult);
      expect(service.isLoading()).toBe(false);
      expect(service.error()).toBeNull();
    });

    it('should handle error on import failure', async () => {
      const mockFile = new File(['test'], 'catmat.xlsx');

      const resultPromise = firstValueFrom(service.importCatmat(mockFile));

      const req = httpMock.expectOne(`${mockRootUrl}/catmat/import`);
      req.flush(
        { error: 'Invalid file format' },
        { status: 400, statusText: 'Bad Request' }
      );

      const result = await resultPromise;

      expect(result).toBeNull();
      expect(service.isLoading()).toBe(false);
      expect(service.error()).toBe('Invalid file format');
    });
  });

  describe('importCatser', () => {
    it('should upload file and return result on success', async () => {
      const mockFile = new File(['test'], 'catser.xlsx');
      const mockResult: ImportResult = {
        rows_read: 50,
        rows_saved: 48,
        rows_skipped: 2,
      };

      const resultPromise = firstValueFrom(service.importCatser(mockFile));

      expect(service.isLoading()).toBe(true);

      const req = httpMock.expectOne(`${mockRootUrl}/catser/import`);
      expect(req.request.method).toBe('POST');
      req.flush(mockResult);

      const result = await resultPromise;

      expect(result).toEqual(mockResult);
      expect(service.isLoading()).toBe(false);
    });

    it('should handle error on import failure', async () => {
      const mockFile = new File(['test'], 'catser.xlsx');

      const resultPromise = firstValueFrom(service.importCatser(mockFile));

      const req = httpMock.expectOne(`${mockRootUrl}/catser/import`);
      req.flush(
        { error: 'Server error' },
        { status: 500, statusText: 'Internal Server Error' }
      );

      const result = await resultPromise;

      expect(result).toBeNull();
      expect(service.error()).toBe('Server error');
    });
  });

  describe('searchCatmat', () => {
    it('should search and return results', async () => {
      const mockResponse: CatmatSearchResponse = {
        data: [mockCatmatItem],
        total: 1,
        limit: 25,
        offset: 0,
      };

      const resultPromise = firstValueFrom(
        service.searchCatmat({ q: 'test', limit: 25, offset: 0 })
      );

      expect(service.isLoading()).toBe(true);

      const req = httpMock.expectOne(
        (r) => r.url === `${mockRootUrl}/catmat/search`
      );
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('q')).toBe('test');
      expect(req.request.params.get('limit')).toBe('25');
      expect(req.request.params.get('offset')).toBe('0');
      req.flush(mockResponse);

      const result = await resultPromise;

      expect(result).toEqual(mockResponse);
      expect(service.isLoading()).toBe(false);
    });

    it('should include optional filters in request', async () => {
      const resultPromise = firstValueFrom(
        service.searchCatmat({
          q: 'test',
          group_code: 1,
          class_code: 10,
          pdm_code: 100,
          ncm_code: '84719000',
          limit: 50,
          offset: 25,
        })
      );

      const req = httpMock.expectOne(
        (r) => r.url === `${mockRootUrl}/catmat/search`
      );
      expect(req.request.params.get('group_code')).toBe('1');
      expect(req.request.params.get('class_code')).toBe('10');
      expect(req.request.params.get('pdm_code')).toBe('100');
      expect(req.request.params.get('ncm_code')).toBe('84719000');
      req.flush({ data: [], total: 0, limit: 50, offset: 25 });

      await resultPromise;
    });

    it('should handle search error', async () => {
      const resultPromise = firstValueFrom(
        service.searchCatmat({ limit: 25, offset: 0 })
      );

      const req = httpMock.expectOne(
        (r) => r.url === `${mockRootUrl}/catmat/search`
      );
      req.flush(
        { error: 'Search failed' },
        { status: 500, statusText: 'Internal Server Error' }
      );

      const result = await resultPromise;

      expect(result).toBeNull();
      expect(service.error()).toBe('Search failed');
    });
  });

  describe('searchCatser', () => {
    it('should search and return results', async () => {
      const mockResponse: CatserSearchResponse = {
        data: [mockCatserItem],
        total: 1,
        limit: 25,
        offset: 0,
      };

      const resultPromise = firstValueFrom(
        service.searchCatser({ q: 'service', limit: 25, offset: 0 })
      );

      const req = httpMock.expectOne(
        (r) => r.url === `${mockRootUrl}/catser/search`
      );
      req.flush(mockResponse);

      const result = await resultPromise;

      expect(result).toEqual(mockResponse);
    });

    it('should include status filter in request', async () => {
      const resultPromise = firstValueFrom(
        service.searchCatser({
          status: 'Ativo',
          limit: 25,
          offset: 0,
        })
      );

      const req = httpMock.expectOne(
        (r) => r.url === `${mockRootUrl}/catser/search`
      );
      expect(req.request.params.get('status')).toBe('Ativo');
      req.flush({ data: [], total: 0, limit: 25, offset: 0 });

      await resultPromise;
    });
  });

  describe('getCatalogStats', () => {
    const mockStats: CatalogStats = {
      catmat_total: 1000,
      catser_total: 500,
      catmat_by_group: [
        { group_code: 1, group_name: 'Materiais', count: 400 },
        { group_code: 2, group_name: 'Equipamentos', count: 300 },
      ],
      catser_by_group: [
        { group_code: 10, group_name: 'Consultoria', count: 200 },
        { group_code: 11, group_name: 'Manutenção', count: 150 },
      ],
      catser_by_status: [
        { status: 'Ativo', count: 450 },
        { status: 'Inativo', count: 50 },
      ],
    };

    it('should fetch catalog stats successfully', async () => {
      const resultPromise = firstValueFrom(service.getCatalogStats());

      expect(service.isLoading()).toBe(true);

      const req = httpMock.expectOne(`${mockRootUrl}/catalog/stats`);
      expect(req.request.method).toBe('GET');
      req.flush(mockStats);

      const result = await resultPromise;

      expect(result).toEqual(mockStats);
      expect(service.isLoading()).toBe(false);
      expect(service.error()).toBeNull();
    });

    it('should handle error when fetching stats fails', async () => {
      const resultPromise = firstValueFrom(service.getCatalogStats());

      const req = httpMock.expectOne(`${mockRootUrl}/catalog/stats`);
      req.flush(
        { error: 'Failed to fetch stats' },
        { status: 500, statusText: 'Internal Server Error' }
      );

      const result = await resultPromise;

      expect(result).toBeNull();
      expect(service.isLoading()).toBe(false);
      expect(service.error()).toBe('Failed to fetch stats');
    });

    it('should use default error message when no error in response', async () => {
      const resultPromise = firstValueFrom(service.getCatalogStats());

      const req = httpMock.expectOne(`${mockRootUrl}/catalog/stats`);
      req.flush(null, { status: 500, statusText: 'Internal Server Error' });

      const result = await resultPromise;

      expect(result).toBeNull();
      expect(service.error()).toBe('Falha ao obter estatísticas do catálogo');
    });
  });

  describe('clearError', () => {
    it('should clear the error signal', async () => {
      const mockFile = new File(['test'], 'catmat.xlsx');

      const resultPromise = firstValueFrom(service.importCatmat(mockFile));

      const req = httpMock.expectOne(`${mockRootUrl}/catmat/import`);
      req.flush({ error: 'Test error' }, { status: 400, statusText: 'Error' });

      await resultPromise;

      expect(service.error()).toBe('Test error');

      service.clearError();

      expect(service.error()).toBeNull();
    });
  });
});
