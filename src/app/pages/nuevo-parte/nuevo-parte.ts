import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router } from '@angular/router';
import { EstacionesService } from '../../services/estaciones.service';
import { OperacionesService } from '../../services/operaciones.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header';

function soloTextoValidator(control: AbstractControl): ValidationErrors | null {
  const valor = control.value || '';
  const regex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/;
  if (valor && !regex.test(valor)) {
    return { soloTexto: true };
  }
  return null;
}

function n(value: any): any {
  if (value === '' || value === undefined || value === null) return null;
  return value;
}

@Component({
  selector: 'app-nuevo-parte',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, PageHeaderComponent],
  templateUrl: './nuevo-parte.html',
  styleUrl: './nuevo-parte.css'
})
export class NuevoParte implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private estacionesService = inject(EstacionesService);
  private operacionesService = inject(OperacionesService);
  private cdr = inject(ChangeDetectorRef);

  estaciones: any[] = [];
  estacionSeleccionada: any = null;
  guardando = false;
  errorMensaje = '';
  pasoActual = 1;
  totalPasos = 7; 

  // ── NUEVOS ────────────────────────────────────────────────
  activosEstacion: any[] = [];
  valoresActivos: { activo_id: string; campo_id: string; valor: string }[] = [];

  form: FormGroup = this.fb.group({
    fecha_folio: [new Date().toISOString().split('T')[0], Validators.required],
    estacion_id: ['', Validators.required],

    interruptor_llegada_10kv_estado: ['', Validators.required],
    transformador_temperatura: [null, Validators.required],
    llegada_fase_R: [null],
    llegada_fase_S: [null],
    llegada_fase_T: [null],
    tablero_fase_R: [null],
    tablero_fase_S: [null],
    tablero_fase_T: [null],

    inicial_hora_registro: [''],
    inicial_nivel_cisterna: [null],
    inicial_presion_linea: [null],
    inicial_presion_jatun_huaylla: [null],
    totalizador_inicial: [null, Validators.required],

    final_hora_registro: [''],
    final_nivel_cisterna: [null],
    final_presion_linea: [null],
    final_presion_jatun_huaylla: [null],
    totalizador_final: [null, Validators.required],
    nivel_cisterna_final: [null],
    presion_linea_final: [null],

    habilitacion_estado_telemetria: [''],
    habilitacion_presion_ingreso: [null],
    desactivacion_estado_telemetria: [''],
    desactivacion_presion_ingreso: [null],

    operadores: this.fb.array([]),
    bombas: this.fb.array([]),
    tableros: this.fb.array([])
  });

  ngOnInit() {
    this.estacionesService.getEstaciones().subscribe({
      next: (data) => { console.log('📦 DATOS DEL BACKEND:', data); this.estaciones = data; this.cdr.detectChanges(); },
      error: (err) => console.error(err)
    });

    this.agregarOperador(true);
    this.agregarOperador(false);
    this.agregarOperador(false);

    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      this.operadoresArray.at(0).patchValue({ nombre_operador: user.nombre_completo });
      this.operadoresArray.at(0).get('nombre_operador')?.disable();
    }
  }

  get operadoresArray() { return this.form.get('operadores') as FormArray; }
  get bombasArray()     { return this.form.get('bombas') as FormArray; }
  get tablerosArray()   { return this.form.get('tableros') as FormArray; }

  get produccionCalculada(): number {
    const ini = this.form.get('totalizador_inicial')?.value || 0;
    const fin = this.form.get('totalizador_final')?.value || 0;
    return fin - ini;
  }

  onEstacionChange() {
    const id = this.form.get('estacion_id')?.value;
    this.estacionSeleccionada = this.estaciones.find(e => e.id === id) || null;
    
    if (!this.estacionSeleccionada) return;
    // Si la estación trae el último totalizador de ayer, lo inyectamos en el formulario
    if (this.estacionSeleccionada.ultimo_totalizador !== undefined && this.estacionSeleccionada.ultimo_totalizador !== null) {
      this.form.patchValue({
        totalizador_inicial: this.estacionSeleccionada.ultimo_totalizador
      });
    } else {
      // Si por alguna razón no hay 
      this.form.patchValue({
        totalizador_inicial: null
      });
    }
    this.bombasArray.clear();
    this.tablerosArray.clear();

    const bombasActivas = this.estacionSeleccionada.bombas?.filter((b: any) => b.activa) || [];
    bombasActivas.forEach((bomba: any) => {
      this.bombasArray.push(this.fb.group({
        bomba_id:    [bomba.id],
        bomba_nombre:[bomba.nombre],
        registros: this.fb.array([this.crearRegistroBombeo(bomba.ultimo_horometro)])
      }));
    });

    const tablerosActivos = this.estacionSeleccionada.tableros?.filter((t: any) => t.activo) || [];
    tablerosActivos.forEach((tablero: any) => {
      this.tablerosArray.push(this.fb.group({
        tablero_id:    [tablero.id],
        tablero_nombre:[tablero.nombre],
        momento:       ['HABILITACION'],
        interruptor_estado: [''],
        selector_estado: [''],
        parada_emergencia_estado: [''],
        variador_estado: [''],
        alarma_estado: ['']
      }));
      this.tablerosArray.push(this.fb.group({
        tablero_id:    [tablero.id],
        tablero_nombre:[tablero.nombre],
        momento:       ['DESACTIVACION'],
        interruptor_estado: [''],
        selector_estado: [''],
        parada_emergencia_estado: [''],
        variador_estado: [''],
        alarma_estado: ['']
      }));
    });

    this.activosEstacion = this.estacionSeleccionada.activos
      ?.filter((a: any) => a.activo)
      ?.sort((a: any, b: any) => a.orden - b.orden) || [];

    this.valoresActivos = [];
    this.activosEstacion.forEach((activo: any) => {
      const campos = activo.tipoActivo?.campos
        ?.sort((a: any, b: any) => a.orden - b.orden) || [];
      campos.forEach((campo: any) => {
        this.valoresActivos.push({
          activo_id: activo.id,
          campo_id:  campo.id,
          valor:     '',
        });
      });
    });

    this.cdr.detectChanges();
  }

  agregarOperador(obligatorio = false) {
    this.operadoresArray.push(this.fb.group({
      nombre_operador: [
        '',
        obligatorio ? [Validators.required, soloTextoValidator] : [soloTextoValidator]
      ],
      numero_turno: [this.operadoresArray.length + 1]
    }));
  }

  eliminarOperador(i: number) {
    this.operadoresArray.removeAt(i);
  }

  getRegistrosBomba(i: number): FormArray {
    return this.bombasArray.at(i).get('registros') as FormArray;
  }

  crearRegistroBombeo(valorInicial: any = null): FormGroup {
    return this.fb.group({
      encendido:         ['', Validators.required],
      apagado:           ['', Validators.required],
      horometro_inicial: [valorInicial, Validators.required],
      horometro_final:   [null],
      observacion:       ['']
    });
  }

  agregarRegistro(bombaIndex: number) {
    this.getRegistrosBomba(bombaIndex).push(this.crearRegistroBombeo());
    this.cdr.detectChanges();
  }

  eliminarRegistro(bombaIndex: number, registroIndex: number) {
    if (this.getRegistrosBomba(bombaIndex).length > 1) {
      this.getRegistrosBomba(bombaIndex).removeAt(registroIndex);
      this.cdr.detectChanges();
    }
  }

  getTablerosPorMomento(momento: string) {
    return this.tablerosArray.controls.filter(c => c.get('momento')?.value === momento);
  }

  getTableroIndex(momento: string, i: number): number {
    let count = 0;
    for (let j = 0; j < this.tablerosArray.length; j++) {
      if (this.tablerosArray.at(j).get('momento')?.value === momento) {
        if (count === i) return j;
        count++;
      }
    }
    return -1;
  }

  operadorTieneError(i: number): boolean {
    const ctrl = this.operadoresArray.at(i).get('nombre_operador');
    return !!(ctrl?.invalid && ctrl?.touched);
  }

  getMensajeErrorOperador(i: number): string {
    const ctrl = this.operadoresArray.at(i).get('nombre_operador');
    if (ctrl?.errors?.['required']) return 'El nombre del operador es obligatorio';
    if (ctrl?.errors?.['soloTexto']) return 'Solo se permiten letras, sin números';
    return '';
  }

  // ── NUEVOS MÉTODOS PARA ACTIVOS ───────────────────────────

  getValor(activoId: string, campoId: string): string {
    const v = this.valoresActivos.find(
      x => x.activo_id === activoId && x.campo_id === campoId
    );
    return v?.valor || '';
  }

  setValor(activoId: string, campoId: string, evento: Event) {
    const valor = (evento.target as HTMLInputElement).value;
    const v = this.valoresActivos.find(
      x => x.activo_id === activoId && x.campo_id === campoId
    );
    if (v) v.valor = valor;
  }

  tieneActivos(): boolean {
    return this.activosEstacion.length > 0;
  }

  getIconoPorTipo(tipo: string): string {
    const iconos: any = {
      numero:   'pin',
      hora:     'schedule',
      texto:    'notes',
      booleano: 'toggle_on',
      fecha:    'calendar_today',
    };
    return iconos[tipo] || 'input';
  }

  // ── NAVEGACIÓN ────────────────────────────────────────────

  siguientePaso() {
    this.errorMensaje = '';

    if (this.pasoActual === 1) {
      ['fecha_folio', 'estacion_id'].forEach(c => this.form.get(c)?.markAsTouched());
      if (this.form.get('fecha_folio')?.invalid || this.form.get('estacion_id')?.invalid) {
        this.errorMensaje = 'Selecciona la fecha y la estación antes de continuar';
        this.cdr.detectChanges(); return;
      }
      const primerOp = this.operadoresArray.at(0)?.get('nombre_operador');
      primerOp?.markAsTouched();
      if (primerOp?.invalid) {
        this.errorMensaje = 'El nombre del primer operador es obligatorio';
        this.cdr.detectChanges(); return;
      }
      let opInvalido = false;
      this.operadoresArray.controls.forEach((ctrl, i) => {
        if (i > 0) { ctrl.get('nombre_operador')?.markAsTouched(); if (ctrl.get('nombre_operador')?.invalid) opInvalido = true; }
      });
      if (opInvalido) { this.errorMensaje = 'Los nombres de operadores solo pueden contener letras'; this.cdr.detectChanges(); return; }
    }

    if (this.pasoActual === 2) {
      ['interruptor_llegada_10kv_estado', 'transformador_temperatura'].forEach(c => this.form.get(c)?.markAsTouched());
      if (this.form.get('interruptor_llegada_10kv_estado')?.invalid || this.form.get('transformador_temperatura')?.invalid) {
        this.errorMensaje = 'El interruptor y la temperatura del transformador son obligatorios';
        this.cdr.detectChanges(); return;
      }
    }

    if (this.pasoActual === 3) {
      this.form.get('totalizador_inicial')?.markAsTouched();
      if (this.form.get('totalizador_inicial')?.invalid) {
        this.errorMensaje = 'El totalizador inicial es obligatorio';
        this.cdr.detectChanges(); return;
      }
    }

    if (this.pasoActual === 4 && this.bombasArray.length > 0) {
      let bombaInvalida = false;
      this.bombasArray.controls.forEach((bomba, i) => {
        this.getRegistrosBomba(i).controls.forEach(registro => {
          ['encendido', 'apagado', 'horometro_inicial'].forEach(campo => {
            registro.get(campo)?.markAsTouched();
            if (registro.get(campo)?.invalid) bombaInvalida = true;
          });
        });
      });
      if (bombaInvalida) { this.errorMensaje = 'Completa todos los datos de encendido y apagado'; this.cdr.detectChanges(); return; }
    }
    
    if (this.pasoActual === 5) {
      const faltantes = this.valoresActivos.filter(v => {
        const activo = this.activosEstacion.find(a => a.id === v.activo_id);
        const campo = activo?.tipoActivo?.campos?.find((c: any) => c.id === v.campo_id);
        return campo?.requerido && (!v.valor || v.valor.trim() === '');
      });
      if (faltantes.length > 0) {
        this.errorMensaje = `Hay ${faltantes.length} campo(s) obligatorio(s) sin completar`;
        this.cdr.detectChanges(); return;
      }
    }

    if (this.pasoActual === 6) {
      this.form.get('totalizador_final')?.markAsTouched();
      if (this.form.get('totalizador_final')?.invalid) {
        this.errorMensaje = 'El totalizador final es obligatorio';
        this.cdr.detectChanges(); return;
      }
    }

    if (this.pasoActual < this.totalPasos) { this.pasoActual++; this.cdr.detectChanges(); }
  }

  anteriorPaso() {
    this.errorMensaje = '';
    if (this.pasoActual > 1) this.pasoActual--;
  }

  irAPaso(paso: number) {
    if (paso < this.pasoActual) { this.errorMensaje = ''; this.pasoActual = paso; }
  }

  guardar() {
    if (this.form.invalid) {
      this.errorMensaje = 'Por favor completa todos los campos requeridos';
      this.cdr.detectChanges(); return;
    }

    this.guardando = true;
    this.errorMensaje = '';
    const v = this.form.value;

    const payload: any = {
      fecha_folio:  v.fecha_folio,
      estacion_id:  v.estacion_id,
      interruptor_llegada_10kv_estado: v.interruptor_llegada_10kv_estado,
      transformador_temperatura: v.transformador_temperatura,
      totalizador_inicial: v.totalizador_inicial,
      totalizador_final:   v.totalizador_final,
      nivel_cisterna_final: n(v.nivel_cisterna_final),
      presion_linea_final:  n(v.presion_linea_final),
      tension_llegada: {
        fase_R: n(v.llegada_fase_R),
        fase_S: n(v.llegada_fase_S),
        fase_T: n(v.llegada_fase_T)
      },
      tension_tablero: {
        fase_R: n(v.tablero_fase_R),
        fase_S: n(v.tablero_fase_S),
        fase_T: n(v.tablero_fase_T)
      },
      lectura_inicial: {
        hora_registro:         n(v.inicial_hora_registro),
        nivel_cisterna:        n(v.inicial_nivel_cisterna),
        presion_linea:         n(v.inicial_presion_linea),
        presion_jatun_huaylla: n(v.inicial_presion_jatun_huaylla),
        totalizador:           v.totalizador_inicial
      },
      lectura_final: {
        hora_registro:         n(v.final_hora_registro),
        nivel_cisterna:        n(v.final_nivel_cisterna),
        presion_linea:         n(v.final_presion_linea),
        presion_jatun_huaylla: n(v.final_presion_jatun_huaylla),
        totalizador:           v.totalizador_final
      },
      condicion_habilitacion: {
        estado_telemetria: n(v.habilitacion_estado_telemetria),
        presion_ingreso:   n(v.habilitacion_presion_ingreso)
      },
      condicion_desactivacion: {
        estado_telemetria: n(v.desactivacion_estado_telemetria),
        presion_ingreso:   n(v.desactivacion_presion_ingreso)
      },
      operadores: this.operadoresArray.getRawValue()
      .filter((op: any) => op.nombre_operador?.trim())
      .map((op: any, i: number) => ({
        nombre_operador: op.nombre_operador,
        numero_turno: i + 1
      })),
      bombeos: v.bombas.flatMap((b: any) =>
        b.registros.map((r: any) => ({
          bomba_id:          b.bomba_id,
          encendido:         r.encendido,
          apagado:           r.apagado,
          horometro_inicial: Number(r.horometro_inicial),
          horometro_final:   r.horometro_final ? Number(r.horometro_final) : null,
          observacion:       n(r.observacion)
        }))
      ),
      tableros: v.tableros.map((t: any) => ({
        tablero_id: t.tablero_id,
        momento:    t.momento,
        interruptor_estado:       n(t.interruptor_estado),
        selector_estado:          n(t.selector_estado),
        parada_emergencia_estado: n(t.parada_emergencia_estado),
        variador_estado:          n(t.variador_estado),
        alarma_estado:            n(t.alarma_estado)
      })),
    };

    // ── NUEVO: agregar valores de activos si hay ──────────
    if (this.valoresActivos.length > 0) {
      payload.registros_activo = this.valoresActivos
        .filter(v => v.valor !== '')
        .map(v => ({
          activo_id: v.activo_id,
          campo_id:  v.campo_id,
          valor:     v.valor,
        }));
    }

    this.operacionesService.crearParte(payload).subscribe({
      next: () => {
        this.guardando = false;
        this.router.navigate(['/partes']);
      },
      error: (err: any) => {
        this.guardando = false;
        this.errorMensaje = err?.error?.message || 'Error al guardar el parte diario';
        this.cdr.detectChanges();
      }
    });
  }
}