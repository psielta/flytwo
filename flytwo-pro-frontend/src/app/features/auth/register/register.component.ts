import { Component, inject, signal } from '@angular/core';
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
  selector: 'app-register',
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
    <mat-card class="register-card">
      <mat-card-header>
        <mat-card-title>Create Account</mat-card-title>
        <mat-card-subtitle>Fill in your details to register</mat-card-subtitle>
      </mat-card-header>
      <mat-card-content>
        <form [formGroup]="form" (ngSubmit)="onSubmit()">
          <mat-form-field appearance="outline">
            <mat-label>Username</mat-label>
            <input matInput type="text" formControlName="user_name" placeholder="johndoe" />
            <mat-icon matSuffix>person</mat-icon>
            @if (form.controls.user_name.hasError('required') && form.controls.user_name.touched) {
              <mat-error>Username is required</mat-error>
            }
            @if (form.controls.user_name.hasError('minlength') && form.controls.user_name.touched) {
              <mat-error>Username must be at least 3 characters</mat-error>
            }
          </mat-form-field>

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
            @if (form.controls.password.hasError('minlength') && form.controls.password.touched) {
              <mat-error>Password must be at least 8 characters</mat-error>
            }
          </mat-form-field>

          <button
            mat-raised-button
            color="primary"
            type="submit"
            [disabled]="form.invalid || authService.isLoading()"
            class="submit-button"
          >
            @if (authService.isLoading()) {
              <mat-spinner diameter="20"></mat-spinner>
            } @else {
              Register
            }
          </button>
        </form>
      </mat-card-content>
      <mat-card-actions align="end">
        <span class="login-link">
          Already have an account?
          <a routerLink="/login">Login</a>
        </span>
      </mat-card-actions>
    </mat-card>
  `,
  styles: [
    `
      .register-card {
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

      .login-link {
        font-size: 0.875rem;
        color: var(--mat-sys-on-surface-variant);
      }

      .login-link a {
        color: var(--mat-sys-primary);
        text-decoration: none;
        font-weight: 500;
      }

      .login-link a:hover {
        text-decoration: underline;
      }

      mat-spinner {
        display: inline-block;
      }
    `,
  ],
})
export class RegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);
  readonly authService = inject(AuthService);

  readonly hidePassword = signal(true);

  readonly form = this.fb.nonNullable.group({
    user_name: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  onSubmit(): void {
    if (this.form.invalid) return;

    const data = this.form.getRawValue();

    this.authService.register(data).subscribe({
      next: (success) => {
        if (success) {
          this.snackBar.open('Account created successfully! Please login.', 'Close', {
            duration: 5000,
          });
          this.router.navigate(['/login']);
        } else {
          this.snackBar.open(this.authService.error() || 'Registration failed', 'Close', {
            duration: 5000,
            panelClass: 'error-snackbar',
          });
        }
      },
    });
  }
}
