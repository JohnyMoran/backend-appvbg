// src/app/pages/lugares/lugares.component.ts
import { Component, OnInit, NgZone, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { SidebarComponent } from '../../shared/components/sidebar/sidebar.component';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';

type Tab   = 'lugares' | 'emergencias';
type Modal = null | 'lugar-form' | 'emergencia-form' | 'confirm-delete' | 'icono-upload';

interface Lugar {
  id: string; nombre: string; ciudad: string; tipo: string;
  direccion: string; telefono: string; whatsapp: string; horario: string;
  descripcion: string; icono: string; icono_url: string | null;
  latitud: number | null; longitud: number | null; activo: boolean;
}
interface Emergencia {
  id: string; nombre: string; numero: string; horario: string;
  descripcion: string; icono_nombre: string;
  prioridad: boolean; orden: number; activo: boolean;
}

const LUGAR_VACIO: Lugar = {
  id:'', nombre:'', ciudad:'Tumaco', tipo:'salud',
  direccion:'', telefono:'', whatsapp:'', horario:'', descripcion:'',
  icono:'salud', icono_url: null, latitud:null, longitud:null, activo:true
};
const EMERGENCIA_VACIA: Emergencia = {
  id:'', nombre:'', numero:'', horario:'24 horas',
  descripcion:'', icono_nombre:'alert-circle-outline',
  prioridad:false, orden:99, activo:true
};

@Component({
  selector: 'app-lugares',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, SidebarComponent],
  template: `
    <div class="layout">
      <app-sidebar></app-sidebar>

      <main class="main">

        <div class="page-header">
          <div>
            <h2>Lugares y Emergencias</h2>
            <p>Gestiona los centros de atención y números de emergencia de la app</p>
          </div>
        </div>

        <!-- Tabs -->
        <div class="tabs">
          <button class="tab" [class.active]="tab === 'lugares'" (click)="setTab('lugares')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
            Lugares de atención
            <span class="tab-badge">{{ lugares.length }}</span>
          </button>
          <button class="tab" [class.active]="tab === 'emergencias'" (click)="setTab('emergencias')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
            </svg>
            Números de emergencia
            <span class="tab-badge">{{ emergencias.length }}</span>
          </button>
        </div>

        <!-- Toolbar -->
        <div class="toolbar">
          <div class="filters" *ngIf="tab === 'lugares'">
            <select [(ngModel)]="filtroTipo" (ngModelChange)="filtrar()">
              <option value="">Todos los tipos</option>
              <option value="salud">Salud</option>
              <option value="protección">Protección</option>
              <option value="justicia">Justicia</option>
              <option value="ministerio_publico">Ministerio Público</option>
              <option value="duplas">Duplas de atención</option>
            </select>
            <select [(ngModel)]="filtroCiudad" (ngModelChange)="filtrar()">
              <option value="">Todas las ciudades</option>
              <option value="Tumaco">Tumaco</option>
              <option value="Buenaventura">Buenaventura</option>
            </select>
            <input type="text" [(ngModel)]="filtroBuscar"
                   (ngModelChange)="filtrar()"
                   placeholder="Buscar por nombre…" />
          </div>
          <div class="filters" *ngIf="tab === 'emergencias'">
            <input type="text" [(ngModel)]="filtroEmergenciaBuscar"
                   (ngModelChange)="filtrarEmergencias()"
                   placeholder="Buscar por nombre o número…" />
          </div>
          <button class="btn-add" (click)="abrirFormNuevo()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            {{ tab === 'lugares' ? 'Nuevo lugar' : 'Nuevo número' }}
          </button>
        </div>

        <div class="error-banner" *ngIf="errorMsg">⚠️ {{ errorMsg }}</div>
        <div class="loading-wrap" *ngIf="cargando">
          <div class="spinner"></div><p>Cargando...</p>
        </div>

        <!-- ═══ TABLA LUGARES ══════════════════════════════════════════════ -->
        <div class="table-wrap" *ngIf="!cargando && tab === 'lugares'">
          <table class="data-table">
            <thead>
              <tr>
                <th>Icono</th><th>Nombre</th><th>Ciudad</th><th>Tipo</th>
                <th>Teléfono</th><th>WhatsApp</th><th>Horario</th>
                <th>Estado</th><th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let l of lugaresFiltrados; trackBy: trackById" [class.inactivo]="!l.activo">
                <td>
                  <div class="icono-cell">
                    <img *ngIf="l.icono_url" [src]="apiBase + l.icono_url" class="icono-thumb"
                         [title]="'Icono de ' + l.nombre" (error)="onIconoError($event)" />
                    <span *ngIf="!l.icono_url" class="icono-badge" [class]="'icono-' + l.icono">
                      {{ iconoLetra(l.icono) }}
                    </span>
                    <button class="btn-icono-upload" (click)="abrirSubirIcono(l)" title="Cambiar ícono">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="17 8 12 3 7 8"/>
                        <line x1="12" y1="3" x2="12" y2="15"/>
                      </svg>
                    </button>
                  </div>
                </td>
                <td>
                  <div class="cell-nombre">
                    <span class="tipo-dot" [class]="'dot-' + l.tipo"></span>
                    <span>{{ l.nombre }}</span>
                  </div>
                </td>
                <td><span class="ciudad-pill">{{ l.ciudad }}</span></td>
                <td><span class="tipo-label" [class]="'tipo-' + l.tipo">{{ formatTipo(l.tipo) }}</span></td>
                <td class="cell-telefono">{{ l.telefono || '—' }}</td>
                <td class="cell-telefono">
                  <span *ngIf="l.whatsapp" class="wpp-chip">
                    <svg viewBox="0 0 24 24" fill="currentColor" class="wpp-icon">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    {{ l.whatsapp }}
                  </span>
                  <span *ngIf="!l.whatsapp">—</span>
                </td>
                <td class="cell-horario">{{ l.horario || '—' }}</td>
                <td>
                  <span class="status-pill" [class.active]="l.activo">
                    {{ l.activo ? 'Activo' : 'Inactivo' }}
                  </span>
                </td>
                <td>
                  <div class="actions">
                    <button class="btn-icon btn-edit" (click)="editarLugar(l)" title="Editar">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>
                    <button class="btn-icon btn-toggle" [class.btn-activate]="!l.activo"
                            (click)="toggleActivo(l.id)" [title]="l.activo ? 'Desactivar' : 'Activar'">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path *ngIf="l.activo"  d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22"/>
                        <path *ngIf="!l.activo" d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle *ngIf="!l.activo" cx="12" cy="12" r="3"/>
                      </svg>
                    </button>
                    <button class="btn-icon btn-delete"
                            (click)="confirmarEliminar('lugar', l.id, l.nombre)" title="Eliminar">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
              <tr *ngIf="!lugaresFiltrados.length">
                <td colspan="9" class="empty-row">Sin resultados</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- ═══ TABLA EMERGENCIAS ═════════════════════════════════════════ -->
        <div class="table-wrap" *ngIf="!cargando && tab === 'emergencias'">
          <table class="data-table">
            <thead>
              <tr>
                <th>Orden</th><th>Nombre</th><th>Número</th><th>Horario</th>
                <th>Prioridad</th><th>Estado</th><th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let e of emergenciasFiltradas; trackBy: trackById" [class.inactivo]="!e.activo">
                <td><span class="orden-num">{{ e.orden }}</span></td>
                <td>
                  <div class="cell-nombre">
                    <span class="emergencia-icon">{{ getEmergenciaEmoji(e.icono_nombre) }}</span>
                    {{ e.nombre }}
                  </div>
                </td>
                <td><strong class="numero-tel">{{ e.numero }}</strong></td>
                <td>{{ e.horario }}</td>
                <td>
                  <span class="priority-pill" [class.high]="e.prioridad">
                    {{ e.prioridad ? '⭐ Alta' : 'Normal' }}
                  </span>
                </td>
                <td>
                  <span class="status-pill" [class.active]="e.activo">
                    {{ e.activo ? 'Activo' : 'Inactivo' }}
                  </span>
                </td>
                <td>
                  <div class="actions">
                    <button class="btn-icon btn-edit" (click)="editarEmergencia(e)" title="Editar">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>
                    <button class="btn-icon btn-toggle" [class.btn-activate]="!e.activo"
                            (click)="toggleActivoEmergencia(e.id)"
                            [title]="e.activo ? 'Desactivar' : 'Activar'">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path *ngIf="e.activo"  d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22"/>
                        <path *ngIf="!e.activo" d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle *ngIf="!e.activo" cx="12" cy="12" r="3"/>
                      </svg>
                    </button>
                    <button class="btn-icon btn-delete"
                            (click)="confirmarEliminar('emergencia', e.id, e.nombre)" title="Eliminar">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
              <tr *ngIf="!emergenciasFiltradas.length">
                <td colspan="7" class="empty-row">Sin resultados</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- ═══ MODAL: FORM LUGAR ════════════════════════════════════════ -->
        <div class="modal-overlay" *ngIf="modal === 'lugar-form'" (click)="cerrarModal()">
          <div class="modal" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3>{{ editandoId ? 'Editar lugar' : 'Nuevo lugar' }}</h3>
              <button class="modal-close" (click)="cerrarModal()">✕</button>
            </div>
            <div class="modal-body">
              <div class="form-grid">
                <div class="field" *ngIf="!editandoId">
                  <label>ID único <span class="req">*</span></label>
                  <input [(ngModel)]="formLugar.id" placeholder="ej: hospital_san_andres" />
                  <small>Solo letras, números y guion bajo.</small>
                </div>
                <div class="field">
                  <label>Nombre <span class="req">*</span></label>
                  <input [(ngModel)]="formLugar.nombre" placeholder="Nombre del lugar" />
                </div>
                <div class="field">
                  <label>Ciudad <span class="req">*</span></label>
                  <select [(ngModel)]="formLugar.ciudad">
                    <option value="Tumaco">Tumaco</option>
                    <option value="Buenaventura">Buenaventura</option>
                  </select>
                </div>
                <div class="field">
                  <label>Tipo <span class="req">*</span></label>
                  <select [(ngModel)]="formLugar.tipo">
                    <option value="salud">Salud</option>
                    <option value="protección">Protección</option>
                    <option value="justicia">Justicia</option>
                    <option value="ministerio_publico">Ministerio Público</option>
                    <option value="duplas">Duplas de atención</option>
                  </select>
                </div>
                <div class="field full">
                  <label>Dirección</label>
                  <input [(ngModel)]="formLugar.direccion" placeholder="Calle, barrio, referencia…" />
                </div>
                <div class="field">
                  <label>Teléfono</label>
                  <textarea [(ngModel)]="formLugar.telefono"
                            placeholder="Un número por línea" rows="3"></textarea>
                </div>
                <div class="field">
                  <label>WhatsApp</label>
                  <input [(ngModel)]="formLugar.whatsapp" placeholder="ej: 3170820627" />
                </div>
                <div class="field full">
                  <label>Horario</label>
                  <textarea [(ngModel)]="formLugar.horario" rows="3"></textarea>
                </div>
                <div class="field full">
                  <label>Descripción</label>
                  <textarea [(ngModel)]="formLugar.descripcion" rows="3"></textarea>
                </div>
                <div class="field">
                  <label>Latitud</label>
                  <input type="number" step="0.000001" [(ngModel)]="formLugar.latitud" />
                </div>
                <div class="field">
                  <label>Longitud</label>
                  <input type="number" step="0.000001" [(ngModel)]="formLugar.longitud" />
                </div>
                <div class="field">
                  <label>Ícono SVG</label>
                  <select [(ngModel)]="formLugar.icono">
                    <option value="salud">Salud</option>
                    <option value="proteccion">Protección</option>
                    <option value="justicia">Justicia</option>
                    <option value="ministerio_publico">Ministerio Público</option>
                    <option value="default">Default</option>
                  </select>
                </div>
                <div class="field">
                  <label>Estado</label>
                  <label class="toggle-wrap">
                    <input type="checkbox" [(ngModel)]="formLugar.activo" />
                    <span class="toggle-label">{{ formLugar.activo ? 'Activo' : 'Inactivo' }}</span>
                  </label>
                </div>
              </div>
              <div class="form-error" *ngIf="formError">⚠️ {{ formError }}</div>
            </div>
            <div class="modal-footer">
              <button class="btn-cancel" (click)="cerrarModal()">Cancelar</button>
              <button class="btn-save" (click)="guardarLugar()" [disabled]="guardando">
                <span *ngIf="guardando" class="btn-spinner"></span>
                {{ guardando ? 'Guardando…' : (editandoId ? 'Actualizar' : 'Crear lugar') }}
              </button>
            </div>
          </div>
        </div>

        <!-- ═══ MODAL: SUBIR ICONO ════════════════════════════════════════ -->
        <div class="modal-overlay" *ngIf="modal === 'icono-upload'" (click)="cerrarModal()">
          <div class="modal modal-sm" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3>Cambiar ícono — {{ iconoLugarNombre }}</h3>
              <button class="modal-close" (click)="cerrarModal()">✕</button>
            </div>
            <div class="modal-body">
              <div class="icono-actual" *ngIf="iconoUrlActual">
                <p class="icono-actual-label">Ícono actual</p>
                <img [src]="apiBase + iconoUrlActual" class="icono-preview-grande" (error)="onIconoError($event)" />
                <button class="btn-delete-icono" (click)="eliminarIcono()">Eliminar ícono</button>
              </div>
              <div class="upload-zone" [class.has-preview]="iconoPreviewUrl"
                   (click)="fileInput.click()" (dragover)="$event.preventDefault()" (drop)="onDrop($event)">
                <input #fileInput type="file" accept="image/jpeg,image/png,image/svg+xml,image/webp"
                       style="display:none" (change)="onFileSelected($event)" />
                <ng-container *ngIf="!iconoPreviewUrl">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="upload-icon">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/>
                    <line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                  <p class="upload-text">Arrastra o haz clic para seleccionar</p>
                  <p class="upload-hint">JPG, PNG, SVG o WebP · Máx. 2 MB</p>
                </ng-container>
                <ng-container *ngIf="iconoPreviewUrl">
                  <img [src]="iconoPreviewUrl" class="icono-preview-grande" />
                  <p class="upload-hint">{{ iconoArchivoNombre }}</p>
                </ng-container>
              </div>
              <div class="form-error" *ngIf="formError">⚠️ {{ formError }}</div>
            </div>
            <div class="modal-footer">
              <button class="btn-cancel" (click)="cerrarModal()">Cancelar</button>
              <button class="btn-save" (click)="subirIcono()" [disabled]="guardando || !iconoArchivo">
                <span *ngIf="guardando" class="btn-spinner"></span>
                {{ guardando ? 'Subiendo…' : 'Guardar ícono' }}
              </button>
            </div>
          </div>
        </div>

        <!-- ═══ MODAL: FORM EMERGENCIA ═══════════════════════════════════ -->
        <div class="modal-overlay" *ngIf="modal === 'emergencia-form'" (click)="cerrarModal()">
          <div class="modal" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3>{{ editandoId ? 'Editar número' : 'Nuevo número de emergencia' }}</h3>
              <button class="modal-close" (click)="cerrarModal()">✕</button>
            </div>
            <div class="modal-body">
              <div class="form-grid">
                <div class="field" *ngIf="!editandoId">
                  <label>ID único <span class="req">*</span></label>
                  <input [(ngModel)]="formEmergencia.id" placeholder="ej: e-11" />
                </div>
                <div class="field">
                  <label>Nombre <span class="req">*</span></label>
                  <input [(ngModel)]="formEmergencia.nombre" placeholder="ej: Línea de Mujeres" />
                </div>
                <div class="field">
                  <label>Número <span class="req">*</span></label>
                  <input [(ngModel)]="formEmergencia.numero" placeholder="ej: 155" />
                </div>
                <div class="field">
                  <label>Horario</label>
                  <input [(ngModel)]="formEmergencia.horario" placeholder="24 horas" />
                </div>
                <div class="field">
                  <label>Icono (Ionicons)</label>
                  <input [(ngModel)]="formEmergencia.icono_nombre" placeholder="ej: woman-outline" />
                </div>
                <div class="field full">
                  <label>Descripción</label>
                  <textarea [(ngModel)]="formEmergencia.descripcion" rows="3"></textarea>
                </div>
                <div class="field">
                  <label>Orden</label>
                  <input type="number" [(ngModel)]="formEmergencia.orden" min="1" max="999" />
                </div>
                <div class="field">
                  <label>Prioridad alta</label>
                  <label class="toggle-wrap">
                    <input type="checkbox" [(ngModel)]="formEmergencia.prioridad" />
                    <span class="toggle-label">{{ formEmergencia.prioridad ? '⭐ Sí' : 'No' }}</span>
                  </label>
                </div>
                <div class="field">
                  <label>Estado</label>
                  <label class="toggle-wrap">
                    <input type="checkbox" [(ngModel)]="formEmergencia.activo" />
                    <span class="toggle-label">{{ formEmergencia.activo ? 'Activo' : 'Inactivo' }}</span>
                  </label>
                </div>
              </div>
              <div class="form-error" *ngIf="formError">⚠️ {{ formError }}</div>
            </div>
            <div class="modal-footer">
              <button class="btn-cancel" (click)="cerrarModal()">Cancelar</button>
              <button class="btn-save" (click)="guardarEmergencia()" [disabled]="guardando">
                <span *ngIf="guardando" class="btn-spinner"></span>
                {{ guardando ? 'Guardando…' : (editandoId ? 'Actualizar' : 'Crear número') }}
              </button>
            </div>
          </div>
        </div>

        <!-- ═══ MODAL: CONFIRMAR ELIMINACIÓN ══════════════════════════════ -->
        <div class="modal-overlay" *ngIf="modal === 'confirm-delete'" (click)="cerrarModal()">
          <div class="modal modal-sm" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3>Confirmar eliminación</h3>
              <button class="modal-close" (click)="cerrarModal()">✕</button>
            </div>
            <div class="modal-body">
              <p class="confirm-text">
                ¿Desactivar <strong>{{ deleteTarget.nombre }}</strong>?
                El registro no se borrará de la base de datos.
              </p>
            </div>
            <div class="modal-footer">
              <button class="btn-cancel" (click)="cerrarModal()">Cancelar</button>
              <button class="btn-delete-confirm" (click)="ejecutarEliminar()" [disabled]="guardando">
                <span *ngIf="guardando" class="btn-spinner"></span>
                {{ guardando ? 'Procesando…' : 'Sí, desactivar' }}
              </button>
            </div>
          </div>
        </div>

        <div class="toast" [class.visible]="toastVisible">{{ toastMsg }}</div>

      </main>
    </div>
  `,
  styles: [`
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
    :host { display:block; }
    .layout { display:flex; min-height:100vh; background:#f7f4fc; font-family:'DM Sans',sans-serif; }
    .main   { flex:1; padding:32px; overflow-y:auto; min-width:0; }
    .page-header { margin-bottom:24px; }
    .page-header h2 { color:#1a0526; font-size:24px; font-weight:700; margin:0 0 4px; letter-spacing:-0.3px; }
    .page-header p  { color:#82368C; font-size:14px; margin:0; }
    .tabs { display:flex; gap:4px; background:white; border-radius:14px; padding:5px;
            border:1px solid rgba(130,54,140,0.1); margin-bottom:20px;
            box-shadow:0 1px 8px rgba(130,54,140,0.06); width:fit-content; }
    .tab  { display:flex; align-items:center; gap:8px; padding:9px 18px;
            border-radius:10px; border:none; cursor:pointer; font-size:14px; font-weight:500;
            color:#7a5090; background:transparent; transition:all 0.2s; font-family:'DM Sans',sans-serif; }
    .tab svg { width:16px; height:16px; }
    .tab:hover { background:#f5eefa; }
    .tab.active { background:linear-gradient(135deg,#82368C,#801AD3); color:white; }
    .tab-badge { background:rgba(255,255,255,0.25); padding:1px 7px; border-radius:10px; font-size:11px; font-weight:700; }
    .tab:not(.active) .tab-badge { background:rgba(130,54,140,0.12); color:#82368C; }
    .toolbar { display:flex; align-items:center; gap:10px; margin-bottom:16px; flex-wrap:wrap; }
    .filters { display:flex; gap:8px; flex:1; flex-wrap:wrap; }
    .filters select, .filters input {
      padding:9px 12px; border:1.5px solid rgba(130,54,140,0.2);
      border-radius:10px; font-size:13px; background:white; color:#1a0526;
      outline:none; font-family:'DM Sans',sans-serif; transition:border-color 0.2s; }
    .filters input { flex:1; min-width:180px; }
    .filters select:focus, .filters input:focus { border-color:#82368C; }
    .btn-add { display:flex; align-items:center; gap:6px; background:linear-gradient(135deg,#82368C,#801AD3);
               color:white; border:none; padding:10px 18px; border-radius:12px; font-size:14px;
               font-weight:600; cursor:pointer; transition:opacity 0.2s; font-family:'DM Sans',sans-serif; white-space:nowrap; }
    .btn-add svg { width:16px; height:16px; }
    .btn-add:hover { opacity:0.9; }
    .error-banner { background:#fff0f5; border:1px solid rgba(243,26,115,0.2); color:#c41158;
                    padding:12px 18px; border-radius:12px; margin-bottom:16px; font-size:14px; }
    .loading-wrap { display:flex; align-items:center; gap:12px; padding:40px; color:#82368C; }
    .spinner { width:32px; height:32px; border:3px solid rgba(130,54,140,0.15);
               border-top-color:#82368C; border-radius:50%; animation:spin 0.8s linear infinite; }
    @keyframes spin { to { transform:rotate(360deg); } }
    .table-wrap { background:white; border-radius:18px; overflow:hidden;
                  box-shadow:0 1px 20px rgba(130,54,140,0.06); border:1px solid rgba(130,54,140,0.07); }
    .data-table { width:100%; border-collapse:collapse; font-size:13px; }
    .data-table thead tr { background:#faf7ff; border-bottom:2px solid rgba(130,54,140,0.1); }
    .data-table th { padding:12px 16px; text-align:left; font-weight:700; color:#5a3070;
                     font-size:12px; text-transform:uppercase; letter-spacing:0.5px; }
    .data-table td { padding:12px 16px; border-bottom:1px solid rgba(130,54,140,0.06);
                     color:#1a0526; vertical-align:middle; }
    .data-table tr:last-child td { border-bottom:none; }
    .data-table tr:hover td { background:#fdfaff; }
    .data-table tr.inactivo td { opacity:0.5; }
    .empty-row { text-align:center; color:#b09ac0; font-style:italic; padding:32px !important; }
    .icono-cell { display:flex; align-items:center; gap:6px; }
    .icono-thumb { width:36px; height:36px; border-radius:8px; object-fit:contain;
                   border:1px solid rgba(130,54,140,0.15); background:#faf7ff; padding:2px; }
    .icono-badge { width:36px; height:36px; border-radius:8px; display:flex; align-items:center;
                   justify-content:center; font-size:13px; font-weight:700; flex-shrink:0; }
    .icono-salud { background:#f0fdf4; color:#065f46; }
    .icono-proteccion { background:#f5eefa; color:#5b1f72; }
    .icono-justicia { background:#fff0f5; color:#9d1050; }
    .icono-ministerio_publico { background:#f3e8ff; color:#6b21a8; }
    .icono-default, .icono-duplas { background:#f5eefa; color:#82368C; }
    .btn-icono-upload { width:24px; height:24px; border-radius:6px; border:1px solid rgba(130,54,140,0.2);
                        background:white; cursor:pointer; display:flex; align-items:center;
                        justify-content:center; color:#82368C; transition:all 0.2s; flex-shrink:0; }
    .btn-icono-upload svg { width:12px; height:12px; }
    .btn-icono-upload:hover { background:#82368C; color:white; border-color:#82368C; }
    .cell-nombre { display:flex; align-items:center; gap:8px; font-weight:500; }
    .tipo-dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; }
    .dot-salud { background:#7ED842; }
    .dot-protección, .dot-proteccion { background:#801AD3; }
    .dot-justicia { background:#F31A73; }
    .dot-ministerio_publico { background:#82368C; }
    .dot-duplas { background:#FFED00; border:1px solid #c8b800; }
    .ciudad-pill { background:#f5eefa; color:#82368C; padding:3px 9px; border-radius:8px; font-size:12px; font-weight:600; }
    .tipo-label { padding:3px 9px; border-radius:8px; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.4px; }
    .tipo-salud { background:#f0fdf4; color:#065f46; }
    .tipo-protección, .tipo-proteccion { background:#f5eefa; color:#5b1f72; }
    .tipo-justicia { background:#fff0f5; color:#9d1050; }
    .tipo-ministerio_publico { background:#f3e8ff; color:#6b21a8; }
    .tipo-duplas { background:#fffce0; color:#92610a; }
    .cell-telefono { font-family:monospace; font-size:12px; white-space:pre-line; color:#5a3070; }
    .cell-horario  { font-size:12px; white-space:pre-line; color:#7a5090; max-width:150px; }
    .status-pill { padding:4px 10px; border-radius:8px; font-size:11px; font-weight:700; background:#f3f4f6; color:#6b7280; }
    .status-pill.active { background:#f0fdf4; color:#065f46; }
    .priority-pill { padding:4px 10px; border-radius:8px; font-size:11px; font-weight:600; background:#f3f4f6; color:#6b7280; }
    .priority-pill.high { background:#fffce0; color:#92610a; border:1px solid rgba(255,237,0,0.5); }
    .emergencia-icon { font-size:18px; }
    .orden-num { font-weight:700; color:#82368C; background:#f5eefa; padding:2px 8px; border-radius:6px; font-size:12px; }
    .numero-tel { font-family:monospace; font-size:15px; color:#1a0526; letter-spacing:0.5px; }
    .wpp-chip { display:inline-flex; align-items:center; gap:4px; background:#f0fdf4;
                color:#065f46; padding:3px 8px; border-radius:8px; font-size:12px; font-weight:600; }
    .wpp-icon { width:12px; height:12px; fill:#25D366; }
    .actions { display:flex; gap:4px; }
    .btn-icon { width:30px; height:30px; border-radius:8px; border:none; cursor:pointer;
                display:flex; align-items:center; justify-content:center; transition:all 0.2s; }
    .btn-icon svg { width:14px; height:14px; }
    .btn-edit { background:#f5eefa; color:#82368C; }
    .btn-edit:hover { background:#82368C; color:white; }
    .btn-toggle { background:#fff0f5; color:#F31A73; }
    .btn-toggle:hover { background:#F31A73; color:white; }
    .btn-activate { background:#f0fdf4; color:#065f46; }
    .btn-activate:hover { background:#065f46; color:white; }
    .btn-delete { background:#fef2f2; color:#b91c1c; }
    .btn-delete:hover { background:#b91c1c; color:white; }
    .modal-overlay { position:fixed; inset:0; background:rgba(10,0,20,0.6);
                     backdrop-filter:blur(4px); display:flex; align-items:center;
                     justify-content:center; z-index:1000; padding:16px; }
    .modal { background:white; border-radius:24px; width:100%; max-width:640px;
             max-height:90vh; display:flex; flex-direction:column; box-shadow:0 24px 80px rgba(0,0,0,0.3); }
    .modal-sm { max-width:440px; }
    .modal-header { display:flex; justify-content:space-between; align-items:center;
                    padding:22px 28px 18px; border-bottom:1px solid rgba(130,54,140,0.1); }
    .modal-header h3 { color:#1a0526; font-size:18px; font-weight:700; margin:0; }
    .modal-close { background:none; border:none; cursor:pointer; font-size:18px; color:#b09ac0;
                   width:30px; height:30px; border-radius:8px; display:flex; align-items:center;
                   justify-content:center; transition:all 0.2s; }
    .modal-close:hover { background:#f5eefa; color:#82368C; }
    .modal-body { padding:24px 28px; overflow-y:auto; flex:1; }
    .modal-footer { padding:18px 28px 22px; border-top:1px solid rgba(130,54,140,0.1);
                    display:flex; justify-content:flex-end; gap:10px; }
    .icono-actual { display:flex; flex-direction:column; align-items:center; gap:10px;
                    margin-bottom:20px; padding:16px; background:#faf7ff;
                    border-radius:14px; border:1px solid rgba(130,54,140,0.1); }
    .icono-actual-label { font-size:12px; font-weight:600; color:#7a5090; margin:0; text-transform:uppercase; letter-spacing:0.5px; }
    .icono-preview-grande { width:80px; height:80px; object-fit:contain; border-radius:12px;
                            border:1px solid rgba(130,54,140,0.15); background:white; padding:4px; }
    .btn-delete-icono { display:flex; align-items:center; gap:6px; background:#fff0f5; color:#c41158;
                        border:1px solid rgba(243,26,115,0.2); padding:6px 12px; border-radius:8px;
                        font-size:12px; font-weight:600; cursor:pointer; font-family:'DM Sans',sans-serif; transition:all 0.2s; }
    .btn-delete-icono:hover { background:#F31A73; color:white; border-color:#F31A73; }
    .upload-zone { border:2px dashed rgba(130,54,140,0.25); border-radius:16px; padding:32px 20px;
                   display:flex; flex-direction:column; align-items:center; gap:10px;
                   cursor:pointer; transition:all 0.2s; text-align:center; background:#fdfaff; }
    .upload-zone:hover, .upload-zone.has-preview { border-color:#82368C; background:#f5eefa; }
    .upload-icon { width:40px; height:40px; color:#82368C; opacity:0.6; }
    .upload-text { font-size:14px; font-weight:500; color:#5a3070; margin:0; }
    .upload-hint { font-size:12px; color:#b09ac0; margin:0; }
    .form-grid { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
    .field { display:flex; flex-direction:column; gap:5px; }
    .field.full { grid-column:1 / -1; }
    .field label { font-size:13px; font-weight:600; color:#5a3070; }
    .field input, .field select, .field textarea {
      padding:10px 12px; border:1.5px solid rgba(130,54,140,0.2);
      border-radius:10px; font-size:14px; color:#1a0526; background:white;
      font-family:'DM Sans',sans-serif; outline:none; transition:border-color 0.2s; resize:vertical; }
    .field input:focus, .field select:focus, .field textarea:focus { border-color:#82368C; }
    .field small { font-size:11px; color:#b09ac0; }
    .req { color:#F31A73; }
    .toggle-wrap { display:flex; align-items:center; gap:8px; cursor:pointer; }
    .toggle-wrap input[type=checkbox] { width:16px; height:16px; accent-color:#82368C; cursor:pointer; }
    .toggle-label { font-size:14px; color:#1a0526; }
    .form-error { background:#fff0f5; border:1px solid rgba(243,26,115,0.2); color:#c41158;
                  padding:10px 14px; border-radius:10px; margin-top:12px; font-size:13px; }
    .confirm-text { color:#1a0526; font-size:15px; line-height:1.5; margin:0; }
    .btn-cancel { padding:10px 20px; background:#f5eefa; color:#82368C; border:none;
                  border-radius:12px; font-size:14px; font-weight:600; cursor:pointer; font-family:'DM Sans',sans-serif; }
    .btn-save { display:flex; align-items:center; gap:8px; padding:10px 24px;
                background:linear-gradient(135deg,#82368C,#801AD3); color:white; border:none;
                border-radius:12px; font-size:14px; font-weight:600; cursor:pointer;
                font-family:'DM Sans',sans-serif; transition:opacity 0.2s; }
    .btn-save:disabled { opacity:0.5; cursor:not-allowed; }
    .btn-delete-confirm { display:flex; align-items:center; gap:8px; padding:10px 24px;
                          background:#F31A73; color:white; border:none; border-radius:12px;
                          font-size:14px; font-weight:600; cursor:pointer; font-family:'DM Sans',sans-serif; }
    .btn-delete-confirm:disabled { opacity:0.5; cursor:not-allowed; }
    .btn-spinner { width:14px; height:14px; border:2px solid rgba(255,255,255,0.4);
                   border-top-color:white; border-radius:50%; animation:spin 0.7s linear infinite; }
    .toast { position:fixed; bottom:28px; right:28px; background:#1a0526; color:white;
             padding:12px 20px; border-radius:12px; font-size:14px; font-weight:500;
             transform:translateY(20px); opacity:0; pointer-events:none; transition:all 0.3s; z-index:2000; }
    .toast.visible { transform:translateY(0); opacity:1; }
    @media (max-width:700px) {
      .main { padding:16px; }
      .form-grid { grid-template-columns:1fr; }
      .modal { max-height:95vh; }
    }
  `]
})
export class LugaresComponent implements OnInit {
  tab:   Tab   = 'lugares';
  modal: Modal = null;

  lugares:    Lugar[]      = [];
  emergencias: Emergencia[] = [];
  lugaresFiltrados:     Lugar[]      = [];
  emergenciasFiltradas: Emergencia[] = [];

  filtroTipo    = '';
  filtroCiudad  = '';
  filtroBuscar  = '';
  filtroEmergenciaBuscar = '';

  formLugar:      Lugar      = { ...LUGAR_VACIO };
  formEmergencia: Emergencia = { ...EMERGENCIA_VACIA };
  editandoId  = '';
  formError   = '';
  guardando   = false;
  cargando    = false;
  errorMsg    = '';
  toastMsg     = '';
  toastVisible = false;

  deleteTarget = { tipo: '', id: '', nombre: '' };

  iconoLugarId     = '';
  iconoLugarNombre = '';
  iconoUrlActual:     string | null = null;
  iconoArchivo:       File | null   = null;
  iconoPreviewUrl:    string | null = null;
  iconoArchivoNombre = '';

  readonly apiBase = environment.apiUrl.replace('/api', '');
  private base = environment.apiUrl;

  // ── Guarda IDs que tienen un PATCH en vuelo para no duplicar peticiones ──
  private toggling = new Set<string>();

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.cargarLugares();
    this.cargarEmergencias();
  }

  setTab(t: Tab) { this.tab = t; this.cerrarModal(); }

  // ── trackBy para *ngFor — evita que Angular destruya/recree filas ─────────
  trackById(_index: number, item: { id: string }): string {
    return item.id;
  }

  // ── Carga ─────────────────────────────────────────────────────────────────
  cargarLugares() {
    this.cargando = true;
    this.http.get<Lugar[]>(`${this.base}/admin/lugares`).subscribe({
      next: (data) => {
        this.lugares = data;
        this.filtrar();
        this.cargando = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.errorMsg = 'Error al cargar lugares';
        this.cargando = false;
        this.cdr.markForCheck();
      }
    });
  }

  cargarEmergencias() {
    this.http.get<Emergencia[]>(`${this.base}/admin/emergencias`).subscribe({
      next: (data) => {
        this.emergencias = data;
        this.filtrarEmergencias();
        this.cdr.markForCheck();
      },
      error: () => {}
    });
  }

  // ── Filtros ───────────────────────────────────────────────────────────────
  filtrar() {
    this.lugaresFiltrados = this.lugares.filter(l => {
      const okTipo   = !this.filtroTipo   || l.tipo   === this.filtroTipo;
      const okCiudad = !this.filtroCiudad || l.ciudad === this.filtroCiudad;
      const q = this.filtroBuscar.toLowerCase();
      const okBuscar = !q || l.nombre.toLowerCase().includes(q) || (l.direccion || '').toLowerCase().includes(q);
      return okTipo && okCiudad && okBuscar;
    });
  }

  filtrarEmergencias() {
    const q = this.filtroEmergenciaBuscar.toLowerCase();
    this.emergenciasFiltradas = this.emergencias.filter(e =>
      !q || e.nombre.toLowerCase().includes(q) || e.numero.includes(q)
    );
  }

  // ── Toggle activo lugar — recibe ID, no el objeto del *ngFor ─────────────
  toggleActivo(id: string) {
    if (this.toggling.has(id)) return;          // evita doble click
    const lugar = this.lugares.find(x => x.id === id);
    if (!lugar) return;

    const nuevoEstado = !lugar.activo;
    this.toggling.add(id);

    this.http.patch(`${this.base}/admin/lugares/${id}`, { activo: nuevoEstado }).subscribe({
      next: () => {
        lugar.activo = nuevoEstado;
        this.toggling.delete(id);
        this.filtrar();
        this.mostrarToast(nuevoEstado ? '✅ Lugar activado' : '✅ Lugar desactivado');
        this.cdr.markForCheck();
      },
      error: () => {
        this.toggling.delete(id);
        this.mostrarToast('⚠️ Error al cambiar estado');
      }
    });
  }

  // ── Toggle activo emergencia — recibe ID, no el objeto del *ngFor ─────────
  toggleActivoEmergencia(id: string) {
    if (this.toggling.has(id)) return;
    const emergencia = this.emergencias.find(x => x.id === id);
    if (!emergencia) return;

    const nuevoEstado = !emergencia.activo;
    this.toggling.add(id);

    this.http.patch(`${this.base}/admin/emergencias/${id}`, { activo: nuevoEstado }).subscribe({
      next: () => {
        emergencia.activo = nuevoEstado;
        this.toggling.delete(id);
        this.filtrarEmergencias();
        this.mostrarToast(nuevoEstado ? '✅ Activado' : '✅ Desactivado');
        this.cdr.markForCheck();
      },
      error: () => {
        this.toggling.delete(id);
        this.mostrarToast('⚠️ Error al cambiar estado');
      }
    });
  }

  // ── Abrir formularios ─────────────────────────────────────────────────────
  abrirFormNuevo() {
    this.editandoId = '';
    this.formError  = '';
    if (this.tab === 'lugares') {
      this.formLugar = { ...LUGAR_VACIO };
      this.modal = 'lugar-form';
    } else {
      this.formEmergencia = { ...EMERGENCIA_VACIA };
      this.modal = 'emergencia-form';
    }
  }

  editarLugar(l: Lugar) {
    this.editandoId = l.id;
    this.formLugar  = { ...l };
    this.formError  = '';
    this.modal = 'lugar-form';
  }

  editarEmergencia(e: Emergencia) {
    this.editandoId     = e.id;
    this.formEmergencia = { ...e };
    this.formError      = '';
    this.modal = 'emergencia-form';
  }

  confirmarEliminar(tipo: string, id: string, nombre: string) {
    this.deleteTarget = { tipo, id, nombre };
    this.modal = 'confirm-delete';
  }

  // ── Modal subir icono ─────────────────────────────────────────────────────
  abrirSubirIcono(l: Lugar) {
    this.iconoLugarId       = l.id;
    this.iconoLugarNombre   = l.nombre;
    this.iconoUrlActual     = l.icono_url ?? null;
    this.iconoArchivo       = null;
    this.iconoPreviewUrl    = null;
    this.iconoArchivoNombre = '';
    this.formError          = '';
    this.modal = 'icono-upload';
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) this.procesarArchivo(input.files[0]);
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    const file = event.dataTransfer?.files[0];
    if (file) this.procesarArchivo(file);
  }

  private procesarArchivo(file: File) {
    const permitidos = ['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp'];
    if (!permitidos.includes(file.type)) { this.formError = 'Solo JPG, PNG, SVG o WebP.'; return; }
    if (file.size > 2 * 1024 * 1024)    { this.formError = 'El archivo supera 2 MB.'; return; }
    this.formError          = '';
    this.iconoArchivo       = file;
    this.iconoArchivoNombre = file.name;
    const reader = new FileReader();
    reader.onload = (e) => {
      this.iconoPreviewUrl = e.target?.result as string;
      this.cdr.markForCheck();
    };
    reader.readAsDataURL(file);
  }

  subirIcono() {
    if (!this.iconoArchivo) return;
    this.guardando = true;
    this.formError = '';
    const formData = new FormData();
    formData.append('icono_file', this.iconoArchivo);
    this.http.post<{ ok: boolean; icono_url: string }>(
      `${this.base}/admin/lugares/${this.iconoLugarId}/icono`, formData
    ).subscribe({
      next: (res) => {
        const lugar = this.lugares.find(l => l.id === this.iconoLugarId);
        if (lugar) lugar.icono_url = res.icono_url;
        this.filtrar();
        this.cerrarModal();
        this.mostrarToast('✅ Ícono actualizado');
      },
      error: (err) => {
        this.formError = err.error?.error || 'Error al subir';
        this.guardando = false;
      }
    });
  }

  eliminarIcono() {
    this.guardando = true;
    this.http.delete(`${this.base}/admin/lugares/${this.iconoLugarId}/icono`).subscribe({
      next: () => {
        const lugar = this.lugares.find(l => l.id === this.iconoLugarId);
        if (lugar) lugar.icono_url = null;
        this.iconoUrlActual = null;
        this.filtrar();
        this.guardando = false;
        this.mostrarToast('✅ Ícono eliminado');
        this.cerrarModal();
      },
      error: () => { this.guardando = false; }
    });
  }

  onIconoError(event: Event) {
    (event.target as HTMLImageElement).style.display = 'none';
  }

  cerrarModal() {
    this.modal           = null;
    this.formError       = '';
    this.guardando       = false;
    this.iconoArchivo    = null;
    this.iconoPreviewUrl = null;
    this.cdr.markForCheck();
  }

  // ── Guardar lugar ─────────────────────────────────────────────────────────
  guardarLugar() {
    if (!this.formLugar.nombre?.trim()) { this.formError = 'El nombre es obligatorio.'; return; }
    if (!this.editandoId && !this.formLugar.id?.trim()) { this.formError = 'El ID es obligatorio.'; return; }
    this.guardando = true;
    this.formError = '';
    const url = this.editandoId
      ? `${this.base}/admin/lugares/${this.editandoId}`
      : `${this.base}/admin/lugares`;
    const req = this.editandoId
      ? this.http.put<any>(url, this.formLugar)
      : this.http.post<any>(url, this.formLugar);
    req.subscribe({
      next: () => {
        this.guardando = false;
        if (this.editandoId) {
          const idx = this.lugares.findIndex(l => l.id === this.editandoId);
          if (idx >= 0) this.lugares[idx] = { ...this.formLugar };
          this.filtrar();
        } else {
          this.cargarLugares();
        }
        this.cerrarModal();
        this.mostrarToast(this.editandoId ? '✅ Lugar actualizado' : '✅ Lugar creado');
      },
      error: (err) => {
        this.formError = err.error?.error || 'Error al guardar';
        this.guardando = false;
      }
    });
  }

  // ── Guardar emergencia ────────────────────────────────────────────────────
  guardarEmergencia() {
    if (!this.formEmergencia.nombre?.trim()) { this.formError = 'El nombre es obligatorio.'; return; }
    if (!this.formEmergencia.numero?.trim()) { this.formError = 'El número es obligatorio.'; return; }
    if (!this.editandoId && !this.formEmergencia.id?.trim()) { this.formError = 'El ID es obligatorio.'; return; }
    this.guardando = true;
    this.formError = '';
    const url = this.editandoId
      ? `${this.base}/admin/emergencias/${this.editandoId}`
      : `${this.base}/admin/emergencias`;
    const req = this.editandoId
      ? this.http.put<any>(url, this.formEmergencia)
      : this.http.post<any>(url, this.formEmergencia);
    req.subscribe({
      next: () => {
        this.guardando = false;
        if (this.editandoId) {
          const idx = this.emergencias.findIndex(e => e.id === this.editandoId);
          if (idx >= 0) this.emergencias[idx] = { ...this.formEmergencia };
          this.filtrarEmergencias();
        } else {
          this.cargarEmergencias();
        }
        this.cerrarModal();
        this.mostrarToast(this.editandoId ? '✅ Número actualizado' : '✅ Número creado');
      },
      error: (err) => {
        this.formError = err.error?.error || 'Error al guardar';
        this.guardando = false;
      }
    });
  }

  // ── Eliminar ──────────────────────────────────────────────────────────────
  ejecutarEliminar() {
    this.guardando = true;
    const { tipo, id } = this.deleteTarget;
    const url = tipo === 'lugar'
      ? `${this.base}/admin/lugares/${id}`
      : `${this.base}/admin/emergencias/${id}`;
    this.http.delete(url).subscribe({
      next: () => {
        if (tipo === 'lugar') {
          const l = this.lugares.find(x => x.id === id);
          if (l) l.activo = false;
          this.filtrar();
        } else {
          const e = this.emergencias.find(x => x.id === id);
          if (e) e.activo = false;
          this.filtrarEmergencias();
        }
        this.cerrarModal();
        this.mostrarToast('✅ Desactivado correctamente');
      },
      error: () => {
        this.guardando = false;
        this.cerrarModal();
        this.mostrarToast('⚠️ Error al desactivar');
      }
    });
  }

  // ── Toast — usa NgZone para que el setTimeout no rompa NgZone ────────────
  mostrarToast(msg: string) {
    this.ngZone.run(() => {
      this.toastMsg     = msg;
      this.toastVisible = true;
      this.cdr.markForCheck();
      setTimeout(() => {
        this.toastVisible = false;
        this.toastMsg     = '';
        this.cdr.markForCheck();
      }, 3000);
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  formatTipo(tipo: string): string {
    const map: Record<string, string> = {
      'salud':'Salud','protección':'Protección','justicia':'Justicia',
      'ministerio_publico':'Min. Público','duplas':'Duplas',
    };
    return map[tipo] || tipo;
  }

  iconoLetra(icono: string): string {
    const map: Record<string, string> = {
      'salud':'S','proteccion':'P','justicia':'J',
      'ministerio_publico':'M','duplas':'D','default':'?',
    };
    return map[icono] || icono.charAt(0).toUpperCase();
  }

  getEmergenciaEmoji(iconName: string): string {
    const map: Record<string, string> = {
      'woman-outline':'👩','home-outline':'🏠','people-outline':'👥',
      'shield-checkmark-outline':'🛡️','scale-outline':'⚖️',
      'alert-circle-outline':'🚨','heart-outline':'💙','phone-outline':'📞',
    };
    return map[iconName] || '📞';
  }

  logout() { this.authService.logout(); }
}