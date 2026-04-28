import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  EstadisticasDashboard, PerfilesResumen,
  ViolenciasResumen, SolicitudesResumen
} from '../../shared/models/models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private base = environment.apiUrl;
  constructor(private http: HttpClient) {}

  getEstadisticas(): Observable<EstadisticasDashboard> {
    return this.http.get<EstadisticasDashboard>(`${this.base}/admin/estadisticas`);
  }

  getPerfilesResumen(): Observable<PerfilesResumen> {
    return this.http.get<PerfilesResumen>(`${this.base}/admin/perfiles/resumen`);
  }

  getViolenciasResumen(): Observable<ViolenciasResumen> {
    return this.http.get<ViolenciasResumen>(`${this.base}/admin/violencias/resumen`);
  }

  getSolicitudesResumen(): Observable<SolicitudesResumen> {
    return this.http.get<SolicitudesResumen>(`${this.base}/admin/solicitudes/resumen`);
  }
}