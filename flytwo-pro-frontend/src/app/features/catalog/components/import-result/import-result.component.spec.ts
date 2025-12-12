import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ImportResultComponent } from './import-result.component';
import { ImportResult } from '../../models';

describe('ImportResultComponent', () => {
  let component: ImportResultComponent;
  let fixture: ComponentFixture<ImportResultComponent>;

  const mockResult: ImportResult = {
    rows_read: 100,
    rows_saved: 90,
    rows_skipped: 10,
    errors: [
      { row: 5, reason: 'Missing required field' },
      { row: 12, reason: 'Invalid format' },
    ],
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ImportResultComponent, NoopAnimationsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(ImportResultComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('result', mockResult);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display rows_read stat', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('100');
    expect(compiled.textContent).toContain('Lidos');
  });

  it('should display rows_saved stat', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('90');
    expect(compiled.textContent).toContain('Salvos');
  });

  it('should display rows_skipped stat', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('10');
    expect(compiled.textContent).toContain('Ignorados');
  });

  it('should display error count when errors exist', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('2');
    expect(compiled.textContent).toContain('erro(s)');
  });

  it('should emit importAnother when button is clicked', () => {
    const importAnotherSpy = vi.fn();
    component.importAnother.subscribe(importAnotherSpy);

    const button = fixture.nativeElement.querySelector(
      'button[mat-raised-button]'
    );
    button.click();

    expect(importAnotherSpy).toHaveBeenCalled();
  });

  it('should not display errors panel when no errors', async () => {
    const resultWithoutErrors: ImportResult = {
      rows_read: 50,
      rows_saved: 50,
      rows_skipped: 0,
    };

    fixture.componentRef.setInput('result', resultWithoutErrors);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('mat-expansion-panel')).toBeNull();
  });

  it('should display errors table when errors exist', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const panel = compiled.querySelector('mat-expansion-panel');
    expect(panel).toBeTruthy();
  });

  it('should show warning icon when there are errors', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('warning');
    expect(compiled.textContent).toContain('Importacao com avisos');
  });

  it('should show success icon when no errors', async () => {
    // Create a new fixture with a result without errors
    const resultWithoutErrors: ImportResult = {
      rows_read: 50,
      rows_saved: 50,
      rows_skipped: 0,
      errors: [],
    };

    const newFixture = TestBed.createComponent(ImportResultComponent);
    newFixture.componentRef.setInput('result', resultWithoutErrors);
    newFixture.detectChanges();

    const compiled = newFixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('check_circle');
    expect(compiled.textContent).toContain('Importacao concluida');
  });
});
