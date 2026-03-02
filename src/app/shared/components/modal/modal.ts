import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './modal.html'
})
export class ModalComponent {
  @Input() abierto: boolean = false;
  @Input() titulo: string = '';
  @Input() subtitulo: string = '';
  @Output() cerrar = new EventEmitter<void>();
}