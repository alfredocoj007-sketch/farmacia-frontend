import { Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CajasService } from '../../../core/services/cajas.service';
import { Caja } from '../../../core/models/caja.models';

@Component({
  selector: 'app-caja-apertura-modal',
  imports: [CommonModule, FormsModule],
  templateUrl: './caja-apertura-modal.html',
})
export class CajaAperturaModal {
  private readonly cajasService = inject(CajasService);

  @Input({ required: true }) caja!: Caja;
  @Output() cancelado = new EventEmitter<void>();
  @Output() abierto = new EventEmitter<void>();

  protected saldoInicial = 200; // Fondo de caja recomendado
  protected guardando = signal(false);
  protected error = signal<string | null>(null);

  protected setMontoRapido(monto: number): void {
    this.saldoInicial = monto;
  }

  protected submit(): void {
    if (this.saldoInicial < 0) {
      this.error.set('El saldo inicial no puede ser negativo.');
      return;
    }

    this.guardando.set(true);
    this.error.set(null);

    this.cajasService
      .abrirSesion({
        cajaId: this.caja.cajaId,
        saldoInicial: Number(this.saldoInicial),
      })
      .subscribe({
        next: () => {
          this.guardando.set(false);
          this.abierto.emit();
        },
        error: (err) => {
          this.guardando.set(false);
          this.error.set(err.error?.message || 'Error al abrir el turno de caja.');
        },
      });
  }
}
