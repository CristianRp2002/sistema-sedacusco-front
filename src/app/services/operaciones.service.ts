import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class OperacionesService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  getPartes(mes?: number, anio?: number, estacion_id?: string) {
    let params = new HttpParams();
    if (mes) params = params.set('mes', mes.toString());
    if (anio) params = params.set('anio', anio.toString());
    if (estacion_id) params = params.set('estacion_id', estacion_id);
    return this.http.get<any[]>(`${this.apiUrl}/operaciones`, { params });
  }

  getPartePorId(id: string) {
    return this.http.get<any>(`${this.apiUrl}/operaciones/${id}`);
  }

  crearParte(payload: any) {
    return this.http.post(`${this.apiUrl}/operaciones`, payload);
  }

  eliminarParte(id: string) {
    return this.http.delete<any>(`${this.apiUrl}/operaciones/${id}`);
  }
  descargarPdf(parteId: string) {
    return this.http.get(`${this.apiUrl}/pdf/parte/${parteId}`, {
      responseType: 'blob'
    }).subscribe(blob => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Parte_${parteId}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    });
  }
}