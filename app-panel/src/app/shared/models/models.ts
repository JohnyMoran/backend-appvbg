export interface Admin {
  id: number;
  nombre: string;
  email: string;
  rol: 'superadmin' | 'admin' | 'viewer';
}

export interface LoginResponse {
  token: string;
  admin: Admin;
}

export interface PerfilesResumen {
  total: number;
  por_region:  { region:  string; total: string }[];
  por_zona:    { zona:    string; total: string }[];
  por_etnia:   { etnia:   string; total: string }[];
  por_edad:    { edad:    string; total: string }[];
  por_laboral: { laboral: string; total: string }[];
}

export interface ViolenciasResumen {
  total:    number;
  por_tipo: { tipo_violencia: string; total: string }[];
  por_dia:  { dia: string; total: string }[];
}

export interface SolicitudesResumen {
  total: number;
  necesidades: {
    atencion_medica:     string;
    denuncia:            string;
    agresor:             string;
    amenaza_hijos:       string;
    derechos_vulnerados: string;
  };
  por_lugar: { lugar_redirigido: string; total: string }[];
  por_dia:   { dia: string; total: string }[];
}

export interface EstadisticasDashboard {
  totales: {
    total_perfiles:    string;
    total_solicitudes: string;
    total_violencias:  string;
    total_eventos:     string;
    dispositivos_unicos: string;
  };
  por_evento:     { evento:     string; total: string }[];
  por_plataforma: { plataforma: string; total: string }[];
  por_dia:        { dia: string; total: string }[];
  por_necesita_atencion: { tipo_violencia: string; total: string }[];
}

// ── Lugar administrable ───────────────────────────────────────────────────────
export interface Lugar {
  id:           string;
  nombre:       string;
  ciudad:       'Tumaco' | 'Buenaventura';
  tipo:         'salud' | 'protección' | 'justicia' | 'ministerio_publico' | 'duplas' | 'otro';
  direccion:    string | null;
  telefono:     string | null;
  whatsapp:     string | null;
  horario:      string | null;
  descripcion:  string | null;
  icono:        string | null;       
  icono_url:    string | null;     
  latitud:      number | null;
  longitud:     number | null;
  activo:       boolean;
  creado_en:    string;
  actualizado_en: string;
}

// ── Número de emergencia administrable ────────────────────────────────────────
export interface NumeroEmergencia {
  id:          string;
  nombre:      string;
  numero:      string;
  horario:     string;
  descripcion: string | null;
  icono_nombre: string;
  prioridad:   boolean;
  activo:      boolean;
  orden:       number;
}