import { Component, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { AuditoriaEvento } from '../../../core/models/auditoria.models';

@Component({
  selector: 'app-auditoria-detalle-modal',
  imports: [DatePipe],
  templateUrl: './auditoria-detalle-modal.html',
  styleUrl: './auditoria-detalle-modal.scss',
})
export class AuditoriaDetalleModal {
  readonly evento = input.required<AuditoriaEvento>();
  readonly cerrar = output<void>();
  readonly fechaImpresion = new Date();

  imprimirFicha(): void {
    window.print();
  }
}
