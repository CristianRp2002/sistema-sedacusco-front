import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment.development';

@Injectable({
  providedIn: 'root'
})
export class PartesService {
  private http = inject(HttpClient);
  private readonly API_URL = `${environment.apiUrl}`;

  getPartes(): Observable<any[]> {
    return this.http.get<any[]>(`${this.API_URL}/operaciones`);
  }

  getPartePorId(id: string): Observable<any> {
    return this.http.get<any>(`${this.API_URL}/operaciones/${id}`);
  }

  eliminarParte(id: string): Observable<any> {
    return this.http.delete(`${this.API_URL}/operaciones/${id}`);
  }
}