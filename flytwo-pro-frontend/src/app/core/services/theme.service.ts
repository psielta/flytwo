import { Injectable, signal, computed, effect } from '@angular/core';

export type ThemeMode = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly STORAGE_KEY = 'themeMode';
  private readonly mode = signal<ThemeMode>(this.loadTheme());

  readonly isDarkMode = computed(() => this.mode() === 'dark');
  readonly currentMode = this.mode.asReadonly();

  constructor() {
    effect(() => {
      this.applyTheme(this.mode());
    });
  }

  toggleTheme(): void {
    const newMode: ThemeMode = this.mode() === 'light' ? 'dark' : 'light';
    localStorage.setItem(this.STORAGE_KEY, newMode);
    this.mode.set(newMode);
  }

  setTheme(mode: ThemeMode): void {
    localStorage.setItem(this.STORAGE_KEY, mode);
    this.mode.set(mode);
  }

  private loadTheme(): ThemeMode {
    const saved = localStorage.getItem(this.STORAGE_KEY);
    if (saved === 'dark' || saved === 'light') {
      return saved;
    }
    // Detectar preferência do sistema
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  }

  private applyTheme(mode: ThemeMode): void {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark-theme', mode === 'dark');
    }
  }
}
