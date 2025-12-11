import { Component, inject, signal, computed } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { AuthService } from '../../../core/auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
  ],
  template: `
    <mat-card class="login-card">
      <mat-card-header>
        <mat-card-title>Login</mat-card-title>
        <mat-card-subtitle>Enter your credentials to continue</mat-card-subtitle>
      </mat-card-header>
      <mat-card-content>
        <form [formGroup]="form" (ngSubmit)="onSubmit()">
          <mat-form-field appearance="outline">
            <mat-label>Email</mat-label>
            <input matInput type="email" formControlName="email" placeholder="your@email.com" />
            <mat-icon matSuffix>email</mat-icon>
            @if (form.controls.email.hasError('required') && form.controls.email.touched) {
              <mat-error>Email is required</mat-error>
            }
            @if (form.controls.email.hasError('email') && form.controls.email.touched) {
              <mat-error>Invalid email format</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Password</mat-label>
            <input
              matInput
              [type]="hidePassword() ? 'password' : 'text'"
              formControlName="password"
            />
            <button
              mat-icon-button
              matSuffix
              type="button"
              (click)="hidePassword.set(!hidePassword())"
            >
              <mat-icon>{{ hidePassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
            </button>
            @if (form.controls.password.hasError('required') && form.controls.password.touched) {
              <mat-error>Password is required</mat-error>
            }
          </mat-form-field>

          <button
            mat-raised-button
            color="primary"
            type="submit"
            [disabled]="form.invalid || isLoading()"
            class="submit-button"
          >
            @if (isLoading()) {
              <mat-spinner diameter="20"></mat-spinner>
            } @else {
              Login
            }
          </button>
        </form>
      </mat-card-content>
      <mat-card-actions align="end">
        <span class="register-link">
          Don't have an account?
          <a routerLink="/register">Register</a>
        </span>
      </mat-card-actions>
    </mat-card>
  `,
  styles: [
    `
      .login-card {
        width: 100%;
        max-width: 400px;
      }

      form {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-top: 16px;
      }

      .submit-button {
        margin-top: 8px;
        height: 48px;
      }

      .register-link {
        font-size: 0.875rem;
        color: var(--mat-sys-on-surface-variant);
      }

      .register-link a {
        color: var(--mat-sys-primary);
        text-decoration: none;
        font-weight: 500;
      }

      .register-link a:hover {
        text-decoration: underline;
      }

      mat-spinner {
        display: inline-block;
      }
    `,
  ],
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);
  readonly authService = inject(AuthService);

  readonly hidePassword = signal(true);
  readonly isSubmitting = signal(false);

  // Combined loading state: either auth service loading or submitting/redirecting
  readonly isLoading = computed(() => this.authService.isLoading() || this.isSubmitting());

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  onSubmit(): void {
    if (this.form.invalid || this.isLoading()) return;

    const { email, password } = this.form.getRawValue();
    this.isSubmitting.set(true);

    this.authService.login({ email, password }).subscribe({
      next: (success) => {
        if (success) {
          // Keep loading state while redirecting
          this.router.navigate(['/dashboard']);
        } else {
          this.isSubmitting.set(false);
          this.snackBar.open(this.authService.error() || 'Login failed', 'Close', {
            duration: 5000,
            panelClass: 'error-snackbar',
          });
        }
      },
      error: () => {
        this.isSubmitting.set(false);
      },
    });
  }
}
