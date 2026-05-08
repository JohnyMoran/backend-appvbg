// src/app/pages/usuarios/usuarios.component.ts
import { Component, OnInit, NgZone, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { SidebarComponent } from '../../shared/components/sidebar/sidebar.component';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';

interface AdminUser {
  id: string;
  nombre: string;
  email: string;
  rol: 'superadmin' | 'admin' | 'viewer';
  activo: boolean;
  creado_en: string;
}

type Modal = null | 'crear' | 'editar' | 'password' | 'confirm-desactivar';

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent],
  template: `
    <div class="layout">
      <app-sidebar></app-sidebar>

      <main class="main">
        <div class="page-header">
          <div>
            <h2>Gestión de usuarios</h2>
            <p>Administra las cuentas de acceso al panel</p>
          </div>
          <button class="btn-add" *ngIf="currentUserRole !== 'viewer'" (click)="abrirCrear()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Nuevo usuario
          </button>
        </div>

        <div class="error-banner" *ngIf="errorMsg">⚠️ {{ errorMsg }}</div>
        <div class="loading-wrap" *ngIf="cargando">
          <div class="spinner"></div><p>Cargando...</p>
        </div>

        <div class="table-wrap" *ngIf="!cargando">
          <table class="data-table">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Email</th>
                <th>Rol</th>
                <th>Estado</th>
                <th>Creado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let u of usuarios" [class.inactivo]="!u.activo">
                <td>
                  <div class="user-cell">
                    <div class="user-avatar">{{ u.nombre[0].toUpperCase() }}</div>
                    <span class="user-name">{{ u.nombre }}</span>
                    <span class="self-badge" *ngIf="esMiCuenta(u.id)">Tú</span>
                  </div>
                </td>
                <td class="email-cell">{{ u.email }}</td>
                <td>
                  <span class="rol-pill"
                        [class.superadmin]="u.rol === 'superadmin'"
                        [class.viewer]="u.rol === 'viewer'">
                    <ng-container [ngSwitch]="u.rol">
                      <span *ngSwitchCase="'superadmin'">⭐ Superadmin</span>
                      <span *ngSwitchCase="'admin'">Admin</span>
                      <span *ngSwitchCase="'viewer'">👁 Viewer</span>
                    </ng-container>
                  </span>
                </td>
                <td>
                  <span class="status-pill" [class.active]="u.activo">
                    {{ u.activo ? 'Activo' : 'Inactivo' }}
                  </span>
                </td>
                <td class="fecha-cell">{{ u.creado_en | date:'dd/MM/yyyy' }}</td>
                <td>
                  <div class="actions">
                    <button class="btn-icon btn-edit" *ngIf="currentUserRole === 'superadmin'" (click)="abrirEditar(u)" title="Editar datos">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>
                    <button class="btn-icon btn-pwd" (click)="abrirCambiarPassword(u)"
                            title="Cambiar contraseña">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                      </svg>
                    </button>
                    <button class="btn-icon btn-delete"
                            *ngIf="currentUserRole === 'superadmin' && !esMiCuenta(u.id) && u.activo"
                            (click)="confirmarDesactivar(u)"
                            title="Desactivar usuario">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
              <tr *ngIf="!usuarios.length">
                <td colspan="6" class="empty-row">No hay usuarios registrados</td>
              </tr>
            </tbody>
           </table>
        </div>

        <!-- ═══ MODAL: CREAR USUARIO ═══════════════════════════════════════ -->
        <div class="modal-overlay" *ngIf="modal === 'crear'" (click)="cerrarModal()">
          <div class="modal" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3>Nuevo usuario</h3>
              <button class="modal-close" (click)="cerrarModal()">✕</button>
            </div>
            <div class="modal-body">
              <div class="form-grid">
                <div class="field full">
                  <label>Nombre completo <span class="req">*</span></label>
                  <input [(ngModel)]="formCrear.nombre" placeholder="Ej: María González" />
                </div>
                <div class="field full">
                  <label>Email <span class="req">*</span></label>
                  <input type="email" [(ngModel)]="formCrear.email"
                         placeholder="usuario@correo.com" />
                </div>
                <div class="field">
                  <label>Contraseña <span class="req">*</span></label>
                  <div class="pwd-wrap">
                    <input [type]="mostrarPwd ? 'text' : 'password'"
                           [(ngModel)]="formCrear.password"
                           placeholder="Mínimo 8 caracteres" />
                    <button class="btn-eye" type="button"
                            (click)="mostrarPwd = !mostrarPwd">
                      {{ mostrarPwd ? '🙈' : '👁' }}
                    </button>
                  </div>
                </div>
                <div class="field">
                  <label>Rol</label>
                  <select [(ngModel)]="formCrear.rol">
                    <ng-container *ngIf="currentUserRole === 'superadmin'">
                      <option value="superadmin">Superadmin</option>
                      <option value="admin">Admin</option>
                    </ng-container>
                    <option value="viewer">Viewer</option>
                  </select>
                  <small>
                    <ng-container *ngIf="currentUserRole === 'admin'">Solo puedes crear usuarios Viewer.</ng-container>
                    <ng-container *ngIf="currentUserRole === 'superadmin'">Superadmin: acceso total. Admin solo puede crear viewers.</ng-container>
                  </small>
                </div>
              </div>
              <div class="form-error" *ngIf="formError">⚠️ {{ formError }}</div>
            </div>
            <div class="modal-footer">
              <button class="btn-cancel" (click)="cerrarModal()">Cancelar</button>
              <button class="btn-save" (click)="crearUsuario()" [disabled]="guardando">
                <span *ngIf="guardando" class="btn-spinner"></span>
                {{ guardando ? 'Creando…' : 'Crear usuario' }}
              </button>
            </div>
          </div>
        </div>

        <!-- ═══ MODAL: EDITAR USUARIO ══════════════════════════════════════ -->
        <div class="modal-overlay" *ngIf="modal === 'editar'" (click)="cerrarModal()">
          <div class="modal" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3>Editar usuario</h3>
              <button class="modal-close" (click)="cerrarModal()">✕</button>
            </div>
            <div class="modal-body">
              <div class="form-grid">
                <div class="field full">
                  <label>Nombre completo <span class="req">*</span></label>
                  <input [(ngModel)]="formEditar.nombre" />
                </div>
                <div class="field full">
                  <label>Email <span class="req">*</span></label>
                  <input type="email" [(ngModel)]="formEditar.email" />
                </div>
                <div class="field">
                  <label>Rol</label>
                  <select [(ngModel)]="formEditar.rol">
                    <option value="admin">Admin</option>
                    <option value="superadmin">Superadmin</option>
                  </select>
                </div>
                <div class="field">
                  <label>Estado</label>
                  <label class="toggle-wrap">
                    <input type="checkbox" [(ngModel)]="formEditar.activo" />
                    <span class="toggle-label">{{ formEditar.activo ? 'Activo' : 'Inactivo' }}</span>
                  </label>
                </div>
              </div>
              <div class="form-error" *ngIf="formError">⚠️ {{ formError }}</div>
            </div>
            <div class="modal-footer">
              <button class="btn-cancel" (click)="cerrarModal()">Cancelar</button>
              <button class="btn-save" (click)="actualizarUsuario()" [disabled]="guardando">
                <span *ngIf="guardando" class="btn-spinner"></span>
                {{ guardando ? 'Guardando…' : 'Guardar cambios' }}
              </button>
            </div>
          </div>
        </div>

        <!-- ═══ MODAL: CAMBIAR CONTRASEÑA ══════════════════════════════════ -->
        <div class="modal-overlay" *ngIf="modal === 'password'" (click)="cerrarModal()">
          <div class="modal modal-sm" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3>Cambiar contraseña — {{ usuarioSeleccionado?.nombre }}</h3>
              <button class="modal-close" (click)="cerrarModal()">✕</button>
            </div>
            <div class="modal-body">
              <div class="info-box" *ngIf="esMiCuenta(usuarioSeleccionado?.id)">
                ℹ️ Estás cambiando <strong>tu propia contraseña</strong>. Deberás ingresar la actual.
              </div>
              <div class="info-box" *ngIf="!requierePasswordActual()">
                ℹ️ Estás cambiando la contraseña de un usuario. No se requiere contraseña actual.
              </div>
              <div class="form-grid">
                <div class="field full" *ngIf="requierePasswordActual()">
                  <label>Contraseña actual <span class="req">*</span></label>
                  <div class="pwd-wrap">
                    <input [type]="mostrarPwdActual ? 'text' : 'password'"
                           [(ngModel)]="formPassword.password_actual"
                           placeholder="Tu contraseña actual" />
                    <button class="btn-eye" type="button"
                            (click)="mostrarPwdActual = !mostrarPwdActual">
                      {{ mostrarPwdActual ? '🙈' : '👁' }}
                    </button>
                  </div>
                </div>
                <div class="field full">
                  <label>Nueva contraseña <span class="req">*</span></label>
                  <div class="pwd-wrap">
                    <input [type]="mostrarPwdNueva ? 'text' : 'password'"
                           [(ngModel)]="formPassword.password_nueva"
                           placeholder="Mínimo 8 caracteres" />
                    <button class="btn-eye" type="button"
                            (click)="mostrarPwdNueva = !mostrarPwdNueva">
                      {{ mostrarPwdNueva ? '🙈' : '👁' }}
                    </button>
                  </div>
                </div>
                <div class="field full">
                  <label>Confirmar nueva contraseña <span class="req">*</span></label>
                  <div class="pwd-wrap">
                    <input [type]="mostrarPwdConfirm ? 'text' : 'password'"
                           [(ngModel)]="formPassword.confirmar"
                           placeholder="Repite la nueva contraseña" />
                    <button class="btn-eye" type="button"
                            (click)="mostrarPwdConfirm = !mostrarPwdConfirm">
                      {{ mostrarPwdConfirm ? '🙈' : '👁' }}
                    </button>
                  </div>
                </div>
              </div>
              <div class="form-error" *ngIf="formError">⚠️ {{ formError }}</div>
            </div>
            <div class="modal-footer">
              <button class="btn-cancel" (click)="cerrarModal()">Cancelar</button>
              <button class="btn-save" (click)="cambiarPassword()" [disabled]="guardando">
                <span *ngIf="guardando" class="btn-spinner"></span>
                {{ guardando ? 'Guardando…' : 'Cambiar contraseña' }}
              </button>
            </div>
          </div>
        </div>

        <!-- ═══ MODAL: CONFIRMAR DESACTIVAR ════════════════════════════════ -->
        <div class="modal-overlay" *ngIf="modal === 'confirm-desactivar'" (click)="cerrarModal()">
          <div class="modal modal-sm" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3>Desactivar usuario</h3>
              <button class="modal-close" (click)="cerrarModal()">✕</button>
            </div>
            <div class="modal-body">
              <p class="confirm-text">
                ¿Desactivar la cuenta de
                <strong>{{ usuarioSeleccionado?.nombre }}</strong>?
                El usuario no podrá iniciar sesión hasta que sea reactivado.
              </p>
            </div>
            <div class="modal-footer">
              <button class="btn-cancel" (click)="cerrarModal()">Cancelar</button>
              <button class="btn-delete-confirm" (click)="desactivarUsuario()" [disabled]="guardando">
                <span *ngIf="guardando" class="btn-spinner"></span>
                {{ guardando ? 'Procesando…' : 'Sí, desactivar' }}
              </button>
            </div>
          </div>
        </div>

        <div class="toast" [class.visible]="toastMsg">{{ toastMsg }}</div>
      </main>
    </div>
  `,
  styles: [`
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
    :host { display:block; }
    .layout { display:flex; min-height:100vh; background:#f7f4fc; font-family:'DM Sans',sans-serif; }
    .main   { flex:1; padding:32px; overflow-y:auto; min-width:0; }

    .page-header { display:flex; justify-content:space-between; align-items:flex-start;
                   margin-bottom:28px; }
    .page-header h2 { color:#1a0526; font-size:24px; font-weight:700; margin:0 0 4px; }
    .page-header p  { color:#82368C; font-size:14px; margin:0; }

    .btn-add { display:flex; align-items:center; gap:6px;
               background:linear-gradient(135deg,#82368C,#801AD3); color:white;
               border:none; padding:10px 18px; border-radius:12px; font-size:14px;
               font-weight:600; cursor:pointer; font-family:'DM Sans',sans-serif; }
    .btn-add svg { width:16px; height:16px; }
    .btn-add:hover { opacity:0.9; }

    .error-banner { background:#fff0f5; border:1px solid rgba(243,26,115,0.2); color:#c41158;
                    padding:12px 18px; border-radius:12px; margin-bottom:16px; font-size:14px; }
    .loading-wrap { display:flex; align-items:center; gap:12px; padding:40px; color:#82368C; }
    .spinner { width:32px; height:32px; border:3px solid rgba(130,54,140,0.15);
               border-top-color:#82368C; border-radius:50%; animation:spin 0.8s linear infinite; }
    @keyframes spin { to { transform:rotate(360deg); } }

    .table-wrap { background:white; border-radius:18px; overflow:hidden;
                  box-shadow:0 1px 20px rgba(130,54,140,0.06);
                  border:1px solid rgba(130,54,140,0.07); }
    .data-table { width:100%; border-collapse:collapse; font-size:13px; }
    .data-table thead tr { background:#faf7ff; border-bottom:2px solid rgba(130,54,140,0.1); }
    .data-table th { padding:12px 16px; text-align:left; font-weight:700; color:#5a3070;
                     font-size:12px; text-transform:uppercase; letter-spacing:0.5px; }
    .data-table td { padding:12px 16px; border-bottom:1px solid rgba(130,54,140,0.06);
                     color:#1a0526; vertical-align:middle; }
    .data-table tr:last-child td { border-bottom:none; }
    .data-table tr:hover td { background:#fdfaff; }
    .data-table tr.inactivo td { opacity:0.5; }
    .empty-row { text-align:center; color:#b09ac0; font-style:italic; padding:40px !important; }

    .user-cell { display:flex; align-items:center; gap:10px; }
    .user-avatar { width:34px; height:34px; border-radius:50%;
                   background:linear-gradient(135deg,#82368C,#F31A73);
                   display:flex; align-items:center; justify-content:center;
                   font-size:13px; font-weight:700; color:white; flex-shrink:0; }
    .user-name { font-weight:600; }
    .self-badge { background:#fffce0; color:#92610a; border:1px solid rgba(255,237,0,0.5);
                  padding:2px 8px; border-radius:8px; font-size:11px; font-weight:700; }
    .email-cell { color:#7a5090; font-size:13px; }
    .fecha-cell { color:#b09ac0; font-size:12px; }
    .status-pill { padding:4px 10px; border-radius:8px; font-size:11px; font-weight:700;
                   background:#f3f4f6; color:#6b7280; }
    .status-pill.active { background:#f0fdf4; color:#065f46; }
    .rol-pill { padding:4px 10px; border-radius:8px; font-size:11px; font-weight:700;
                background:#f5eefa; color:#82368C; }
    .rol-pill.superadmin { background:linear-gradient(135deg,rgba(130,54,140,0.15),rgba(128,26,211,0.1));
                           color:#5b1f72; border:1px solid rgba(130,54,140,0.2); }
    .rol-pill.viewer { background:#f0f9ff; color:#0369a1; border:1px solid rgba(14,165,233,0.2); }
    .actions { display:flex; gap:4px; }
    .btn-icon { width:30px; height:30px; border-radius:8px; border:none; cursor:pointer;
                display:flex; align-items:center; justify-content:center; transition:all 0.2s; }
    .btn-icon svg { width:14px; height:14px; }
    .btn-edit { background:#f5eefa; color:#82368C; }
    .btn-edit:hover { background:#82368C; color:white; }
    .btn-pwd { background:#fff0e5; color:#c65c00; }
    .btn-pwd:hover { background:#c65c00; color:white; }
    .btn-delete { background:#fef2f2; color:#b91c1c; }
    .btn-delete:hover { background:#b91c1c; color:white; }

    /* Modal */
    .modal-overlay { position:fixed; inset:0; background:rgba(10,0,20,0.6);
                     backdrop-filter:blur(4px); display:flex; align-items:center;
                     justify-content:center; z-index:1000; padding:16px; }
    .modal { background:white; border-radius:24px; width:100%; max-width:520px;
             max-height:90vh; display:flex; flex-direction:column;
             box-shadow:0 24px 80px rgba(0,0,0,0.3); }
    .modal-sm { max-width:420px; }
    .modal-header { display:flex; justify-content:space-between; align-items:center;
                    padding:22px 28px 18px; border-bottom:1px solid rgba(130,54,140,0.1); }
    .modal-header h3 { color:#1a0526; font-size:18px; font-weight:700; margin:0; }
    .modal-close { background:none; border:none; cursor:pointer; font-size:18px; color:#b09ac0;
                   width:30px; height:30px; border-radius:8px; display:flex; align-items:center;
                   justify-content:center; }
    .modal-body   { padding:24px 28px; overflow-y:auto; flex:1; }
    .modal-footer { padding:18px 28px 22px; border-top:1px solid rgba(130,54,140,0.1);
                    display:flex; justify-content:flex-end; gap:10px; }
    .info-box { background:#f0f9ff; border:1px solid rgba(14,165,233,0.2); color:#0369a1;
                padding:10px 14px; border-radius:10px; margin-bottom:16px; font-size:13px; }
    .form-grid { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
    .field { display:flex; flex-direction:column; gap:5px; }
    .field.full { grid-column:1 / -1; }
    .field label { font-size:13px; font-weight:600; color:#5a3070; }
    .field input, .field select {
      padding:10px 12px; border:1.5px solid rgba(130,54,140,0.2);
      border-radius:10px; font-size:14px; color:#1a0526; background:white;
      font-family:'DM Sans',sans-serif; outline:none; transition:border-color 0.2s;
    }
    .field input:focus, .field select:focus { border-color:#82368C; }
    .field small { font-size:11px; color:#b09ac0; }
    .req { color:#F31A73; }
    .pwd-wrap { position:relative; display:flex; }
    .pwd-wrap input { flex:1; padding-right:44px; }
    .btn-eye { position:absolute; right:10px; top:50%; transform:translateY(-50%);
               background:none; border:none; cursor:pointer; font-size:16px; }
    .toggle-wrap { display:flex; align-items:center; gap:8px; cursor:pointer; margin-top:4px; }
    .toggle-wrap input[type=checkbox] { width:16px; height:16px; accent-color:#82368C; }
    .toggle-label { font-size:14px; color:#1a0526; }
    .form-error { background:#fff0f5; border:1px solid rgba(243,26,115,0.2); color:#c41158;
                  padding:10px 14px; border-radius:10px; margin-top:12px; font-size:13px; }
    .confirm-text { color:#1a0526; font-size:15px; line-height:1.5; margin:0; }
    .btn-cancel { padding:10px 20px; background:#f5eefa; color:#82368C; border:none;
                  border-radius:12px; font-size:14px; font-weight:600; cursor:pointer;
                  font-family:'DM Sans',sans-serif; }
    .btn-save { display:flex; align-items:center; gap:8px; padding:10px 24px;
                background:linear-gradient(135deg,#82368C,#801AD3); color:white; border:none;
                border-radius:12px; font-size:14px; font-weight:600; cursor:pointer;
                font-family:'DM Sans',sans-serif; }
    .btn-save:disabled { opacity:0.5; cursor:not-allowed; }
    .btn-delete-confirm { display:flex; align-items:center; gap:8px; padding:10px 24px;
                          background:#F31A73; color:white; border:none; border-radius:12px;
                          font-size:14px; font-weight:600; cursor:pointer;
                          font-family:'DM Sans',sans-serif; }
    .btn-delete-confirm:disabled { opacity:0.5; cursor:not-allowed; }
    .btn-spinner { width:14px; height:14px; border:2px solid rgba(255,255,255,0.4);
                   border-top-color:white; border-radius:50%; animation:spin 0.7s linear infinite; }
    .toast { position:fixed; bottom:28px; right:28px; background:#1a0526; color:white;
             padding:12px 20px; border-radius:12px; font-size:14px; font-weight:500;
             transform:translateY(20px); opacity:0; pointer-events:none; transition:all 0.3s; z-index:2000; }
    .toast.visible { transform:translateY(0); opacity:1; }
  `]
})
export class UsuariosComponent implements OnInit {
  modal: Modal = null;
  usuarios: AdminUser[] = [];
  cargando = false;
  guardando = false;
  errorMsg = '';
  formError = '';
  toastMsg = '';

  usuarioSeleccionado: AdminUser | null = null;

  formCrear  = { nombre: '', email: '', password: '', rol: 'viewer' as 'superadmin' | 'admin' | 'viewer' };
  formEditar = { nombre: '', email: '', rol: 'admin' as 'superadmin' | 'admin' | 'viewer', activo: true };
  formPassword = { password_actual: '', password_nueva: '', confirmar: '' };

  mostrarPwd        = false;
  mostrarPwdActual  = false;
  mostrarPwdNueva   = false;
  mostrarPwdConfirm = false;

  get currentUserRole(): string {
    return this.authService['adminSubject']?.value?.rol || '';
  }

  private readonly base = environment.apiUrl;
  private get headers() {
    return { Authorization: `Bearer ${this.authService.getToken()}` };
  }

  constructor(
    private http: HttpClient, 
    private authService: AuthService,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() { this.cargarUsuarios(); }

  cargarUsuarios() {
    this.cargando = true;
    this.http.get<AdminUser[]>(`${this.base}/admin/usuarios`, { headers: this.headers })
      .subscribe({
        next: (data) => { 
          this.usuarios = data; 
          this.cargando = false;
          this.cdr.markForCheck();
        },
        error: () => { 
          this.errorMsg = 'Error al cargar usuarios'; 
          this.cargando = false;
          this.cdr.markForCheck();
        }
      });
  }

  esMiCuenta(id: string | undefined): boolean {
    const admin = this.authService['adminSubject']?.value;
    return !!id && !!admin && String(admin.id) === String(id);
  }

  requierePasswordActual(): boolean {
    if (this.currentUserRole === 'superadmin' && !this.esMiCuenta(this.usuarioSeleccionado?.id))
      return false;
    if (this.currentUserRole === 'admin' && this.usuarioSeleccionado?.rol === 'viewer')
      return false;
    return true;
  }

  abrirCrear() {
    this.formCrear  = { nombre: '', email: '', password: '', rol: this.currentUserRole === 'superadmin' ? 'admin' : 'viewer' };
    this.formError  = '';
    this.mostrarPwd = false;
    this.modal = 'crear';
    this.cdr.markForCheck();
  }

  abrirEditar(u: AdminUser) {
    this.usuarioSeleccionado = u;
    this.formEditar = { nombre: u.nombre, email: u.email, rol: u.rol, activo: u.activo };
    this.formError  = '';
    this.modal = 'editar';
    this.cdr.markForCheck();
  }

  abrirCambiarPassword(u: AdminUser) {
    this.usuarioSeleccionado = u;
    this.formPassword = { password_actual: '', password_nueva: '', confirmar: '' };
    this.mostrarPwdActual  = false;
    this.mostrarPwdNueva   = false;
    this.mostrarPwdConfirm = false;
    this.formError  = '';
    this.modal = 'password';
    this.cdr.markForCheck();
  }

  confirmarDesactivar(u: AdminUser) {
    this.usuarioSeleccionado = u;
    this.modal = 'confirm-desactivar';
    this.cdr.markForCheck();
  }

  cerrarModal() {
    this.modal = null;
    this.formError = '';
    this.guardando = false;
    this.usuarioSeleccionado = null;
    this.cdr.markForCheck();
  }

  crearUsuario() {
    if (!this.formCrear.nombre.trim()) { this.formError = 'El nombre es obligatorio.'; return; }
    if (!this.formCrear.email.trim())  { this.formError = 'El email es obligatorio.'; return; }
    if (this.formCrear.password.length < 8) { this.formError = 'La contraseña debe tener al menos 8 caracteres.'; return; }

    this.guardando = true;
    this.formError = '';
    this.http.post<AdminUser>(`${this.base}/admin/usuarios`, this.formCrear, { headers: this.headers })
      .subscribe({
        next: (nuevo) => {
          this.usuarios.unshift(nuevo);
          this.cerrarModal();
          this.mostrarToast('✅ Usuario creado correctamente');
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.formError = err.error?.error || 'Error al crear usuario';
          this.guardando = false;
          this.cdr.markForCheck();
        }
      });
  }

  actualizarUsuario() {
    if (!this.formEditar.nombre.trim()) { this.formError = 'El nombre es obligatorio.'; return; }
    if (!this.formEditar.email.trim())  { this.formError = 'El email es obligatorio.'; return; }

    this.guardando = true;
    this.formError = '';
    const id = this.usuarioSeleccionado!.id;
    this.http.put<AdminUser>(`${this.base}/admin/usuarios/${id}`, this.formEditar, { headers: this.headers })
      .subscribe({
        next: (actualizado) => {
          const idx = this.usuarios.findIndex(u => u.id === id);
          if (idx >= 0) this.usuarios[idx] = actualizado;
          this.cerrarModal();
          this.mostrarToast('✅ Usuario actualizado');
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.formError = err.error?.error || 'Error al actualizar';
          this.guardando = false;
          this.cdr.markForCheck();
        }
      });
  }

  cambiarPassword() {
    if (!this.formPassword.password_nueva || this.formPassword.password_nueva.length < 8) {
      this.formError = 'La nueva contraseña debe tener al menos 8 caracteres.'; return;
    }
    if (this.formPassword.password_nueva !== this.formPassword.confirmar) {
      this.formError = 'Las contraseñas no coinciden.'; return;
    }

    const id = this.usuarioSeleccionado!.id;

    // admin solo puede cambiar passwords de viewers (además de la propia)
    if (this.currentUserRole === 'admin'
        && !this.esMiCuenta(id)
        && this.usuarioSeleccionado?.rol !== 'viewer') {
      this.formError = 'No tienes permiso para cambiar esta contraseña';
      return;
    }

    this.guardando = true;
    this.formError = '';
    this.http.put(
      `${this.base}/admin/usuarios/${id}/password`,
      {
        password_actual: this.formPassword.password_actual || undefined,
        password_nueva:  this.formPassword.password_nueva,
      },
      { headers: this.headers }
    ).subscribe({
      next: () => {
        this.cerrarModal();
        this.mostrarToast('✅ Contraseña actualizada');
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.formError = err.error?.error || 'Error al cambiar contraseña';
        this.guardando = false;
        this.cdr.markForCheck();
      }
    });
  }

  desactivarUsuario() {
    this.guardando = true;
    const id = this.usuarioSeleccionado!.id;
    this.http.delete(`${this.base}/admin/usuarios/${id}`, { headers: this.headers })
      .subscribe({
        next: () => {
          const u = this.usuarios.find(x => x.id === id);
          if (u) u.activo = false;
          this.cerrarModal();
          this.mostrarToast('✅ Usuario desactivado');
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.formError = err.error?.error || 'Error al desactivar';
          this.guardando = false;
          this.cdr.markForCheck();
        }
      });
  }

  // ── CORREGIDO: mostrarToast con NgZone y ChangeDetectorRef ────────────────
  mostrarToast(msg: string) {
    this.ngZone.run(() => {
      this.toastMsg = msg;
      this.cdr.markForCheck();
      setTimeout(() => {
        this.toastMsg = '';
        this.cdr.markForCheck();
      }, 3000);
    });
  }
}