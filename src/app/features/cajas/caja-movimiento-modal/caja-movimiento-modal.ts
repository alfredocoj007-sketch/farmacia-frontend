import { Component, EventEmitter, Input, OnInit, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CajasService } from '../../../core/services/cajas.service';
import { MetodoPago } from '../../../core/models/caja.models';

@Component({
  selector: 'app-caja-movimiento-modal',
  imports: [CommonModule, FormsModule],
  templateUrl: './caja-movimiento-modal.html',
})
export class CajaMovimientoModal implements OnInit {
  private readonly cajasService = inject(CajasService);

  @Input({ required: true }) sesionCajaId!: number;
  @Input({ required: true }) codigoCaja!: string;
  @Output() cancelado = new EventEmitter<void>();
  @Output() registrado = new EventEmitter<void>();

  protected tipoMovimiento: 'INGRESO' | 'EGRESO' = 'INGRESO';
  protected monto: number | null = null;
  protected metodoPagoId: number | null = null;
  protected descripcion = '';
  protected metodosPago = signal<MetodoPago[]>([]);
  protected guardando = signal(false);
  protected error = signal<string | null>(null);

  ngOnInit(): void {
    this.cajasService.listarMetodosPago().subscribe({
      next: (metodos) => {
        this.metodosPago.set(metodos);
        // Seleccionar Efectivo por defecto
        const efectivo = metodos.find((m) => m.nombre.toUpperCase().includes('EFECTIVO'));
        if (efectivo) {
          this.metodoPagoId = efectivo.metodoPagoId;
        } else if (metodos.length > 0) {
          this.metodoPagoId = metodos[0].metodoPagoId;
        }
      },
      error: () => {
        this.error.set('No se pudieron cargar los métodos de pago.');
      },
    });
  }

  protected setConceptoRapido(concepto: string): void {
    this.descripcion = concepto;
  }

  protected submit(): void {
    if (!this.monto || this.monto <= 0) {
      this.error.set('Ingresa un monto mayor a 0.');
      return;
    }

    if (!this.metodoPagoId) {
      this.error.set('Selecciona un método de pago.');
      return;
    }

    if (!this.descripcion.trim()) {
      this.error.set('Ingresa una descripción o justificación para el movimiento.');
      return;
    }

    this.guardando.set(true);
    this.error.set(null);

    this.cajasService
      .registrarMovimiento({
        sesionCajaId: this.sesionCajaId,
        tipoMovimiento: this.tipoMovimiento,
        monto: Number(this.monto),
        metodoPagoId: Number(this.metodoPagoId),
        descripcion: this.descripcion.trim(),
      })
      .subscribe({
        next: () => {
          this.guardando.set(false);
          this.registrado.emit();
        },
        error: (err) => {
          this.guardando.set(false);
          this.error.set(err.error?.message || 'Error al registrar el movimiento.');
        },
      });
  }
}
