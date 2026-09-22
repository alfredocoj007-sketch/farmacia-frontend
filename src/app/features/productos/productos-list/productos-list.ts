import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../../shared/toast/toast.service';
import { ConfirmService } from '../../../shared/confirm/confirm.service';
import { Modal } from '../../../shared/modal/modal';
import { ProductosService } from '../../../core/services/productos.service';
import { CategoriasProductoService } from '../../../core/services/categorias-producto.service';
import { LotesService } from '../../../core/services/lotes.service';
import { AuthService } from '../../../core/services/auth.service';
import { CategoriaProducto, Producto } from '../../../core/models/producto.models';
import { Lote } from '../../../core/models/lote.models';
import { ProductoForm } from '../producto-form/producto-form';

@Component({
  selector: 'app-productos-list',
  imports: [FormsModule, Modal, ProductoForm, RouterLink, DatePipe],
  templateUrl: './productos-list.html',
  styleUrl: './productos-list.scss',
})
export class ProductosList implements OnInit {
  private readonly productosService = inject(ProductosService);
  private readonly categoriasService = inject(CategoriasProductoService);
  private readonly lotesService = inject(LotesService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);
  private readonly confirmService = inject(ConfirmService);

  protected readonly usuario = this.authService.currentUser;
  protected readonly productos = signal<Producto[]>([]);
  protected readonly categorias = signal<CategoriaProducto[]>([]);
  protected readonly total = signal(0);
  protected readonly page = signal(1);
  protected readonly limit = 10;
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);

  // Lotes vinculados en modal de detalle
  protected readonly lotesDeProductoDetalle = signal<Lote[]>([]);
  protected readonly cargandoLotesDetalle = signal<boolean>(false);

  // Quick KPI counters
  protected readonly totalRegistrados = signal(0);
  protected readonly totalActivos = signal(0);
  protected readonly totalInactivos = signal(0);
  protected readonly totalConReceta = signal(0);

  // Modal states
  protected readonly productoEnEdicion = signal<number | null | undefined>(undefined);
  protected readonly productoDetalle = signal<Producto | null>(null);
  protected readonly procesandoId = signal<number | null>(null);

  // Filter states
  protected q = '';
  protected estado: '' | 'ACTIVO' | 'INACTIVO' = '';
  protected categoriaId: number | '' = '';
  protected requiereRecetaFiltro: '' | 'S' | 'N' = '';

  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  protected readonly filtrosActivosCount = computed(() => {
    let count = 0;
    if (this.q.trim()) count++;
    if (this.estado) count++;
    if (this.categoriaId !== '') count++;
    if (this.requiereRecetaFiltro) count++;
    return count;
  });

  ngOnInit(): void {
    this.cargarCategorias();
    this.cargarKpis();
    this.cargar();
  }

  protected onSearchInput(): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.page.set(1);
      this.cargar();
    }, 300);
  }

  protected cambiarEstado(nuevoEstado: '' | 'ACTIVO' | 'INACTIVO'): void {
    this.estado = nuevoEstado;
    this.page.set(1);
    this.cargar();
  }

  protected cambiarCategoria(): void {
    this.page.set(1);
    this.cargar();
  }

  protected cambiarFiltroReceta(receta: '' | 'S' | 'N'): void {
    this.requiereRecetaFiltro = receta;
    this.page.set(1);
    this.cargar();
  }

  protected limpiarFiltros(): void {
    this.q = '';
    this.estado = '';
    this.categoriaId = '';
    this.requiereRecetaFiltro = '';
    this.page.set(1);
    this.cargar();
  }

  protected cambiarPagina(delta: number): void {
    const nueva = this.page() + delta;
    if (nueva >= 1 && nueva <= this.totalPaginas()) {
      this.page.set(nueva);
      this.cargar();
    }
  }

  protected irAPagina(pagina: number): void {
    this.page.set(pagina);
    this.cargar();
  }

  protected abrirCrear(): void {
    this.productoEnEdicion.set(null);
  }

  protected async abrirEditar(producto: Producto): Promise<void> {
    const confirmado = await this.confirmService.confirm({
      title: '¿Deseas editar este producto?',
      message: `Se abrirá la ficha técnica de "${producto.nombre}" para modificar sus datos.`,
      confirmText: 'Sí, Editar',
      cancelText: 'Cancelar',
      tipo: 'primary',
    });
    if (!confirmado) return;
    this.productoEnEdicion.set(producto.productoId);
  }

  protected verDetalle(producto: Producto): void {
    this.productoDetalle.set(producto);
    this.lotesDeProductoDetalle.set([]);
    this.cargandoLotesDetalle.set(true);

    this.lotesService.findAll({ productoId: producto.productoId, limit: 50 }).subscribe({
      next: (res) => {
        this.lotesDeProductoDetalle.set(res.data ?? []);
        this.cargandoLotesDetalle.set(false);
      },
      error: () => {
        this.cargandoLotesDetalle.set(false);
      },
    });
  }

  protected verKardex(loteId: number): void {
    this.cerrarDetalle();
    this.router.navigate(['/lotes', loteId]);
  }

  protected diasParaVencerLote(fechaVencimiento: string | Date): number {
    let fechaVenc: Date;
    if (typeof fechaVencimiento === 'string') {
      const parts = fechaVencimiento.split('T')[0].split('-').map(Number);
      fechaVenc = parts.length === 3 ? new Date(parts[0], parts[1] - 1, parts[2]) : new Date(fechaVencimiento);
    } else {
      fechaVenc = new Date(fechaVencimiento);
    }
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    return Math.round((fechaVenc.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
  }

  protected calcularStockLote(lote: Lote): number {
    return (lote.inventarios ?? []).reduce(
      (sum, inv) => sum + Number(inv.cantidadDisponible ?? 0),
      0,
    );
  }

  protected cerrarDetalle(): void {
    this.productoDetalle.set(null);
    this.lotesDeProductoDetalle.set([]);
  }

  protected cerrarFormulario(): void {
    this.productoEnEdicion.set(undefined);
  }

  protected onGuardado(): void {
    const esCreacion = this.productoEnEdicion() === null;
    this.cerrarFormulario();
    this.cargar();
    this.cargarKpis();
    this.toastService.success(
      esCreacion ? '¡Medicamento registrado con éxito!' : '¡Medicamento actualizado!',
      esCreacion
        ? 'El producto se ha incorporado al catálogo comercial.'
        : 'Los cambios en la ficha técnica fueron guardados correctamente.',
    );
  }

  protected async alternarEstado(producto: Producto): Promise<void> {
    const esDesactivar = producto.estado === 'ACTIVO';
    const confirmado = await this.confirmService.confirm({
      title: esDesactivar
        ? '¿Estás seguro de desactivar este producto?'
        : '¿Estás seguro de reactivar este producto?',
      message: esDesactivar
        ? `El medicamento "${producto.nombre}" pasará a estado inactivo y no podrá dispensarse en ventas ni pedidos.`
        : `El medicamento "${producto.nombre}" volverá a estar disponible para su comercialización.`,
      confirmText: esDesactivar ? 'Sí, Desactivar' : 'Sí, Reactivar',
      cancelText: 'Cancelar',
      tipo: esDesactivar ? 'danger' : 'primary',
    });

    if (!confirmado) {
      return;
    }

    this.procesandoId.set(producto.productoId);
    const peticion = producto.estado === 'ACTIVO'
      ? this.productosService.desactivar(producto.productoId)
      : this.productosService.activar(producto.productoId);

    peticion.subscribe({
      next: (actualizado) => {
        this.procesandoId.set(null);
        this.cargar();
        this.cargarKpis();
        this.toastService.info(
          actualizado.estado === 'ACTIVO' ? '¡Medicamento Activado!' : 'Medicamento Desactivado',
          `El estado de "${actualizado.nombre}" ha sido actualizado a ${actualizado.estado.toLowerCase()}.`,
        );
      },
      error: () => {
        this.procesandoId.set(null);
        this.toastService.error('Error al cambiar el estado del medicamento.');
      },
    });
  }

  protected esAdmin(): boolean {
    return this.usuario()?.rol === 'ADMIN';
  }

  protected totalPaginas(): number {
    return Math.max(1, Math.ceil(this.total() / this.limit));
  }

  protected listaPaginas(): number[] {
    const total = this.totalPaginas();
    const actual = this.page();
    const paginas: number[] = [];

    const inicio = Math.max(1, actual - 2);
    const fin = Math.min(total, actual + 2);

    for (let i = inicio; i <= fin; i++) {
      paginas.push(i);
    }
    return paginas;
  }

  private cargarCategorias(): void {
    this.categoriasService.findAll().subscribe({
      next: (cats) => this.categorias.set(cats),
      error: () => {},
    });
  }

  private cargarKpis(): void {
    this.productosService.findAll({ limit: 500 }).subscribe({
      next: (res) => {
        this.totalRegistrados.set(res.total);
        const activos = res.data.filter((p) => p.estado === 'ACTIVO').length;
        const inactivos = res.data.filter((p) => p.estado === 'INACTIVO').length;
        const conReceta = res.data.filter((p) => p.requiereReceta === 'S').length;

        this.totalActivos.set(activos);
        this.totalInactivos.set(inactivos);
        this.totalConReceta.set(conReceta);
      },
      error: () => {},
    });
  }

  private cargar(): void {
    this.cargando.set(true);
    this.error.set(null);

    this.productosService
      .findAll({
        q: this.q.trim() || undefined,
        estado: this.estado || undefined,
        categoriaId: this.categoriaId !== '' ? Number(this.categoriaId) : undefined,
        page: this.page(),
        limit: this.limit,
      })
      .subscribe({
        next: (respuesta) => {
          let data = respuesta.data;
          if (this.requiereRecetaFiltro) {
            data = data.filter((p) => p.requiereReceta === this.requiereRecetaFiltro);
          }
          this.productos.set(data);
          this.total.set(respuesta.total);
          this.cargando.set(false);
        },
        error: () => {
          this.error.set('No se pudieron cargar los productos. Por favor intenta de nuevo.');
          this.cargando.set(false);
        },
      });
  }
}
