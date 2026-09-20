import { Component, EventEmitter, Input, OnInit, Output, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CajasService } from '../../../core/services/cajas.service';
import { HistorialSesion } from '../../../core/models/caja.models';

@Component({
  selector: 'app-caja-historial-modal',
  imports: [CommonModule],
  templateUrl: './caja-historial-modal.html',
})
export class CajaHistorialModal implements OnInit {
  private readonly cajasService = inject(CajasService);

  @Input({ required: true }) cajaId!: number;
  @Input({ required: true }) codigoCaja!: string;
  @Output() cerrar = new EventEmitter<void>();

  protected sesiones = signal<HistorialSesion[]>([]);
  protected cargando = signal(true);
  protected error = signal<string | null>(null);

  // Paginación (10 turnos por página)
  protected readonly page = signal(1);
  protected readonly limit = 10;
  protected readonly totalPaginas = computed(() =>
    Math.max(1, Math.ceil(this.sesiones().length / this.limit)),
  );
  protected readonly sesionesPaginadas = computed(() => {
    const inicio = (this.page() - 1) * this.limit;
    return this.sesiones().slice(inicio, inicio + this.limit);
  });

  protected cambiarPagina(delta: number): void {
    const nueva = this.page() + delta;
    if (nueva >= 1 && nueva <= this.totalPaginas()) {
      this.page.set(nueva);
    }
  }

  ngOnInit(): void {
    this.cargarHistorial();
  }

  protected cargarHistorial(): void {
    this.cargando.set(true);
    this.cajasService.obtenerHistorial(this.cajaId).subscribe({
      next: (data) => {
        this.sesiones.set(data);
        this.page.set(1);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No se pudo cargar el historial de auditoría de la caja.');
        this.cargando.set(false);
      },
    });
  }
}
