import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router } from '@angular/router';
import { EstacionesService } from '../../services/estaciones.service';
import { OperacionesService } from '../../services/operaciones.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header';
import { ActivatedRoute } from '@angular/router';

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
  private route = inject(ActivatedRoute);
  cargandoParte = false;

  estaciones: any[] = [];
  estacionSeleccionada: any = null;
  guardando = false;
  errorMensaje = '';
  pasoActual = 1;
  totalPasos = 7;

  // PROPIEDADES PARA CONTROL DE PARTE EXISTENTE
  parteExistente: any = null;
  cambiosRealizados: number = 0;
  readonly LIMITE_CAMBIOS = 3;
  modoEdicion = false;

  // 🔥 FUNCIÓN HELPER PARA CONVERSIÓN SEGURA STRING → NUMBER
  private toNumber(value: any): number | null {
    if (value === null || value === undefined || value === '') return null;
    const num = Number(value);
    return isNaN(num) ? null : num;
  }

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
      next: (data) => {
        this.estaciones = data;
        this.cdr.detectChanges();

        const parteId = this.route.snapshot.queryParamMap.get('id');
        if (parteId) {
          this.cargarParteExistente(parteId);
        }
      },
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

  private construirEstructura(estacion: any) {
    this.estacionSeleccionada = estacion;

    this.bombasArray.clear();
    this.tablerosArray.clear();

    const bombasActivas = estacion.bombas?.filter((b: any) => b.activa) || [];
    bombasActivas.forEach((bomba: any) => {
      this.bombasArray.push(this.fb.group({
        bomba_id:    [bomba.id],
        bomba_nombre:[bomba.nombre],
        registros: this.fb.array([this.crearRegistroBombeo(bomba.ultimo_horometro)])
      }));
    });

    const tablerosActivos = estacion.tableros?.filter((t: any) => t.activo) || [];
    tablerosActivos.forEach((tablero: any) => {
      ['HABILITACION', 'DESACTIVACION'].forEach(momento => {
        this.tablerosArray.push(this.fb.group({
          tablero_id:    [tablero.id],
          tablero_nombre:[tablero.nombre],
          momento:       [momento],
          interruptor_estado: [''],
          selector_estado: [''],
          parada_emergencia_estado: [''],
          variador_estado: [''],
          alarma_estado: ['']
        }));
      });
    });

    this.activosEstacion = estacion.activos
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
  }

  onEstacionChange() {
    const id = this.form.get('estacion_id')?.value;
    const fecha = this.form.get('fecha_folio')?.value;

    const estacion = this.estaciones.find(e => e.id === id) || null;
    if (!estacion) return;

    this.form.patchValue({
      totalizador_inicial: estacion.ultimo_totalizador ?? null
    });

    this.construirEstructura(estacion);

    if (fecha) {
      this.validarParteExistente(id, fecha);
    }

    this.cdr.detectChanges();
  }

  // Verificar si ya existe un parte para esta estación y fecha
  validarParteExistente(estacionId: string, fecha: string) {
    this.operacionesService.verificarParteExistente(estacionId, fecha).subscribe({
      next: (resultado) => {
        if (resultado.existe) {
          this.parteExistente = resultado.parte;
          this.cambiosRealizados = resultado.parte.cambios_realizados || 0;
          this.modoEdicion = true;

          if (this.cambiosRealizados >= this.LIMITE_CAMBIOS) {
            this.errorMensaje = `⚠️ Ya existe un parte para esta estación hoy y ha alcanzado el límite de ${this.LIMITE_CAMBIOS} cambios permitidos. No se pueden realizar más modificaciones.`;
            this.form.disable();
          } else {
            this.errorMensaje = `ℹ️ Ya existe un parte para hoy. Estás en modo edición. Cambios realizados: ${this.cambiosRealizados}/${this.LIMITE_CAMBIOS}`;
          }
          this.cdr.detectChanges();
        } else {
          this.parteExistente = null;
          this.cambiosRealizados = 0;
          this.modoEdicion = false;
          this.errorMensaje = '';
          this.form.enable();
        }
      },
      error: (err) => {
        console.error('Error al verificar parte existente:', err);
      }
    });
  }

  cargarParteExistente(parteId: string) {
    this.cargandoParte = true;

    this.operacionesService.getPartePorId(parteId).subscribe({
      next: (parte: any) => {

        // 🔍 LOG DE VERIFICACIÓN (puedes eliminarlo después)
        console.log('🔍 Tipos recuperados de BD:', {
          temp: typeof parte.transformador_temperatura,
          ini: typeof parte.totalizador_inicial,
          fin: typeof parte.totalizador_final,
          valores: {
            temp: parte.transformador_temperatura,
            ini: parte.totalizador_inicial,
            fin: parte.totalizador_final
          }
        });

        // 1. Configuración inicial de estados
        this.parteExistente = parte;
        this.modoEdicion = true;
        this.cambiosRealizados = parte.cambios_realizados || 0;

        if (this.cambiosRealizados >= this.LIMITE_CAMBIOS) {
          this.errorMensaje = `⚠️ Límite de ${this.LIMITE_CAMBIOS} cambios alcanzado.`;
          this.form.disable();
        } else {
          this.errorMensaje = `ℹ️ Modo edición. Cambios: ${this.cambiosRealizados}/${this.LIMITE_CAMBIOS}`;
        }

        // 2. Parchar campos principales del formulario
        // 🔥 CORRECCIÓN: Convertir strings a números usando toNumber()
        this.form.patchValue({
          fecha_folio:   parte.fecha_folio?.substring(0, 10),
          estacion_id:   parte.estacion?.id,
          interruptor_llegada_10kv_estado: parte.interruptor_llegada_10kv_estado || '',
          
          // 🔥 CONVERSIÓN A NÚMEROS - CRÍTICO
          transformador_temperatura: this.toNumber(parte.transformador_temperatura),
          
          llegada_fase_R: this.toNumber(parte.llegadaFase_r),
          llegada_fase_S: this.toNumber(parte.llegadaFase_s),
          llegada_fase_T: this.toNumber(parte.llegadaFase_t),
          tablero_fase_R: this.toNumber(parte.tableroFase_r),
          tablero_fase_S: this.toNumber(parte.tableroFase_s),
          tablero_fase_T: this.toNumber(parte.tableroFase_t),
          
          inicial_hora_registro:         parte.inicialHora_registro,
          inicial_nivel_cisterna:        this.toNumber(parte.inicialNivel_cisterna),
          inicial_presion_linea:         this.toNumber(parte.inicialPresion_linea),
          inicial_presion_jatun_huaylla: this.toNumber(parte.inicialPresion_jatun_huaylla),
          
          // 🔥 CONVERSIÓN A NÚMEROS - CRÍTICO
          totalizador_inicial: this.toNumber(parte.totalizador_inicial),
          
          final_hora_registro:           parte.finalHora_registro,
          final_nivel_cisterna:          this.toNumber(parte.finalNivel_cisterna),
          final_presion_linea:           this.toNumber(parte.finalPresion_linea),
          final_presion_jatun_huaylla:   this.toNumber(parte.finalPresion_jatun_huaylla),
          
          // 🔥 CONVERSIÓN A NÚMEROS - CRÍTICO
          totalizador_final: this.toNumber(parte.totalizador_final),
          
          nivel_cisterna_final: this.toNumber(parte.nivel_cisterna_final),
          presion_linea_final:  this.toNumber(parte.presion_linea_final),
          
          habilitacion_estado_telemetria:  parte.habilitacionEstado_telemetria,
          habilitacion_presion_ingreso:    this.toNumber(parte.habilitacionPresion_ingreso),
          desactivacion_estado_telemetria: parte.desactivacionEstado_telemetria,
          desactivacion_presion_ingreso:   this.toNumber(parte.desactivacionPresion_ingreso),
        });

        // 🔍 LOG DE VERIFICACIÓN POST-PATCH (puedes eliminarlo después)
        console.log('✅ Valores después de patchValue:', {
          temp: this.form.get('transformador_temperatura')?.value,
          ini: this.form.get('totalizador_inicial')?.value,
          fin: this.form.get('totalizador_final')?.value,
          tipos: {
            temp: typeof this.form.get('transformador_temperatura')?.value,
            ini: typeof this.form.get('totalizador_inicial')?.value,
            fin: typeof this.form.get('totalizador_final')?.value
          }
        });

        // 3. GENERAR ESTRUCTURA (Activos, Bombas, Tableros)
        const estacionObj = this.estaciones.find(e => e.id === parte.estacion?.id);
        if (estacionObj) {
          this.construirEstructura(estacionObj);
        }

        // 4. RELLENAR BOMBAS CON DATOS REALES
        const detalles: any[] = parte.detallesBombeo || [];
        this.bombasArray.controls.forEach((bombaCtrl, i) => {
          const bombaId = bombaCtrl.get('bomba_id')?.value;
          const registrosDeBomba = detalles.filter(d => d.bomba?.id === bombaId);

          if (registrosDeBomba.length > 0) {
            const registrosArray = this.getRegistrosBomba(i);
            registrosArray.clear();

            registrosDeBomba.forEach((detalle: any) => {
              const encendido = detalle.encendido ? new Date(detalle.encendido).toISOString().substring(11, 16) : '';
              const apagado = detalle.apagado ? new Date(detalle.apagado).toISOString().substring(11, 16) : '';

              registrosArray.push(this.fb.group({
                encendido:         [encendido, Validators.required],
                apagado:           [apagado, Validators.required],
                horometro_inicial: [detalle.horometro_inicial, Validators.required],
                horometro_final:   [detalle.horometro_final],
                observacion:       [detalle.observacion || '']
              }));
            });
          }
        });

        // 5. RELLENAR TABLEROS CON DATOS REALES
        const verificaciones: any[] = parte.verificacionesTablero || [];
        this.tablerosArray.controls.forEach((tableroCtrl) => {
          const tableroId = tableroCtrl.get('tablero_id')?.value;
          const momento   = tableroCtrl.get('momento')?.value;

          const v = verificaciones.find(v => v.tablero?.id === tableroId && v.momento === momento);
          if (v) {
            tableroCtrl.patchValue({
              interruptor_estado:       v.interruptor_estado || '',
              selector_estado:          v.selector_estado || '',
              parada_emergencia_estado: v.parada_emergencia_estado || '',
              variador_estado:          v.variador_estado || '',
              alarma_estado:            v.alarma_estado || '',
            });
          }
        });
        
        // 6. RELLENAR ACTIVOS (CORREGIDO USANDO valoresRegistro)
        console.log('=== DEBUG ACTIVOS CORREGIDO ===');

        const valores: any[] = parte.valoresRegistro || [];

        if (valores.length === 0) {
          console.warn('⚠️ No hay valoresRegistro');
        }

        this.valoresActivos = [];

        // 🔥 Agrupar por activo (igual que tu PDF)
        const mapa = new Map<string, any>();

        valores.forEach((v: any) => {
          const activoId = v.activo_id;

          if (!activoId) {
            console.warn('⚠️ valor sin activo_id', v);
            return;
          }

          if (!mapa.has(activoId)) {
            mapa.set(activoId, {
              id: activoId,
              nombre: v.activo?.nombre || '—',
              tipo: v.activo?.tipoActivo?.nombre || '—',
              campos: []
            });
          }

          mapa.get(activoId).campos.push({
            campo_id: v.campo_id,
            nombre: v.campo?.nombre_campo,
            etiqueta: v.campo?.etiqueta,
            valor: v.valor,
            unidad: v.campo?.unidad || ''
          });
        });

        const activosConValores = Array.from(mapa.values());

        console.log('🔥 activosConValores:', activosConValores);

        // 🎯 Llenar estructura que usa el formulario
        activosConValores.forEach((activo: any) => {
          activo.campos.forEach((campo: any) => {

            const valor = campo.valor;

            console.log('🔎 campo:', campo.nombre, 'valor:', valor);

            if (valor !== null && valor !== undefined && valor !== '') {

              this.valoresActivos.push({
                activo_id: activo.id,
                campo_id: campo.campo_id,
                valor: valor.toString()
              });

              console.log('✅ INSERTADO:', {
                activo_id: activo.id,
                campo_id: campo.campo_id,
                valor
              });

            } else {
              console.warn('⚠️ valor vacío:', campo.nombre);
            }

          });
        });

        console.log('📊 valoresActivos FINAL:', this.valoresActivos);

        // 7. CARGAR OPERADORES
        const userStr = localStorage.getItem('user');
        const user = userStr ? JSON.parse(userStr) : null;
        const turnoEditor = this.cambiosRealizados + 1;

        while (this.operadoresArray.length > 0) this.operadoresArray.removeAt(0);

        const operadoresExistentes = parte.operadores || [];
        for (let i = 0; i < 3; i++) {
          const opExistente = operadoresExistentes.find((op: any) => Number(op.turno) === i + 1);
          this.agregarOperador(i === 0);

          if (i + 1 === turnoEditor && user) {
            this.operadoresArray.at(i).patchValue({ nombre_operador: user.nombre_completo });
            this.operadoresArray.at(i).get('nombre_operador')?.disable();
          } else if (opExistente) {
            this.operadoresArray.at(i).patchValue({ nombre_operador: opExistente.nombre_operador });
            this.operadoresArray.at(i).get('nombre_operador')?.disable();
          }
        }

        this.cargandoParte = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.cargandoParte = false;
        console.error('❌ Error cargando parte:', err);
      }
    });
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

  getValor(activoId: string, campoId: string): string {
    const v = this.valoresActivos.find(
      x => x.activo_id === activoId && x.campo_id === campoId
    );
    return v?.valor || '';
  }

  setValor(activoId: string, campoId: string, evento: Event) {
    const valor = (evento.target as HTMLInputElement).value;
    console.log('setValor llamado:', { activoId, campoId, valor }); 
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

    if (this.valoresActivos.length > 0) {
      payload.registros_activo = this.valoresActivos
        .filter(v => v.valor !== '')
        .map(v => ({
          activo_id: v.activo_id,
          campo_id:  v.campo_id,
          valor:     v.valor,
        }));
    }

    const operacion = this.modoEdicion && this.parteExistente
      ? this.operacionesService.actualizarParte(this.parteExistente.id, payload)
      : this.operacionesService.crearParte(payload);

    console.log('=== PAYLOAD registros_activo ===', JSON.stringify(payload.registros_activo, null, 2));

    operacion.subscribe({
      next: (response: any) => {
        this.guardando = false;
        const mensaje = this.modoEdicion
          ? `Parte actualizado correctamente (Cambio ${response.data?.cambios_realizados || this.cambiosRealizados + 1}/${this.LIMITE_CAMBIOS})`
          : 'Parte creado correctamente';
        alert(mensaje);
        this.router.navigate(['/partes']);
      },
      error: (err: any) => {
        this.guardando = false;
        console.log('=== ERROR COMPLETO ===', JSON.stringify(err?.error, null, 2));
        console.log('STATUS:', err?.status);
        this.errorMensaje = err?.error?.message || 'Error al guardar el parte diario';
        this.cdr.detectChanges();
      }
    });
  }
}