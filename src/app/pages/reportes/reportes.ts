import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { ReportesService } from '../../services/reportes.service';
import { EstacionesService } from '../../services/estaciones.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header';
import { environment } from '../../../environments/environment';
import { GraficosBombeoComponent } from '../../shared/components/graficos-bombeo/graficos-bombeo';

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, GraficosBombeoComponent],
  templateUrl: './reportes.html',
  styleUrl: './reportes.css',
  animations: [
    trigger('slideDown', [
      transition(':enter', [
        style({ height: 0, opacity: 0, overflow: 'hidden' }),
        animate('300ms ease-out', style({ height: '*', opacity: 1 }))
      ]),
      transition(':leave', [
        style({ height: '*', opacity: 1, overflow: 'hidden' }),
        animate('300ms ease-in', style({ height: 0, opacity: 0 }))
      ])
    ])
  ]
})
export class Reportes implements OnInit {
  private reportesService = inject(ReportesService);
  private estacionesService = inject(EstacionesService);
  private cdr = inject(ChangeDetectorRef);

  // ── Estado principal ─────────────────────────────────────────────────────
  partes: any[] = [];
  partesAnterior: any[] = [];
  partesFiltradas: any[] = [];
  estaciones: any[] = [];
  buscado = false;
  cargando = false;
  mostrarTablaDetalle = true;
  busquedaTabla: string = '';
  columnaOrden: string = '';
  ordenAscendente: boolean = true;

  meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  anios = [2023, 2024, 2025, 2026];

  mesSeleccionado  = new Date().getMonth() + 1;
  anioSeleccionado = new Date().getFullYear();
  estacionSeleccionada = '';

  // ── Getters básicos ──────────────────────────────────────────────────────
  get totalProduccion() {
    return this.partes.reduce((sum, p) => sum + Number(p.produccion_calculada || 0), 0);
  }

  get totalProduccionAnterior() {
    return this.partesAnterior.reduce((sum, p) => sum + Number(p.produccion_calculada || 0), 0);
  }

  get totalHoras() {
    return this.partes.reduce((sum, p) => sum + this.getHorasBombeo(p), 0);
  }

  get totalHorasAnterior() {
    return this.partesAnterior.reduce((sum, p) => sum + this.getHorasBombeo(p), 0);
  }

  get promedioDiario() {
    return this.partes.length > 0 ? this.totalProduccion / this.partes.length : 0;
  }

  get eficienciaPromedio() {
    return this.totalHoras > 0 ? this.totalProduccion / this.totalHoras : 0;
  }

  // ── Variaciones vs mes anterior ──────────────────────────────────────────
  get variacionProduccion(): number {
    if (this.totalProduccionAnterior === 0) return 0;
    return ((this.totalProduccion - this.totalProduccionAnterior) / this.totalProduccionAnterior) * 100;
  }

  get variacionHoras(): number {
    if (this.totalHorasAnterior === 0) return 0;
    return ((this.totalHoras - this.totalHorasAnterior) / this.totalHorasAnterior) * 100;
  }

  // ── Insights calculados ──────────────────────────────────────────────────
  get mejorDia() {
    if (this.partes.length === 0) {
      return { fecha: new Date(), produccion: 0, horas: 0 };
    }

    const mejor = this.partes.reduce((max, p) => {
      const prod    = Number(p.produccion_calculada || 0);
      const maxProd = Number(max.produccion_calculada || 0);
      return prod > maxProd ? p : max;
    }, this.partes[0]);

    return {
      fecha: mejor.fecha_folio,
      produccion: Number(mejor.produccion_calculada || 0),
      horas: this.getHorasBombeo(mejor)
    };
  }

  get diasConAlerta() {
    return this.partes.filter(p => this.getHorasBombeo(p) < 19);
  }

  get tendenciaTexto(): string {
    const variacion = this.variacionProduccion;
    if (variacion > 10)  return 'Crecimiento Alto';
    if (variacion > 5)   return 'Crecimiento';
    if (variacion > 0)   return 'Crecimiento Leve';
    if (variacion === 0) return 'Estable';
    if (variacion > -5)  return 'Descenso Leve';
    if (variacion > -10) return 'Descenso';
    return 'Descenso Alto';
  }

  get nombreMesActual(): string {
    return this.meses[this.mesSeleccionado - 1];
  }

  get nombreMesAnterior(): string {
    const mesAnt = this.mesSeleccionado === 1 ? 12 : this.mesSeleccionado - 1;
    return this.meses[mesAnt - 1];
  }

  // ── Lifecycle ────────────────────────────────────────────────────────────
  ngOnInit() {
    this.estacionesService.getEstaciones().subscribe({
      next: (data) => {
        this.estaciones = data;
        this.cdr.detectChanges();
        this.cargarReporte();
      },
      error: (err: any) => console.error(err)
    });
  }

  // ── Carga de datos ───────────────────────────────────────────────────────
  cargarReporte() {
    this.cargando = true;

    const mesAnt  = this.mesSeleccionado === 1 ? 12 : this.mesSeleccionado - 1;
    const anioAnt = this.mesSeleccionado === 1 ? this.anioSeleccionado - 1 : this.anioSeleccionado;

    let cargaActual   = false;
    let cargaAnterior = false;

    const verificarListo = () => {
      if (cargaActual && cargaAnterior) {
        this.cargando = false;
        this.cdr.detectChanges();
      }
    };

    // Carga mes actual
    this.reportesService.getPartesPorMes(
      this.mesSeleccionado,
      this.anioSeleccionado,
      this.estacionSeleccionada || undefined
    ).subscribe({
      next: (data) => {
        this.partes          = data;
        this.partesFiltradas = [...data];
        this.busquedaTabla   = '';
        this.buscado         = true;
        cargaActual          = true;
        this.cdr.detectChanges();
        verificarListo();
      },
      error: (err: any) => {
        console.error(err);
        cargaActual = true;
        verificarListo();
      }
    });

    // Carga mes anterior
    this.reportesService.getPartesPorMes(
      mesAnt,
      anioAnt,
      this.estacionSeleccionada || undefined
    ).subscribe({
      next: (data) => {
        this.partesAnterior = data;
        cargaAnterior       = true;
        this.cdr.detectChanges();
        verificarListo();
      },
      error: () => {
        this.partesAnterior = [];
        cargaAnterior       = true;
        verificarListo();
      }
    });
  }

  // ── Filtro de tabla ──────────────────────────────────────────────────────
  filtrarTabla() {
    const texto = this.busquedaTabla.toLowerCase();
    this.partesFiltradas = this.partes.filter(p =>
      p.estacion?.nombre?.toLowerCase().includes(texto)
    );
  }

  // Ordenar
  ordenarPor(columna: string) {
  if (this.columnaOrden === columna) {
    this.ordenAscendente = !this.ordenAscendente;
  } else {
    this.columnaOrden = columna;
    this.ordenAscendente = true;
  }

  this.partesFiltradas.sort((a, b) => {
    let valA: any;
    let valB: any;

    if (columna === 'fecha')      { valA = new Date(a.fecha_folio).getTime(); valB = new Date(b.fecha_folio).getTime(); }
    if (columna === 'produccion') { valA = Number(a.produccion_calculada);    valB = Number(b.produccion_calculada); }
    if (columna === 'horas')      { valA = this.getHorasBombeo(a);            valB = this.getHorasBombeo(b); }
    if (columna === 'eficiencia') { valA = this.getEficiencia(a);             valB = this.getEficiencia(b); }

    return this.ordenAscendente ? valA - valB : valB - valA;
  });
}

  // ── Helpers ──────────────────────────────────────────────────────────────
  getHorasBombeo(parte: any): number {
    if (!parte.detallesBombeo || parte.detallesBombeo.length === 0) return 0;

    return parte.detallesBombeo.reduce((sum: number, b: any) => {
      if (!b.encendido || !b.apagado) return sum;
      const encendido = new Date(b.encendido).getTime();
      const apagado   = new Date(b.apagado).getTime();
      const horas     = (apagado - encendido) / (1000 * 60 * 60);
      return sum + horas;
    }, 0);
  }

  getEficiencia(parte: any): number {
    const horas      = this.getHorasBombeo(parte);
    const produccion = Number(parte.produccion_calculada || 0);
    return horas > 0 ? produccion / horas : 0;
  }

  // ── Acciones ─────────────────────────────────────────────────────────────
  exportarExcel() {
    const estacion = this.estaciones.find(e => e.id === this.estacionSeleccionada)?.nombre || 'Todas';
    this.reportesService.exportarExcel(this.partes, this.mesSeleccionado, this.anioSeleccionado, estacion);
  }

  exportarPDF(parte: any) {
    const url = `${environment.apiUrl}/pdf/parte/${parte.id}`;
    window.open(url, '_blank');
  }

  toggleTablaDetalle() {
    this.mostrarTablaDetalle = !this.mostrarTablaDetalle;
  }

  scrollToTabla() {
    this.mostrarTablaDetalle = true;
    setTimeout(() => {
      const tabla = document.querySelector('table');
      tabla?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 350);
  }
}