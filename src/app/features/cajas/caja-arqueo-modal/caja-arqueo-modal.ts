import { Component, EventEmitter, Input, OnInit, Output, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CajasService } from '../../../core/services/cajas.service';
import { ResultadoArqueo, SesionActivaDetalle } from '../../../core/models/caja.models';

@Component({
  selector: 'app-caja-arqueo-modal',
  imports: [CommonModule, FormsModule],
  templateUrl: './caja-arqueo-modal.html',
})
export class CajaArqueoModal implements OnInit {
  private readonly cajasService = inject(CajasService);

  @Input({ required: true }) cajaId!: number;
  @Input({ required: true }) codigoCaja!: string;
  @Output() cancelado = new EventEmitter<void>();
  @Output() arqueoCerrado = new EventEmitter<ResultadoArqueo>();

  protected detalle = signal<SesionActivaDetalle | null>(null);
  protected cargando = signal(true);
  protected guardando = signal(false);
  protected error = signal<string | null>(null);

  protected efectivoContado: number | null = null;
  protected observacionCierre = '';

  protected readonly diferencia = computed(() => {
    const d = this.detalle();
    if (!d || this.efectivoContado === null || this.efectivoContado === undefined) {
      return null;
    }
    const esperado = d.efectivoEsperado;
    const contado = Number(this.efectivoContado);
    return Number((contado - esperado).toFixed(2));
  });

  ngOnInit(): void {
    this.cargarDetalle();
  }

  protected cargarDetalle(): void {
    this.cargando.set(true);
    this.cajasService.obtenerSesionActiva(this.cajaId).subscribe({
      next: (det) => {
        this.detalle.set(det);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No se pudo obtener el detalle de la sesión para el arqueo.');
        this.cargando.set(false);
      },
    });
  }

  protected submit(): void {
    const d = this.detalle();
    if (!d) return;

    if (this.efectivoContado === null || this.efectivoContado < 0) {
      this.error.set('Debes ingresar el efectivo físico contado en caja.');
      return;
    }

    const dif = this.diferencia();
    if (dif !== null && dif !== 0 && !this.observacionCierre.trim()) {
      this.error.set('Existe una diferencia (faltante o sobrante). Es obligatorio justificarla para auditoría.');
      return;
    }

    this.guardando.set(true);
    this.error.set(null);

    this.cajasService
      .cerrarYArquearSesion({
        sesionCajaId: d.sesionCajaId,
        efectivoContado: Number(this.efectivoContado),
        observacionCierre: this.observacionCierre.trim() || undefined,
      })
      .subscribe({
        next: (resultado) => {
          this.guardando.set(false);
          this.arqueoCerrado.emit(resultado);
        },
        error: (err) => {
          this.guardando.set(false);
          this.error.set(err.error?.message || 'Error al procesar el arqueo de caja.');
        },
      });
  }
}
