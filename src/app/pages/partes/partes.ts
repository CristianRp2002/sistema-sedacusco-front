import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PartesService } from '../../services/partes.service';
import { EstacionesService } from '../../services/estaciones.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header';
import { Router } from '@angular/router';

@Component({
  selector: 'app-partes',
  standalone: true,
  imports: [CommonModule, PageHeaderComponent],
  templateUrl: './partes.html',
  styleUrl: './partes.css'
})
export class Partes implements OnInit {
  private partesService = inject(PartesService);
  private estacionesService = inject(EstacionesService);
  private cdr = inject(ChangeDetectorRef);
  private router = inject(Router);

  partes: any[] = [];
  partesFiltrados: any[] = [];
  estaciones: any[] = [];
  parteSeleccionado: any = null;
  modalDetalleAbierto = false;

  ngOnInit() {
    this.cargarPartes();
    this.cargarEstaciones();
  }

  cargarPartes() {
    this.partesService.getPartes().subscribe({
      next: (data) => {
        this.partes = data;
        this.partesFiltrados = data;
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error cargando partes', err)
    });
  }

  cargarEstaciones() {
    this.estacionesService.getEstaciones().subscribe({
      next: (data) => {
        this.estaciones = data;
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error cargando estaciones', err)
    });
  }

  irANuevoParte() {
    this.router.navigate(['/nuevo-parte']);
  }

  filtrarTexto(event: any) {
    const texto = event.target.value.toLowerCase();
    this.partesFiltrados = this.partes.filter(p =>
      p.estacion?.nombre.toLowerCase().includes(texto) ||
      p.operadores?.some((op: any) => op.nombre_operador?.toLowerCase().includes(texto))
    );
  }

  filtrarFecha(event: any) {
    const fecha = event.target.value;
    this.partesFiltrados = fecha
      ? this.partes.filter(p => p.fecha_folio?.startsWith(fecha))
      : this.partes;
  }

  filtrarEstacion(event: any) {
    const estacionId = event.target.value;
    this.partesFiltrados = estacionId
      ? this.partes.filter(p => p.estacion?.id === estacionId)
      : this.partes;
  }

  verDetalle(parte: any) {
    this.parteSeleccionado = parte;
    this.modalDetalleAbierto = true;
    this.cdr.detectChanges();
  }

  cerrarDetalle() {
    this.modalDetalleAbierto = false;
    this.parteSeleccionado = null;
  }

  eliminarParte(parte: any) {
    if (confirm(`¿Eliminar el parte del ${new Date(parte.fecha_folio).toLocaleDateString('es-PE')}?`)) {
      this.partesService.eliminarParte(parte.id).subscribe({
        next: () => this.cargarPartes(),
        error: (err) => console.error('Error eliminando parte', err)
      });
    }
  }
}