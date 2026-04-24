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

  // ── Propiedades ─────
  tipos: any[]              = [];
  tipoSeleccionado: any     = null;
  campoEditando: any        = null;
  tipoEditando: any         = null;
  modalCampoAbierto         = false;
  modalTipoAbierto          = false;
  errorTipo: string | null  = null;
  previewOpciones: string[] = [];

  tiposInput = [
    { valor: 'numero',   etiqueta: 'Número'   },
    { valor: 'hora',     etiqueta: 'Hora'     },
    { valor: 'texto',    etiqueta: 'Texto'    },
    { valor: 'booleano', etiqueta: 'Sí / No'  },
    { valor: 'fecha',    etiqueta: 'Fecha'    },
    { valor: 'selector', etiqueta: 'Opción Multiple', tieneConfig: true },
  ];

  // ── Formularios ─────
  campoForm = this.fb.group({
    etiqueta:    ['', [Validators.required, Validators.minLength(2)]],
    nombre_campo:['', [Validators.required, Validators.minLength(2)]],
    tipo_input:  ['numero', Validators.required],
    requerido:   [false],
    orden:       [1],
    unidad:      [''],
    config_min:       [null],
    config_max:       [null],
    config_decimales: [0],
    config_opciones:  [''], 
  });

  tipoForm = this.fb.group({
    nombre: ['', [Validators.required, Validators.minLength(2)]],
    codigo: ['', [Validators.required, Validators.minLength(2)]],
  });

  // Getter para saber qué campos extra mostrar
  get tipoSeleccionadoEsNumero(): boolean {
    return this.campoForm.get('tipo_input')?.value === 'numero';
  }

  get tipoSeleccionadoEsSelector(): boolean {
    return this.campoForm.get('tipo_input')?.value === 'selector';
  }

  // ── Ciclo de vida ────
  ngOnInit() {
    this.cargarTipos();
    
    // Suscribirse a cambios en config_opciones para actualizar preview
    this.campoForm.get('config_opciones')?.valueChanges.subscribe(() => {
      this.actualizarPreviewOpciones();
    });
  }

  // ✅ CORRECCIÓN PRINCIPAL: cargarTipos mejorado
  cargarTipos() {
    this.estacionesService.getTiposConCampos().subscribe({
      next: (data) => { 
        console.log('📦 Datos recibidos del backend:', data);
        console.log('📊 Total de tipos recibidos:', data?.length || 0);
        
        // ✅ Asegurar que data sea un array y normalizar la estructura
        if (Array.isArray(data)) {
          this.tipos = data.map(tipo => ({
            ...tipo,
            campos: Array.isArray(tipo.campos) ? tipo.campos : [],
            nombre: tipo.nombre || 'Sin nombre',
            codigo: tipo.codigo || 'SIN_CODIGO',
            descripcion: tipo.descripcion || null,
            activo: tipo.activo !== false // Por defecto true si no está definido
          }));
        } else {
          console.error('❌ El backend no devolvió un array:', data);
          this.tipos = [];
        }
        
        console.log('✅ Tipos procesados y asignados:', this.tipos.length);
        console.log('📋 Primeros 3 tipos:', this.tipos.slice(0, 3));
        
        // ✅ Forzar detección de cambios
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('❌ Error cargando tipos:', err);
        this.tipos = [];
        this.cdr.detectChanges();
      }
    });
  }

  // ── Método para actualizar preview de opciones ────
  actualizarPreviewOpciones() {
    const opciones = this.campoForm.get('config_opciones')?.value || '';
    this.previewOpciones = opciones
      .split(',')
      .map((o: string) => o.trim())
      .filter((o: string) => o.length > 0);
  }

  // ── Métodos Modal Campo ──────────────────────────────────────
  abrirModalCampo(tipo: any) {
    this.tipoSeleccionado = tipo;
    this.campoEditando = null;
    this.campoForm.reset({
      tipo_input: 'numero',
      requerido:  false,
      orden:      (tipo.campos?.length || 0) + 1,
      config_decimales: 0, // ✅ Agregado valor por defecto
    });
    this.modalCampoAbierto = true;
    this.previewOpciones = [];
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
      config_min:        campo.config?.min      ?? null,
      config_max:        campo.config?.max      ?? null,
      config_decimales:  campo.config?.decimales ?? 0,
      config_opciones:   campo.config?.opciones?.join(', ') ?? '',
    });
    this.modalCampoAbierto = true;
    this.actualizarPreviewOpciones();
  }

  cerrarModal() {
    this.modalCampoAbierto = false;
    this.tipoSeleccionado = null;
    this.campoEditando = null;
    this.campoForm.reset();
    this.previewOpciones = [];
  }

  guardarCampo() {
    if (this.campoForm.invalid) return;

    const v = this.campoForm.value;

    // Construir config solo si aplica
    let config: any = undefined;
    if (v.tipo_input === 'numero') {
      config = {
        min:       v.config_min      !== null ? Number(v.config_min)      : undefined,
        max:       v.config_max      !== null ? Number(v.config_max)      : undefined,
        decimales: v.config_decimales !== null ? Number(v.config_decimales) : 0,
      };
      // ✅ Limpiar valores undefined del config
      config = Object.fromEntries(
        Object.entries(config).filter(([_, value]) => value !== undefined)
      );
    }
    if (v.tipo_input === 'selector' && v.config_opciones) {
      const opciones = v.config_opciones
        .split(',')
        .map((o: string) => o.trim())
        .filter((o: string) => o.length > 0);
      
      // ✅ Validar que haya al menos 2 opciones
      if (opciones.length < 2) {
        alert('El selector debe tener al menos 2 opciones');
        return;
      }
      
      config = { opciones };
    }

    const datos: any = {
      etiqueta: v.etiqueta,
      nombre_campo: v.nombre_campo,
      tipo_input: v.tipo_input,
      requerido: !!v.requerido,
      orden: Number(v.orden),
      unidad: v.unidad || null,
      tipo_activo_id: this.tipoSeleccionado.id,
      config: Object.keys(config || {}).length > 0 ? config : undefined
    };

    if (this.campoEditando) {
      this.estacionesService.actualizarCampo(this.campoEditando.id, datos).subscribe({
        next: () => { 
          this.cerrarModal(); 
          this.cargarTipos(); 
        },
        error: (err) => {
          console.error('Error actualizando campo', err);
          alert('Error al actualizar el campo: ' + (err.error?.message || 'Error desconocido'));
        }
      });
    } else {
      this.estacionesService.crearCampo(datos).subscribe({
        next: () => { 
          this.cerrarModal(); 
          this.cargarTipos(); 
        },
        error: (err) => {
          console.error('Error creando campo', err);
          alert('Error al crear el campo: ' + (err.error?.message || 'Error desconocido'));
        }
      });
    }
  }

  eliminarCampo(campo: any) {
    if (confirm(`¿Eliminar el campo "${campo.etiqueta}"?`)) {
      this.estacionesService.eliminarCampo(campo.id).subscribe({
        next: () => this.cargarTipos(),
        error: (err) => {
          console.error('Error eliminando campo', err);
          alert('Error al eliminar el campo');
        }
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
        next: () => { 
          this.cerrarModalTipo(); 
          this.cargarTipos(); 
        },
        error: (err: any) => { 
          this.errorTipo = err.error?.message || 'Error al actualizar'; 
          this.cdr.detectChanges(); 
        }
      });
    } else {
      this.estacionesService.crearTipoActivo(datos).subscribe({
        next: () => { 
          this.cerrarModalTipo(); 
          this.cargarTipos(); 
        },
        error: (err: any) => { 
          this.errorTipo = err.error?.message || 'Error al crear el tipo'; 
          this.cdr.detectChanges(); 
        }
      });
    }
  }

  eliminarTipo(tipo: any) {
    if (confirm(`¿Eliminar el tipo "${tipo.nombre}"? También se eliminarán sus campos.`)) {
      this.estacionesService.eliminarTipoActivo(tipo.id).subscribe({
        next: () => this.cargarTipos(),
        error: (err: any) => {
          console.error('Error eliminando tipo', err);
          alert('Error al eliminar el tipo');
        }
      });
    }
  }

  // ── Helpers visuales ─
  iconoPorTipo(tipo: string): string {
    const iconos: any = {
      numero:   'pin',
      hora:     'schedule',
      texto:    'notes',
      booleano: 'toggle_on',
      fecha:    'calendar_today',
      selector: 'list',
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
      selector: '#dc2626',
    };
    return colores[tipo] || '#64748b';
  }
}