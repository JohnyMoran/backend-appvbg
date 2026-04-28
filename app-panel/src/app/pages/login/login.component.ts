// src/app/pages/login/login.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LogoComponent } from '../../shared/components/logo/logo.component';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
imports: [CommonModule, FormsModule, LogoComponent],
  template: `
    <div class="login-bg">
      <!-- Orbs decorativos -->
      <div class="orb orb-1"></div>
      <div class="orb orb-2"></div>
      <div class="orb orb-3"></div>

      <div class="login-card">
        <div class="login-logo">
          <div class="logo-mark">
            <app-logo class="login-logo-svg"></app-logo>
          </div>
          <h1>Perla</h1>
          <p>Panel de Administración</p>
        </div>

        <form (ngSubmit)="onLogin()">
          <div class="field">
            <label>Correo electrónico</label>
            <div class="input-wrap">
              <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
              <input type="email" [(ngModel)]="email" name="email"
                     placeholder="admin@perla.com" required />
            </div>
          </div>

          <div class="field">
            <label>Contraseña</label>
            <div class="input-wrap">
              <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              <input [type]="showPassword ? 'text' : 'password'"
                     [(ngModel)]="password" name="password"
                     placeholder="••••••••" required />
              <button type="button" class="toggle-pw" (click)="showPassword = !showPassword">
                <svg *ngIf="!showPassword" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
                <svg *ngIf="showPassword" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                  <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
              </button>
            </div>
          </div>

          <div class="error" *ngIf="error">{{ error }}</div>

          <button type="submit" class="btn-submit" [disabled]="loading">
            <span *ngIf="loading" class="btn-spinner"></span>
            {{ loading ? 'Ingresando...' : 'Ingresar al panel' }}
          </button>
        </form>
      </div>
    </div>
  `,
  styles: [`
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');

    :host { display: block; }

    .login-bg {
      min-height: 100vh;
      background: #0d0515;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      position: relative;
      overflow: hidden;
      font-family: 'DM Sans', sans-serif;
    }

    .orb {
      position: absolute;
      border-radius: 50%;
      filter: blur(80px);
      pointer-events: none;
    }
    .orb-1 {
      width: 500px; height: 500px;
      background: radial-gradient(circle, #82368C55, transparent 70%);
      top: -100px; left: -100px;
    }
    .orb-2 {
      width: 400px; height: 400px;
      background: radial-gradient(circle, #F31A7333, transparent 70%);
      bottom: -80px; right: -80px;
    }
    .orb-3 {
      width: 300px; height: 300px;
      background: radial-gradient(circle, #801AD322, transparent 70%);
      top: 50%; left: 50%;
      transform: translate(-50%, -50%);
    }

    .login-card {
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.1);
      backdrop-filter: blur(24px);
      border-radius: 28px;
      padding: 44px 40px;
      width: 100%;
      max-width: 400px;
      position: relative;
      z-index: 1;
    }

    .login-logo {
      text-align: center;
      margin-bottom: 36px;
    }

    .logo-mark {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 64px; height: 64px;
      background: rgba(130,54,140,0.15);
      border: 1px solid rgba(130,54,140,0.3);
      border-radius: 20px;
      margin-bottom: 14px;
    }
    .login-logo-svg { width: 40px; height: 40px; }

    h1 {
      color: #fff;
      margin: 0 0 6px;
      font-size: 30px;
      font-weight: 700;
      letter-spacing: -0.5px;
    }
    p { color: rgba(255,255,255,0.45); font-size: 14px; margin: 0; }

    .field { margin-bottom: 18px; }

    label {
      display: block;
      font-size: 13px;
      font-weight: 600;
      color: rgba(255,255,255,0.6);
      margin-bottom: 8px;
      letter-spacing: 0.3px;
    }

    .input-wrap {
      position: relative;
      display: flex;
      align-items: center;
    }
    .input-icon {
      position: absolute;
      left: 14px;
      width: 16px; height: 16px;
      color: rgba(255,255,255,0.3);
      pointer-events: none;
    }
    .input-wrap input {
      width: 100%;
      padding: 13px 16px 13px 42px;
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 14px;
      font-size: 15px;
      outline: none;
      box-sizing: border-box;
      color: #fff;
      font-family: 'DM Sans', sans-serif;
      transition: border-color 0.2s, background 0.2s;
    }
    .input-wrap input::placeholder { color: rgba(255,255,255,0.25); }
    .input-wrap input:focus {
      border-color: #82368C;
      background: rgba(130,54,140,0.1);
    }

    .toggle-pw {
      position: absolute;
      right: 12px;
      width: 30px; height: 30px;
      background: none;
      border: none;
      cursor: pointer;
      padding: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: rgba(255,255,255,0.3);
      border-radius: 8px;
      transition: color 0.2s;
    }
    .toggle-pw:hover { color: rgba(255,255,255,0.7); }
    .toggle-pw svg { width: 16px; height: 16px; }

    .error {
      background: rgba(243,26,115,0.15);
      border: 1px solid rgba(243,26,115,0.3);
      color: #f87aaa;
      padding: 10px 14px;
      border-radius: 10px;
      font-size: 13px;
      margin-bottom: 16px;
    }

    .btn-submit {
      width: 100%;
      padding: 15px;
      background: linear-gradient(135deg, #82368C, #801AD3);
      color: white;
      border: none;
      border-radius: 14px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      transition: opacity 0.2s, transform 0.1s;
      font-family: 'DM Sans', sans-serif;
      margin-top: 8px;
    }
    .btn-submit:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
    .btn-submit:active:not(:disabled) { transform: translateY(0); }
    .btn-submit:disabled { opacity: 0.5; cursor: not-allowed; }

    .btn-spinner {
      width: 16px; height: 16px;
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  `]
})
export class LoginComponent {
  email        = '';
  password     = '';
  error        = '';
  loading      = false;
  showPassword = false;

  constructor(private auth: AuthService, private router: Router) {}

  onLogin() {
    this.error   = '';
    this.loading = true;
    this.auth.login(this.email, this.password).subscribe({
      next:  ()    => this.router.navigate(['/perfiles']),
      error: (err) => {
        this.error   = err.error?.error || 'Credenciales incorrectas';
        this.loading = false;
      },
    });
  }
}