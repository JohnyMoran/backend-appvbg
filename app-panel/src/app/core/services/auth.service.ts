import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Admin, LoginResponse } from '../../shared/models/models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private adminSubject = new BehaviorSubject<Admin | null>(this.getStoredAdmin());
  admin$ = this.adminSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {}

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${environment.apiUrl}/auth/login`, { email, password })
      .pipe(
        tap((res) => {
          localStorage.setItem('sorora_token', res.token);
          localStorage.setItem('sorora_admin', JSON.stringify(res.admin));
          this.adminSubject.next(res.admin);
        })
      );
  }

  logout(): void {
    localStorage.removeItem('sorora_token');
    localStorage.removeItem('sorora_admin');
    this.adminSubject.next(null);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem('sorora_token');
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  private getStoredAdmin(): Admin | null {
    const raw = localStorage.getItem('sorora_admin');
    return raw ? JSON.parse(raw) : null;
  }
}