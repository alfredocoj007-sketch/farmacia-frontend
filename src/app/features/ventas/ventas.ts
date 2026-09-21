import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { VentasService } from '../../core/services/ventas.service';
import { SucursalesService } from '../../core/services/sucursales.service';
import { ToastService } from '../../shared/toast/toast.service';
import { AuthService } from '../../core/services/auth.service';
import {
  MetodoPagoSimple,
  ProductoPosItem,
  SesionCajaInfo,
  VentaListadoItem,
  VentaRespuesta,
} from '../../core/models/venta.models';
import { SucursalRed } from '../../core/models/sucursal.models';

export interface ItemCarrito {
  producto: ProductoPosItem;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

@Component({
  selector: 'app-ventas',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './ventas.html',
  styleUrls: ['./ventas.scss'],
})
export class Ventas implements OnInit {
  private readonly ventasService = inject(VentasService);
  private readonly sucursalesService = inject(SucursalesService);
  private readonly toastService = inject(ToastService);
  readonly authService = inject(AuthService);

  // Sucursales y Estado de Caja
  readonly sucursales = signal<SucursalRed[]>([]);
  readonly sucursalSeleccionadaId = signal<number>(1);
  readonly cajaInfo = signal<SesionCajaInfo | null>(null);
  readonly cargandoCaja = signal<boolean>(false);

  // Catálogo de Productos y Búsqueda
  readonly productos = signal<ProductoPosItem[]>([]);
  readonly cargandoProductos = signal<boolean>(false);
  readonly terminoBusqueda = signal<string>('');
  readonly categoriaFiltro = signal<string>('TODAS');

  // Canasta / Ticket de Venta
  readonly carrito = signal<ItemCarrito[]>([]);

  // Datos del Cliente (FEL Guatemala)
  readonly esConsumidorFinal = signal<boolean>(true);
  readonly clienteNit = signal<string>('CF');
  readonly clienteNombre = signal<string>('Consumidor Final');
  readonly clienteDireccion = signal<string>('Ciudad de Guatemala');
  readonly clienteTelefono = signal<string>('2000-0000');

  // Modal de Cobro y Facturación
  readonly modalCobroAbierto = signal<boolean>(false);
  readonly metodosPago = signal<MetodoPagoSimple[]>([]);
  readonly metodoPagoSeleccionadoId = signal<number>(1);
  readonly montoRecibido = signal<number>(0);
  readonly procesandoVenta = signal<boolean>(false);

  // Modal de Factura FEL / Ticket Térmico
  readonly modalTicketAbierto = signal<boolean>(false);
  readonly ventaEmitida = signal<VentaRespuesta | null>(null);

  // Historial de Ventas del Día
  readonly vistaHistorial = signal<boolean>(false);
  readonly historialVentas = signal<VentaListadoItem[]>([]);
  readonly cargandoHistorial = signal<boolean>(false);
  readonly filtroHistorial = signal<string>('');

  // Paginación Historial de Ventas (10 por página)
  readonly pageHistorial = signal<number>(1);
  readonly limitHistorial = 10;
  readonly totalPaginasHistorial = computed(() =>
    Math.max(1, Math.ceil(this.historialVentas().length / this.limitHistorial)),
  );
  readonly historialPaginado = computed(() => {
    const inicio = (this.pageHistorial() - 1) * this.limitHistorial;
    return this.historialVentas().slice(inicio, inicio + this.limitHistorial);
  });
  readonly listaPaginasHistorial = computed(() => {
    const total = this.totalPaginasHistorial();
    const actual = this.pageHistorial();
    const paginas: number[] = [];
    const inicio = Math.max(1, actual - 2);
    const fin = Math.min(total, actual + 2);
    for (let i = inicio; i <= fin; i++) {
      paginas.push(i);
    }
    return paginas;
  });

  cambiarPaginaHistorial(delta: number): void {
    const nueva = this.pageHistorial() + delta;
    if (nueva >= 1 && nueva <= this.totalPaginasHistorial()) {
      this.pageHistorial.set(nueva);
    }
  }

  irAPaginaHistorial(p: number): void {
    if (p >= 1 && p <= this.totalPaginasHistorial()) {
      this.pageHistorial.set(p);
    }
  }

  // Computados
  readonly totalArticulos = computed(() =>
    this.carrito().reduce((acc, item) => acc + item.cantidad, 0),
  );

  readonly totalVenta = computed(() => {
    const sum = this.carrito().reduce((acc, item) => acc + item.subtotal, 0);
    return Number(sum.toFixed(2));
  });

  readonly baseImponible = computed(() =>
    Number((this.totalVenta() / 1.12).toFixed(2)),
  );

  readonly ivaCalculado = computed(() =>
    Number((this.totalVenta() - this.baseImponible()).toFixed(2)),
  );

  readonly cambioEfectivo = computed(() => {
    const recibido = Number(this.montoRecibido() || 0);
    const total = this.totalVenta();
    return Number(Math.max(0, recibido - total).toFixed(2));
  });

  readonly productosFiltrados = computed(() => {
    const cat = this.categoriaFiltro();
    const prods = this.productos();
    if (cat === 'TODAS') return prods;
    return prods.filter((p) => p.categoria.toUpperCase() === cat.toUpperCase());
  });

  readonly categoriasDisponibles = computed(() => {
    const set = new Set<string>();
    this.productos().forEach((p) => {
      if (p.categoria) set.add(p.categoria);
    });
    return Array.from(set).sort();
  });

  readonly esAdmin = computed(() => this.authService.currentUser()?.rol === 'ADMIN');
  readonly sucursalAsignadaId = computed(() => this.authService.currentUser()?.sucursalId);
  readonly nombreSucursalAsignada = computed(() => {
    const u = this.authService.currentUser();
    if (u?.sucursalNombre) return u.sucursalNombre;
    const match = this.sucursales().find((s) => s.sucursalId === u?.sucursalId);
    return match?.nombre || 'Sucursal Asignada';
  });

  ngOnInit(): void {
    this.cargarSucursales();
    this.cargarMetodosPago();
  }

  cargarSucursales(): void {
    this.sucursalesService.findAll().subscribe({
      next: (data: SucursalRed[]) => {
        this.sucursales.set(data);
        if (data.length > 0) {
          const userSucursalId = this.authService.currentUser()?.sucursalId;
          const esAdmin = this.esAdmin();

          // Si el usuario no es admin y tiene sucursal asignada, fijar su sede
          let idInicial = data[0].sucursalId;
          if (!esAdmin && userSucursalId) {
            const existe = data.find((s) => s.sucursalId === userSucursalId);
            if (existe) {
              idInicial = userSucursalId;
            }
          }

          this.sucursalSeleccionadaId.set(idInicial);
          this.cambiarSucursal(idInicial);
        }
      },
      error: () => this.toastService.error('Error al cargar la red de sucursales.'),
    });
  }

  cargarMetodosPago(): void {
    this.ventasService.listarMetodosPago().subscribe({
      next: (data) => {
        this.metodosPago.set(data);
        if (data.length > 0) {
          this.metodoPagoSeleccionadoId.set(data[0].metodoPagoId);
        }
      },
    });
  }

  cambiarSucursal(sucursalId: number): void {
    const userSucursalId = this.authService.currentUser()?.sucursalId;
    const esAdmin = this.esAdmin();

    if (!esAdmin && userSucursalId && Number(sucursalId) !== Number(userSucursalId)) {
      this.toastService.warning(
        'Acceso Restringido',
        'Solo puedes operar en tu sucursal asignada.',
      );
      this.sucursalSeleccionadaId.set(userSucursalId);
      return;
    }

    this.sucursalSeleccionadaId.set(sucursalId);
    this.carrito.set([]);
    this.terminoBusqueda.set('');
    this.verificarCaja(sucursalId);
    this.buscarProductos();
    this.cargarHistorial();
  }

  verificarCaja(sucursalId: number): void {
    this.cargandoCaja.set(true);
    this.ventasService.verificarSesionCaja(sucursalId).subscribe({
      next: (info) => {
        this.cajaInfo.set(info);
        this.cargandoCaja.set(false);
      },
      error: () => {
        this.cajaInfo.set({ abierta: false, mensaje: 'Error al consultar estado de caja.' });
        this.cargandoCaja.set(false);
      },
    });
  }

  buscarProductos(): void {
    this.cargandoProductos.set(true);
    this.ventasService
      .buscarProductos(this.terminoBusqueda(), this.sucursalSeleccionadaId())
      .subscribe({
        next: (data) => {
          this.productos.set(data);
          this.cargandoProductos.set(false);
        },
        error: () => {
          this.toastService.error('Error al buscar medicamentos en catálogo.');
          this.cargandoProductos.set(false);
        },
      });
  }

  onBuscarInput(): void {
    this.buscarProductos();
  }

  // Operaciones del Carrito
  agregarAlCarrito(prod: ProductoPosItem): void {
    if (prod.stockDisponible <= 0) {
      this.toastService.warning(
        'Sin existencias disponibles',
        `No hay stock de "${prod.nombre}" en esta sede.`,
      );
      return;
    }

    const items = [...this.carrito()];
    const index = items.findIndex((i) => i.producto.productoId === prod.productoId);

    if (index >= 0) {
      if (items[index].cantidad + 1 > prod.stockDisponible) {
        this.toastService.warning(
          'Límite de stock alcanzado',
          `Solo hay ${prod.stockDisponible} unidades disponibles.`,
        );
        return;
      }
      items[index].cantidad += 1;
      items[index].subtotal = Number(
        (items[index].cantidad * items[index].precioUnitario).toFixed(2),
      );
    } else {
      items.push({
        producto: prod,
        cantidad: 1,
        precioUnitario: prod.precioVenta,
        subtotal: prod.precioVenta,
      });
    }

    this.carrito.set(items);
  }

  modificarCantidad(index: number, delta: number): void {
    const items = [...this.carrito()];
    const item = items[index];
    const nuevaCant = item.cantidad + delta;

    if (nuevaCant <= 0) {
      this.removerItem(index);
      return;
    }

    if (nuevaCant > item.producto.stockDisponible) {
      this.toastService.warning(
        'Stock insuficiente',
        `Existencias máximas: ${item.producto.stockDisponible}`,
      );
      return;
    }

    item.cantidad = nuevaCant;
    item.subtotal = Number((item.cantidad * item.precioUnitario).toFixed(2));
    this.carrito.set(items);
  }

  removerItem(index: number): void {
    const items = [...this.carrito()];
    items.splice(index, 1);
    this.carrito.set(items);
  }

  vaciarCarrito(): void {
    this.carrito.set([]);
  }

  // Selector de Cliente
  setConsumidorFinal(esCF: boolean): void {
    this.esConsumidorFinal.set(esCF);
    if (esCF) {
      this.clienteNit.set('CF');
      this.clienteNombre.set('Consumidor Final');
      this.clienteDireccion.set('Ciudad de Guatemala');
      this.clienteTelefono.set('2000-0000');
    } else {
      this.clienteNit.set('');
      this.clienteNombre.set('');
      this.clienteDireccion.set('');
      this.clienteTelefono.set('');
    }
  }

  // Flujo de Cobro
  iniciarCobro(): void {
    if (this.carrito().length === 0) {
      this.toastService.warning('Canasta vacía', 'Agrega medicamentos antes de cobrar.');
      return;
    }

    const total = this.totalVenta();
    this.montoRecibido.set(total);
    this.modalCobroAbierto.set(true);
  }

  cerrarModalCobro(): void {
    this.modalCobroAbierto.set(false);
  }

  seleccionarEfectivoRapido(monto: number): void {
    this.montoRecibido.set(monto);
  }

  confirmarVenta(): void {
    const total = this.totalVenta();
    const recibido = Number(this.montoRecibido() || 0);

    const metodoId = this.metodoPagoSeleccionadoId();
    const metodo = this.metodosPago().find((m) => m.metodoPagoId === metodoId);
    const esEfectivo = (metodo?.nombre || '').toUpperCase().includes('EFECTIVO');

    if (esEfectivo && recibido < total) {
      this.toastService.error(
        'Monto insuficiente',
        `El dinero recibido (Q${recibido.toFixed(2)}) es menor al total a pagar (Q${total.toFixed(2)}).`,
      );
      return;
    }

    this.procesandoVenta.set(true);

    const payload = {
      sucursalId: this.sucursalSeleccionadaId(),
      metodoPagoId: metodoId,
      montoRecibido: esEfectivo ? recibido : total,
      cajaId: this.cajaInfo()?.cajaId,
      cliente: {
        nit: this.clienteNit() || 'CF',
        nombre: this.clienteNombre() || 'Consumidor Final',
        direccion: this.clienteDireccion() || 'Ciudad de Guatemala',
        telefono: this.clienteTelefono() || '2000-0000',
      },
      items: this.carrito().map((item) => ({
        productoId: item.producto.productoId,
        loteId: item.producto.proximoLote?.loteId,
        cantidad: item.cantidad,
      })),
    };

    this.ventasService.registrarVenta(payload).subscribe({
      next: (resp) => {
        this.procesandoVenta.set(false);
        this.modalCobroAbierto.set(false);
        this.ventaEmitida.set(resp);
        this.modalTicketAbierto.set(true);
        this.vaciarCarrito();
        this.buscarProductos();
        this.verificarCaja(this.sucursalSeleccionadaId());

        // Alerta flotante moderna
        this.toastService.success(
          '¡Venta registrada con éxito!',
          `Factura FEL #${resp.fel.numeroFactura} por Q${resp.total.toFixed(2)} emitida correctamente.`,
        );
      },
      error: (err) => {
        this.procesandoVenta.set(false);
        const errorMsg =
          err?.error?.message || 'Error al procesar la venta en mostrador.';
        this.toastService.error('Fallo en venta POS', errorMsg);
      },
    });
  }

  cerrarModalTicket(): void {
    this.modalTicketAbierto.set(false);
    this.ventaEmitida.set(null);
  }

  imprimirTicket(): void {
    window.print();
  }

  // Historial de Ventas
  toggleVistaHistorial(): void {
    const nuevoEstado = !this.vistaHistorial();
    this.vistaHistorial.set(nuevoEstado);
    if (nuevoEstado) {
      this.cargarHistorial();
    }
  }

  cargarHistorial(): void {
    this.cargandoHistorial.set(true);
    this.ventasService
      .listarVentas({
        sucursalId: this.sucursalSeleccionadaId(),
        busqueda: this.filtroHistorial(),
      })
      .subscribe({
        next: (data) => {
          this.historialVentas.set(data);
          this.pageHistorial.set(1);
          this.cargandoHistorial.set(false);
        },
        error: () => {
          this.toastService.error('Error al cargar historial de ventas.');
          this.cargandoHistorial.set(false);
        },
      });
  }

  verTicketHistorial(pedidoId: number): void {
    this.ventasService.obtenerVentaPorId(pedidoId).subscribe({
      next: (venta) => {
        this.ventaEmitida.set(venta);
        this.modalTicketAbierto.set(true);
      },
      error: () => this.toastService.error('No se pudo cargar el ticket.'),
    });
  }
}
