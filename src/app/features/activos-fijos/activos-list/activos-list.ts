import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { ActivosFijosService } from '../../../core/services/activos-fijos.service';
import { SucursalesService } from '../../../core/services/sucursales.service';
import {
  ActivoFijo,
  CategoriaActivo,
  EstadisticasActivosFijos,
  QueryActivoFijoParams,
} from '../../../core/models/activo-fijo.models';
import { Sucursal } from '../../../core/models/lote.models';
import { Modal } from '../../../shared/modal/modal';
import { ToastService } from '../../../shared/toast/toast.service';
import { ActivoFormModal } from '../activo-form-modal/activo-form-modal';
import { ActivoTrasladoModal } from '../activo-traslado-modal/activo-traslado-modal';
import { ActivoMantenimientoModal } from '../activo-mantenimiento-modal/activo-mantenimiento-modal';
import { ActivoDetalleModal } from '../activo-detalle-modal/activo-detalle-modal';

@Component({
  selector: 'app-activos-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    Modal,
    ActivoFormModal,
    ActivoTrasladoModal,
    ActivoMantenimientoModal,
    ActivoDetalleModal,
  ],
  templateUrl: './activos-list.html',
  styleUrl: './activos-list.scss',
})
export class ActivosList implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly activosService = inject(ActivosFijosService);
  private readonly sucursalesService = inject(SucursalesService);
  private readonly toastService = inject(ToastService);

  protected readonly usuarioActual = this.authService.currentUser;
  protected readonly esAdmin = computed(() => this.usuarioActual()?.rol === 'ADMIN');

  protected readonly activos = signal<ActivoFijo[]>([]);
  protected readonly categorias = signal<CategoriaActivo[]>([]);
  protected readonly sucursales = signal<Sucursal[]>([]);
  protected readonly estadisticas = signal<EstadisticasActivosFijos | null>(null);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);

  // Filtros
  protected readonly filtroSucursalId = signal<number | null>(null);
  protected readonly filtroCategoriaId = signal<number | null>(null);
  protected readonly filtroEstado = signal<string | null>(null);
  protected readonly busqueda = signal<string>('');

  protected readonly modalAltaAbierto = signal(false);
  protected readonly activoParaTraslado = signal<ActivoFijo | null>(null);
  protected readonly activoParaMantenimiento = signal<ActivoFijo | null>(null);
  protected readonly activoParaDetalle = signal<number | null>(null);

  // Paginación (10 registros por página estrictamente)
  protected readonly page = signal(1);
  protected readonly limit = 10;
  protected readonly totalPaginas = computed(() =>
    Math.max(1, Math.ceil(this.activos().length / this.limit)),
  );
  protected readonly activosPaginados = computed(() => {
    const inicio = (this.page() - 1) * this.limit;
    return this.activos().slice(inicio, inicio + this.limit);
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

  // Totales computados
  protected readonly totalInversion = computed(() => {
    return this.activos().reduce((sum, a) => sum + Number(a.valorAdquisicion), 0);
  });

  protected readonly totalValorLibros = computed(() => {
    return this.activos().reduce((sum, a) => sum + Number(a.valorLibros), 0);
  });

  protected readonly totalDepreciacion = computed(() => {
    return this.activos().reduce((sum, a) => sum + Number(a.depreciacionAcumulada), 0);
  });

  ngOnInit(): void {
    this.cargarDatosIniciales();
  }

  protected cargarDatosIniciales(): void {
    this.cargando.set(true);

    // Si no es administrador y tiene sucursal asignada, pre-fijamos el filtro
    if (!this.esAdmin() && this.usuarioActual()?.sucursalId) {
      this.filtroSucursalId.set(this.usuarioActual()!.sucursalId!);
    }

    // Cargar categorías y sucursales
    this.activosService.listarCategorias().subscribe({
      next: (cats) => this.categorias.set(cats),
    });

    this.sucursalesService.findAll().subscribe({
      next: (sucs) => this.sucursales.set(sucs),
    });

    this.cargarEstadisticas();
    this.cargarActivos();
  }

  protected cargarEstadisticas(): void {
    const sucId = this.esAdmin()
      ? (this.filtroSucursalId() ?? undefined)
      : (this.usuarioActual()?.sucursalId ?? undefined);

    this.activosService.obtenerEstadisticas(sucId).subscribe({
      next: (stats) => this.estadisticas.set(stats),
    });
  }

  protected cargarActivos(): void {
    this.cargando.set(true);
    this.error.set(null);

    const params: QueryActivoFijoParams = {};
    if (this.filtroSucursalId()) {
      params.sucursalId = this.filtroSucursalId()!;
    }
    if (this.filtroCategoriaId()) {
      params.categoriaActivoId = this.filtroCategoriaId()!;
    }
    if (this.filtroEstado()) {
      params.estado = this.filtroEstado()!;
    }
    if (this.busqueda().trim()) {
      params.busqueda = this.busqueda().trim();
    }

    this.activosService.listar(params).subscribe({
      next: (items) => {
        this.activos.set(items);
        this.page.set(1);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('Error al cargar el inventario de activos fijos.');
        this.cargando.set(false);
      },
    });
  }

  protected onFiltroChange(): void {
    this.cargarEstadisticas();
    this.cargarActivos();
  }

  protected limpiarFiltros(): void {
    if (this.esAdmin()) {
      this.filtroSucursalId.set(null);
    } else if (this.usuarioActual()?.sucursalId) {
      this.filtroSucursalId.set(this.usuarioActual()!.sucursalId!);
    }
    this.filtroCategoriaId.set(null);
    this.filtroEstado.set(null);
    this.busqueda.set('');
    this.cargarEstadisticas();
    this.cargarActivos();
  }

  // Modales
  protected abrirAlta(): void {
    this.modalAltaAbierto.set(true);
  }

  protected cerrarAlta(): void {
    this.modalAltaAbierto.set(false);
  }

  protected onAltaGuardada(): void {
    this.cerrarAlta();
    this.toastService.success('¡Activo Registrado!', 'El activo fijo fue incorporado con éxito al patrimonio.');
    this.cargarActivos();
    this.cargarEstadisticas();
  }

  protected abrirTraslado(activo: ActivoFijo): void {
    this.activoParaTraslado.set(activo);
  }

  protected cerrarTraslado(): void {
    this.activoParaTraslado.set(null);
  }

  protected onTrasladoCompletado(): void {
    this.cerrarTraslado();
    this.toastService.success('¡Traslado Completado!', 'El activo fue reubicado de sucursal exitosamente.');
    this.cargarActivos();
    this.cargarEstadisticas();
  }

  protected abrirMantenimiento(activo: ActivoFijo): void {
    this.activoParaMantenimiento.set(activo);
  }

  protected cerrarMantenimiento(): void {
    this.activoParaMantenimiento.set(null);
  }

  protected onMantenimientoGuardado(): void {
    this.cerrarMantenimiento();
    this.toastService.info('¡Mantenimiento Registrado!', 'El servicio técnico del activo fue asentado en la bitácora.');
    this.cargarActivos();
    this.cargarEstadisticas();
  }

  protected abrirDetalle(activoId: number): void {
    this.activoParaDetalle.set(activoId);
  }

  protected cerrarDetalle(): void {
    this.activoParaDetalle.set(null);
  }
}
