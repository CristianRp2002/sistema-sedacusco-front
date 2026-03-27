import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class OperacionesService {
  private http = inject(HttpClient);
  private readonly API_URL = `${environment.apiUrl}`;

  getPartes(mes?: number, anio?: number, estacion_id?: string): Observable<any[]> {
    let params = new HttpParams();
    if (mes)         params = params.set('mes', mes.toString());
    if (anio)        params = params.set('anio', anio.toString());
    if (estacion_id) params = params.set('estacion_id', estacion_id);
    return this.http.get<any[]>(`${this.API_URL}/operaciones`, { params });
  }

  getPartePorId(id: string): Observable<any> {
    return this.http.get<any>(`${this.API_URL}/operaciones/${id}`);
  }

  crearParte(payload: any): Observable<any> {
    return this.http.post(`${this.API_URL}/operaciones`, payload);
  }

  actualizarParte(id: string, payload: any): Observable<any> {
    return this.http.patch(`${this.API_URL}/operaciones/${id}`, payload);
  }

  eliminarParte(id: string): Observable<any> {
    return this.http.delete<any>(`${this.API_URL}/operaciones/${id}`);
  }

  descargarPdf(parteId: string): Observable<Blob> {
    return this.http.get(`${this.API_URL}/pdf/parte/${parteId}`, {
      responseType: 'blob'
    });
  }
}