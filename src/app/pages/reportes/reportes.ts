import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReportesService } from '../../services/reportes.service';
import { EstacionesService } from '../../services/estaciones.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent],
  templateUrl: './reportes.html',
  styleUrl: './reportes.css'
})
export class Reportes implements OnInit {
  private reportesService = inject(ReportesService);
  private estacionesService = inject(EstacionesService);
  private cdr = inject(ChangeDetectorRef);

  partes: any[] = [];
  estaciones: any[] = [];
  buscado = false;
  cargando = false;

  meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  anios = [2024, 2025, 2026];

  mesSeleccionado  = new Date().getMonth() + 1;
  anioSeleccionado = new Date().getFullYear();
  estacionSeleccionada = '';

  get totalProduccion() {
    return this.partes.reduce((sum, p) => sum + Number(p.produccion_calculada || 0), 0);
  }
  get totalHoras() {
    return this.partes.reduce((sum, p) => sum + this.getHorasBombeo(p), 0);
  }
  get promedioDiario() {
    return this.partes.length > 0 ? this.totalProduccion / this.partes.length : 0;
  }

  ngOnInit() {
    this.estacionesService.getEstaciones().subscribe({
      next: (data) => {
        this.estaciones = data;
        this.cdr.detectChanges();
        // Carga el reporte del mes actual al iniciar
        this.cargarReporte();
      },
      error: (err: any) => console.error(err)
    });
  }

  cargarReporte() {
    this.cargando = true;
    this.reportesService.getPartesPorMes(
      this.mesSeleccionado,
      this.anioSeleccionado,
      this.estacionSeleccionada || undefined
    ).subscribe({
      next: (data) => {
        this.partes = data;
        this.buscado = true;
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error(err);
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });
  }

  getHorasBombeo(parte: any): number {
    return parte.detallesBombeo?.reduce((sum: number, b: any) => sum + Number(b.horas_bombeo || 0), 0) || 0;
  }

  exportarExcel() {
    const estacion = this.estaciones.find(e => e.id === this.estacionSeleccionada)?.nombre || 'Todas';
    this.reportesService.exportarExcel(this.partes, this.mesSeleccionado, this.anioSeleccionado, estacion);
  }

  formatHora(fecha: string): string {
    if (!fecha) return '';
    return new Date(fecha).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false });
  }

  exportarPDF(parte: any) {
    const url = `${environment.apiUrl}/pdf/parte/${parte.id}`;
    window.open(url, '_blank');
  }
}