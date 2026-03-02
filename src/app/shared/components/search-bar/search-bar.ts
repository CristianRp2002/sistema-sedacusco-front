import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-search-bar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './search-bar.html'
})
export class SearchBarComponent {
  @Input() placeholder: string = 'Buscar...';
  @Input() filtros: { valor: string; label: string }[] = [];
  @Input() filtroLabel: string = 'Todos';
  @Output() buscar = new EventEmitter<string>();
  @Output() filtrar = new EventEmitter<string>();
}