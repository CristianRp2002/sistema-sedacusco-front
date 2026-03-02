import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './status-badge.html'
})
export class StatusBadgeComponent {
  @Input() tipo: 'activo' | 'inactivo' | 'rol' = 'activo';
  @Input() valor: string | boolean = '';

  getStyle() {
    if (this.tipo === 'activo') {
      return this.valor
        ? { background: '#f0fdf4', color: '#16a34a' }
        : { background: '#fef2f2', color: '#dc2626' };
    }
    const roles: any = {
      'ADMIN': { background: '#eff6ff', color: '#0072BC' },
      'JEFE': { background: '#f5f3ff', color: '#7c3aed' },
      'OPERARIO': { background: '#f0fdf4', color: '#16a34a' }
    };
    return roles[String(this.valor)] || { background: '#f1f5f9', color: '#64748b' };
  }

  getTexto() {
    if (this.tipo === 'activo') return this.valor ? 'Activo' : 'Inactivo';
    return this.valor || 'Sin rol';
  }

  getColor() {
    return this.tipo === 'activo'
      ? (this.valor ? '#16a34a' : '#dc2626')
      : null;
  }
}