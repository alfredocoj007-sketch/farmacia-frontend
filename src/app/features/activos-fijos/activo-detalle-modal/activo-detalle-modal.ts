import { Component, EventEmitter, Input, OnInit, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivosFijosService } from '../../../core/services/activos-fijos.service';
import { ActivoFijoDetalle } from '../../../core/models/activo-fijo.models';

@Component({
  selector: 'app-activo-detalle-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './activo-detalle-modal.html',
})
export class ActivoDetalleModal implements OnInit {
  private readonly activosService = inject(ActivosFijosService);

  @Input({ required: true }) activoId!: number;
  @Output() cerrar = new EventEmitter<void>();

  protected readonly detalle = signal<ActivoFijoDetalle | null>(null);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.cargarDetalle();
  }

  private cargarDetalle(): void {
    this.cargando.set(true);
    this.error.set(null);

    this.activosService.obtenerPorId(this.activoId).subscribe({
      next: (data) => {
        this.detalle.set(data);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No se pudo cargar la ficha técnica del activo.');
        this.cargando.set(false);
      },
    });
  }
}
