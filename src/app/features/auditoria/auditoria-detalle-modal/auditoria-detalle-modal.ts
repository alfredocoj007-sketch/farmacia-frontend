import { Component, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { AuditoriaEvento } from '../../../core/models/auditoria.models';

@Component({
  selector: 'app-auditoria-detalle-modal',
  imports: [DatePipe],
  templateUrl: './auditoria-detalle-modal.html',
})
export class AuditoriaDetalleModal {
  readonly evento = input.required<AuditoriaEvento>();
  readonly cerrar = output<void>();

  imprimirFicha(): void {
    window.print();
  }
}
