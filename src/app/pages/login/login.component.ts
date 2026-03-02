import { Component, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { LoginDto } from '../../models/auth.model';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html'
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  loginForm = this.fb.group({
    username: ['', [Validators.required, Validators.minLength(3)]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  errorLogin = false;
  isLoading = false;

  onSubmit() {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorLogin = false;

    const credentials = this.loginForm.value as LoginDto;

    this.authService.login(credentials).subscribe({
      next: (res) => {
        console.log('Login exitoso. Token:', res.access_token);
        this.isLoading = false;
        this.cdr.detectChanges();
        this.router.navigate(['/inicio']);
      },
      error: (err) => {
        console.error('Error:', err);
        this.errorLogin = true;
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }
}