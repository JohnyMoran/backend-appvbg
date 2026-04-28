// src/app/pages/estadisticas/estadisticas.component.ts
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { SidebarComponent } from '../../shared/components/sidebar/sidebar.component';
import {
  EstadisticasDashboard, SolicitudesResumen, ViolenciasResumen
} from '../../shared/models/models';

@Component({
  selector: 'app-estadisticas',
  standalone: true,
  imports: [CommonModule, RouterModule, SidebarComponent],
  template: `
    <div class="layout">
      <app-sidebar></app-sidebar>

      <main class="main">
        <div class="error-banner" *ngIf="errorMsg">
          <span>⚠️ {{ errorMsg }}</span>
          <button (click)="cargar()">Reintentar</button>
        </div>

        <div class="loading-wrap" *ngIf="cargando && !errorMsg">
          <div class="spinner"></div>
          <p>Cargando estadísticas...</p>
        </div>

        <ng-container *ngIf="!cargando && !errorMsg">

          <div class="page-header">
            <div>
              <h2>Estadísticas de uso</h2>
              <p>Interacciones registradas desde la app Perla</p>
            </div>
            <div class="header-date">{{ hoy | date:'dd/MM/yyyy' }}</div>
          </div>

          <!-- KPIs -->
          <div class="cards">
            <div class="card card-pink">
              <div class="card-top">
                <div class="card-icon-wrap">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                </div>
                <span class="card-badge">Ayuda</span>
              </div>
              <div class="card-num">{{ solicitudes?.total || 0 }}</div>
              <div class="card-label">Solicitudes de ayuda</div>
            </div>

            <div class="card card-green">
              <div class="card-top">
                <div class="card-icon-wrap">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="11" cy="11" r="8"/>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                </div>
                <span class="card-badge">Consultas</span>
              </div>
              <div class="card-num">{{ violencias?.total || 0 }}</div>
              <div class="card-label">Tipos de violencia vistos</div>
            </div>

            <div class="card card-purple">
              <div class="card-top">
                <div class="card-icon-wrap">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
                    <line x1="12" y1="18" x2="12.01" y2="18"/>
                  </svg>
                </div>
                <span class="card-badge">Dispositivos</span>
              </div>
              <div class="card-num">{{ stats?.totales?.dispositivos_unicos || 0 }}</div>
              <div class="card-label">Dispositivos únicos</div>
            </div>

            <div class="card card-yellow">
              <div class="card-top">
                <div class="card-icon-wrap">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                  </svg>
                </div>
                <span class="card-badge">Eventos</span>
              </div>
              <div class="card-num">{{ stats?.totales?.total_eventos || 0 }}</div>
              <div class="card-label">Interacciones en app</div>
            </div>
          </div>

          <!-- ── "¿Necesitas Atención?" por tipo de violencia ── -->
          <div class="section" *ngIf="stats?.por_necesita_atencion?.length">
            <div class="section-header">
              <div class="section-dot dot-pink"></div>
              <h3>Tipo de violencia que llevó a buscar atención</h3>
            </div>
            <div class="bars">
              <div class="bar-item" *ngFor="let v of stats!.por_necesita_atencion">
                <span class="bar-label">{{ formatViolencia(v.tipo_violencia) }}</span>
                <div class="bar-track">
                  <div class="bar-fill fill-pink"
                       [style.width.%]="pct(+v.total, maxVal(stats!.por_necesita_atencion, 'total'))"></div>
                </div>
                <span class="bar-val">{{ v.total }}</span>
              </div>
            </div>
          </div>

          <!-- Necesidades (5 preguntas reales) -->
          <div class="section" *ngIf="solicitudes">
            <div class="section-header">
              <div class="section-dot dot-purple"></div>
              <h3>Motivos de solicitud de ayuda</h3>
            </div>
            <div class="needs-grid" *ngIf="necesidadesArr.length; else sinDatos">
              <div class="need-card" *ngFor="let n of necesidadesArr; let i = index"
                   [class]="'need-card-' + (i % 4)">
                <div class="need-num">{{ n.valor }}</div>
                <div class="need-label">{{ n.label }}</div>
              </div>
            </div>
          </div>

          <!-- Lugar de redirección -->
          <div class="section" *ngIf="solicitudes?.por_lugar?.length">
            <div class="section-header">
              <div class="section-dot dot-green"></div>
              <h3>Lugares de redirección</h3>
            </div>
            <div class="bars">
              <div class="bar-item" *ngFor="let l of solicitudes!.por_lugar">
                <span class="bar-label">{{ formatLugar(l.lugar_redirigido) }}</span>
                <div class="bar-track">
                  <div class="bar-fill fill-green"
                       [style.width.%]="pct(+l.total, maxVal(solicitudes!.por_lugar, 'total'))"></div>
                </div>
                <span class="bar-val">{{ l.total }}</span>
              </div>
            </div>
          </div>

          <!-- Row: Plataforma + Eventos -->
          <div class="row-2" *ngIf="stats">
            <div class="section">
              <div class="section-header">
                <div class="section-dot dot-yellow"></div>
                <h3>Plataforma</h3>
              </div>
              <div class="plat-wrap" *ngIf="stats.por_plataforma.length; else sinDatos">
                <div class="plat-item" *ngFor="let p of stats.por_plataforma">
                  <span class="plat-icon">{{ p.plataforma === 'android' ? '🤖' : p.plataforma === 'ios' ? '🍎' : '🌐' }}</span>
                  <span class="plat-name">{{ p.plataforma | titlecase }}</span>
                  <div class="bar-track">
                    <div class="bar-fill fill-purple"
                         [style.width.%]="pct(+p.total, totalPlataforma)"></div>
                  </div>
                  <span class="bar-val">{{ p.total }}</span>
                </div>
              </div>
            </div>

            <div class="section">
              <div class="section-header">
                <div class="section-dot dot-purple"></div>
                <h3>Eventos principales</h3>
              </div>
              <div class="bars" *ngIf="stats.por_evento.length; else sinDatos">
                <div class="bar-item" *ngFor="let e of stats.por_evento">
                  <span class="bar-label">{{ formatEvento(e.evento) }}</span>
                  <div class="bar-track">
                    <div class="bar-fill fill-purple"
                         [style.width.%]="pct(+e.total, maxEvento)"></div>
                  </div>
                  <span class="bar-val">{{ e.total }}</span>
                </div>
              </div>
            </div>
          </div>

        </ng-container>

        <ng-template #sinDatos>
          <p class="empty-msg">Sin datos aún — se registran cuando las usuarias usan la app</p>
        </ng-template>
      </main>
    </div>
  `,
  styles: [`
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');

    :host { display: block; }

    .layout {
      display: flex;
      min-height: 100vh;
      background: #f7f4fc;
      font-family: 'DM Sans', sans-serif;
    }
    .main { flex: 1; padding: 32px; overflow-y: auto; min-width: 0; }

    .error-banner {
      background: #fff0f5;
      border: 1px solid rgba(243,26,115,0.2);
      color: #c41158;
      padding: 14px 20px;
      border-radius: 14px;
      margin-bottom: 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .error-banner button {
      background: #F31A73; color: white; border: none;
      padding: 7px 14px; border-radius: 8px; cursor: pointer;
      font-size: 13px; font-weight: 600;
    }
    .loading-wrap {
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      min-height: 60vh; gap: 16px; color: #82368C;
    }
    .spinner {
      width: 40px; height: 40px;
      border: 3px solid rgba(130,54,140,0.15);
      border-top-color: #82368C;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    .page-header {
      display: flex; justify-content: space-between;
      align-items: flex-start; margin-bottom: 28px;
    }
    .page-header h2 {
      color: #1a0526; font-size: 24px; font-weight: 700;
      margin: 0 0 4px; letter-spacing: -0.3px;
    }
    .page-header p { color: #82368C; font-size: 14px; margin: 0; }
    .header-date { color: #b09ac0; font-size: 13px; }

    .cards {
      display: grid; grid-template-columns: repeat(4, 1fr);
      gap: 14px; margin-bottom: 20px;
    }
    .card {
      border-radius: 18px; padding: 20px; color: white;
      position: relative; overflow: hidden;
    }
    .card::before {
      content: ''; position: absolute;
      top: -20px; right: -20px;
      width: 80px; height: 80px;
      border-radius: 50%; background: rgba(255,255,255,0.08);
    }
    .card-purple { background: linear-gradient(135deg, #82368C, #801AD3); }
    .card-pink   { background: linear-gradient(135deg, #F31A73, #c01060); }
    .card-green  { background: linear-gradient(135deg, #7ED842, #5ab520); }
    .card-yellow { background: linear-gradient(135deg, #d4b800, #a08c00); }
    .card-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
    .card-icon-wrap {
      width: 36px; height: 36px; background: rgba(255,255,255,0.18);
      border-radius: 10px; display: flex; align-items: center; justify-content: center;
    }
    .card-icon-wrap svg { width: 18px; height: 18px; color: white; }
    .card-badge { background: rgba(255,255,255,0.2); padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; }
    .card-num { font-size: 34px; font-weight: 800; line-height: 1; margin-bottom: 4px; letter-spacing: -1px; }
    .card-label { font-size: 13px; opacity: 0.8; }

    .row-2 {
      display: grid; grid-template-columns: 1fr 1fr;
      gap: 14px; margin-bottom: 14px;
    }
    .section {
      background: white; border-radius: 18px; padding: 22px;
      box-shadow: 0 1px 20px rgba(130,54,140,0.06);
      border: 1px solid rgba(130,54,140,0.07);
      margin-bottom: 14px;
    }
    .section-header { display: flex; align-items: center; gap: 10px; margin-bottom: 18px; }
    .section-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
    .dot-purple { background: #82368C; }
    .dot-pink   { background: #F31A73; }
    .dot-green  { background: #7ED842; }
    .dot-yellow { background: #FFED00; border: 1px solid #c8b800; }
    .section-header h3 { color: #1a0526; font-size: 15px; font-weight: 700; margin: 0; }

    .bars { display: flex; flex-direction: column; gap: 11px; }
    .bar-item { display: flex; align-items: center; gap: 10px; }
    .bar-label { width: 200px; font-size: 13px; color: #5a3070; flex-shrink: 0; }
    .bar-track { flex: 1; background: #f0eaf7; border-radius: 6px; height: 10px; overflow: hidden; }
    .bar-fill { height: 100%; border-radius: 6px; transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1); min-width: 4px; }
    .fill-purple { background: linear-gradient(90deg, #82368C, #801AD3); }
    .fill-pink   { background: linear-gradient(90deg, #F31A73, #ff5fa8); }
    .fill-green  { background: linear-gradient(90deg, #7ED842, #95C11F); }
    .bar-val { width: 28px; text-align: right; font-size: 13px; font-weight: 700; color: #1a0526; }

    /* Need cards */
    .needs-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px;
    }
    .need-card {
      padding: 16px; border-radius: 14px;
      display: flex; flex-direction: column; gap: 6px;
    }
    .need-card-0 { background: #f5eefa; border: 1px solid rgba(130,54,140,0.15); }
    .need-card-1 { background: #fff0f5; border: 1px solid rgba(243,26,115,0.15); }
    .need-card-2 { background: #f2fbea; border: 1px solid rgba(126,216,66,0.25); }
    .need-card-3 { background: #fffce0; border: 1px solid rgba(255,237,0,0.4); }
    .need-num { font-size: 28px; font-weight: 800; color: #1a0526; letter-spacing: -0.5px; }
    .need-label { font-size: 12px; color: #5a3070; line-height: 1.4; }

    /* Plataforma */
    .plat-wrap { display: flex; flex-direction: column; gap: 12px; }
    .plat-item { display: flex; align-items: center; gap: 10px; }
    .plat-icon { font-size: 20px; width: 28px; }
    .plat-name { width: 70px; font-size: 13px; color: #5a3070; font-weight: 600; }

    .empty-msg { color: #c4aad8; font-size: 13px; font-style: italic; padding: 8px 0; }

    @media (max-width: 1100px) {
      .cards { grid-template-columns: 1fr 1fr; }
      .row-2 { grid-template-columns: 1fr; }
    }
  `]
})
export class EstadisticasComponent implements OnInit {
  stats:       EstadisticasDashboard | null = null;
  solicitudes: SolicitudesResumen | null    = null;
  violencias:  ViolenciasResumen | null     = null;
  cargando  = false;
  errorMsg  = '';
  hoy       = new Date();
  necesidadesArr: { label: string; valor: number }[] = [];

  get maxNecesidad()    { return Math.max(...this.necesidadesArr.map(n => n.valor), 1); }
  get totalPlataforma() { return this.stats?.por_plataforma.reduce((s, p) => s + +p.total, 0) || 1; }
  get maxEvento()       { return Math.max(...(this.stats?.por_evento.map(e => +e.total) || [1]), 1); }

  constructor(private api: ApiService, private authService: AuthService, private cdr: ChangeDetectorRef) {}
  ngOnInit() { this.cargar(); }

  cargar() {
    this.cargando = true;
    this.errorMsg = '';
    this.cdr.markForCheck();
    forkJoin({
      stats:       this.api.getEstadisticas().pipe(catchError(() => of(null))),
      solicitudes: this.api.getSolicitudesResumen().pipe(catchError(() => of(null))),
      violencias:  this.api.getViolenciasResumen().pipe(catchError(() => of(null))),
    }).subscribe({
      next: ({ stats, solicitudes, violencias }) => {
        this.stats       = stats;
        this.solicitudes = solicitudes;
        this.violencias  = violencias;
        if (solicitudes?.necesidades) {
          const n = solicitudes.necesidades;
          // ── 5 preguntas reales de ServicesScreen ──────────────
          this.necesidadesArr = [
            { label: 'Atención médica / psicológica urgente', valor: +n.atencion_medica     },
            { label: 'Quiere presentar una denuncia',         valor: +n.denuncia            },
            { label: 'Agresora es pareja o familia',          valor: +n.agresor             },
            { label: 'Agresora usa hijos para dañarla',      valor: +n.amenaza_hijos       },
            { label: 'Derechos vulnerados en la atención',   valor: +n.derechos_vulnerados },
          ];
        }
        this.cargando = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.errorMsg = 'No se pudieron cargar las estadísticas.';
        this.cargando = false;
        this.cdr.markForCheck();
      }
    });
  }

  maxVal(arr: any[], key: string): number {
    return Math.max(...arr.map(i => +i[key]), 1);
  }

  pct(val: number, max: number): number {
    return max > 0 ? Math.round((val / max) * 100) : 0;
  }

  formatViolencia(tipo: string): string {
    const map: Record<string, string> = {
      'fisica':      'Violencia Física',
      'sexual':      'Violencia Sexual',
      'psicologica': 'Violencia Psicológica',
      'economica':   'Violencia Económica',
      'patrimonial': 'Violencia Patrimonial',
      'digital':     'Violencia Digital',
      'vicaria':     'Violencia Vicaria',
      'prejuicios':  'Violencia por Prejuicios',
    };
    return map[tipo] || tipo;
  }

  formatEvento(evento: string): string {
    const map: Record<string, string> = {
      'abrir_app':            'Abrió la app',
      'ver_tipo_violencia':   'Vio tipo de violencia',
      'abrir_info_violencia': 'Leyó info de violencia',
      'necesita_atencion':    '¿Necesitas Atención? presionado',
      'solicitar_ayuda':      'Solicitó ayuda',
      'ver_emergencias':      'Vio emergencias',
      'llamar_emergencia':    'Llamó a emergencias',
      'activar_camuflaje':    'Activó camuflaje',
      'ver_configuracion':    'Vio configuración',
      'enviar_solicitud':     'Envió solicitud',
    };
    return map[evento] || evento;
  }

  formatLugar(lugar: string): string {
    const map: Record<string, string> = {
      'salud':                               'Centro de salud',
      'justicia':                            'Fiscalía / Justicia',
      'proteccion':                          'Comisaría / Protección',
      'ministerio_publico':                  'Ministerio Público',
      'hospital_san_andres':                 'Hospital San Andrés (Tumaco)',
      'hospital_luis_ablanque_distrital':    'Hospital Luis Ablanque (Buenaventura)',
      'fiscalia_tumaco':                     'Fiscalía Tumaco',
      'fiscalia_buenaventura':               'Fiscalía Buenaventura',
      'comisaria_tumaco':                    'Comisaría Tumaco',
      'comisaria_buenaventura':              'Comisaría Buenaventura',
      'icbf_tumaco':                         'ICBF Tumaco',
      'icbf_buenaventura':                   'ICBF Buenaventura',
      'defensoria_del_pueblo_tumaco':        'Defensoría Tumaco',
      'defensoria_del_pueblo_buenaventura':  'Defensoría Buenaventura',
      'dupla_tumaco':                       'Dupla de Atención Tumaco',
      'dupla_buenaventura':                 'Dupla de Atención Buenaventura',
      'sin_redireccion':                     'Sin redirección',
      'otro':                                'Otro',
    };
    return map[lugar] || lugar;
  }

  logout() { this.authService.logout(); }
}