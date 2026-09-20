import { Component, EventEmitter, Input, OnInit, Output, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Empleado } from '../../../core/models/planilla.models';
import { PlanillasService } from '../../../core/services/planillas.service';
import { ToastService } from '../../../shared/toast/toast.service';

@Component({
  selector: 'app-ajuste-salario-modal',
  imports: [FormsModule],
  templateUrl: './ajuste-salario-modal.html',
})
export class AjusteSalarioModal implements OnInit {
  private readonly planillasService = inject(PlanillasService);
  private readonly toastService = inject(ToastService);

  @Input({ required: true }) empleado!: Empleado;
  @Output() cerrar = new EventEmitter<void>();
  @Output() salarioAjustado = new EventEmitter<void>();

  protected nuevoSalario = 0;
  protected motivo = '';
  protected readonly procesando = signal(false);
  protected readonly error = signal<string | null>(null);

  get diferencia(): number {
    const actual = Number(this.empleado?.salarioActual || 0);
    const nuevo = Number(this.nuevoSalario || 0);
    return nuevo - actual;
  }

  get porcentajeCambio(): number {
    const actual = Number(this.empleado?.salarioActual || 0);
    if (actual <= 0) return 0;
    return Number(((this.diferencia / actual) * 100).toFixed(1));
  }

  ngOnInit(): void {
    this.nuevoSalario = Number(this.empleado.salarioActual);
  }

  protected guardarAjuste(): void {
    if (Number(this.nuevoSalario) <= 0) {
      this.error.set('El nuevo salario debe ser mayor a 0.');
      return;
    }

    if (Number(this.nuevoSalario) === Number(this.empleado.salarioActual)) {
      this.error.set('El nuevo salario no puede ser igual al salario actual.');
      return;
    }

    if (!this.motivo.trim() || this.motivo.trim().length < 5) {
      this.error.set('Debe especificar un motivo o justificación de auditoría de al menos 5 caracteres.');
      return;
    }

    this.procesando.set(true);
    this.error.set(null);

    this.planillasService
      .ajustarSalario(this.empleado.empleadoId, {
        nuevoSalario: Number(this.nuevoSalario),
        motivo: this.motivo.trim(),
      })
      .subscribe({
        next: () => {
          this.procesando.set(false);
          this.toastService.success(
            '¡Ajuste Salarial Aplicado!',
            `El salario de ${this.empleado.nombre} ${this.empleado.apellido} se actualizó a Q ${Number(this.nuevoSalario).toFixed(2)}.`,
          );
          this.salarioAjustado.emit();
        },
        error: (err) => {
          this.procesando.set(false);
          const msg = err.error?.message || 'Error al aplicar el ajuste salarial.';
          this.error.set(msg);
          this.toastService.error('Error en Ajuste Salarial', msg);
        },
      });
  }
}
