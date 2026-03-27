import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment.development';

@Injectable({
  providedIn: 'root'
})
export class EstacionesService {
  private http = inject(HttpClient);
  private readonly API_URL = `${environment.apiUrl}`;

  // ESTACIONES
  getEstaciones(): Observable<any[]> {
    return this.http.get<any[]>(`${this.API_URL}/estaciones`);
  }

  crearEstacion(datos: { nombre: string }): Observable<any> {
    return this.http.post(`${this.API_URL}/estaciones`, datos);
  }

  actualizarEstacion(id: string, datos: { nombre: string }): Observable<any> {
    return this.http.patch(`${this.API_URL}/estaciones/${id}`, datos);
  }

  eliminarEstacion(id: string): Observable<any> {
    return this.http.delete(`${this.API_URL}/estaciones/${id}`);
  }

  // BOMBAS
  crearBomba(estacionId: string, datos: { nombre: string }): Observable<any> {
    return this.http.post(`${this.API_URL}/estaciones/${estacionId}/bombas`, datos);
  }

  actualizarBomba(id: string, datos: any): Observable<any> {
    return this.http.patch(`${this.API_URL}/estaciones/bombas/${id}`, datos);
  }

  eliminarBomba(id: string): Observable<any> {
    return this.http.delete(`${this.API_URL}/estaciones/bombas/${id}`);
  }

  // TABLEROS
  crearTablero(estacionId: string, datos: { nombre: string, tipo: string }): Observable<any> {
    return this.http.post(`${this.API_URL}/estaciones/${estacionId}/tableros`, datos);
  }

  actualizarTablero(id: string, datos: any): Observable<any> {
    return this.http.patch(`${this.API_URL}/estaciones/tableros/${id}`, datos);
  }

  eliminarTablero(id: string): Observable<any> {
    return this.http.delete(`${this.API_URL}/estaciones/tableros/${id}`);
  }
  // ACTIVOS
getTiposActivo(): Observable<any[]> {
  return this.http.get<any[]>(`${this.API_URL}/activos/tipos`);
}

getActivosByEstacion(estacionId: string): Observable<any[]> {
  return this.http.get<any[]>(`${this.API_URL}/activos/estacion/${estacionId}`);
}

crearActivo(datos: any): Observable<any> {
  return this.http.post(`${this.API_URL}/activos`, datos);
}

actualizarActivo(id: string, datos: any): Observable<any> {
  return this.http.put(`${this.API_URL}/activos/${id}`, datos);
}

eliminarActivo(id: string): Observable<any> {
  return this.http.delete(`${this.API_URL}/activos/${id}`);
}
// CAMPOS DE TIPOS DE ACTIVO
getTiposConCampos(): Observable<any[]> {
  return this.http.get<any[]>(`${this.API_URL}/campos/tipos`);
}

getCamposByTipo(tipoActivoId: string): Observable<any[]> {
  return this.http.get<any[]>(`${this.API_URL}/campos/tipo/${tipoActivoId}`);
}

crearCampo(datos: {
  tipo_activo_id: string;
  nombre_campo: string;
  etiqueta: string;
  tipo_input: string;
  requerido: boolean;
  orden: number;
  unidad?: string;
}): Observable<any> {
  return this.http.post(`${this.API_URL}/campos`, datos);
}

actualizarCampo(id: string, datos: any): Observable<any> {
  return this.http.put(`${this.API_URL}/campos/${id}`, datos);
}

eliminarCampo(id: string): Observable<any> {
  return this.http.delete(`${this.API_URL}/campos/${id}`);
}

crearTipoActivo(datos: { nombre: string; codigo: string }): Observable<any> {
  return this.http.post(`${this.API_URL}/activos/tipos`, datos);
}
actualizarTipoActivo(id: string, datos: { nombre: string; codigo: string }): Observable<any> {
  return this.http.put(`${this.API_URL}/activos/tipos/${id}`, datos);
}

eliminarTipoActivo(id: string): Observable<any> {
  return this.http.delete(`${this.API_URL}/activos/tipos/${id}`);
}
}