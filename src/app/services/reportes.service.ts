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
  private readonly MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

  getPartesPorMes(mes: number, anio: number, estacionId?: string): Observable<any[]> {
    let url = `${this.API_URL}/operaciones?mes=${mes}&anio=${anio}`;
    if (estacionId) url += `&estacion_id=${estacionId}`;
    return this.http.get<any[]>(url);
  }

  exportarExcel(partes: any[], mes: number, anio: number, estacion: string) {
    try {
      // Validar que haya datos
      if (!partes || partes.length === 0) {
        alert('No hay datos para exportar');
        return;
      }

      // 1. HOJA DE PRODUCCIÓN DIARIA
      const produccionData = partes.map(p => ({
        'Fecha': this.formatearFecha(p.fecha_folio),
        'Estación': p.estacion?.nombre || 'Sin estación',
        'Totalizador Inicial': p.totalizador_inicial || 0,
        'Totalizador Final': p.totalizador_final || 0,
        'Producción (m³)': p.produccion_calculada || 0
      }));

      // Agregar fila de totales en producción
      const totalProduccion = partes.reduce((sum, p) => sum + (p.produccion_calculada || 0), 0);
      produccionData.push({
        'Fecha': 'TOTAL',
        'Estación': '',
        'Totalizador Inicial': '',
        'Totalizador Final': '',
        'Producción (m³)': totalProduccion
      });

      // 2. HOJA DE HORAS DE BOMBEO
      const bombeosData: any[] = [];
      let totalHoras = 0;

      partes.forEach(p => {
        if (p.detallesBombeo && Array.isArray(p.detallesBombeo)) {
          p.detallesBombeo.forEach((b: any) => {
            const horas = b.horas_bombeo || 0;
            totalHoras += horas;

            bombeosData.push({
              'Fecha': this.formatearFecha(p.fecha_folio),
              'Estación': p.estacion?.nombre || 'Sin estación',
              'Bomba': b.bomba?.nombre || 'Sin nombre',
              'Encendido': this.formatearHora(b.encendido),
              'Apagado': this.formatearHora(b.apagado),
              'Horómetro Inicial': b.horometro_inicial || 0,
              'Horómetro Final': b.horometro_final || 0,
              'Horas Bombeo': horas
            });
          });
        }
      });

      // Agregar fila de totales en bombeos
      if (bombeosData.length > 0) {
        bombeosData.push({
          'Fecha': 'TOTAL',
          'Estación': '',
          'Bomba': '',
          'Encendido': '',
          'Apagado': '',
          'Horómetro Inicial': '',
          'Horómetro Final': '',
          'Horas Bombeo': totalHoras
        });
      }

      // 3. CREAR WORKBOOK
      const wb = XLSX.utils.book_new();
      const ws1 = XLSX.utils.json_to_sheet(produccionData);
      const ws2 = XLSX.utils.json_to_sheet(bombeosData);

      // Ajustar ancho de columnas
      ws1['!cols'] = [
        { wch: 15 }, // Fecha
        { wch: 20 }, // Estación
        { wch: 18 }, // Totalizador Inicial
        { wch: 18 }, // Totalizador Final
        { wch: 15 }  // Producción
      ];

      ws2['!cols'] = [
        { wch: 15 }, // Fecha
        { wch: 20 }, // Estación
        { wch: 20 }, // Bomba
        { wch: 12 }, // Encendido
        { wch: 12 }, // Apagado
        { wch: 18 }, // Horómetro Inicial
        { wch: 18 }, // Horómetro Final
        { wch: 15 }  // Horas Bombeo
      ];

      XLSX.utils.book_append_sheet(wb, ws1, 'Producción Diaria');
      XLSX.utils.book_append_sheet(wb, ws2, 'Horas de Bombeo');

      // 4. DESCARGAR ARCHIVO
      const nombreArchivo = `Reporte_${estacion}_${this.MESES[mes-1]}_${anio}.xlsx`;
      XLSX.writeFile(wb, nombreArchivo);

      console.log(`✓ Excel exportado: ${nombreArchivo}`);
      console.log(`  - Registros de producción: ${produccionData.length - 1}`);
      console.log(`  - Registros de bombeo: ${bombeosData.length - 1}`);

    } catch (error) {
      console.error('Error al exportar Excel:', error);
      alert('Error al generar el archivo Excel');
    }
  }

  // MÉTODO AUXILIAR: Formatear fecha
  private formatearFecha(fecha: any): string {
    try {
      if (!fecha) return '';
      const date = new Date(fecha);
      return date.toLocaleDateString('es-PE', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit' 
      });
    } catch (e) {
      return fecha;
    }
  }

  // MÉTODO AUXILIAR: Formatear hora
  private formatearHora(hora: any): string {
    try {
      if (!hora) return '';
      const date = new Date(hora);
      return date.toLocaleTimeString('es-PE', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false
      });
    } catch (e) {
      return hora;
    }
  }
}