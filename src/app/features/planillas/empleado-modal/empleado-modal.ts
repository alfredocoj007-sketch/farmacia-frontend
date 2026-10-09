import { Component, EventEmitter, Input, OnInit, Output, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Empleado, Puesto } from '../../../core/models/planilla.models';
import { Sucursal } from '../../../core/models/lote.models';
import { PlanillasService } from '../../../core/services/planillas.service';
import { SucursalesService } from '../../../core/services/sucursales.service';
import { ToastService } from '../../../shared/toast/toast.service';

@Component({
  selector: 'app-empleado-modal',
  imports: [FormsModule],
  templateUrl: './empleado-modal.html',
})
export class EmpleadoModal implements OnInit {
  private readonly planillasService = inject(PlanillasService);
  private readonly sucursalesService = inject(SucursalesService);
  private readonly toastService = inject(ToastService);

  @Input() empleadoAEditar?: Empleado | null = null;
  @Output() cerrar = new EventEmitter<void>();
  @Output() empleadoGuardado = new EventEmitter<void>();

  protected readonly puestos = signal<Puesto[]>([]);
  protected readonly sucursales = signal<Sucursal[]>([]);
  protected readonly procesando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly fechaMinima = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();

  protected nombre = '';
  protected apellido = '';
  protected dpi = '';
  protected telefono = '';
  protected fechaIngreso = '';
  protected salarioActual = 3500;
  protected puestoId: number | null = null;
  protected sucursalId: number | null = null;
  protected estado: 'ACTIVO' | 'INACTIVO' | 'SUSPENDIDO' = 'ACTIVO';

  ngOnInit(): void {
    this.cargarCatalogos();

    if (this.empleadoAEditar) {
      const e = this.empleadoAEditar;
      this.nombre = e.nombre;
      this.apellido = e.apellido;
      this.dpi = e.dpi || '';
      this.telefono = e.telefono || '';
      this.fechaIngreso = e.fechaIngreso.substring(0, 10);
      this.salarioActual = e.salarioActual;
      this.puestoId = e.puesto?.puestoId || null;
      this.sucursalId = e.sucursal?.sucursalId || null;
      this.estado = e.estado;
    } else {
      this.fechaIngreso = this.fechaMinima;
    }
  }

  private cargarCatalogos(): void {
    this.planillasService.listarPuestos().subscribe({
      next: (res) => {
        this.puestos.set(res);
        if (!this.puestoId && res.length > 0) {
          this.puestoId = res[0].puestoId;
        }
      },
    });

    this.sucursalesService.findAll().subscribe({
      next: (res) => {
        this.sucursales.set(res);
        if (!this.sucursalId && res.length > 0) {
          this.sucursalId = res[0].sucursalId;
        }
      },
    });
  }

  protected guardar(): void {
    if (!this.nombre.trim() || !this.apellido.trim()) {
      this.error.set('El nombre y el apellido son obligatorios.');
      return;
    }

    if (!this.puestoId || !this.sucursalId) {
      this.error.set('Debe seleccionar el puesto laboral y la sucursal de asignación.');
      return;
    }

    if (!this.fechaIngreso) {
      this.error.set('La fecha de ingreso laboral es obligatoria para efectos de auditoría.');
      return;
    }

    if (!this.empleadoAEditar && this.fechaIngreso < this.fechaMinima) {
      this.error.set('Por normas de auditoría y prevención de fraude en nómina, la fecha de ingreso no puede ser anterior a hoy.');
      return;
    }

    const dpiLimpio = this.dpi.trim().replace(/\D/g, '');
    if (this.dpi.trim() && dpiLimpio.length !== 13) {
      this.error.set('El DPI debe tener exactamente 13 dígitos numéricos según RENAP.');
      return;
    }

    const telLimpio = this.telefono.trim().replace(/\D/g, '');
    if (this.telefono.trim() && telLimpio.length !== 8) {
      this.error.set('El teléfono debe tener exactamente 8 dígitos numéricos.');
      return;
    }

    this.procesando.set(true);
    this.error.set(null);

    const puestoNum = Number(this.puestoId);
    const sucursalNum = Number(this.sucursalId);

    if (this.empleadoAEditar) {
      this.planillasService
        .actualizarEmpleado(this.empleadoAEditar.empleadoId, {
          nombre: this.nombre.trim(),
          apellido: this.apellido.trim(),
          dpi: dpiLimpio || undefined,
          telefono: telLimpio || undefined,
          estado: this.estado,
          puestoId: puestoNum,
          sucursalId: sucursalNum,
        })
        .subscribe({
          next: () => {
            this.procesando.set(false);
            this.toastService.success(
              '¡Colaborador Actualizado!',
              `Los datos de ${this.nombre.trim()} ${this.apellido.trim()} fueron actualizados con éxito.`,
            );
            this.empleadoGuardado.emit();
          },
          error: (err) => {
            this.procesando.set(false);
            const msg = Array.isArray(err.error?.message)
              ? err.error.message.join(' · ')
              : err.error?.message || 'Error al actualizar el empleado.';
            this.error.set(msg);
            this.toastService.error('Error al Actualizar', msg);
          },
        });
    } else {
      this.planillasService
        .crearEmpleado({
          nombre: this.nombre.trim(),
          apellido: this.apellido.trim(),
          dpi: dpiLimpio || undefined,
          telefono: telLimpio || undefined,
          fechaIngreso: this.fechaIngreso,
          salarioActual: Number(this.salarioActual),
          puestoId: puestoNum,
          sucursalId: sucursalNum,
        })
        .subscribe({
          next: () => {
            this.procesando.set(false);
            this.toastService.success(
              '¡Colaborador Registrado!',
              `${this.nombre.trim()} ${this.apellido.trim()} ha sido dado de alta correctamente en la nómina.`,
            );
            this.empleadoGuardado.emit();
          },
          error: (err) => {
            this.procesando.set(false);
            const msg = Array.isArray(err.error?.message)
              ? err.error.message.join(' · ')
              : err.error?.message || 'Error al registrar el empleado.';
            this.error.set(msg);
            this.toastService.error('Error al Registrar', msg);
          },
        });
    }
  }
}
