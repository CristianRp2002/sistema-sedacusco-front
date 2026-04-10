import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, OnDestroy, OnChanges,Input, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

interface DatoBombeo {
  fecha: Date;
  horas: number;
  produccion: number;
}

@Component({
  selector: 'app-graficos-bombeo',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './graficos-bombeo.html',
  styleUrls: ['./graficos-bombeo.css']
})
export class GraficosBombeoComponent implements OnInit, AfterViewInit, OnChanges, OnDestroy {
  
  @ViewChild('comparativoChart') comparativoChart!: ElementRef<HTMLCanvasElement>;
  @ViewChild('horasDiarioChart') horasDiarioChart!: ElementRef<HTMLCanvasElement>;
  
  private chartComparativo?: Chart;
  private chartHorasDiario?: Chart;

  // Propiedades del componente
  tabActivo: 'mensual' | 'diario' = 'mensual';
  vistaMetrica: 'produccion' | 'horas' | 'eficiencia' = 'produccion';
  
  // Umbrales
  UMBRAL_BAJO = 18;
  UMBRAL_CRITICO = 12;
  
  // Datos
  datosActual: DatoBombeo[] = [];
  datosAnterior: DatoBombeo[] = [];
  diasConAlerta: DatoBombeo[] = [];
  
  // Inputs: Ahora reciben el valor desde el HTML del padre (Ej. <app-graficos-bombeo [nombreMesAnterior]="...">)
  @Input() nombreMesActual: string = '';
  @Input() nombreMesAnterior: string = '';
  @Input() partesAnterior: any; 
  @Input() partesActual: any;
  @Input() partes: any;

  constructor() {}

  ngOnInit(): void {
    this.cargarDatos();
    this.calcularAlertas();
  }
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['partes'] || changes['partesAnterior']) {
      this.cargarDatos();
      this.calcularAlertas();
      setTimeout(() => this.inicializarGraficos(), 100);
    }
  }
  ngAfterViewInit(): void {
    setTimeout(() => {
      this.inicializarGraficos();
    }, 100);
  }

  private cargarDatos(): void {
    this.datosActual = (this.partes || [])
      .map((p: any) => ({
        fecha: new Date(p.fecha_folio),
        horas: this.calcularHoras(p),
        produccion: Number(p.produccion_calculada || 0)
      }))
      .sort((a: DatoBombeo, b: DatoBombeo) => a.fecha.getTime() - b.fecha.getTime());

    this.datosAnterior = (this.partesAnterior || [])
      .map((p: any) => ({
        fecha: new Date(p.fecha_folio),
        horas: this.calcularHoras(p),
        produccion: Number(p.produccion_calculada || 0)
      }))
      .sort((a: DatoBombeo, b: DatoBombeo) => a.fecha.getTime() - b.fecha.getTime());
  }

  private calcularHoras(parte: any): number {
    if (!parte.detallesBombeo?.length) return 0;
    return parte.detallesBombeo.reduce((sum: number, b: any) => {
      if (!b.encendido || !b.apagado) return sum;
      return sum + (new Date(b.apagado).getTime() - new Date(b.encendido).getTime()) / 3_600_000;
    }, 0);
  }

  private getNombreMes(mes: number): string {
    const meses = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return meses[mes < 0 ? mes + 12 : mes];
  }

  private calcularAlertas(): void {
    this.diasConAlerta = this.datosActual.filter(d => d.horas < this.UMBRAL_BAJO);
    this.diasConAlerta.sort((a, b) => a.horas - b.horas);
  }

  cambiarTab(tab: 'mensual' | 'diario'): void {
    this.tabActivo = tab;
    setTimeout(() => {
      this.inicializarGraficos();
    }, 50);
  }

  cambiarMetrica(metrica: 'produccion' | 'horas' | 'eficiencia'): void {
    this.vistaMetrica = metrica;
    this.actualizarGraficoComparativo();
  }

  private inicializarGraficos(): void {
    if (this.tabActivo === 'mensual') {
      this.actualizarGraficoComparativo();
    } else {
      this.actualizarGraficoHorasDiario();
    }
  }

  private actualizarGraficoComparativo(): void {
    if (!this.comparativoChart) return;

    const ctx = this.comparativoChart.nativeElement.getContext('2d');
    if (!ctx) return;
    
    if (this.chartComparativo) {
      this.chartComparativo.destroy();
    }

    let datasets;
    let yAxisLabel;
    let tooltipSuffix;

    switch (this.vistaMetrica) {
      case 'produccion':
        datasets = [
          {
            label: this.nombreMesActual,
            data: this.datosActual.map(d => d.produccion),
            backgroundColor: '#0072BC',
            borderColor: '#0072BC',
            borderWidth: 1,
            borderRadius: 4
          },
          {
            label: this.nombreMesAnterior,
            data: this.datosAnterior.map(d => d.produccion),
            backgroundColor: '#94a3b8',
            borderColor: '#94a3b8',
            borderWidth: 1,
            borderRadius: 4
          }
        ];
        yAxisLabel = 'Producción (m³)';
        tooltipSuffix = ' m³';
        break;

      case 'horas':
        datasets = [
          {
            label: this.nombreMesActual,
            data: this.datosActual.map(d => d.horas),
            backgroundColor: '#0072BC',
            borderColor: '#0072BC',
            borderWidth: 1,
            borderRadius: 4
          },
          {
            label: this.nombreMesAnterior,
            data: this.datosAnterior.map(d => d.horas),
            backgroundColor: '#94a3b8',
            borderColor: '#94a3b8',
            borderWidth: 1,
            borderRadius: 4
          }
        ];
        yAxisLabel = 'Horas de Bombeo';
        tooltipSuffix = ' h';
        break;

      case 'eficiencia':
        datasets = [
          {
            label: this.nombreMesActual,
            data: this.datosActual.map(d => d.horas > 0 ? d.produccion / d.horas : 0),
            backgroundColor: '#0072BC',
            borderColor: '#0072BC',
            borderWidth: 1,
            borderRadius: 4
          },
          {
            label: this.nombreMesAnterior,
            data: this.datosAnterior.map(d => d.horas > 0 ? d.produccion / d.horas : 0),
            backgroundColor: '#94a3b8',
            borderColor: '#94a3b8',
            borderWidth: 1,
            borderRadius: 4
          }
        ];
        yAxisLabel = 'Eficiencia (m³/h)';
        tooltipSuffix = ' m³/h';
        break;
    }

    this.chartComparativo = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: this.datosActual.map(d => {
          const f = d.fecha;
          const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
          return f.getDate() + ' ' + meses[f.getMonth()];
        }),
        datasets: datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: {
              font: {
                size: 12,
                weight: 600
              },
              padding: 15
            }
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const value = context.parsed.y ?? 0;
                return `${context.dataset.label}: ${value.toFixed(1)}${tooltipSuffix}`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: yAxisLabel,
              font: {
                size: 12,
                weight: 600
              }
            },
            grid: {
              color: '#e2e8f0'
            }
          },
          x: {
            grid: {
              display: false
            }
          }
        },
        onClick: (event, elements) => {
          if (elements.length > 0) {
            this.cambiarTab('diario');
          }
        }
      }
    });
  }

  private actualizarGraficoHorasDiario(): void {
    if (!this.horasDiarioChart) return;

    const ctx = this.horasDiarioChart.nativeElement.getContext('2d');
    if (!ctx) return;
    
    if (this.chartHorasDiario) {
      this.chartHorasDiario.destroy();
    }

    const colores = this.datosActual.map(d => {
      if (d.horas < this.UMBRAL_CRITICO) {
        return '#dc2626';
      } else if (d.horas < this.UMBRAL_BAJO) {
        return '#f59e0b';
      } else {
        return '#10b981';
      }
    });

    this.chartHorasDiario = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: this.datosActual.map(d => {
          const f = d.fecha;
          const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
          return f.getDate() + ' ' + meses[f.getMonth()];
        }),
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
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const dato = this.datosActual[context.dataIndex];
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
            title: {
              display: true,
              text: 'Horas de Bombeo',
              font: {
                size: 12,
                weight: 600
              }
            },
            grid: {
              color: '#e2e8f0'
            }
          },
          x: {
            grid: {
              display: false
            }
          }
        }
      }
    });
  }

  formatM3(valor: number): string {
    return new Intl.NumberFormat('es-PE', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(valor);
  }

  ngOnDestroy(): void {
    if (this.chartComparativo) {
      this.chartComparativo.destroy();
    }
    if (this.chartHorasDiario) {
      this.chartHorasDiario.destroy();
    }
  }
}