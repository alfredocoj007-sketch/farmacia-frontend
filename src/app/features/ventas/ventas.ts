import { Component, HostListener, OnInit, computed, inject, signal } from '@angular/core';
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
  StockRedRespuesta,
  StockSucursalRed,
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

  // Vista de Catálogo (Tabla compacta por defecto vs Tarjetas)
  readonly vistaProductos = signal<'tabla' | 'tarjetas'>('tabla');

  // Datos del Cliente (FEL Guatemala)
  readonly esConsumidorFinal = signal<boolean>(true);
  readonly clienteNit = signal<string>('CF');
  readonly clienteNombre = signal<string>('Consumidor Final');
  readonly clienteDireccion = signal<string>('Ciudad de Guatemala');
  readonly clienteTelefono = signal<string>('2000-0000');
  readonly clienteTouched = signal<boolean>(false);

  // Parámetros de validación de NIT SAT
  readonly nitMinLength = 4;
  readonly nitMaxLength = 12;

  readonly nitError = computed<string | null>(() => {
    if (this.esConsumidorFinal()) return null;
    const raw = (this.clienteNit() || '').trim();
    if (!raw) {
      return 'El NIT es obligatorio para emitir factura con NIT.';
    }
    const clean = raw.replace(/\s+/g, '').toUpperCase();
    if (clean === 'CF' || clean === 'C/F') {
      return 'Para emitir con NIT ingresa un número válido (o selecciona el botón C/F).';
    }
    if (clean.length < this.nitMinLength) {
      return `Mínimo ${this.nitMinLength} caracteres para el NIT (has ingresado ${clean.length}). Ej: 123456-7`;
    }
    if (clean.length > this.nitMaxLength) {
      return `Máximo ${this.nitMaxLength} caracteres permitidos para el NIT (has ingresado ${clean.length}).`;
    }
    if (!/^[0-9A-Z-]+$/.test(clean)) {
      return 'El NIT solo debe contener números, letras y guión (-).';
    }
    return null;
  });

  readonly nombreError = computed<string | null>(() => {
    if (this.esConsumidorFinal()) return null;
    const nom = (this.clienteNombre() || '').trim();
    if (!nom) {
      return 'El nombre o razón social es obligatorio cuando se emite con NIT.';
    }
    if (nom.length < 3) {
      return `El nombre debe tener al menos 3 caracteres (has ingresado ${nom.length}).`;
    }
    return null;
  });

  readonly datosClienteValidos = computed<boolean>(() => {
    if (this.esConsumidorFinal()) return true;
    return !this.nitError() && !this.nombreError();
  });

  // Modal de Cobro y Facturación
  readonly modalCobroAbierto = signal<boolean>(false);
  readonly metodosPago = signal<MetodoPagoSimple[]>([]);
  readonly metodoPagoSeleccionadoId = signal<number>(1);
  readonly montoRecibido = signal<number>(0);
  readonly procesandoVenta = signal<boolean>(false);

  // Modal de Factura FEL / Ticket Térmico
  readonly modalTicketAbierto = signal<boolean>(false);
  readonly ventaEmitida = signal<VentaRespuesta | null>(null);

  // Modal de Consulta de Stock en Red de Sucursales
  readonly modalStockRedAbierto = signal<boolean>(false);
  readonly productoConsultadoStockRed = signal<ProductoPosItem | null>(null);
  readonly detalleStockRed = signal<StockRedRespuesta | null>(null);
  readonly cargandoStockRed = signal<boolean>(false);
  readonly errorStockRed = signal<string | null>(null);
  readonly filtroSoloConStock = signal<boolean>(true);
  readonly sedesFiltradasModal = computed(() => {
    const detalle = this.detalleStockRed();
    if (!detalle) return [];
    if (this.filtroSoloConStock()) {
      return detalle.sedes.filter((s) => s.stockDisponible > 0);
    }
    return detalle.sedes;
  });

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
        'Sin existencias en esta sede',
        `No hay stock disponible de "${prod.nombre}". Abriendo consulta en red...`,
      );
      this.abrirModalStockRed(prod);
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
    this.clienteTouched.set(false);
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

  onNitChange(valor: string): void {
    this.clienteNit.set(valor);
  }

  onNombreChange(valor: string): void {
    this.clienteNombre.set(valor);
  }

  // Flujo de Cobro
  iniciarCobro(): void {
    if (!this.cajaInfo()?.abierta) {
      this.toastService.warning(
        'Turno de caja cerrado',
        'No puedes cobrar porque la caja se encuentra cerrada en esta sucursal. Abre tu turno en el módulo de Cajas.',
      );
      return;
    }

    if (this.carrito().length === 0) {
      this.toastService.warning('Canasta vacía', 'Agrega medicamentos antes de cobrar.');
      return;
    }

    if (!this.esConsumidorFinal()) {
      this.clienteTouched.set(true);
      if (this.nitError()) {
        this.toastService.warning('NIT inválido', this.nitError()!);
        return;
      }
      if (this.nombreError()) {
        this.toastService.warning('Nombre requerido', this.nombreError()!);
        return;
      }
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
    if (!this.esConsumidorFinal() && !this.datosClienteValidos()) {
      this.clienteTouched.set(true);
      this.toastService.error(
        'Datos fiscales incompletos',
        'Verifica el NIT y nombre del comprador antes de continuar.',
      );
      return;
    }

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
        nit: this.esConsumidorFinal() ? 'CF' : (this.clienteNit()?.trim() || 'CF'),
        nombre: this.esConsumidorFinal()
          ? 'Consumidor Final'
          : (this.clienteNombre()?.trim() || 'Consumidor Final'),
        direccion: this.clienteDireccion()?.trim() || 'Ciudad de Guatemala',
        telefono: this.esConsumidorFinal() ? '2000-0000' : (this.clienteTelefono()?.trim() || ''),
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
        this.setConsumidorFinal(true);
        this.buscarProductos();
        this.verificarCaja(this.sucursalSeleccionadaId());

        // Alerta flotante moderna
        const numFactura = resp.fel?.numeroFactura || resp.numeroFactura || resp.pedidoId;
        this.toastService.success(
          '¡Venta registrada con éxito!',
          `Factura FEL #${numFactura} por Q${resp.total.toFixed(2)} emitida correctamente.`,
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

  // Consulta de Stock en Red de Sucursales
  abrirModalStockRed(p: ProductoPosItem, event?: MouseEvent): void {
    if (event) {
      event.stopPropagation();
    }
    this.productoConsultadoStockRed.set(p);
    this.detalleStockRed.set(null);
    this.errorStockRed.set(null);
    this.filtroSoloConStock.set(true);
    this.cargandoStockRed.set(true);
    this.modalStockRedAbierto.set(true);

    this.ventasService.obtenerStockRed(p.productoId).subscribe({
      next: (res) => {
        this.detalleStockRed.set(res);
        this.cargandoStockRed.set(false);
      },
      error: (err) => {
        if (err.status === 403) {
          this.errorStockRed.set('Acceso Restringido: Tu perfil no cuenta con permisos de auditoría multisede.');
        } else {
          this.errorStockRed.set('No se pudo consultar el stock en la red de sucursales en este momento.');
        }
        this.cargandoStockRed.set(false);
      },
    });
  }

  cerrarModalStockRed(): void {
    this.modalStockRedAbierto.set(false);
    this.productoConsultadoStockRed.set(null);
    this.detalleStockRed.set(null);
    this.errorStockRed.set(null);
  }

  sedesConStockCount(sedes: StockSucursalRed[]): number {
    return sedes.filter((s) => s.stockDisponible > 0).length;
  }

  copiarInfoCliente(sede: StockSucursalRed): void {
    const prod = this.detalleStockRed()?.producto;
    if (!prod) return;
    const direccionTexto = sede.direccion ? `📍 Dirección: ${sede.direccion}` : '';
    const telTexto = sede.telefono ? `📞 Teléfono: ${sede.telefono}` : '';
    const unidadTexto = prod.unidadMedida ? ` / ${prod.unidadMedida}` : '';
    const texto = `🏥 *Farmacia ProSalud - Disponibilidad de Medicamento*\n💊 *Producto:* ${prod.nombre} (${prod.presentacion || ''})\n🏢 *Sucursal disponible:* ${sede.nombre}\n${direccionTexto}\n${telTexto}\n📦 *Stock:* ${sede.stockDisponible} ${prod.unidadMedidaAbrev || 'uds'} disponibles\n💰 *Precio:* Q ${prod.precioVenta.toFixed(2)}${unidadTexto}`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(texto).then(() => {
        this.toastService.success('Copiado al portapapeles', `Datos de ${sede.nombre} listos para compartir al cliente.`);
      }).catch(() => {
        this.toastService.info('Datos listos', texto);
      });
    }
  }

  copiarDireccion(direccion: string): void {
    if (!direccion) return;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(direccion).then(() => {
        this.toastService.success('Dirección copiada', direccion);
      });
    }
  }

  copiarTodasSedesConStock(): void {
    const detalle = this.detalleStockRed();
    if (!detalle) return;
    const conStock = detalle.sedes.filter((s) => s.stockDisponible > 0);
    if (conStock.length === 0) {
      this.toastService.warning('Sin existencias', 'No hay ninguna sede con stock disponible.');
      return;
    }
    const unidadTexto = detalle.producto.unidadMedida ? ` / ${detalle.producto.unidadMedida}` : '';
    let texto = `🏥 *Farmacia ProSalud - Disponibilidad en Red*\n💊 *Producto:* ${detalle.producto.nombre}\n💰 *Precio:* Q ${detalle.producto.precioVenta.toFixed(2)}${unidadTexto}\n\n*Sucursales disponibles:*\n`;
    conStock.forEach((s) => {
      texto += `• *${s.nombre}*: ${s.stockDisponible} ${detalle.producto.unidadMedidaAbrev || 'uds'} disponibles\n  Dirección: ${s.direccion || 'N/A'}\n  Tel: ${s.telefono || 'N/A'}\n\n`;
    });
    if (navigator.clipboard) {
      navigator.clipboard.writeText(texto).then(() => {
        this.toastService.success('Copiado', 'Lista de sucursales copiada al portapapeles.');
      });
    }
  }

  @HostListener('document:keydown.escape')
  onEscapePressed(): void {
    if (this.modalStockRedAbierto()) {
      this.cerrarModalStockRed();
    }
  }
}
