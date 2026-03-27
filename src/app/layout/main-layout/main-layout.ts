import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Router } from '@angular/router';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './main-layout.html'
})
export class MainLayoutComponent implements OnInit {
  today = new Date().toLocaleDateString('es-PE', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  usuario: any = null;

  constructor(private router: Router) {}

  ngOnInit() {
    const userStr = localStorage.getItem('user');
    if (userStr) this.usuario = JSON.parse(userStr);
  }

  get rolUsuario(): string {
    return this.usuario?.rol?.nombre || '';
  }

  get esAdmin(): boolean {
    return this.rolUsuario === 'ADMIN';
  }

  get esJefe(): boolean {
    return this.rolUsuario === 'JEFE';
  }

  get esOperador(): boolean {
    return this.rolUsuario === 'OPERADOR';
  }

  cerrarSesion() {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    this.router.navigate(['/login']);
  }
}