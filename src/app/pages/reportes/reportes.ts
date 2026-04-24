import { Component, inject, OnInit, AfterViewInit, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
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
export class Reportes implements OnInit, AfterViewInit {
  private reportesService = inject(ReportesService);
  private estacionesService = inject(EstacionesService);
  private cdr = inject(ChangeDetectorRef);

  // ── Referencia a la tabla para scroll ──────────────────────────────────
  @ViewChild('tablaRef') tablaRef!: ElementRef;

  // ── Estado principal ────────────────────────────────────────────────────
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

  // NUEVO: selector de vista temporal
  vistaSeleccionada: 'mensual' | 'trimestral' | 'anual' = 'mensual';
  vistas: { key: 'mensual' | 'trimestral' | 'anual'; label: string }[] = [
    { key: 'mensual', label: 'Mensual' },
    { key: 'trimestral', label: 'Trimestral' },
    { key: 'anual', label: 'Anual' }
  ];

  // NUEVO: meta mensual configurable (m³)
  metaMensual = 150000;

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

  // ── Insights ─────────────────────────────────────────────────────────────
  get mejorDia() {
    if (this.partes.length === 0) return { fecha: new Date(), produccion: 0, horas: 0 };
    const mejor = this.partes.reduce((max, p) =>
      Number(p.produccion_calculada || 0) > Number(max.produccion_calculada || 0) ? p : max
    , this.partes[0]);
    return { fecha: mejor.fecha_folio, produccion: Number(mejor.produccion_calculada || 0), horas: this.getHorasBombeo(mejor) };
  }

  get diasConAlerta() {
    return this.partes.filter(p => this.getHorasBombeo(p) < 19);
  }

  get tendenciaTexto(): string {
    const v = this.variacionProduccion;
    if (v > 10)  return 'Crecimiento Alto';
    if (v > 5)   return 'Crecimiento';
    if (v > 0)   return 'Crecimiento Leve';
    if (v === 0) return 'Estable';
    if (v > -5)  return 'Descenso Leve';
    if (v > -10) return 'Descenso';
    return 'Descenso Alto';
  }

  get nombreMesActual(): string {
    return this.meses[this.mesSeleccionado - 1];
  }

  get nombreMesAnterior(): string {
    const mesAnt = this.mesSeleccionado === 1 ? 12 : this.mesSeleccionado - 1;
    return this.meses[mesAnt - 1];
  }

  // NUEVO: Resumen agrupado por estación
  get resumenEstaciones(): { nombre: string; produccion: number; diasCriticos: number }[] {
    const mapa = new Map<string, { produccion: number; diasCriticos: number }>();

    this.partes.forEach(p => {
      const nombre = p.estacion?.nombre || 'Sin nombre';
      const prod   = Number(p.produccion_calculada || 0);
      const horas  = this.getHorasBombeo(p);
      const actual = mapa.get(nombre) || { produccion: 0, diasCriticos: 0 };
      mapa.set(nombre, {
        produccion:   actual.produccion + prod,
        diasCriticos: actual.diasCriticos + (horas < 17 ? 1 : 0)
      });
    });

    return Array.from(mapa.entries())
      .map(([nombre, val]) => ({ nombre, ...val }))
      .sort((a, b) => b.produccion - a.produccion);
  }

  // NUEVO: Datos diarios de producción para sparklines
  get produccionDiaria(): number[] {
    return this.partes
      .slice()
      .sort((a, b) => new Date(a.fecha_folio).getTime() - new Date(b.fecha_folio).getTime())
      .map(p => Number(p.produccion_calculada || 0));
  }

  get horasDiarias(): number[] {
    return this.partes
      .slice()
      .sort((a, b) => new Date(a.fecha_folio).getTime() - new Date(b.fecha_folio).getTime())
      .map(p => this.getHorasBombeo(p));
  }

  get eficienciaDiaria(): number[] {
    return this.partes
      .slice()
      .sort((a, b) => new Date(a.fecha_folio).getTime() - new Date(b.fecha_folio).getTime())
      .map(p => this.getEficiencia(p));
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

  ngAfterViewInit() {
    // Las sparklines se dibujan después de que los datos carguen (ver dibujarSparklines)
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
        // NUEVO: dibujar sparklines una vez que tenemos datos
        setTimeout(() => this.dibujarSparklines(), 150);
      }
    };

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

  // ── Ordenar tabla ────────────────────────────────────────────────────────
  ordenarPor(columna: string) {
    if (this.columnaOrden === columna) {
      this.ordenAscendente = !this.ordenAscendente;
    } else {
      this.columnaOrden    = columna;
      this.ordenAscendente = true;
    }

    this.partesFiltradas.sort((a, b) => {
      let valA: any, valB: any;
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
      const horas = (new Date(b.apagado).getTime() - new Date(b.encendido).getTime()) / (1000 * 60 * 60);
      return sum + horas;
    }, 0);
  }

  getEficiencia(parte: any): number {
    const horas      = this.getHorasBombeo(parte);
    const produccion = Number(parte.produccion_calculada || 0);
    return horas > 0 ? produccion / horas : 0;
  }

  // NUEVO: porcentaje respecto a la meta diaria (metaMensual / días del mes)
  getPorcentajeObjetivo(parte: any): number {
    const diasMes     = new Date(this.anioSeleccionado, this.mesSeleccionado, 0).getDate();
    const metaDiaria  = this.metaMensual / diasMes;
    const produccion  = Number(parte.produccion_calculada || 0);
    return Math.min((produccion / metaDiaria) * 100, 100);
  }

  // ── NUEVO: Dibujar sparklines con canvas 2D ──────────────────────────────
  dibujarSparklines() {
    this.dibujarSparkline('sparkProduccion', this.produccionDiaria, '#0072BC');
    this.dibujarSparkline('sparkHoras',      this.horasDiarias,     '#16a34a');
    this.dibujarSparkline('sparkEficiencia', this.eficienciaDiaria, '#9333ea');
    this.dibujarSparkline('sparkPromedio',   this.produccionDiaria, '#d97706');
  }

  private dibujarSparkline(id: string, data: number[], color: string) {
    const canvas = document.getElementById(id) as HTMLCanvasElement;
    if (!canvas || data.length === 0) return;

    const ctx   = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.clientWidth || 120;
    const h = 32;
    canvas.width  = w;
    canvas.height = h;

    const mn    = Math.min(...data);
    const mx    = Math.max(...data);
    const range = mx - mn || 1;

    ctx.clearRect(0, 0, w, h);

    // Área bajo la curva
    ctx.beginPath();
    data.forEach((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - mn) / range) * (h - 6) - 3;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fillStyle = color + '20';
    ctx.fill();

    // Línea principal
    ctx.beginPath();
    data.forEach((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - mn) / range) * (h - 6) - 3;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.strokeStyle = color;
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';
    ctx.stroke();

    // Punto final
    const lastX = w;
    const lastY = h - ((data[data.length - 1] - mn) / range) * (h - 6) - 3;
    ctx.beginPath();
    ctx.arc(lastX, lastY, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
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
      this.tablaRef?.nativeElement?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 350);
  }
}