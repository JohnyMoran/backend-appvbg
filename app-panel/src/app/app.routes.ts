import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'perfiles',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent)
  },
  {
    path: 'estadisticas',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/estadisticas/estadisticas.component').then(m => m.EstadisticasComponent)
  },
  {
    path: 'exportar',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/exportar/exportar.component').then(m => m.ExportarComponent)
  },
  {
    path: 'lugares',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/lugares/lugares.component').then(m => m.LugaresComponent)
  },
  {
    path: 'usuarios',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/usuarios/usuarios.component').then(m => m.UsuariosComponent)
  },
  { path: '', redirectTo: 'estadisticas', pathMatch: 'full' },
  { path: '**', redirectTo: 'estadisticas' }
];