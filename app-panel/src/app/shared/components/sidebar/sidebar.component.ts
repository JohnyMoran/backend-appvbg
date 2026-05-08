// src/app/shared/components/sidebar/sidebar.component.ts
import { Component, inject } from '@angular/core';
import { CommonModule, AsyncPipe } from '@angular/common';
import { SidebarLogoComponent } from '../sidebar-logo/sidebar-logo.component';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, AsyncPipe, SidebarLogoComponent],
  template: `
    <aside class="sidebar">
      <div class="sidebar-brand">
        <div class="brand-icon">
          <app-sidebar-logo class="brand-logo"></app-sidebar-logo>
        </div>
        <span class="brand-name">Perla</span>
      </div>

      <nav class="nav">
        <a routerLink="/perfiles"     routerLinkActive="active" class="nav-item">
          <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          <span>Perfiles</span>
        </a>

        <a routerLink="/estadisticas" routerLinkActive="active" class="nav-item">
          <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="20" x2="18" y2="10"/>
            <line x1="12" y1="20" x2="12" y2="4"/>
            <line x1="6"  y1="20" x2="6"  y2="14"/>
          </svg>
          <span>Estadísticas</span>
        </a>

        <a routerLink="/lugares" routerLinkActive="active" class="nav-item">
          <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
          <span>Lugares y Emergencias</span>
        </a>

        <a routerLink="/exportar" routerLinkActive="active" class="nav-item">
          <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          <span>Exportar</span>
        </a>

        <!-- Separador -->
        <div class="nav-separator"></div>

        <a routerLink="/usuarios" routerLinkActive="active" class="nav-item"
           *ngIf="(admin$ | async)?.rol !== 'viewer'">
          <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="8" r="4"/>
            <path d="M6 20v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/>
            <line x1="19" y1="8" x2="23" y2="8"/>
            <line x1="21" y1="6" x2="21" y2="10"/>
          </svg>
          <span>Usuarios</span>
        </a>
      </nav>

      <div class="sidebar-footer">
        <div class="user-chip">
          <div class="user-avatar">
            {{ ((admin$ | async)?.nombre || 'A')[0].toUpperCase() }}
          </div>
          <span class="user-name">{{ (admin$ | async)?.nombre || 'Admin' }}</span>
        </div>
        <button class="logout-btn" (click)="logout()" title="Cerrar sesión">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
        </button>
      </div>
    </aside>
  `,
  styles: [`
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');

    :host { display: block; }

    .sidebar {
      width: 220px; min-height: 100vh;
      background: linear-gradient(170deg, #1a0526 0%, #2d0a40 100%);
      border-right: 1px solid rgba(130,54,140,0.2);
      padding: 24px 16px;
      display: flex; flex-direction: column; flex-shrink: 0;
      position: sticky; top: 0; height: 100vh;
      font-family: 'DM Sans', sans-serif;
    }

    .sidebar-brand { display:flex; align-items:center; gap:10px; padding:0 8px; margin-bottom:32px; }
    .brand-icon { width:36px; height:36px; background:linear-gradient(135deg,#82368C,#801AD3);
                  border-radius:10px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
    .brand-logo { width:40px; height:40px; }
    .brand-name { font-size:30px; font-weight:700; color:#fff; letter-spacing:-0.3px; }

    .nav { display:flex; flex-direction:column; gap:4px; flex:1; }

    .nav-separator { height:1px; background:rgba(255,255,255,0.08); margin:8px 4px; }

    .nav-item {
      display:flex; align-items:center; gap:10px; padding:11px 12px;
      border-radius:12px; color:rgba(255,255,255,0.5); text-decoration:none;
      font-size:14px; font-weight:500; transition:all 0.2s;
    }
    .nav-item:hover { color:rgba(255,255,255,0.85); background:rgba(255,255,255,0.06); }
    .nav-item.active {
      color:#fff;
      background:linear-gradient(135deg,rgba(130,54,140,0.5),rgba(128,26,211,0.3));
      border:1px solid rgba(130,54,140,0.4);
    }
    .nav-icon { width:30px; height:30px; flex-shrink:0; }

    .sidebar-footer { display:flex; align-items:center; gap:8px; padding:12px 8px 0;
                      border-top:1px solid rgba(255,255,255,0.08); }
    .user-chip { display:flex; align-items:center; gap:8px; flex:1; min-width:0; }
    .user-avatar { width:30px; height:30px; background:linear-gradient(135deg,#82368C,#F31A73);
                   border-radius:50%; display:flex; align-items:center; justify-content:center;
                   font-size:13px; font-weight:700; color:white; flex-shrink:0; }
    .user-name { font-size:13px; color:rgba(255,255,255,0.6); white-space:nowrap;
                 overflow:hidden; text-overflow:ellipsis; }
    .logout-btn { width:32px; height:32px; background:rgba(255,255,255,0.06);
                  border:1px solid rgba(255,255,255,0.1); border-radius:8px; cursor:pointer;
                  display:flex; align-items:center; justify-content:center;
                  color:rgba(255,255,255,0.4); transition:all 0.2s; flex-shrink:0; }
    .logout-btn:hover { background:rgba(243,26,115,0.2); border-color:rgba(243,26,115,0.4); color:#F31A73; }
    .logout-btn svg { width:15px; height:15px; }
  `]
})
export class SidebarComponent {
  admin$ = inject(AuthService).admin$;
  constructor(private authService: AuthService) {}
  logout() { this.authService.logout(); }
}