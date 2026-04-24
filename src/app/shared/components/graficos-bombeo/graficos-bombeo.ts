import {
  Component, OnInit, ViewChild, ElementRef,
  AfterViewInit, OnDestroy, OnChanges, Input, SimpleChanges
} from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

interface DatoBombeo {
  fecha: Date;
  horas: number;
  produccion: number;
}

interface ResumenEstacion {
  nombre: string;
  produccion: number;
  eficiencia: number;
}

@Component({
  selector: 'app-graficos-bombeo',
  standalone: true,
  imports: [CommonModule, DecimalPipe, DatePipe],
  templateUrl: './graficos-bombeo.html',
  styleUrls: ['./graficos-bombeo.css']
})
export class GraficosBombeoComponent implements OnInit, AfterViewInit, OnChanges, OnDestroy {

  @ViewChild('comparativoChart')  comparativoChart!:  ElementRef<HTMLCanvasElement>;
  @ViewChild('horasDiarioChart')  horasDiarioChart!:  ElementRef<HTMLCanvasElement>;
  @ViewChild('acumuladoChart')    acumuladoChart!:    ElementRef<HTMLCanvasElement>;  // NUEVO
  @ViewChild('distribucionChart') distribucionChart!: ElementRef<HTMLCanvasElement>;  // NUEVO

  private chartComparativo?: Chart;
  private chartHorasDiario?: Chart;
  private chartAcumulado?: Chart;    // NUEVO
  private chartDistribucion?: Chart; // NUEVO

  // ── Tabs y métricas 
  tabActivo: 'mensual' | 'diario' | 'acumulado' | 'distribucion' = 'mensual'; // NUEVO tabs
  vistaMetrica: 'produccion' | 'horas' | 'eficiencia' = 'produccion';

  // ── Umbrales ─────────
  UMBRAL_BAJO     = 18;
  UMBRAL_CRITICO  = 12;

  // ── Paleta para estaciones ────
  coloresEstaciones = ['#0072BC', '#1a9e6b', '#f59e0b', '#9333ea', '#dc2626', '#0891b2'];

  // ── Datos procesados ─
  datosActual:   DatoBombeo[] = [];
  datosAnterior: DatoBombeo[] = [];
  diasConAlerta: DatoBombeo[] = [];

  // NUEVO
  resumenEstaciones:          ResumenEstacion[] = [];
  totalProduccionDistribucion = 0;
  produccionAcumuladaTotal    = 0;
  Math = Math; // para usar Math en template

  // ── Inputs ───────────
  @Input() nombreMesActual:  string = '';
  @Input() nombreMesAnterior: string = '';
  @Input() partesAnterior:   any;
  @Input() partesActual:     any;
  @Input() partes:           any;
  @Input() metaMensual:      number = 150; // NUEVO

  // ── Lifecycle ────────
  ngOnInit(): void {
    this.cargarDatos();
    this.calcularAlertas();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['partes'] || changes['partesAnterior'] || changes['metaMensual']) {
      this.cargarDatos();
      this.calcularAlertas();
      setTimeout(() => this.inicializarGraficos(), 100);
    }
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.inicializarGraficos(), 100);
  }

  // ── Carga de datos ───
  private cargarDatos(): void {
    this.datosActual = (this.partes || [])
      .map((p: any) => ({
        fecha:     new Date(p.fecha_folio),
        horas:     this.calcularHoras(p),
        produccion: Number(p.produccion_calculada || 0)
      }))
      .sort((a: DatoBombeo, b: DatoBombeo) => a.fecha.getTime() - b.fecha.getTime());

    this.datosAnterior = (this.partesAnterior || [])
      .map((p: any) => ({
        fecha:     new Date(p.fecha_folio),
        horas:     this.calcularHoras(p),
        produccion: Number(p.produccion_calculada || 0)
      }))
      .sort((a: DatoBombeo, b: DatoBombeo) => a.fecha.getTime() - b.fecha.getTime());

    // NUEVO: resumen por estación
    this.calcularResumenEstaciones();

    // NUEVO: producción acumulada total
    this.produccionAcumuladaTotal = this.datosActual.reduce((s, d) => s + d.produccion, 0);
  }

  // NUEVO: agrupa partes por estación
  private calcularResumenEstaciones(): void {
    const mapa = new Map<string, { produccion: number; horasTotales: number }>();

    (this.partes || []).forEach((p: any) => {
      const nombre    = p.estacion?.nombre || 'Sin nombre';
      const prod      = Number(p.produccion_calculada || 0);
      const horas     = this.calcularHoras(p);
      const actual    = mapa.get(nombre) || { produccion: 0, horasTotales: 0 };
      mapa.set(nombre, {
        produccion:   actual.produccion + prod,
        horasTotales: actual.horasTotales + horas
      });
    });

    this.resumenEstaciones = Array.from(mapa.entries()).map(([nombre, val]) => ({
      nombre,
      produccion: val.produccion,
      eficiencia: val.horasTotales > 0 ? val.produccion / val.horasTotales : 0
    })).sort((a, b) => b.produccion - a.produccion);

    this.totalProduccionDistribucion = this.resumenEstaciones.reduce((s, e) => s + e.produccion, 0);
  }

  private calcularHoras(parte: any): number {
    if (!parte.detallesBombeo?.length) return 0;
    return parte.detallesBombeo.reduce((sum: number, b: any) => {
      if (!b.encendido || !b.apagado) return sum;
      return sum + (new Date(b.apagado).getTime() - new Date(b.encendido).getTime()) / 3_600_000;
    }, 0);
  }

  private calcularAlertas(): void {
    this.diasConAlerta = this.datosActual
      .filter(d => d.horas < this.UMBRAL_BAJO)
      .sort((a, b) => a.horas - b.horas);
  }

  // ── Control de tabs ──
  cambiarTab(tab: 'mensual' | 'diario' | 'acumulado' | 'distribucion'): void {
    this.tabActivo = tab;
    setTimeout(() => this.inicializarGraficos(), 50);
  }

  cambiarMetrica(metrica: 'produccion' | 'horas' | 'eficiencia'): void {
    this.vistaMetrica = metrica;
    this.actualizarGraficoComparativo();
  }

  // ── Router de gráficos ─────────
  private inicializarGraficos(): void {
    switch (this.tabActivo) {
      case 'mensual':      this.actualizarGraficoComparativo();  break;
      case 'diario':       this.actualizarGraficoHorasDiario();  break;
      case 'acumulado':    this.actualizarGraficoAcumulado();     break;
      case 'distribucion': this.actualizarGraficoDistribucion();  break;
    }
  }

  // ── Gráfico comparativo mensual 
  private actualizarGraficoComparativo(): void {
    if (!this.comparativoChart) return;
    const ctx = this.comparativoChart.nativeElement.getContext('2d');
    if (!ctx) return;
    this.chartComparativo?.destroy();

    let datasets: any[], yAxisLabel: string, tooltipSuffix: string;

    switch (this.vistaMetrica) {
      case 'produccion':
        datasets = [
          { label: this.nombreMesActual,  data: this.datosActual.map(d => d.produccion),   backgroundColor: '#0072BC', borderColor: '#0072BC', borderWidth: 1, borderRadius: 4 },
          { label: this.nombreMesAnterior, data: this.datosAnterior.map(d => d.produccion), backgroundColor: '#94a3b8', borderColor: '#94a3b8', borderWidth: 1, borderRadius: 4 }
        ];
        yAxisLabel = 'Producción (m³)'; tooltipSuffix = ' m³'; break;

      case 'horas':
        datasets = [
          { label: this.nombreMesActual,  data: this.datosActual.map(d => d.horas),   backgroundColor: '#0072BC', borderColor: '#0072BC', borderWidth: 1, borderRadius: 4 },
          { label: this.nombreMesAnterior, data: this.datosAnterior.map(d => d.horas), backgroundColor: '#94a3b8', borderColor: '#94a3b8', borderWidth: 1, borderRadius: 4 }
        ];
        yAxisLabel = 'Horas de Bombeo'; tooltipSuffix = ' h'; break;

      case 'eficiencia':
      default:
        datasets = [
          { label: this.nombreMesActual,  data: this.datosActual.map(d => d.horas > 0 ? d.produccion / d.horas : 0),   backgroundColor: '#0072BC', borderColor: '#0072BC', borderWidth: 1, borderRadius: 4 },
          { label: this.nombreMesAnterior, data: this.datosAnterior.map(d => d.horas > 0 ? d.produccion / d.horas : 0), backgroundColor: '#94a3b8', borderColor: '#94a3b8', borderWidth: 1, borderRadius: 4 }
        ];
        yAxisLabel = 'Eficiencia (m³/h)'; tooltipSuffix = ' m³/h'; break;
    }

    this.chartComparativo = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: this.datosActual.map(d => this.formatLabel(d.fecha)),
        datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }, // NUEVO: usamos leyenda HTML
          tooltip: {
            callbacks: {
              label: (c) => `${c.dataset.label}: ${(c.parsed.y ?? 0).toFixed(1)}${tooltipSuffix}`
            }
          }
        },
        scales: {
          y: { beginAtZero: true, title: { display: true, text: yAxisLabel, font: { size: 12, weight: 600 } }, grid: { color: '#e2e8f0' } },
          x: { grid: { display: false }, ticks: { autoSkip: true, maxTicksLimit: 15 } }
        },
        onClick: () => this.cambiarTab('diario')
      }
    });
  }

  // ── Gráfico horas diario ───────
  private actualizarGraficoHorasDiario(): void {
    if (!this.horasDiarioChart) return;
    const ctx = this.horasDiarioChart.nativeElement.getContext('2d');
    if (!ctx) return;
    this.chartHorasDiario?.destroy();

    const colores = this.datosActual.map(d =>
      d.horas < this.UMBRAL_CRITICO ? '#dc2626' : d.horas < this.UMBRAL_BAJO ? '#f59e0b' : '#10b981'
    );

    this.chartHorasDiario = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: this.datosActual.map(d => this.formatLabel(d.fecha)),
        datasets: [{
          label: 'Horas de Bombeo',
          data: this.datosActual.map(d => d.horas),
          backgroundColor: colores,
          borderColor: colores,
          borderWidth: 1,
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          // NUEVO: línea de umbral con annotation (requiere chartjs-plugin-annotation)
          // Si no tienes el plugin, la línea se puede dibujar manualmente
          tooltip: {
            callbacks: {
              label: (c) => {
                const dato = this.datosActual[c.dataIndex];
                return [
                  `Horas: ${dato.horas.toFixed(1)} h`,
                  `Producción: ${this.formatM3(dato.produccion)} m³`,
                  `Eficiencia: ${(dato.produccion / dato.horas).toFixed(1)} m³/h`
                ];
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            suggestedMax: 25,
            title: { display: true, text: 'Horas de Bombeo', font: { size: 12, weight: 600 } },
            grid: { color: '#e2e8f0' }
          },
          x: { grid: { display: false }, ticks: { autoSkip: true, maxTicksLimit: 15 } }
        }
      },
      plugins: [{
        // NUEVO: plugin inline para dibujar línea de umbral
        id: 'umbralLine',
        afterDraw: (chart) => {
          const { ctx: c, scales: { y, x } } = chart as any;
          const yPos = y.getPixelForValue(this.UMBRAL_BAJO);
          c.save();
          c.strokeStyle = '#f59e0b';
          c.lineWidth   = 1.5;
          c.setLineDash([6, 4]);
          c.beginPath();
          c.moveTo(x.left,  yPos);
          c.lineTo(x.right, yPos);
          c.stroke();
          c.restore();
        }
      }]
    });
  }

  // NUEVO: Gráfico de línea acumulada vs meta ────────────────────────────────
  private actualizarGraficoAcumulado(): void {
    if (!this.acumuladoChart) return;
    const ctx = this.acumuladoChart.nativeElement.getContext('2d');
    if (!ctx) return;
    this.chartAcumulado?.destroy();

    const diasMes = this.datosActual.length || 30;

    let cumAct = 0, cumAnt = 0;
    const cumActArr = this.datosActual.map(d => { cumAct += d.produccion; return cumAct; });
    const cumAntArr = this.datosAnterior.map(d => { cumAnt += d.produccion; return cumAnt; });
    const metaArr   = this.datosActual.map((_, i) => Math.round((this.metaMensual / diasMes) * (i + 1)));

    this.chartAcumulado = new Chart(ctx, {
      type: 'line',
      data: {
        labels: this.datosActual.map(d => this.formatLabel(d.fecha)),
        datasets: [
          {
            label: `Acumulado ${this.nombreMesActual}`,
            data: cumActArr,
            borderColor: '#0072BC',
            backgroundColor: '#0072BC18',
            borderWidth: 2,
            pointRadius: 0,
            fill: true,
            tension: 0.3
          },
          {
            label: `Acumulado ${this.nombreMesAnterior}`,
            data: cumAntArr,
            borderColor: '#94a3b8',
            backgroundColor: 'transparent',
            borderWidth: 1.5,
            borderDash: [4, 4],
            pointRadius: 0,
            fill: false,
            tension: 0.3
          },
          {
            label: 'Meta',
            data: metaArr,
            borderColor: '#f59e0b',
            backgroundColor: 'transparent',
            borderWidth: 1.5,
            borderDash: [6, 3],
            pointRadius: 0,
            fill: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            mode: 'index',
            intersect: false,
            callbacks: {
              label: (c) => `${c.dataset.label}: ${this.formatM3(c.parsed.y ?? 0)} m³`
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: { display: true, text: 'Producción acumulada (m³)', font: { size: 12, weight: 600 } },
            grid: { color: '#e2e8f0' },
            ticks: { callback: (v: any) => (v / 1000).toFixed(0) + 'k' }
          },
          x: { grid: { display: false }, ticks: { autoSkip: true, maxTicksLimit: 12 } }
        }
      }
    });
  }

  // NUEVO: Gráfico de dona por estación ─────────────────────────────────────
  private actualizarGraficoDistribucion(): void {
    if (!this.distribucionChart) return;
    const ctx = this.distribucionChart.nativeElement.getContext('2d');
    if (!ctx) return;
    this.chartDistribucion?.destroy();

    if (this.resumenEstaciones.length === 0) return;

    this.chartDistribucion = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: this.resumenEstaciones.map(e => e.nombre),
        datasets: [{
          data: this.resumenEstaciones.map(e => e.produccion),
          backgroundColor: this.resumenEstaciones.map((_, i) => this.coloresEstaciones[i % this.coloresEstaciones.length]),
          borderWidth: 2,
          borderColor: '#fff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (c) => {
                const pct = ((c.parsed / this.totalProduccionDistribucion) * 100).toFixed(1);
                return `${c.label}: ${this.formatM3(c.parsed)} m³ (${pct}%)`;
              }
            }
          }
        }
      }
    });
  }

  // ── Helpers ──────────
  private formatLabel(fecha: Date): string {
    const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    return `${fecha.getDate()} ${meses[fecha.getMonth()]}`;
  }

  formatM3(valor: number): string {
    return new Intl.NumberFormat('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(valor);
  }

  // ── Destroy ──────────
  ngOnDestroy(): void {
    this.chartComparativo?.destroy();
    this.chartHorasDiario?.destroy();
    this.chartAcumulado?.destroy();
    this.chartDistribucion?.destroy();
  }
}