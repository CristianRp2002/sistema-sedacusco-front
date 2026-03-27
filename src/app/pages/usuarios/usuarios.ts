import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { UsuariosService } from '../../services/usuarios';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header';
import { SearchBarComponent } from '../../shared/components/search-bar/search-bar';
import { ModalComponent } from '../../shared/components/modal/modal';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge';
import { FormInputComponent } from '../../shared/components/form-input/form-input';
import { NotificacionService } from '../../services/notificacion.service';

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, PageHeaderComponent, SearchBarComponent, ModalComponent, StatusBadgeComponent, FormInputComponent],
  templateUrl: './usuarios.html',
  styleUrl: './usuarios.css'
})
export class Usuarios implements OnInit {
  private notificacion = inject(NotificacionService);
  private fb = inject(FormBuilder);
  private usuariosService = inject(UsuariosService);
  private cdr = inject(ChangeDetectorRef);

  usuarios: any[] = [];
  usuariosFiltrados: any[] = [];
  roles: any[] = [];
  modalAbierto = false;
  mostrarPassword = false;
  usuarioEditando: any = null;

  usuarioForm = this.fb.group({
    nombre_completo: ['', [Validators.required, Validators.minLength(3)]],
    username: ['', [Validators.required, Validators.minLength(3)]],
    password: ['', [Validators.minLength(6)]],
    rol_id: ['', Validators.required],
    telefono:        [''],   
    dni:             [''],   
  });

  ngOnInit() {
    this.cargarUsuarios();
    this.cargarRoles();
  }

  cargarUsuarios() {
    this.usuariosService.getUsuarios().subscribe({
      next: (data) => {
        this.usuarios = data;
        this.usuariosFiltrados = data;
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error cargando usuarios', err)
    });
  }

  cargarRoles() {
    this.usuariosService.getRoles().subscribe({
      next: (data) => {
        this.roles = data;
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error cargando roles', err)
    });
  }

  filtrarTexto(texto: string) {
    this.usuariosFiltrados = this.usuarios.filter(u =>
      u.nombre_completo.toLowerCase().includes(texto.toLowerCase()) ||
      u.username.toLowerCase().includes(texto.toLowerCase())
    );
  }

  filtrarRol(rol: string) {
    this.usuariosFiltrados = rol
      ? this.usuarios.filter(u => u.rol?.nombre === rol)
      : this.usuarios;
  }

  abrirModal() {
    this.usuarioEditando = null;
    this.mostrarPassword = false;
    this.usuarioForm.reset();
    this.usuarioForm.get('password')?.setValidators([Validators.required, Validators.minLength(6)]);
    this.usuarioForm.get('password')?.updateValueAndValidity();
    this.modalAbierto = true;
  }

  editarUsuario(usuario: any) {
    this.usuarioEditando = usuario;
    this.mostrarPassword = false;
    this.usuarioForm.patchValue({
      nombre_completo: usuario.nombre_completo,
      username:        usuario.username,
      rol_id:          usuario.rol?.id,
      telefono:        usuario.telefono,
      dni:             usuario.dni,
    });
    this.usuarioForm.get('password')?.clearValidators();
    this.usuarioForm.get('password')?.updateValueAndValidity();
    this.modalAbierto = true;
  }

  cerrarModal() {
    this.modalAbierto = false;
    this.usuarioEditando = null;
    this.mostrarPassword = false;
    this.usuarioForm.reset();
  }

  toggleCambiarPassword(event: any) {
    this.mostrarPassword = event.target.checked;
    if (this.mostrarPassword) {
      this.usuarioForm.get('password')?.setValidators([Validators.minLength(6)]);
    } else {
      this.usuarioForm.get('password')?.clearValidators();
      this.usuarioForm.get('password')?.reset();
    }
    this.usuarioForm.get('password')?.updateValueAndValidity();
  }

  guardarUsuario() {
    if (this.usuarioForm.invalid) return;

    const { password, ...datos } = this.usuarioForm.value;
    const datosFinales = password ? { ...datos, password } : datos;

    if (this.usuarioEditando) {
      this.usuariosService.actualizarUsuario(this.usuarioEditando.id, datosFinales).subscribe({
        next: () => {
          this.notificacion.exito('Usuario actualizado correctamente');
          this.cerrarModal();
          this.cargarUsuarios();
        },
        error: (err) => this.notificacion.error(err?.error?.message || 'Error al actualizar usuario')
      });
    } else {
      this.usuariosService.crearUsuario({ ...datosFinales, password }).subscribe({
        next: () => {
          this.notificacion.exito('Usuario creado correctamente');
          this.cerrarModal();
          this.cargarUsuarios();
        },
        error: (err) => this.notificacion.error(err?.error?.message || 'Error al crear usuario')
      });
    }
  }

  toggleEstado(usuario: any) {
    this.usuariosService.toggleEstado(usuario.id, !usuario.activo).subscribe({
      next: () => {
        this.notificacion.exito(usuario.activo ? 'Usuario desactivado' : 'Usuario activado');
        this.cargarUsuarios();
      },
      error: (err) => this.notificacion.error('Error al cambiar estado')
    });
  }

  eliminarUsuario(usuario: any) {
    if (confirm(`¿Estás seguro de eliminar a ${usuario.nombre_completo}?`)) {
      this.usuariosService.eliminarUsuario(usuario.id).subscribe({
        next: () => {
          this.notificacion.exito(`${usuario.nombre_completo} eliminado correctamente`);
          this.cargarUsuarios();
        },
        error: (err) => this.notificacion.error('Error al eliminar usuario')
      });
    }
  }

  getRolStyle(rol: string) {
    const estilos: any = {
      'ADMIN': { background: '#eff6ff', color: '#0072BC' },
      'JEFE': { background: '#f5f3ff', color: '#7c3aed' },
      'OPERARIO': { background: '#f0fdf4', color: '#16a34a' }
    };
    return estilos[rol] || { background: '#f1f5f9', color: '#64748b' };
  }
}