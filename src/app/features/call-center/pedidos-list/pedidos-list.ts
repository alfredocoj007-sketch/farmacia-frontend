import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PedidosService } from '../../../core/services/pedidos.service';
import { SucursalesService } from '../../../core/services/sucursales.service';
import {
  EstadisticasCallCenter,
  PedidoCallCenter,
  QueryPedidosParams,
} from '../../../core/models/pedido.models';
import { Sucursal } from '../../../core/models/lote.models';
import { ToastService } from '../../../shared/toast/toast.service';
import { Modal } from '../../../shared/modal/modal';
import { PedidoCallcenterModal } from '../pedido-callcenter-modal/pedido-callcenter-modal';
import { PedidoDetalleModal } from '../pedido-detalle-modal/pedido-detalle-modal';

@Component({
  selector: 'app-pedidos-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    Modal,
    PedidoCallcenterModal,
    PedidoDetalleModal,
  ],
  templateUrl: './pedidos-list.html',
  styleUrl: './pedidos-list.scss',
})
export class PedidosList implements OnInit {
  private readonly pedidosService = inject(PedidosService);
  private readonly sucursalesService = inject(SucursalesService);
  private readonly toastService = inject(ToastService);

  protected readonly pedidos = signal<PedidoCallCenter[]>([]);
  protected readonly sucursales = signal<Sucursal[]>([]);
  protected readonly estadisticas = signal<EstadisticasCallCenter | null>(null);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);

  // Filtros
  protected readonly filtroEstado = signal<string | null>(null);
  protected readonly filtroSucursalId = signal<number | null>(null);
  protected readonly busqueda = signal<string>('');

  // Modales
  protected readonly modalNuevoPedidoAbierto = signal(false);
  protected readonly pedidoSeleccionadoId = signal<number | null>(null);

  // Paginación (10 registros por página estrictamente)
  protected readonly page = signal(1);
  protected readonly limit = 10;
  protected readonly totalPaginas = computed(() =>
    Math.max(1, Math.ceil(this.pedidos().length / this.limit)),
  );
  protected readonly pedidosPaginados = computed(() => {
    const inicio = (this.page() - 1) * this.limit;
    return this.pedidos().slice(inicio, inicio + this.limit);
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

  // Métricas computadas locales si estadísticas del server están cargando
  protected readonly totalMontoPedidos = computed(() => {
    return this.pedidos().reduce((sum, p) => sum + Number(p.total), 0);
  });

  ngOnInit(): void {
    this.cargarDatosIniciales();
  }

  protected cargarDatosIniciales(): void {
    this.cargando.set(true);

    this.sucursalesService.findAll().subscribe({
      next: (sucs) => this.sucursales.set(sucs),
    });

    this.cargarEstadisticas();
    this.cargarPedidos();
  }

  protected cargarEstadisticas(): void {
    this.pedidosService.obtenerEstadisticas().subscribe({
      next: (stats) => this.estadisticas.set(stats),
    });
  }

  protected cargarPedidos(): void {
    this.cargando.set(true);
    this.error.set(null);

    const params: QueryPedidosParams = {};
    if (this.filtroEstado()) {
      params.estado = this.filtroEstado()!;
    }
    if (this.filtroSucursalId()) {
      params.sucursalId = this.filtroSucursalId()!;
    }
    if (this.busqueda().trim()) {
      params.busqueda = this.busqueda().trim();
    }

    this.pedidosService.listar(params).subscribe({
      next: (items) => {
        this.pedidos.set(items);
        this.page.set(1);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar los pedidos del Call Center.');
        this.cargando.set(false);
      },
    });
  }

  protected onFiltroChange(): void {
    this.cargarPedidos();
  }

  protected limpiarFiltros(): void {
    this.filtroEstado.set(null);
    this.filtroSucursalId.set(null);
    this.busqueda.set('');
    this.cargarPedidos();
  }

  // Modales
  protected abrirNuevoPedido(): void {
    this.modalNuevoPedidoAbierto.set(true);
  }

  protected cerrarNuevoPedido(): void {
    this.modalNuevoPedidoAbierto.set(false);
  }

  protected onPedidoCreado(): void {
    this.cerrarNuevoPedido();
    this.cargarPedidos();
    this.cargarEstadisticas();
    this.toastService.success(
      '¡Pedido Call Center registrado!',
      'La orden de entrega y despacho a domicilio ha sido creada con éxito.',
    );
  }

  protected abrirDetalle(pedidoId: number): void {
    this.pedidoSeleccionadoId.set(pedidoId);
  }

  protected cerrarDetalle(): void {
    this.pedidoSeleccionadoId.set(null);
  }

  protected onEstadoCambiado(): void {
    this.cargarPedidos();
    this.cargarEstadisticas();
    this.toastService.info(
      '¡Estado actualizado!',
      'El estado de despacho y logística del pedido ha sido actualizado.',
    );
  }
}
