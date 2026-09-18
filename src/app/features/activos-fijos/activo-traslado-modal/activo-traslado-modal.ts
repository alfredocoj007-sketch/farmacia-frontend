import { Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivosFijosService } from '../../../core/services/activos-fijos.service';
import { ActivoFijo, TrasladarActivoRequest } from '../../../core/models/activo-fijo.models';
import { Sucursal } from '../../../core/models/lote.models';

@Component({
  selector: 'app-activo-traslado-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './activo-traslado-modal.html',
})
export class ActivoTrasladoModal {
  private readonly activosService = inject(ActivosFijosService);

  @Input({ required: true }) activo!: ActivoFijo;
  @Input() sucursales: Sucursal[] = [];
  @Output() trasladado = new EventEmitter<void>();
  @Output() cancelar = new EventEmitter<void>();

  protected readonly guardando = signal(false);
  protected readonly error = signal<string | null>(null);

  protected sucursalDestinoId = 0;
  protected observacion = '';

  protected sucursalesDisponibles(): Sucursal[] {
    return this.sucursales.filter((s) => s.sucursalId !== this.activo.sucursal?.sucursalId);
  }

  protected submit(): void {
    if (!this.sucursalDestinoId) {
      this.error.set('Debe seleccionar la sucursal de destino para el traslado.');
      return;
    }

    this.guardando.set(true);
    this.error.set(null);

    const req: TrasladarActivoRequest = {
      sucursalDestinoId: Number(this.sucursalDestinoId),
      observacion: this.observacion.trim() || undefined,
    };

    this.activosService.trasladar(this.activo.activoId, req).subscribe({
      next: () => {
        this.guardando.set(false);
        this.trasladado.emit();
      },
      error: (err) => {
        this.guardando.set(false);
        this.error.set(err.error?.message || 'Error al ejecutar el traslado de activo.');
      },
    });
  }
}
