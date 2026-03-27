import { Injectable } from '@angular/core';
import { ToastrService } from 'ngx-toastr';

@Injectable({
  providedIn: 'root'
})
export class NotificacionService {
  constructor(private toastr: ToastrService) {}

  exito(mensaje: string, titulo: string = '¡Éxito!') {
    this.toastr.success(mensaje, titulo);
  }

  error(mensaje: string, titulo: string = 'Error') {
    this.toastr.error(mensaje, titulo);
  }

  advertencia(mensaje: string, titulo: string = 'Atención') {
    this.toastr.warning(mensaje, titulo);
  }

  info(mensaje: string, titulo: string = 'Información') {
    this.toastr.info(mensaje, titulo);
  }
}