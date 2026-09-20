import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SlicePipe } from '@angular/common';
import { Modal } from '../../../shared/modal/modal';
import {
  Empleado,
  EstadisticasNomina,
  Planilla,
  PlanillaCompleta,
  Puesto,
} from '../../../core/models/planilla.models';
import { Sucursal } from '../../../core/models/lote.models';
import { PlanillasService } from '../../../core/services/planillas.service';
import { SucursalesService } from '../../../core/services/sucursales.service';
import { GenerarPlanillaModal } from '../generar-planilla-modal/generar-planilla-modal';
import { PlanillaDetalleModal } from '../planilla-detalle-modal/planilla-detalle-modal';
import { EmpleadoModal } from '../empleado-modal/empleado-modal';
import { AjusteSalarioModal } from '../ajuste-salario-modal/ajuste-salario-modal';

@Component({
  selector: 'app-planillas-list',
  imports: [
    FormsModule,
    SlicePipe,
    Modal,
    GenerarPlanillaModal,
    PlanillaDetalleModal,
    EmpleadoModal,
    AjusteSalarioModal,
  ],
  templateUrl: './planillas-list.html',
  styleUrl: './planillas-list.scss',
})
export class PlanillasList implements OnInit {
  private readonly planillasService = inject(PlanillasService);
  private readonly sucursalesService = inject(SucursalesService);

  protected tabActiva = signal<'planillas' | 'empleados'>('planillas');

  // Datos
  protected readonly planillas = signal<Planilla[]>([]);
  protected readonly empleados = signal<Empleado[]>([]);
  protected readonly puestos = signal<Puesto[]>([]);
  protected readonly sucursales = signal<Sucursal[]>([]);
  protected readonly estadisticas = signal<EstadisticasNomina | null>(null);

  // Paginación Planillas (10 por página)
  protected readonly pagePlanillas = signal(1);
  protected readonly limitPlanillas = 10;
  protected readonly totalPaginasPlanillas = computed(() =>
    Math.max(1, Math.ceil(this.planillas().length / this.limitPlanillas)),
  );
  protected readonly planillasPaginadas = computed(() => {
    const inicio = (this.pagePlanillas() - 1) * this.limitPlanillas;
    return this.planillas().slice(inicio, inicio + this.limitPlanillas);
  });
  protected readonly listaPaginasPlanillas = computed(() => {
    const total = this.totalPaginasPlanillas();
    const actual = this.pagePlanillas();
    const paginas: number[] = [];
    const inicio = Math.max(1, actual - 2);
    const fin = Math.min(total, actual + 2);
    for (let i = inicio; i <= fin; i++) {
      paginas.push(i);
    }
    return paginas;
  });

  // Paginación Empleados (10 por página)
  protected readonly pageEmpleados = signal(1);
  protected readonly limitEmpleados = 10;
  protected readonly totalPaginasEmpleados = computed(() =>
    Math.max(1, Math.ceil(this.empleados().length / this.limitEmpleados)),
  );
  protected readonly empleadosPaginados = computed(() => {
    const inicio = (this.pageEmpleados() - 1) * this.limitEmpleados;
    return this.empleados().slice(inicio, inicio + this.limitEmpleados);
  });
  protected readonly listaPaginasEmpleados = computed(() => {
    const total = this.totalPaginasEmpleados();
    const actual = this.pageEmpleados();
    const paginas: number[] = [];
    const inicio = Math.max(1, actual - 2);
    const fin = Math.min(total, actual + 2);
    for (let i = inicio; i <= fin; i++) {
      paginas.push(i);
    }
    return paginas;
  });

  protected cambiarPaginaPlanillas(delta: number): void {
    const nueva = this.pagePlanillas() + delta;
    if (nueva >= 1 && nueva <= this.totalPaginasPlanillas()) {
      this.pagePlanillas.set(nueva);
    }
  }

  protected irAPaginaPlanillas(p: number): void {
    if (p >= 1 && p <= this.totalPaginasPlanillas()) {
      this.pagePlanillas.set(p);
    }
  }

  protected cambiarPaginaEmpleados(delta: number): void {
    const nueva = this.pageEmpleados() + delta;
    if (nueva >= 1 && nueva <= this.totalPaginasEmpleados()) {
      this.pageEmpleados.set(nueva);
    }
  }

  protected irAPaginaEmpleados(p: number): void {
    if (p >= 1 && p <= this.totalPaginasEmpleados()) {
      this.pageEmpleados.set(p);
    }
  }

  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);

  // Filtros de Empleados
  protected busquedaEmpleado = '';
  protected filtroSucursalId: number | null = null;
  protected filtroPuestoId: number | null = null;
  protected filtroEstadoEmpleado = '';

  // Modales
  protected modalGenerarAbierto = signal(false);
  protected modalDetallePlanillaId = signal<number | null>(null);
  protected modalEmpleadoAbierto = signal(false);
  protected empleadoAEditar = signal<Empleado | null>(null);
  protected modalAjusteSalarioEmpleado = signal<Empleado | null>(null);

  ngOnInit(): void {
    this.cargarCatalogos();
    this.cargarTodo();
  }

  protected cambiarTab(t: 'planillas' | 'empleados'): void {
    this.tabActiva.set(t);
  }

  private cargarCatalogos(): void {
    this.planillasService.listarPuestos().subscribe({
      next: (res) => this.puestos.set(res),
    });

    this.sucursalesService.findAll().subscribe({
      next: (res) => this.sucursales.set(res),
    });
  }

  protected cargarTodo(): void {
    this.cargando.set(true);
    this.error.set(null);

    this.planillasService.obtenerEstadisticas().subscribe({
      next: (stats) => this.estadisticas.set(stats),
    });

    this.planillasService.listarPlanillas().subscribe({
      next: (res) => {
        this.planillas.set(res);
        this.pagePlanillas.set(1);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No se pudo cargar el historial de planillas.');
        this.cargando.set(false);
      },
    });

    this.filtrarEmpleados();
  }

  protected filtrarEmpleados(): void {
    this.planillasService
      .listarEmpleados({
        busqueda: this.busquedaEmpleado.trim() || undefined,
        sucursalId: this.filtroSucursalId || undefined,
        puestoId: this.filtroPuestoId || undefined,
        estado: this.filtroEstadoEmpleado || undefined,
      })
      .subscribe({
        next: (res) => {
          this.empleados.set(res);
          this.pageEmpleados.set(1);
        },
      });
  }

  protected limpiarFiltrosEmpleados(): void {
    this.busquedaEmpleado = '';
    this.filtroSucursalId = null;
    this.filtroPuestoId = null;
    this.filtroEstadoEmpleado = '';
    this.filtrarEmpleados();
  }

  // Manejo de Modales
  protected abrirModalGenerar(): void {
    this.modalGenerarAbierto.set(true);
  }

  protected cerrarModalGenerar(): void {
    this.modalGenerarAbierto.set(false);
  }

  protected onPlanillaGenerada(p: PlanillaCompleta): void {
    this.cerrarModalGenerar();
    this.cargarTodo();
    this.abrirModalDetalle(p.planillaId);
  }

  protected abrirModalDetalle(id: number): void {
    this.modalDetallePlanillaId.set(id);
  }

  protected cerrarModalDetalle(): void {
    this.modalDetallePlanillaId.set(null);
  }

  protected onPlanillaActualizada(): void {
    this.cargarTodo();
  }

  protected abrirModalNuevoEmpleado(): void {
    this.empleadoAEditar.set(null);
    this.modalEmpleadoAbierto.set(true);
  }

  protected abrirModalEditarEmpleado(e: Empleado): void {
    this.empleadoAEditar.set(e);
    this.modalEmpleadoAbierto.set(true);
  }

  protected cerrarModalEmpleado(): void {
    this.modalEmpleadoAbierto.set(false);
    this.empleadoAEditar.set(null);
  }

  protected onEmpleadoGuardado(): void {
    this.cerrarModalEmpleado();
    this.cargarTodo();
  }

  protected abrirModalAjustarSalario(e: Empleado): void {
    this.modalAjusteSalarioEmpleado.set(e);
  }

  protected cerrarModalAjustarSalario(): void {
    this.modalAjusteSalarioEmpleado.set(null);
  }

  protected onSalarioAjustado(): void {
    this.cerrarModalAjustarSalario();
    this.cargarTodo();
  }
}
