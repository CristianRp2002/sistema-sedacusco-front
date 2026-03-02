import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-page-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './page-header.html'
})
export class PageHeaderComponent {
  @Input() seccion: string = '';
  @Input() titulo: string = '';
  @Input() subtitulo: string = '';
  @Input() botonTexto: string = '';
  @Input() botonIcono: string = 'add';
  @Output() botonClick = new EventEmitter<void>();
}