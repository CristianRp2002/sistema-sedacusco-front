import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment.development';
import * as XLSX from 'xlsx';

@Injectable({
  providedIn: 'root'
})
export class ReportesService {
  private http = inject(HttpClient);
  private readonly API_URL = `${environment.apiUrl}`;

  getPartesPorMes(mes: number, anio: number, estacionId?: string): Observable<any[]> {
    let url = `${this.API_URL}/operaciones?mes=${mes}&anio=${anio}`;
    if (estacionId) url += `&estacion_id=${estacionId}`;
    return this.http.get<any[]>(url);
  }

  exportarExcel(partes: any[], mes: number, anio: number, estacion: string) {
    const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

    const produccionData = partes.map(p => ({
      'Fecha': new Date(p.fecha_folio).toLocaleDateString('es-PE'),
      'Estación': p.estacion?.nombre,
      'Totalizador Inicial': p.totalizador_inicial,
      'Totalizador Final': p.totalizador_final,
      'Producción (m³)': p.produccion_calculada
    }));

    const bombeosData: any[] = [];
    partes.forEach(p => {
      p.detallesBombeo?.forEach((b: any) => {
        bombeosData.push({
          'Fecha': new Date(p.fecha_folio).toLocaleDateString('es-PE'),
          'Bomba': b.bomba?.nombre,
          'Encendido': new Date(b.encendido).toLocaleTimeString('es-PE', {hour: '2-digit', minute: '2-digit'}),
          'Apagado': new Date(b.apagado).toLocaleTimeString('es-PE', {hour: '2-digit', minute: '2-digit'}),
          'Horómetro Inicial': b.horometro_inicial,
          'Horómetro Final': b.horometro_final,
          'Horas Bombeo': b.horas_bombeo
        });
      });
    });

    const wb = XLSX.utils.book_new();
    const ws1 = XLSX.utils.json_to_sheet(produccionData);
    const ws2 = XLSX.utils.json_to_sheet(bombeosData);

    XLSX.utils.book_append_sheet(wb, ws1, 'Producción Diaria');
    XLSX.utils.book_append_sheet(wb, ws2, 'Horas de Bombeo');

    XLSX.writeFile(wb, `Reporte_${estacion}_${meses[mes-1]}_${anio}.xlsx`);
  }
}