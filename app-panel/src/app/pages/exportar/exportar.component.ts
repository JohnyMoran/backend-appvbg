// src/app/pages/exportar/exportar.component.ts
import { Component, OnInit, NgZone, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';
import { SidebarComponent } from '../../shared/components/sidebar/sidebar.component';
import { environment } from '../../../environments/environment';

type Dataset = 'perfiles' | 'violencias' | 'solicitudes';

@Component({
  selector: 'app-exportar',
  standalone: true,
  imports: [CommonModule, RouterModule, SidebarComponent],
  template: `
    <div class="layout">
      <app-sidebar></app-sidebar>

      <main class="main">
        <div class="page-header">
          <div>
            <h2>Exportar datos</h2>
            <p>Descarga los datos recopilados en formato CSV o HTML/PDF</p>
          </div>
        </div>

        <div class="loading-wrap" *ngIf="cargandoConteos">
          <div class="spinner"></div>
          <p>Verificando datos disponibles...</p>
        </div>

        <ng-container *ngIf="!cargandoConteos">

          <!-- Exportar todo -->
          <div class="export-hero">
            <div class="export-hero-left">
              <div class="hero-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
              </div>
              <div>
                <h3>Exportar todos los datos</h3>
                <p>Un único documento con perfiles, tipos de violencia y solicitudes de ayuda.</p>
                <span class="total-badge">{{ totalRegistros }} registros en total</span>
              </div>
            </div>
            <div class="export-actions">
              <button class="btn-csv" (click)="exportarTodo('csv')"
                      [disabled]="cargando === 'todo-csv' || totalRegistros === 0">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
                {{ cargando === 'todo-csv' ? 'Generando...' : 'Todo en CSV' }}
              </button>
              <button class="btn-pdf" (click)="exportarTodo('pdf')"
                      [disabled]="cargando === 'todo-pdf' || totalRegistros === 0">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                  <polyline points="10 9 9 9 8 9"/>
                </svg>
                {{ cargando === 'todo-pdf' ? 'Generando...' : 'Todo en PDF' }}
              </button>
            </div>
          </div>

          <div class="divider"><span>o por sección</span></div>

          <!-- Cards individuales -->
          <div class="export-grid">

            <div class="export-card">
              <div class="ec-icon ec-purple">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              </div>
              <h4>Perfiles de usuarias</h4>
              <p>Región, zona, grupo étnico, edad y situación laboral.</p>
              <div class="ec-count">{{ conteos.perfiles }} registros</div>
              <div class="ec-actions">
                <button class="btn-csv sm" (click)="exportar('perfiles','csv')"
                        [disabled]="cargando === 'perfiles-csv' || conteos.perfiles === 0">
                  {{ cargando === 'perfiles-csv' ? '⏳' : 'CSV' }}
                </button>
                <button class="btn-pdf sm" (click)="exportar('perfiles','pdf')"
                        [disabled]="cargando === 'perfiles-pdf' || conteos.perfiles === 0">
                  {{ cargando === 'perfiles-pdf' ? '⏳' : 'PDF' }}
                </button>
              </div>
              <p class="sin-datos" *ngIf="conteos.perfiles === 0">Sin datos aún</p>
            </div>

            <div class="export-card">
              <div class="ec-icon ec-pink">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="11" cy="11" r="8"/>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
              </div>
              <h4>Tipos de violencia</h4>
              <p>8 tipos consultados por las usuarias en el carrusel.</p>
              <div class="ec-count">{{ conteos.violencias }} registros</div>
              <div class="ec-actions">
                <button class="btn-csv sm" (click)="exportar('violencias','csv')"
                        [disabled]="cargando === 'violencias-csv' || conteos.violencias === 0">
                  {{ cargando === 'violencias-csv' ? '⏳' : 'CSV' }}
                </button>
                <button class="btn-pdf sm" (click)="exportar('violencias','pdf')"
                        [disabled]="cargando === 'violencias-pdf' || conteos.violencias === 0">
                  {{ cargando === 'violencias-pdf' ? '⏳' : 'PDF' }}
                </button>
              </div>
              <p class="sin-datos" *ngIf="conteos.violencias === 0">Sin datos aún</p>
            </div>

            <div class="export-card">
              <div class="ec-icon ec-green">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
              </div>
              <h4>Solicitudes de ayuda</h4>
              <p>Las 5 preguntas de necesidad: médica, denuncia, agresor, hijos, derechos.</p>
              <div class="ec-count">{{ conteos.solicitudes }} registros</div>
              <div class="ec-actions">
                <button class="btn-csv sm" (click)="exportar('solicitudes','csv')"
                        [disabled]="cargando === 'solicitudes-csv' || conteos.solicitudes === 0">
                  {{ cargando === 'solicitudes-csv' ? '⏳' : 'CSV' }}
                </button>
                <button class="btn-pdf sm" (click)="exportar('solicitudes','pdf')"
                        [disabled]="cargando === 'solicitudes-pdf' || conteos.solicitudes === 0">
                  {{ cargando === 'solicitudes-pdf' ? '⏳' : 'PDF' }}
                </button>
              </div>
              <p class="sin-datos" *ngIf="conteos.solicitudes === 0">Sin datos aún</p>
            </div>

          </div>

        </ng-container>

        <div class="msg msg-error"   *ngIf="error">⚠️ {{ error }}</div>
        <div class="msg msg-success" *ngIf="exito">✅ {{ exito }}</div>

        <div class="note">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="note-icon">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <p>Los datos exportados no contienen información personal identificable.
             Cada registro usa únicamente un ID anónimo de dispositivo.</p>
        </div>
      </main>
    </div>
  `,
  styles: [`
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');

    :host { display: block; }

    .layout {
      display: flex; min-height: 100vh;
      background: #f7f4fc;
      font-family: 'DM Sans', sans-serif;
    }
    .main { flex: 1; padding: 32px; overflow-y: auto; min-width: 0; }

    .page-header { margin-bottom: 28px; }
    .page-header h2 { color: #1a0526; font-size: 24px; font-weight: 700; margin: 0 0 4px; letter-spacing: -0.3px; }
    .page-header p  { color: #82368C; font-size: 14px; margin: 0; }

    .loading-wrap {
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      min-height: 40vh; gap: 16px; color: #82368C;
    }
    .spinner {
      width: 40px; height: 40px;
      border: 3px solid rgba(130,54,140,0.15);
      border-top-color: #82368C;
      border-radius: 50%; animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* Hero export */
    .export-hero {
      background: white;
      border: 1px solid rgba(130,54,140,0.1);
      border-radius: 20px;
      padding: 28px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 24px;
      margin-bottom: 24px;
      box-shadow: 0 1px 20px rgba(130,54,140,0.06);
    }
    .export-hero-left { display: flex; align-items: center; gap: 18px; }
    .hero-icon {
      width: 52px; height: 52px;
      background: linear-gradient(135deg, #82368C, #801AD3);
      border-radius: 16px;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .hero-icon svg { width: 24px; height: 24px; color: white; }
    .export-hero-left h3 { color: #1a0526; font-size: 17px; font-weight: 700; margin: 0 0 4px; }
    .export-hero-left p  { color: #6b7280; font-size: 14px; margin: 0 0 8px; }
    .total-badge {
      background: #f5eefa;
      border: 1px solid rgba(130,54,140,0.2);
      color: #82368C;
      padding: 3px 10px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
    }
    .export-actions { display: flex; gap: 10px; flex-shrink: 0; }

    /* Buttons */
    .btn-csv {
      display: flex; align-items: center; gap: 7px;
      background: #f0fdf4; color: #065f46;
      border: 1.5px solid #86efac;
      padding: 10px 18px; border-radius: 12px;
      font-size: 14px; font-weight: 600;
      cursor: pointer; transition: all 0.2s;
      font-family: 'DM Sans', sans-serif;
    }
    .btn-csv svg { width: 15px; height: 15px; }
    .btn-csv:hover:not(:disabled) { background: #dcfce7; }

    .btn-pdf {
      display: flex; align-items: center; gap: 7px;
      background: #fff5f9; color: #9d1050;
      border: 1.5px solid rgba(243,26,115,0.3);
      padding: 10px 18px; border-radius: 12px;
      font-size: 14px; font-weight: 600;
      cursor: pointer; transition: all 0.2s;
      font-family: 'DM Sans', sans-serif;
    }
    .btn-pdf svg { width: 15px; height: 15px; }
    .btn-pdf:hover:not(:disabled) { background: #ffe4ef; }

    .btn-csv.sm, .btn-pdf.sm { padding: 8px 14px; font-size: 13px; }
    button:disabled { opacity: 0.4; cursor: not-allowed; }

    /* Divider */
    .divider {
      text-align: center; margin: 0 0 24px;
      color: #b09ac0; font-size: 13px;
      display: flex; align-items: center; gap: 12px;
    }
    .divider::before, .divider::after {
      content: ''; flex: 1; height: 1px; background: rgba(130,54,140,0.12);
    }

    /* Export grid */
    .export-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 14px;
      margin-bottom: 24px;
    }
    .export-card {
      background: white;
      border-radius: 18px;
      padding: 22px;
      box-shadow: 0 1px 20px rgba(130,54,140,0.06);
      border: 1px solid rgba(130,54,140,0.07);
    }
    .ec-icon {
      width: 44px; height: 44px;
      border-radius: 14px;
      display: flex; align-items: center; justify-content: center;
      margin-bottom: 14px;
    }
    .ec-icon svg { width: 22px; height: 22px; color: white; }
    .ec-purple { background: linear-gradient(135deg, #82368C, #801AD3); }
    .ec-pink   { background: linear-gradient(135deg, #F31A73, #c01060); }
    .ec-green  { background: linear-gradient(135deg, #7ED842, #5ab520); }

    .export-card h4 { color: #1a0526; font-size: 15px; font-weight: 700; margin: 0 0 6px; }
    .export-card p  { color: #6b7280; font-size: 13px; margin: 0 0 8px; line-height: 1.4; }
    .ec-count { font-size: 13px; color: #82368C; font-weight: 600; margin-bottom: 12px; }
    .ec-actions { display: flex; gap: 8px; }
    .sin-datos { font-size: 12px; color: #b09ac0; font-style: italic; margin: 8px 0 0; }

    /* Messages */
    .msg { padding: 14px 18px; border-radius: 12px; margin-bottom: 16px; font-size: 14px; }
    .msg-error   { background: #fff0f5; border: 1px solid rgba(243,26,115,0.2); color: #c41158; }
    .msg-success { background: #f0fdf4; border: 1px solid rgba(126,216,66,0.3); color: #065f46; }

    /* Note */
    .note {
      background: #f5eefa;
      border: 1px solid rgba(130,54,140,0.12);
      border-radius: 14px;
      padding: 16px 20px;
      display: flex; gap: 12px; align-items: flex-start;
    }
    .note-icon { width: 18px; height: 18px; color: #82368C; flex-shrink: 0; margin-top: 1px; }
    .note p { color: #5a3070; font-size: 13px; margin: 0; line-height: 1.5; }

    @media (max-width: 800px) {
      .export-hero { flex-direction: column; align-items: flex-start; }
      .export-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class ExportarComponent implements OnInit {
  cargando        = '';
  cargandoConteos = false;
  error           = '';
  exito           = '';
  conteos         = { perfiles: 0, violencias: 0, solicitudes: 0 };

  get totalRegistros() {
    return this.conteos.perfiles + this.conteos.violencias + this.conteos.solicitudes;
  }

  constructor(
    private http: HttpClient, 
    private authService: AuthService,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef
  ) {}
  ngOnInit() { this.cargarConteos(); }

  cargarConteos() {
    this.cargandoConteos = true;
    this.cdr.markForCheck();
    const headers = { Authorization: `Bearer ${this.authService.getToken()}` };
    forkJoin({
      perfiles:    this.http.get<any[]>(`${environment.apiUrl}/admin/perfiles/exportar`,    { headers }).pipe(catchError(() => of([]))),
      violencias:  this.http.get<any[]>(`${environment.apiUrl}/admin/violencias/exportar`,  { headers }).pipe(catchError(() => of([]))),
      solicitudes: this.http.get<any[]>(`${environment.apiUrl}/admin/solicitudes/exportar`, { headers }).pipe(catchError(() => of([]))),
    }).subscribe({
      next: ({ perfiles, violencias, solicitudes }) => {
        this.conteos = { perfiles: perfiles.length, violencias: violencias.length, solicitudes: solicitudes.length };
        this.cargandoConteos = false;
        this.cdr.markForCheck();
      },
      error: () => { 
        this.cargandoConteos = false; 
        this.cdr.markForCheck();
      }
    });
  }

  exportar(dataset: Dataset, formato: 'csv' | 'pdf') {
    this.cargando = `${dataset}-${formato}`;
    this.error    = '';
    this.exito    = '';
    const headers = { Authorization: `Bearer ${this.authService.getToken()}` };
    this.http.get<any[]>(`${environment.apiUrl}/admin/${dataset}/exportar`, { headers }).subscribe({
      next: (rows) => {
        if (!rows.length) { this.error = 'No hay datos para exportar.'; this.cargando = ''; return; }
        if (formato === 'csv') this.descargarCSV(rows, dataset);
        else                   this.descargarPDF([{ titulo: this.nombreDataset(dataset), rows }], dataset);
        this.exito = `${this.nombreDataset(dataset)} exportado correctamente`;
        this.cargando = '';
        this.ngZone.run(() => {
          setTimeout(() => {
            this.exito = '';
            this.cdr.markForCheck();
          }, 4000);
        });
      },
      error: () => { this.error = 'Error al obtener los datos.'; this.cargando = ''; }
    });
  }

  exportarTodo(formato: 'csv' | 'pdf') {
    this.cargando = `todo-${formato}`;
    this.error    = '';
    this.exito    = '';
    const headers = { Authorization: `Bearer ${this.authService.getToken()}` };
    forkJoin({
      perfiles:    this.http.get<any[]>(`${environment.apiUrl}/admin/perfiles/exportar`,    { headers }).pipe(catchError(() => of([]))),
      violencias:  this.http.get<any[]>(`${environment.apiUrl}/admin/violencias/exportar`,  { headers }).pipe(catchError(() => of([]))),
      solicitudes: this.http.get<any[]>(`${environment.apiUrl}/admin/solicitudes/exportar`, { headers }).pipe(catchError(() => of([]))),
    }).subscribe({
      next: ({ perfiles, violencias, solicitudes }) => {
        const hayDatos = perfiles.length || violencias.length || solicitudes.length;
        if (!hayDatos) { this.error = 'No hay datos para exportar aún.'; this.cargando = ''; return; }

        if (formato === 'csv') {
          const partes: string[] = [];
          if (perfiles.length)    partes.push(this.armarCSV(perfiles,    'PERFILES DE USUARIAS'));
          if (violencias.length)  partes.push(this.armarCSV(violencias,  'TIPOS DE VIOLENCIA CONSULTADOS'));
          if (solicitudes.length) partes.push(this.armarCSV(solicitudes, 'SOLICITUDES DE AYUDA'));
          const blob = new Blob(['\uFEFF' + partes.join('\n\n')], { type: 'text/csv;charset=utf-8;' });
          this.descargar(blob, `perla_todos_los_datos_${this.fechaArchivo()}.csv`);
        } else {
          const secciones = [
            { titulo: 'Perfiles de usuarias',           rows: perfiles    },
            { titulo: 'Tipos de violencia consultados', rows: violencias  },
            { titulo: 'Solicitudes de ayuda',           rows: solicitudes },
          ].filter(s => s.rows.length > 0);
          this.descargarPDF(secciones, 'todos_los_datos');
        }
        this.exito    = 'Todos los datos exportados correctamente';
        this.cargando = '';
        this.ngZone.run(() => {
          setTimeout(() => {
            this.exito = '';
            this.cdr.markForCheck();
          }, 4000);
        });
      },
      error: () => { this.error = 'Error al obtener los datos.'; this.cargando = ''; }
    });
  }

  // ── Columnas legibles para solicitudes ─────────────────────────────────────
  private traducirColumnasSolicitudes(rows: any[]): any[] {
    return rows.map(r => ({
      id:                          r.id,
      'Atención médica/psicológica': r.atencion_medica     ? 'Sí' : 'No',
      'Quiere presentar denuncia':   r.denuncia            ? 'Sí' : 'No',
      'Agresora es pareja/familia':  r.agresor             ? 'Sí' : 'No',
      'Usa hijos para hacer daño':   r.amenaza_hijos       ? 'Sí' : 'No',
      'Derechos vulnerados':         r.derechos_vulnerados ? 'Sí' : 'No',
      'Lugar redirigido':            r.lugar_redirigido    || 'N/A',
      'Plataforma':                  r.plataforma          || 'N/A',
      'Fecha':                       r.fecha               || r.creado_en,
    }));
  }

  private armarCSV(rows: any[], titulo: string): string {
    if (!rows.length) return '';
    const headers = Object.keys(rows[0]);
    return [
      `# ${titulo}`,
      headers.join(','),
      ...rows.map(row =>
        headers.map(h => {
          const val = row[h] ?? '';
          return typeof val === 'string' && (val.includes(',') || val.includes('"'))
            ? `"${val.replace(/"/g, '""')}"` : val;
        }).join(',')
      )
    ].join('\n');
  }

  private descargarCSV(rows: any[], nombre: string) {
    const data = nombre === 'solicitudes' ? this.traducirColumnasSolicitudes(rows) : rows;
    const blob = new Blob(['\uFEFF' + this.armarCSV(data, this.nombreDataset(nombre as Dataset))],
      { type: 'text/csv;charset=utf-8;' });
    this.descargar(blob, `perla_${nombre}_${this.fechaArchivo()}.csv`);
  }

  private descargarPDF(secciones: { titulo: string; rows: any[] }[], nombre: string) {
    const seccionesHTML = secciones.map(({ titulo, rows }) => {
      if (!rows.length) return '';
      const data    = titulo.toLowerCase().includes('solicitud') ? this.traducirColumnasSolicitudes(rows) : rows;
      const headers = Object.keys(data[0]);
      return `
        <h2>${titulo}</h2>
        <p class="sub">${data.length} registros</p>
        <table>
          <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
          <tbody>
            ${data.map(row => `<tr>${headers.map(h => `<td>${row[h] ?? ''}</td>`).join('')}</tr>`).join('')}
          </tbody>
        </table>`;
    }).join('<div class="sep"></div>');

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Perla — Datos exportados</title>
  <style>
    body  { font-family:'Segoe UI',Arial,sans-serif; padding:28px; color:#1f2937; background:#fff; }
    h1    { color:#82368C; font-size:22px; margin-bottom:4px; }
    h2    { color:#82368C; font-size:17px; margin:32px 0 4px; border-bottom:2px solid #f5eefa; padding-bottom:6px; }
    .sub  { color:#6b7280; font-size:13px; margin:0 0 12px; }
    table { width:100%; border-collapse:collapse; font-size:11px; margin-bottom:16px; }
    th    { background:#f5eefa; color:#82368C; padding:8px; text-align:left; border-bottom:2px solid #e8d8f5; }
    td    { padding:6px 8px; border-bottom:1px solid #f3f4f6; }
    tr:nth-child(even) td { background:#faf7ff; }
    .sep  { height:24px; }
    .footer { margin-top:24px; font-size:11px; color:#9ca3af; border-top:1px solid #e5e7eb; padding-top:12px; }
  </style>
</head>
<body>
  <h1>Perla — Datos exportados</h1>
  <p class="sub">Generado el ${new Date().toLocaleDateString('es-CO', { year:'numeric', month:'long', day:'numeric' })}</p>
  ${seccionesHTML}
  <div class="footer">Perla — Datos anónimos para análisis estadístico</div>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
    this.descargar(blob, `perla_${nombre}_${this.fechaArchivo()}.html`);
  }

  private descargar(blob: Blob, filename: string) {
    const url  = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = filename; link.click();
    URL.revokeObjectURL(url);
  }

  private fechaArchivo(): string { return new Date().toISOString().slice(0, 10); }

  private nombreDataset(d: Dataset): string {
    return { perfiles: 'Perfiles de usuarias', violencias: 'Tipos de violencia', solicitudes: 'Solicitudes de ayuda' }[d] || d;
  }

  logout() { this.authService.logout(); }
}