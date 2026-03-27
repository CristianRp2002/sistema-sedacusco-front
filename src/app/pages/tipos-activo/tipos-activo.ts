import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { EstacionesService } from '../../services/estaciones.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header';
import { ModalComponent } from '../../shared/components/modal/modal';
import { FormInputComponent } from '../../shared/components/form-input/form-input';

@Component({
  selector: 'app-tipos-activo',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, PageHeaderComponent, ModalComponent, FormInputComponent],
  templateUrl: './tipos-activo.html',
  styleUrl: './tipos-activo.css'
})
export class TiposActivo implements OnInit {
  private fb                = inject(FormBuilder);
  private estacionesService = inject(EstacionesService);
  private cdr               = inject(ChangeDetectorRef);

  // ── Propiedades ─────────────────────────────────────────────
  tipos: any[]              = [];
  tipoSeleccionado: any     = null;
  campoEditando: any        = null;
  tipoEditando: any         = null;
  modalCampoAbierto         = false;
  modalTipoAbierto          = false;
  errorTipo: string | null  = null;

  tiposInput = [
    { valor: 'numero',   etiqueta: 'Número'   },
    { valor: 'hora',     etiqueta: 'Hora'     },
    { valor: 'texto',    etiqueta: 'Texto'    },
    { valor: 'booleano', etiqueta: 'Sí / No'  },
    { valor: 'fecha',    etiqueta: 'Fecha'    },
  ];

  // ── Formularios ─────────────────────────────────────────────
  campoForm = this.fb.group({
    etiqueta:    ['', [Validators.required, Validators.minLength(2)]],
    nombre_campo:['', [Validators.required, Validators.minLength(2)]],
    tipo_input:  ['numero', Validators.required],
    requerido:   [false],
    orden:       [1],
    unidad:      [''],
  });

  tipoForm = this.fb.group({
    nombre: ['', [Validators.required, Validators.minLength(2)]],
    codigo: ['', [Validators.required, Validators.minLength(2)]],
  });

  // ── Ciclo de vida ────────────────────────────────────────────
  ngOnInit() {
    this.cargarTipos();
  }

  cargarTipos() {
    this.estacionesService.getTiposConCampos().subscribe({
      next: (data) => { this.tipos = data; this.cdr.detectChanges(); },
      error: (err) => console.error('Error cargando tipos', err)
    });
  }

  // ── Métodos Modal Campo ──────────────────────────────────────
  abrirModalCampo(tipo: any) {
    this.tipoSeleccionado = tipo;
    this.campoEditando = null;
    this.campoForm.reset({
      tipo_input: 'numero',
      requerido:  false,
      orden:      (tipo.campos?.length || 0) + 1,
    });
    this.modalCampoAbierto = true;
  }

  editarCampo(campo: any, tipo: any) {
    this.tipoSeleccionado = tipo;
    this.campoEditando = campo;
    this.campoForm.patchValue({
      etiqueta:     campo.etiqueta,
      nombre_campo: campo.nombre_campo,
      tipo_input:   campo.tipo_input,
      requerido:    campo.requerido,
      orden:        campo.orden,
      unidad:       campo.unidad,
    });
    this.modalCampoAbierto = true;
  }

  cerrarModal() {
    this.modalCampoAbierto = false;
    this.tipoSeleccionado = null;
    this.campoEditando = null;
    this.campoForm.reset();
  }

  guardarCampo() {
    if (this.campoForm.invalid) return;

    const datos: any = {
      ...this.campoForm.value,
      tipo_activo_id: this.tipoSeleccionado.id,
      requerido: !!this.campoForm.value.requerido,
    };

    if (this.campoEditando) {
      this.estacionesService.actualizarCampo(this.campoEditando.id, datos).subscribe({
        next: () => { this.cerrarModal(); this.cargarTipos(); },
        error: (err) => console.error('Error actualizando campo', err)
      });
    } else {
      this.estacionesService.crearCampo(datos).subscribe({
        next: () => { this.cerrarModal(); this.cargarTipos(); },
        error: (err) => console.error('Error creando campo', err)
      });
    }
  }

  eliminarCampo(campo: any) {
    if (confirm(`¿Eliminar el campo "${campo.etiqueta}"?`)) {
      this.estacionesService.eliminarCampo(campo.id).subscribe({
        next: () => this.cargarTipos(),
        error: (err) => console.error('Error eliminando campo', err)
      });
    }
  }

  // ── Métodos Modal Tipo ───────────────────────────────────────
  abrirModalTipo() {
    this.tipoEditando = null;
    this.errorTipo = null;
    this.tipoForm.reset();
    this.modalTipoAbierto = true;
  }

  editarTipo(tipo: any) {
    this.tipoEditando = tipo;
    this.errorTipo = null;
    this.tipoForm.patchValue({
      nombre: tipo.nombre,
      codigo: tipo.codigo,
    });
    this.modalTipoAbierto = true;
  }

  cerrarModalTipo() {
    this.modalTipoAbierto = false;
    this.tipoEditando = null;
    this.errorTipo = null;
    this.tipoForm.reset();
  }

  guardarTipo() {
    if (this.tipoForm.invalid) return;
    this.errorTipo = null;

    const datos = {
      nombre: this.tipoForm.value.nombre!,
      codigo: this.tipoForm.value.codigo!.toUpperCase().replace(/\s+/g, '_'),
    };

    if (this.tipoEditando) {
      this.estacionesService.actualizarTipoActivo(this.tipoEditando.id, datos).subscribe({
        next: () => { this.cerrarModalTipo(); this.cargarTipos(); },
        error: (err: any) => { this.errorTipo = err.error?.message || 'Error al actualizar'; this.cdr.detectChanges(); }
      });
    } else {
      this.estacionesService.crearTipoActivo(datos).subscribe({
        next: () => { this.cerrarModalTipo(); this.cargarTipos(); },
        error: (err: any) => { this.errorTipo = err.error?.message || 'Error al crear el tipo'; this.cdr.detectChanges(); }
      });
    }
  }

  eliminarTipo(tipo: any) {
    if (confirm(`¿Eliminar el tipo "${tipo.nombre}"? También se eliminarán sus campos.`)) {
      this.estacionesService.eliminarTipoActivo(tipo.id).subscribe({
        next: () => this.cargarTipos(),
        error: (err: any) => console.error('Error eliminando tipo', err)
      });
    }
  }

  // ── Helpers visuales ─────────────────────────────────────────
  iconoPorTipo(tipo: string): string {
    const iconos: any = {
      numero:   'pin',
      hora:     'schedule',
      texto:    'notes',
      booleano: 'toggle_on',
      fecha:    'calendar_today',
    };
    return iconos[tipo] || 'input';
  }

  colorPorTipo(tipo: string): string {
    const colores: any = {
      numero:   '#0072BC',
      hora:     '#9333ea',
      texto:    '#16a34a',
      booleano: '#ea580c',
      fecha:    '#0891b2',
    };
    return colores[tipo] || '#64748b';
  }
}