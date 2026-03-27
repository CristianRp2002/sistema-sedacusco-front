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

  // ── ACTIVOS ───────────────────────────────────────────────
  activoEditando: any = null;
  tiposActivo: any[] = [];
  modalActivoAbierto = false;

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

  // ── Formulario de activo ──────────────────────────────────
  activoForm = this.fb.group({
    nombre:         ['', [Validators.required, Validators.minLength(3)]],
    tipo_activo_id: ['', Validators.required],
    codigo:         [''],
    numero_serie:   [''],
    modelo:         [''],
    marca:          [''],
    orden:          [1],
    activo:         [true]
  });

  ngOnInit() {
    this.cargarEstaciones();
    this.cargarTiposActivo();
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

  cargarTiposActivo() {
    this.estacionesService.getTiposConCampos().subscribe({
      next: (data) => { this.tiposActivo = data; },
      error: (err) => console.error('Error cargando tipos de activo', err)
    });
  }

  filtrarTexto(texto: string) {
    this.estacionesFiltradas = this.estaciones.filter(e =>
      e.nombre.toLowerCase().includes(texto.toLowerCase())
    );
  }

  // ── Estación ──────────────────────────────────────────────
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

  // ── Bomba ─────────────────────────────────────────────────
  abrirModalBomba(estacion: any) {
    this.estacionSeleccionada = estacion;
    this.bombaEditando = null;
    this.bombaForm.reset();
    this.modalBombaAbierto = true;
  }

  editarBomba(bomba: any, estacion: any) {
    this.bombaEditando = bomba;
    this.estacionSeleccionada = estacion;
    this.bombaForm.patchValue({ nombre: bomba.nombre, numero_serie: bomba.numero_serie, activa: bomba.activa });
    this.modalBombaAbierto = true;
  }

  // ── Tablero ───────────────────────────────────────────────
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

  // ── Activo ────────────────────────────────────────────────
  abrirModalActivo(estacion: any) {
    this.estacionSeleccionada = estacion;
    this.activoEditando = null;
    this.activoForm.reset({ orden: 1, activo: true });
    this.modalActivoAbierto = true;
  }

  editarActivo(activo: any, estacion: any) {
    this.activoEditando = activo;
    this.estacionSeleccionada = estacion;
    this.activoForm.patchValue({
      nombre:         activo.nombre,
      tipo_activo_id: activo.tipo_activo_id,
      codigo:         activo.codigo,
      numero_serie:   activo.numero_serie,
      modelo:         activo.modelo,
      marca:          activo.marca,
      orden:          activo.orden,
      activo:         activo.activo
    });
    this.modalActivoAbierto = true;
  }

  // ── Cerrar todos los modales ──────────────────────────────
  cerrarModales() {
    this.modalEstacionAbierto = false;
    this.modalBombaAbierto = false;
    this.modalTableroAbierto = false;
    this.modalActivoAbierto = false;
    this.estacionSeleccionada = null;
    this.estacionEditando = null;
    this.bombaEditando = null;
    this.tableroEditando = null;
    this.activoEditando = null;
    this.estacionForm.reset();
    this.bombaForm.reset();
    this.tableroForm.reset();
    this.activoForm.reset();
  }

  // ── Guardar Estación ──────────────────────────────────────
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

  // ── Guardar Bomba ─────────────────────────────────────────
  guardarBomba() {
    if (this.bombaForm.invalid) return;
    const datos: any = { ...this.bombaForm.value, activa: !!this.bombaForm.value.activa };

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

  // ── Guardar Tablero ───────────────────────────────────────
  guardarTablero() {
    if (this.tableroForm.invalid) return;
    const datos: any = { ...this.tableroForm.value, activo: !!this.tableroForm.value.activo };

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

  // ── Guardar Activo ────────────────────────────────────────
  guardarActivo() {
    if (this.activoForm.invalid) return;
    const datos: any = {
      ...this.activoForm.value,
      activo: !!this.activoForm.value.activo,
      estacion_id: this.estacionSeleccionada.id
    };

    if (this.activoEditando) {
      this.estacionesService.actualizarActivo(this.activoEditando.id, datos).subscribe({
        next: () => { this.cerrarModales(); this.cargarEstaciones(); },
        error: (err: any) => console.error('Error actualizando activo', err)
      });
    } else {
      this.estacionesService.crearActivo(datos).subscribe({
        next: () => { this.cerrarModales(); this.cargarEstaciones(); },
        error: (err: any) => console.error('Error creando activo', err)
      });
    }
  }

  // ── Eliminar ──────────────────────────────────────────────
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

  toggleActivo(activo: any) {
  const accion = activo.activo ? 'desactivar' : 'activar';
  if (confirm(`¿${accion.charAt(0).toUpperCase() + accion.slice(1)} "${activo.nombre}"?`)) {
    this.estacionesService.actualizarActivo(activo.id, { activo: !activo.activo }).subscribe({
      next: () => this.cargarEstaciones(),
      error: (err) => console.error('Error actualizando activo', err)
    });
  }
}
  getCamposDelTipo(tipoActivoId: string | null | undefined): any[] {
  if (!tipoActivoId) return [];
  const tipo = this.tiposActivo.find(t => t.id === tipoActivoId);
  return tipo?.campos || [];
}
} 