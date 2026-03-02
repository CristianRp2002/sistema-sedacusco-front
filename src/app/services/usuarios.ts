import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment.development';

@Injectable({
  providedIn: 'root'
})
export class UsuariosService {
  private http = inject(HttpClient);
  private readonly API_URL = `${environment.apiUrl}`;

  getUsuarios(): Observable<any[]> {
    return this.http.get<any[]>(`${this.API_URL}/users`);
  }

  getRoles(): Observable<any[]> {
    return this.http.get<any[]>(`${this.API_URL}/roles`);
  }

  crearUsuario(datos: any): Observable<any> {
    return this.http.post(`${this.API_URL}/users`, datos);
  }

  actualizarUsuario(id: string, datos: any): Observable<any> {
    return this.http.patch(`${this.API_URL}/users/${id}`, datos);
  }

  toggleEstado(id: string, activo: boolean): Observable<any> {
    return this.http.patch(`${this.API_URL}/users/${id}`, { activo });
  }

  eliminarUsuario(id: string): Observable<any> {
    return this.http.delete(`${this.API_URL}/users/${id}`);
  }
}