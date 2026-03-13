import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-ficha-pdf',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ficha-pdf.html'
})
export class FichaPdfComponent {
  @Input() parte: any = null;

  getTurnos() {
    return ['PRIMER', 'SEGUNDO', 'TERCER'];
  }

  getBombeos(bombaNombre: string) {
    return this.parte?.detallesBombeo?.filter((b: any) => b.bomba?.nombre === bombaNombre) || [];
  }

  getBombas(): string[] {
  const nombres = new Set<string>(this.parte?.detallesBombeo?.map((b: any) => b.bomba?.nombre as string) || []);
  return Array.from(nombres);
}

  formatHora(fecha: string) {
    if (!fecha) return '';
    return new Date(fecha).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
  }

  formatFecha(fecha: string) {
    if (!fecha) return '';
    return new Date(fecha).toLocaleDateString('es-PE');
  }

  getFilasBombeo() {
    const rows = [];
    for (let i = 0; i < 10; i++) {
      rows.push(i);
    }
    return rows;
  }
}