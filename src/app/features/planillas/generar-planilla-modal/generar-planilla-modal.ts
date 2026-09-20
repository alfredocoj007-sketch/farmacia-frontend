import { Component, EventEmitter, Output, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PlanillasService } from '../../../core/services/planillas.service';
import { PlanillaCompleta } from '../../../core/models/planilla.models';
import { ToastService } from '../../../shared/toast/toast.service';

@Component({
  selector: 'app-generar-planilla-modal',
  imports: [FormsModule],
  templateUrl: './generar-planilla-modal.html',
})
export class GenerarPlanillaModal {
  private readonly planillasService = inject(PlanillasService);
  private readonly toastService = inject(ToastService);

  @Output() cerrar = new EventEmitter<void>();
  @Output() planillaGenerada = new EventEmitter<PlanillaCompleta>();

  protected fechaInicio = '';
  protected fechaFin = '';
  protected observacion = '';
  protected readonly procesando = signal(false);
  protected readonly error = signal<string | null>(null);

  get diasCiclo(): number {
    if (!this.fechaInicio || !this.fechaFin) return 0;
    const f1 = new Date(this.fechaInicio);
    const f2 = new Date(this.fechaFin);
    const diff = f2.getTime() - f1.getTime();
    if (diff < 0) return 0;
    return Math.round(diff / (1000 * 60 * 60 * 24)) + 1;
  }

  get esQuincenal(): boolean {
    return this.diasCiclo > 0 && this.diasCiclo <= 16;
  }

  constructor() {
    this.inicializarFechasPeriodoActual();
  }

  private inicializarFechasPeriodoActual(): void {
    const hoy = new Date();
    const anio = hoy.getFullYear();
    const mes = hoy.getMonth();
    const dia = hoy.getDate();

    if (dia <= 15) {
      // Primera quincena
      this.fechaInicio = `${anio}-${String(mes + 1).padStart(2, '0')}-01`;
      this.fechaFin = `${anio}-${String(mes + 1).padStart(2, '0')}-15`;
    } else {
      // Segunda quincena / fin de mes
      const ultimoDia = new Date(anio, mes + 1, 0).getDate();
      this.fechaInicio = `${anio}-${String(mes + 1).padStart(2, '0')}-16`;
      this.fechaFin = `${anio}-${String(mes + 1).padStart(2, '0')}-${ultimoDia}`;
    }
  }

  protected generar(): void {
    if (!this.fechaInicio || !this.fechaFin) {
      this.error.set('Por favor especifique las fechas de inicio y fin del ciclo laboral.');
      return;
    }

    if (this.fechaFin < this.fechaInicio) {
      this.error.set('La fecha de fin no puede ser anterior a la fecha de inicio.');
      return;
    }

    this.procesando.set(true);
    this.error.set(null);

    this.planillasService
      .generarPlanilla({
        fechaInicio: this.fechaInicio,
        fechaFin: this.fechaFin,
        observacion: this.observacion.trim() || undefined,
      })
      .subscribe({
        next: (res) => {
          this.procesando.set(false);
          this.toastService.success(
            '¡Planilla Generada!',
            `Planilla del período ${this.fechaInicio} al ${this.fechaFin} creada exitosamente con ${res.detalles?.length || 0} colaboradores.`,
          );
          this.planillaGenerada.emit(res);
        },
        error: (err) => {
          this.procesando.set(false);
          const msg =
            err.error?.message || 'Error al generar la planilla. Asegúrese de que existan empleados activos.';
          this.error.set(msg);
          this.toastService.error('Error al Generar Planilla', msg);
        },
      });
  }
}
