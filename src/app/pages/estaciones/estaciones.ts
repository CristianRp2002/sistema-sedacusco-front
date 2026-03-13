import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { EstacionesService } from '../../services/estaciones.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header';
import { SearchBarComponent } from '../../shared/components/search-bar/search-bar';
import { ModalComponent } from '../../shared/components/modal/modal';
import { FormInputComponent } from '../../shared/components/form-input/form-input';

@Component({
  selector: 'app-estaciones',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, PageHeaderComponent, SearchBarComponent, ModalComponent, FormInputComponent],
  templateUrl: './estaciones.html',
  styleUrl: './estaciones.css'
})
export class Estaciones implements OnInit {
  private fb = inject(FormBuilder);
  private estacionesService = inject(EstacionesService);
  private cdr = inject(ChangeDetectorRef);

  estaciones: any[] = [];
  estacionesFiltradas: any[] = [];
  estacionSeleccionada: any = null;
  estacionEditando: any = null;
  bombaEditando: any = null;
  tableroEditando: any = null;

  modalEstacionAbierto = false;
  modalBombaAbierto = false;
  modalTableroAbierto = false;

  estacionForm = this.fb.group({
    nombre: ['', [Validators.required, Validators.minLength(3)]]
  });

  bombaForm = this.fb.group({
    nombre: ['', [Validators.required, Validators.minLength(3)]],
    numero_serie: [''],
    activa: [true]
  });

  tableroForm = this.fb.group({
    nombre: ['', [Validators.required, Validators.minLength(3)]],
    numero_serie: [''],
    tipo: [''],
    activo: [true]
  });

  ngOnInit() {
    this.cargarEstaciones();
  }

  cargarEstaciones() {
    this.estacionesService.getEstaciones().subscribe({
      next: (data) => {
        this.estaciones = data;
        this.estacionesFiltradas = data;
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error cargando estaciones', err)
    });
  }

  filtrarTexto(texto: string) {
    this.estacionesFiltradas = this.estaciones.filter(e =>
      e.nombre.toLowerCase().includes(texto.toLowerCase())
    );
  }

  abrirModalEstacion() {
    this.estacionEditando = null;
    this.estacionForm.reset();
    this.modalEstacionAbierto = true;
  }

  editarEstacion(estacion: any) {
    this.estacionEditando = estacion;
    this.estacionForm.patchValue({ nombre: estacion.nombre });
    this.modalEstacionAbierto = true;
  }

  abrirModalBomba(estacion: any) {
    this.estacionSeleccionada = estacion;
    this.bombaEditando = null;
    this.bombaForm.reset();
    this.modalBombaAbierto = true;
  }

  editarBomba(bomba: any, estacion: any) {
    this.bombaEditando = bomba;
    this.estacionSeleccionada = estacion;
    this.bombaForm.patchValue({ nombre: bomba.nombre,
        numero_serie: bomba.numero_serie, activa: bomba.activa
     });
    this.modalBombaAbierto = true;
  }

  abrirModalTablero(estacion: any) {
    this.estacionSeleccionada = estacion;
    this.tableroEditando = null;
    this.tableroForm.reset();
    this.modalTableroAbierto = true;
  }

  editarTablero(tablero: any, estacion: any) {
    this.tableroEditando = tablero;
    this.estacionSeleccionada = estacion;
    this.tableroForm.patchValue({
      nombre: tablero.nombre,
      numero_serie: tablero.numero_serie,
      tipo: tablero.tipo,
      activo: tablero.activo
    });
    this.modalTableroAbierto = true;
  }

  cerrarModales() {
    this.modalEstacionAbierto = false;
    this.modalBombaAbierto = false;
    this.modalTableroAbierto = false;
    this.estacionSeleccionada = null;
    this.estacionEditando = null;
    this.bombaEditando = null;
    this.tableroEditando = null;
    this.estacionForm.reset();
    this.bombaForm.reset();
    this.tableroForm.reset();
  }

  guardarEstacion() {
    if (this.estacionForm.invalid) return;
    const datos = this.estacionForm.value as { nombre: string };

    if (this.estacionEditando) {
      this.estacionesService.actualizarEstacion(this.estacionEditando.id, datos).subscribe({
        next: () => { this.cerrarModales(); this.cargarEstaciones(); },
        error: (err) => console.error('Error actualizando estacion', err)
      });
    } else {
      this.estacionesService.crearEstacion(datos).subscribe({
        next: () => { this.cerrarModales(); this.cargarEstaciones(); },
        error: (err) => console.error('Error creando estacion', err)
      });
    }
  }

  guardarBomba() {
    if (this.bombaForm.invalid) return;
    const datos: any = {
      ...this.bombaForm.value,
      activa: this.bombaForm.value.activa === true ? true : false
    };

    if (this.bombaEditando) {
      this.estacionesService.actualizarBomba(this.bombaEditando.id, datos).subscribe({
        next: () => { this.cerrarModales(); this.cargarEstaciones(); },
        error: (err: any) => console.error('Error actualizando bomba', err)
      });
    } else {
      this.estacionesService.crearBomba(this.estacionSeleccionada.id, datos).subscribe({
        next: () => { this.cerrarModales(); this.cargarEstaciones(); },
        error: (err: any) => console.error('Error creando bomba', err)
      });
    }
  }

  guardarTablero() {
  if (this.tableroForm.invalid) return;
  const datos: any = {
    ...this.tableroForm.value,
    activo: this.tableroForm.value.activo === true ? true : false
  };

  if (this.tableroEditando) {
    this.estacionesService.actualizarTablero(this.tableroEditando.id, datos).subscribe({
      next: () => { this.cerrarModales(); this.cargarEstaciones(); },
      error: (err: any) => console.error('Error actualizando tablero', err)
    });
  } else {
    this.estacionesService.crearTablero(this.estacionSeleccionada.id, datos).subscribe({
      next: () => { this.cerrarModales(); this.cargarEstaciones(); },
      error: (err: any) => console.error('Error creando tablero', err)
    });
  }
}

  eliminarEstacion(estacion: any) {
    if (confirm(`¿Eliminar la estación ${estacion.nombre}?`)) {
      this.estacionesService.eliminarEstacion(estacion.id).subscribe({
        next: () => this.cargarEstaciones(),
        error: (err) => console.error('Error eliminando estacion', err)
      });
    }
  }

  eliminarBomba(bomba: any, estacion: any) {
    if (confirm(`¿Eliminar la bomba ${bomba.nombre}?`)) {
      this.estacionesService.eliminarBomba(bomba.id).subscribe({
        next: () => this.cargarEstaciones(),
        error: (err) => console.error('Error eliminando bomba', err)
      });
    }
  }

  eliminarTablero(tablero: any, estacion: any) {
    if (confirm(`¿Eliminar el tablero ${tablero.nombre}?`)) {
      this.estacionesService.eliminarTablero(tablero.id).subscribe({
        next: () => this.cargarEstaciones(),
        error: (err) => console.error('Error eliminando tablero', err)
      });
    }
  }
}