import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe, DecimalPipe } from '@angular/common';
import { Modal } from '../../../shared/modal/modal';
import {
  DepartamentoGeo,
  EstadisticasRed,
  MunicipioGeo,
  QuerySucursalesParams,
  SucursalRed,
} from '../../../core/models/sucursal.models';
import { SucursalesService } from '../../../core/services/sucursales.service';
import { ToastService } from '../../../shared/toast/toast.service';
import { ConfirmService } from '../../../shared/confirm/confirm.service';
import { SucursalFormModal } from '../sucursal-form-modal/sucursal-form-modal';
import { SucursalDetalleModal } from '../sucursal-detalle-modal/sucursal-detalle-modal';

@Component({
  selector: 'app-sucursales-list',
  imports: [FormsModule, DatePipe, DecimalPipe, Modal, SucursalFormModal, SucursalDetalleModal],
  templateUrl: './sucursales-list.html',
  styleUrl: './sucursales-list.scss',
})
export class SucursalesList implements OnInit {
  private readonly sucursalesService = inject(SucursalesService);
  private readonly toastService = inject(ToastService);
  private readonly confirmService = inject(ConfirmService);

  // Estados de carga
  protected readonly cargando = signal(true);
  protected readonly cargandoStats = signal(false);

  // Datos
  protected readonly sucursales = signal<SucursalRed[]>([]);
  protected readonly estadisticas = signal<EstadisticasRed | null>(null);
  protected readonly departamentos = signal<DepartamentoGeo[]>([]);
  protected readonly municipios = signal<MunicipioGeo[]>([]);

  // Paginación (10 por página estrictamente)
  protected readonly page = signal(1);
  protected readonly limit = 10;
  protected readonly totalPaginas = computed(() =>
    Math.max(1, Math.ceil(this.sucursales().length / this.limit)),
  );
  protected readonly sucursalesPaginadas = computed(() => {
    const inicio = (this.page() - 1) * this.limit;
    return this.sucursales().slice(inicio, inicio + this.limit);
  });
  protected readonly listaPaginas = computed(() => {
    const total = this.totalPaginas();
    const actual = this.page();
    const paginas: number[] = [];
    const inicio = Math.max(1, actual - 2);
    const fin = Math.min(total, actual + 2);
    for (let i = inicio; i <= fin; i++) {
      paginas.push(i);
    }
    return paginas;
  });

  // Vista activa: 'cards' | 'tabla'
  protected readonly vistaActiva = signal<'cards' | 'tabla'>('cards');

  // Filtros reactivos
  protected readonly busqueda = signal('');
  protected readonly tipoSeleccionado = signal('');
  protected readonly estadoSeleccionado = signal('');
  protected readonly departamentoId = signal<number | null>(null);
  protected readonly municipioId = signal<number | null>(null);

  // Modales
  protected readonly modalFormAbierto = signal(false);
  protected readonly sucursalParaEditar = signal<SucursalRed | null>(null);
  protected readonly sucursalDetalleId = signal<number | null>(null);

  ngOnInit(): void {
    this.cargarEstadisticas();
    this.cargarSucursales();
    this.cargarDepartamentos();
  }

  protected cargarEstadisticas(): void {
    this.cargandoStats.set(true);
    this.sucursalesService.obtenerEstadisticas().subscribe({
      next: (data) => {
        this.estadisticas.set(data);
        this.cargandoStats.set(false);
      },
      error: () => this.cargandoStats.set(false),
    });
  }

  protected cargarSucursales(): void {
    this.cargando.set(true);
    const params: QuerySucursalesParams = {
      busqueda: this.busqueda() ? this.busqueda().trim() : undefined,
      tipoSucursal: this.tipoSeleccionado() || undefined,
      estado: this.estadoSeleccionado() || undefined,
      departamentoId: this.departamentoId() || undefined,
      municipioId: this.municipioId() || undefined,
    };

    this.sucursalesService.findAll(params).subscribe({
      next: (data) => {
        this.sucursales.set(data);
        this.page.set(1);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false),
    });
  }

  protected cambiarPagina(delta: number): void {
    const nueva = this.page() + delta;
    if (nueva >= 1 && nueva <= this.totalPaginas()) {
      this.page.set(nueva);
    }
  }

  protected irAPagina(p: number): void {
    if (p >= 1 && p <= this.totalPaginas()) {
      this.page.set(p);
    }
  }

  protected cargarDepartamentos(): void {
    this.sucursalesService.obtenerDepartamentos().subscribe({
      next: (data) => this.departamentos.set(data),
    });
  }

  protected onDepartamentoChange(): void {
    const depId = this.departamentoId();
    if (depId) {
      this.sucursalesService.obtenerMunicipios(depId).subscribe({
        next: (muns) => this.municipios.set(muns),
      });
    } else {
      this.municipios.set([]);
      this.municipioId.set(null);
    }
    this.cargarSucursales();
  }

  protected limpiarFiltros(): void {
    this.busqueda.set('');
    this.tipoSeleccionado.set('');
    this.estadoSeleccionado.set('');
    this.departamentoId.set(null);
    this.municipioId.set(null);
    this.municipios.set([]);
    this.cargarSucursales();
  }

  protected cambiarVista(vista: 'cards' | 'tabla'): void {
    this.vistaActiva.set(vista);
  }

  protected abrirModalCrear(): void {
    this.sucursalParaEditar.set(null);
    this.modalFormAbierto.set(true);
  }

  protected abrirModalEditar(s: SucursalRed): void {
    this.sucursalParaEditar.set(s);
    this.modalFormAbierto.set(true);
  }

  protected cerrarModalForm(): void {
    this.modalFormAbierto.set(false);
    this.sucursalParaEditar.set(null);
  }

  protected onGuardadoExitoso(): void {
    const eraEdicion = !!this.sucursalParaEditar();
    this.cerrarModalForm();
    this.cargarSucursales();
    this.cargarEstadisticas();
    if (eraEdicion) {
      this.toastService.success('¡Sede comercial actualizada con éxito!');
    } else {
      this.toastService.success('¡Punto de venta registrado exitosamente en la red!');
    }
  }

  protected verExpediente(id: number): void {
    this.sucursalDetalleId.set(id);
  }

  protected cerrarModalDetalle(): void {
    this.sucursalDetalleId.set(null);
  }

  protected editarDesdeDetalle(s: SucursalRed): void {
    this.cerrarModalDetalle();
    this.abrirModalEditar(s);
  }

  protected async alternarEstado(s: SucursalRed): Promise<void> {
    const esDeshabilitar = s.estado === 'ACTIVA';
    const confirmado = await this.confirmService.confirm({
      title: esDeshabilitar
        ? '¿Estás seguro de deshabilitar esta sede?'
        : '¿Estás seguro de reactivar esta sede?',
      message: esDeshabilitar
        ? `La sede "${s.nombre}" no podrá facturar ni recibir pedidos mientras esté inactiva.`
        : `La sede "${s.nombre}" volverá a estar operativa en la red comercial.`,
      confirmText: esDeshabilitar ? 'Sí, Deshabilitar' : 'Sí, Reactivar',
      cancelText: 'Cancelar',
      tipo: esDeshabilitar ? 'danger' : 'primary',
    });

    if (!confirmado) return;

    const nuevoEstado = esDeshabilitar ? 'INACTIVA' : 'ACTIVA';
    this.sucursalesService.cambiarEstado(s.sucursalId, nuevoEstado).subscribe({
      next: () => {
        this.cargarSucursales();
        this.cargarEstadisticas();
        if (nuevoEstado === 'ACTIVA') {
          this.toastService.success(`Sede "${s.nombre}" reactivada con éxito.`);
        } else {
          this.toastService.info(`Sede "${s.nombre}" deshabilitada temporalmente.`);
        }
      },
      error: () => {
        this.toastService.error('No se pudo modificar el estado de la sede.');
      },
    });
  }

  protected obtenerIconoTipo(tipo: string): string {
    if (tipo === 'GAS_STAND' || tipo === 'STAND') return '⛽';
    if (tipo === 'MALL_STAND') return '🛍️';
    if (tipo === 'BODEGA_MATRIZ' || tipo === 'BODEGA_CENTRAL') return '📦';
    return '🏪';
  }

  protected obtenerEtiquetaTipo(tipo: string): string {
    if (tipo === 'GAS_STAND' || tipo === 'STAND') return 'Stand en Gasolinera';
    if (tipo === 'MALL_STAND') return 'Centro Comercial';
    if (tipo === 'BODEGA_MATRIZ' || tipo === 'BODEGA_CENTRAL') return 'Bodega Central';
    return 'Farmacia Estándar';
  }
}
