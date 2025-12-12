import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { DashboardComponent } from './dashboard.component';
import { AuthService } from '../../core/auth';
import { CatalogService } from '../catalog/services/catalog.service';
import { CatalogStats } from '../catalog/models';

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;
  let mockAuthService: Partial<AuthService>;
  let mockCatalogService: Partial<CatalogService>;

  const mockUser = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    user_name: 'Test User',
    email: 'test@example.com',
    created_at: '2024-01-01T00:00:00Z',
  };

  const mockStats: CatalogStats = {
    catmat_total: 1000,
    catser_total: 500,
    catmat_by_group: [
      { group_code: 1, group_name: 'Materiais de Escritório', count: 400 },
      { group_code: 2, group_name: 'Equipamentos de Informática', count: 300 },
      { group_code: 3, group_name: 'Material de Limpeza', count: 200 },
    ],
    catser_by_group: [
      { group_code: 10, group_name: 'Consultoria', count: 200 },
      { group_code: 11, group_name: 'Manutenção', count: 150 },
      { group_code: 12, group_name: 'Treinamento', count: 100 },
    ],
    catser_by_status: [
      { status: 'Ativo', count: 450 },
      { status: 'Inativo', count: 50 },
    ],
  };

  beforeEach(async () => {
    mockAuthService = {
      user: signal(mockUser),
    };

    mockCatalogService = {
      getCatalogStats: vi.fn().mockReturnValue(of(mockStats)),
      isLoading: signal(false),
      error: signal(null),
    };

    await TestBed.configureTestingModule({
      imports: [DashboardComponent, NoopAnimationsModule],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: CatalogService, useValue: mockCatalogService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load stats on init', () => {
    fixture.detectChanges();
    expect(mockCatalogService.getCatalogStats).toHaveBeenCalled();
  });

  it('should display user name in welcome message', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.welcome-text')?.textContent).toContain(
      'Test User'
    );
  });

  it('should display totals after loading stats', () => {
    fixture.detectChanges();

    expect(component.catmatTotal()).toBe(1000);
    expect(component.catserTotal()).toBe(500);
  });

  it('should transform catmat_by_group to chart format', () => {
    fixture.detectChanges();

    const chartData = component.catmatByGroup();
    expect(chartData.length).toBe(3);
    expect(chartData[0].name).toContain('1 - Materiais');
    expect(chartData[0].value).toBe(400);
  });

  it('should transform catser_by_group to chart format', () => {
    fixture.detectChanges();

    const chartData = component.catserByGroup();
    expect(chartData.length).toBe(3);
    expect(chartData[0].name).toContain('10 - Consultoria');
    expect(chartData[0].value).toBe(200);
  });

  it('should transform catser_by_status to chart format', () => {
    fixture.detectChanges();

    const chartData = component.catserByStatus();
    expect(chartData.length).toBe(2);
    expect(chartData[0].name).toBe('Ativo');
    expect(chartData[0].value).toBe(450);
    expect(chartData[1].name).toBe('Inativo');
    expect(chartData[1].value).toBe(50);
  });

  it('should manage loading state correctly', () => {
    // The isLoading signal should be defined and properly manage state
    expect(component.isLoading).toBeDefined();

    // Before ngOnInit, isLoading is true
    expect(component.isLoading()).toBe(true);

    // After stats are loaded, isLoading becomes false
    fixture.detectChanges();
    expect(component.isLoading()).toBe(false);
  });

  it('should hide loading spinner after loading completes', () => {
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('mat-spinner')).toBeFalsy();
  });

  it('should display profile card with user info', () => {
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const profileCard = compiled.querySelector('.profile-card');

    expect(profileCard).toBeTruthy();
    expect(profileCard?.textContent).toContain('Test User');
    expect(profileCard?.textContent).toContain('test@example.com');
  });

  it('should handle null stats gracefully', () => {
    mockCatalogService.getCatalogStats = vi.fn().mockReturnValue(of(null));

    fixture.detectChanges();

    expect(component.catmatTotal()).toBe(0);
    expect(component.catserTotal()).toBe(0);
    expect(component.catmatByGroup()).toEqual([]);
    expect(component.catserByGroup()).toEqual([]);
    expect(component.catserByStatus()).toEqual([]);
  });

  it('should handle empty stats arrays', () => {
    const emptyStats: CatalogStats = {
      catmat_total: 0,
      catser_total: 0,
      catmat_by_group: [],
      catser_by_group: [],
      catser_by_status: [],
    };
    mockCatalogService.getCatalogStats = vi.fn().mockReturnValue(of(emptyStats));

    fixture.detectChanges();

    expect(component.catmatByGroup().length).toBe(0);
    expect(component.catserByGroup().length).toBe(0);
    expect(component.catserByStatus().length).toBe(0);
  });

  it('should truncate long group names', () => {
    const longNameStats: CatalogStats = {
      ...mockStats,
      catmat_by_group: [
        {
          group_code: 1,
          group_name:
            'Este é um nome de grupo muito longo que precisa ser truncado para caber no gráfico',
          count: 100,
        },
      ],
    };
    mockCatalogService.getCatalogStats = vi
      .fn()
      .mockReturnValue(of(longNameStats));

    fixture.detectChanges();

    const chartData = component.catmatByGroup();
    expect(chartData[0].name.length).toBeLessThanOrEqual(40); // "1 - " + 30 chars + "..."
    expect(chartData[0].name).toContain('...');
  });

  it('should handle status with empty string', () => {
    const emptyStatusStats: CatalogStats = {
      ...mockStats,
      catser_by_status: [{ status: '', count: 100 }],
    };
    mockCatalogService.getCatalogStats = vi
      .fn()
      .mockReturnValue(of(emptyStatusStats));

    fixture.detectChanges();

    const chartData = component.catserByStatus();
    expect(chartData[0].name).toBe('Sem Status');
  });

  it('should display no data message when catmat is empty', () => {
    const emptyStats: CatalogStats = {
      catmat_total: 0,
      catser_total: 0,
      catmat_by_group: [],
      catser_by_group: [],
      catser_by_status: [],
    };
    mockCatalogService.getCatalogStats = vi.fn().mockReturnValue(of(emptyStats));

    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const noDataElements = compiled.querySelectorAll('.no-data');
    expect(noDataElements.length).toBeGreaterThan(0);
  });
});
