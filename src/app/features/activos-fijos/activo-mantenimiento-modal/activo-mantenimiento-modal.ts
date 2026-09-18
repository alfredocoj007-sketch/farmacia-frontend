import { Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivosFijosService } from '../../../core/services/activos-fijos.service';
import { ActivoFijo, MantenimientoActivoRequest } from '../../../core/models/activo-fijo.models';

@Component({
  selector: 'app-activo-mantenimiento-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './activo-mantenimiento-modal.html',
})
export class ActivoMantenimientoModal {
  private readonly activosService = inject(ActivosFijosService);

  @Input({ required: true }) activo!: ActivoFijo;
  @Output() guardado = new EventEmitter<void>();
  @Output() cancelar = new EventEmitter<void>();

  protected readonly guardando = signal(false);
  protected readonly error = signal<string | null>(null);

  protected nuevoEstado: 'ACTIVO' | 'EN_MANTENIMIENTO' | 'DE_BAJA' = 'EN_MANTENIMIENTO';
  protected observacion = '';

  ngOnInit(): void {
    if (this.activo) {
      this.nuevoEstado = this.activo.estado === 'ACTIVO' ? 'EN_MANTENIMIENTO' : 'ACTIVO';
    }
  }

  protected submit(): void {
    this.guardando.set(true);
    this.error.set(null);

    const req: MantenimientoActivoRequest = {
      estado: this.nuevoEstado,
      observacion: this.observacion.trim() || undefined,
    };

    this.activosService.registrarMantenimiento(this.activo.activoId, req).subscribe({
      next: () => {
        this.guardando.set(false);
        this.guardado.emit();
      },
      error: (err) => {
        this.guardando.set(false);
        this.error.set(err.error?.message || 'Error al actualizar el estado del activo.');
      },
    });
  }
}
