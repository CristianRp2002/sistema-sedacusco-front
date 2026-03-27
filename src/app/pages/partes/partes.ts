import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { OperacionesService } from '../../services/operaciones.service';
import { EstacionesService } from '../../services/estaciones.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-partes',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, PageHeaderComponent],
  templateUrl: './partes.html',
  styleUrl: './partes.css'
})
export class Partes implements OnInit {

  private operacionesService = inject(OperacionesService);
  private estacionesService  = inject(EstacionesService);
  private cdr                = inject(ChangeDetectorRef);
  private router             = inject(Router);
  private fb                 = inject(FormBuilder);  // ← nuevo

  partes: any[]          = [];
  partesFiltrados: any[] = [];
  estaciones: any[]      = [];
  parteSeleccionado: any = null;
  modalDetalleAbierto    = false;
  modalEditarAbierto     = false;  // ← nuevo
  formEditar!: FormGroup;          // ← nuevo

  ngOnInit() {
    this.cargarPartes();
    this.cargarEstaciones();
  }

  cargarPartes() {
    this.operacionesService.getPartes().subscribe({
      next: (data) => {
        this.partes          = data;
        this.partesFiltrados = data;
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        console.error('Error cargando partes', err.message);
      }
    });
  }

  cargarEstaciones() {
    this.estacionesService.getEstaciones().subscribe({
      next: (data) => {
        this.estaciones = data;
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        console.error('Error cargando estaciones', err.message);
      }
    });
  }

  irANuevoParte() {
    this.router.navigate(['/nuevo-parte']);
  }

  filtrarFecha(event: Event) {
    const fecha = (event.target as HTMLInputElement).value;
    this.partesFiltrados = fecha
      ? this.partes.filter(p => {
          const f = typeof p.fecha_folio === 'string'
            ? p.fecha_folio.substring(0, 10)
            : new Date(p.fecha_folio).toISOString().substring(0, 10);
          return f === fecha;
        })
      : this.partes;
  }

  filtrarTexto(event: Event) {
    const texto = (event.target as HTMLInputElement).value.toLowerCase();
    this.partesFiltrados = this.partes.filter(p =>
      p.estacion?.nombre?.toLowerCase().includes(texto) ||
      p.operadores?.some((op: any) =>
        op.nombre_operador?.toLowerCase().includes(texto)
      )
    );
  }

  filtrarEstacion(event: Event) {
    const estacionId = (event.target as HTMLSelectElement).value;
    this.partesFiltrados = estacionId
      ? this.partes.filter(p => String(p.estacion?.id) === String(estacionId))
      : this.partes;
  }

  verDetalle(parte: any) {
    this.parteSeleccionado   = parte;
    this.modalDetalleAbierto = true;
    this.cdr.detectChanges();
  }

  cerrarDetalle() {
    this.modalDetalleAbierto = false;
    this.parteSeleccionado   = null;
  }

  // ↓ todo esto es nuevo
  abrirEditar(parte: any) {
    this.parteSeleccionado = parte;
    this.formEditar = this.fb.group({
      fecha_folio:         [parte.fecha_folio?.substring(0, 10)],
      estacion_id:         [parte.estacion?.id],
      totalizador_inicial: [parte.totalizador_inicial],
      totalizador_final:   [parte.totalizador_final],
    });
    this.modalEditarAbierto = true;
    this.cdr.detectChanges();
  }

  cerrarEditar() {
    this.modalEditarAbierto = false;
    this.parteSeleccionado  = null;
  }

  guardarEdicion() {
    if (this.formEditar.valid) {
      const id = this.parteSeleccionado?.id;
      this.operacionesService.actualizarParte(id, this.formEditar.value).subscribe({
        next: () => {
          this.cerrarEditar();
          this.cargarPartes();
        },
        error: (err: HttpErrorResponse) => {
          console.error('Error actualizando parte', err.message);
        }
      });
    }
  }
  // ↑ fin nuevos métodos

  eliminarParte(parte: any) {
    if (confirm(`¿Eliminar el parte del ${new Date(parte.fecha_folio).toLocaleDateString('es-PE')}?`)) {
      this.operacionesService.eliminarParte(parte.id).subscribe({
        next: () => {
          this.cargarPartes();
        },
        error: (err: HttpErrorResponse) => {
          console.error('Error eliminando parte', err.message);
        }
      });
    }
  }

  descargarPdf(parteId: string) {
    this.operacionesService.descargarPdf(parteId).subscribe(blob => {
      const url = window.URL.createObjectURL(blob);
      const a   = document.createElement('a');
      a.href     = url;
      a.download = `Parte_${parteId}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    });
  }
}