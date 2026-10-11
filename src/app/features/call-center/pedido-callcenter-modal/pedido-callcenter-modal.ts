import { Component, EventEmitter, OnInit, Output, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PedidosService } from '../../../core/services/pedidos.service';
import { CajasService } from '../../../core/services/cajas.service';
import { ToastService } from '../../../shared/toast/toast.service';
import {
  ClienteSimple,
  CreatePedidoCallCenterRequest,
  MedicamentoCallCenter,
  SucursalDisponibilidad,
} from '../../../core/models/pedido.models';
import { MetodoPago } from '../../../core/models/caja.models';

export interface ItemCarrito {
  producto: MedicamentoCallCenter;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

@Component({
  selector: 'app-pedido-callcenter-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pedido-callcenter-modal.html',
})
export class PedidoCallcenterModal implements OnInit {
  private readonly pedidosService = inject(PedidosService);
  private readonly cajasService = inject(CajasService);
  private readonly toastService = inject(ToastService);

  @Output() pedidoCreado = new EventEmitter<void>();
  @Output() cancelar = new EventEmitter<void>();

  protected readonly guardando = signal(false);
  protected readonly consultandoStock = signal(false);
  protected readonly cargandoMedicamentos = signal(false);
  protected readonly error = signal<string | null>(null);

  // Catálogos
  protected readonly productos = signal<MedicamentoCallCenter[]>([]);
  protected readonly metodosPago = signal<MetodoPago[]>([]);

  // Búsqueda de medicamentos con reactividad pura
  protected readonly busquedaTexto = signal<string>('');
  protected readonly cantidadAgregar = signal<number>(1);
  protected readonly soloConStock = signal<boolean>(false);

  // Medicamento actualmente seleccionado (opcional, para confirmar antes de agregar)
  protected readonly productoSeleccionado = signal<MedicamentoCallCenter | null>(null);

  // Filtrado reactivo en tiempo real
  protected readonly medicamentosFiltrados = computed(() => {
    const query = this.busquedaTexto().trim().toLowerCase();
    const todos = this.productos();
    const soloStock = this.soloConStock();

    let lista = todos;
    if (soloStock) {
      lista = lista.filter((p) => !p.agotado && p.stockTotal > 0);
    }

    if (!query) {
      return lista;
    }

    return lista.filter((p) => {
      const matchNombre = (p.nombre || '').toLowerCase().includes(query);
      const matchFormula = (p.principioActivo || '').toLowerCase().includes(query);
      const matchSku = (p.codigoProducto || '').toLowerCase().includes(query);
      const matchCat = (p.categoria?.nombre || '').toLowerCase().includes(query);
      const matchLab = (p.laboratorio?.nombre || '').toLowerCase().includes(query);
      return matchNombre || matchFormula || matchSku || matchCat || matchLab;
    });
  });

  // Sugerencias rápidas (populares con existencias)
  protected readonly sugerenciasRapidas = computed(() => {
    return this.productos().filter((p) => !p.agotado && p.stockTotal > 0).slice(0, 6);
  });

  // Búsqueda de cliente
  protected busquedaCliente = '';
  protected clientesEncontrados = signal<ClienteSimple[]>([]);
  protected clienteSeleccionado: ClienteSimple | null = null;
  protected modoNuevoCliente = false;
  protected nuevoClienteForm = {
    nombre: '',
    apellido: '',
    telefono: '',
    direccion: '',
    referenciaDireccion: '',
  };

  // Carrito de medicamentos
  protected itemsCarrito = signal<ItemCarrito[]>([]);

  // Disponibilidad por farmacia
  protected sucursalesDisponibles = signal<SucursalDisponibilidad[]>([]);
  protected sucursalPreparacionId = 0;
  protected readonly soloSucursalesConStock = signal<boolean>(true);

  // Sucursales filtradas para mostrar solo donde está disponible el medicamento
  protected readonly sucursalesFiltradas = computed(() => {
    const lista = this.sucursalesDisponibles();
    if (!this.soloSucursalesConStock()) {
      return lista;
    }
    return lista.filter((suc) => {
      if (!suc.items || suc.items.length === 0) {
        return suc.puedeEntregarCompleto;
      }
      return suc.items.some((i) => i.stockDisponibleEnSucursal > 0);
    });
  });

  // Información del medicamento actualmente evaluado
  protected readonly medicamentoEvaluadoInfo = computed(() => {
    const carrito = this.itemsCarrito();
    if (carrito.length === 1) {
      return {
        nombre: carrito[0].producto.nombre,
        cantidad: carrito[0].cantidad,
        esMultiple: false,
      };
    }
    if (carrito.length > 1) {
      return {
        nombre: `${carrito.length} medicamentos en orden`,
        cantidad: carrito.reduce((acc, i) => acc + i.cantidad, 0),
        esMultiple: true,
      };
    }
    const sel = this.productoSeleccionado();
    if (sel) {
      return {
        nombre: sel.nombre,
        cantidad: this.cantidadAgregar(),
        esMultiple: false,
      };
    }
    return null;
  });

  // Condiciones de entrega
  protected metodoPagoId = 0;
  protected fechaEstimadaEntrega = '';
  protected personaRecibe = '';
  protected observacion = '';

  ngOnInit(): void {
    this.cargarCatalogos();
    this.inicializarFechaEstimada();
  }

  private inicializarFechaEstimada(): void {
    const ahora = new Date();
    ahora.setMinutes(ahora.getMinutes() + 45); // Estimado 45 min por defecto
    const pad = (n: number) => String(n).padStart(2, '0');
    const anio = ahora.getFullYear();
    const mes = pad(ahora.getMonth() + 1);
    const dia = pad(ahora.getDate());
    const hora = pad(ahora.getHours());
    const min = pad(ahora.getMinutes());
    this.fechaEstimadaEntrega = `${anio}-${mes}-${dia}T${hora}:${min}`;
  }

  private cargarCatalogos(): void {
    this.cargandoMedicamentos.set(true);
    this.pedidosService.obtenerMedicamentosDisponibles().subscribe({
      next: (prods) => {
        this.productos.set(prods);
        this.cargandoMedicamentos.set(false);
      },
      error: (err) => {
        console.error('Error cargando medicamentos:', err);
        this.cargandoMedicamentos.set(false);
        this.error.set('Error al cargar catálogo de medicamentos: ' + (err.error?.message || err.message));
      },
    });

    this.cajasService.listarMetodosPago().subscribe({
      next: (metodos) => {
        this.metodosPago.set(metodos);
        if (metodos.length > 0) {
          this.metodoPagoId = metodos[0].metodoPagoId;
        }
      },
    });
  }

  protected onInputBusqueda(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.busquedaTexto.set(input.value);
    this.error.set(null);
  }

  protected limpiarBusqueda(): void {
    this.busquedaTexto.set('');
    this.error.set(null);
  }

  protected alternarSoloStock(): void {
    this.soloConStock.set(!this.soloConStock());
  }

  protected seleccionarMedicamento(prod: MedicamentoCallCenter): void {
    if (prod.agotado || prod.stockTotal <= 0) {
      this.error.set(`"${prod.nombre}" se encuentra AGOTADO en la red de farmacias. No se puede seleccionar.`);
      return;
    }
    this.error.set(null);
    this.productoSeleccionado.set(prod);
    this.cantidadAgregar.set(1);
    this.evaluarDisponibilidadParaProducto(prod, 1);
  }

  protected deseleccionarMedicamento(): void {
    this.productoSeleccionado.set(null);
    this.cantidadAgregar.set(1);
    if (this.itemsCarrito().length === 0) {
      this.sucursalesDisponibles.set([]);
      this.sucursalPreparacionId = 0;
    } else {
      this.evaluarDisponibilidadFarmacias();
    }
  }

  protected ajustarCantidad(delta: number): void {
    const maxStock = this.productoSeleccionado()?.stockTotal || 999;
    const nueva = this.cantidadAgregar() + delta;
    if (nueva >= 1 && nueva <= maxStock) {
      this.cantidadAgregar.set(nueva);
      const sel = this.productoSeleccionado();
      if (sel) {
        this.evaluarDisponibilidadParaProducto(sel, nueva);
      }
    }
  }

  protected alternarSoloConStockSucursal(): void {
    this.soloSucursalesConStock.update((v) => !v);
  }

  /**
   * Agrega directamente un medicamento al pedido con control estricto de FEFO y stock.
   */
  protected agregarMedicamentoDirecto(prod: MedicamentoCallCenter, cantidad = 1): void {
    if (prod.agotado || prod.stockTotal <= 0) {
      this.error.set(`"${prod.nombre}" se encuentra AGOTADO en toda la red de farmacias.`);
      return;
    }

    if (cantidad <= 0) return;

    const items = [...this.itemsCarrito()];
    const index = items.findIndex((i) => i.producto.productoId === prod.productoId);
    const cantidadEnCarrito = index >= 0 ? items[index].cantidad : 0;
    const cantidadFinal = cantidadEnCarrito + cantidad;

    if (cantidadFinal > prod.stockTotal) {
      this.error.set(
        `Stock insuficiente en la red para "${prod.nombre}". Existencias: ${prod.stockTotal} uds. (Ya agregadas en orden: ${cantidadEnCarrito}).`,
      );
      return;
    }

    const precioUnitario = Number(prod.precioVenta);
    if (index >= 0) {
      items[index].cantidad = cantidadFinal;
      items[index].subtotal = Number((items[index].cantidad * precioUnitario).toFixed(2));
    } else {
      items.push({
        producto: prod,
        cantidad,
        precioUnitario,
        subtotal: Number((cantidad * precioUnitario).toFixed(2)),
      });
    }

    this.itemsCarrito.set(items);
    this.productoSeleccionado.set(null);
    this.cantidadAgregar.set(1);
    this.error.set(null);

    // Actualizar disponibilidad por farmacia automáticamente
    this.evaluarDisponibilidadFarmacias();
  }

  /**
   * Auto-resolución cuando se presiona Enter en el input de búsqueda o se pulsa botón general.
   */
  protected onEnterBusqueda(): void {
    // Si ya hay un producto seleccionado explícitamente:
    const sel = this.productoSeleccionado();
    if (sel) {
      this.agregarMedicamentoDirecto(sel, this.cantidadAgregar());
      return;
    }

    // Si no hay seleccionado, buscar la mejor coincidencia del texto escrito
    const query = this.busquedaTexto().trim().toLowerCase();
    if (!query) return;

    const filtrados = this.medicamentosFiltrados();
    const disponible = filtrados.find((p) => !p.agotado && p.stockTotal > 0);

    if (disponible) {
      this.agregarMedicamentoDirecto(disponible, this.cantidadAgregar());
    } else if (filtrados.length > 0) {
      this.error.set(`Todos los medicamentos coincidentes con "${this.busquedaTexto()}" están agotados.`);
    } else {
      this.error.set(`No se encontró ningún medicamento con el nombre "${this.busquedaTexto()}".`);
    }
  }

  protected ajustarCantidadCarrito(index: number, delta: number): void {
    const items = [...this.itemsCarrito()];
    const item = items[index];
    const nueva = item.cantidad + delta;
    if (nueva <= 0) {
      this.eliminarItem(index);
      return;
    }
    if (nueva > item.producto.stockTotal) {
      this.error.set(`Stock máximo disponible para "${item.producto.nombre}" es ${item.producto.stockTotal} uds.`);
      return;
    }
    item.cantidad = nueva;
    item.subtotal = Number((nueva * item.precioUnitario).toFixed(2));
    this.itemsCarrito.set(items);
    this.evaluarDisponibilidadFarmacias();
  }

  protected eliminarItem(index: number): void {
    const items = [...this.itemsCarrito()];
    items.splice(index, 1);
    this.itemsCarrito.set(items);
    this.evaluarDisponibilidadFarmacias();
  }

  protected totalOrden(): number {
    return this.itemsCarrito().reduce((sum, i) => sum + i.subtotal, 0);
  }

  protected tieneMedicamentosConReceta(): boolean {
    return this.itemsCarrito().some((i) => i.producto.requiereReceta);
  }

  // Clientes
  protected buscarClientes(): void {
    if (this.busquedaCliente.trim().length < 2) {
      this.clientesEncontrados.set([]);
      return;
    }

    this.pedidosService.buscarClientes(this.busquedaCliente).subscribe({
      next: (res) => this.clientesEncontrados.set(res),
    });
  }

  protected seleccionarCliente(c: ClienteSimple): void {
    this.clienteSeleccionado = c;
    this.modoNuevoCliente = false;
    this.personaRecibe = `${c.nombre} ${c.apellido || ''}`.trim();
    this.clientesEncontrados.set([]);
    this.busquedaCliente = `${c.nombre} (${c.telefono})`;
  }

  protected alternarNuevoCliente(): void {
    this.modoNuevoCliente = !this.modoNuevoCliente;
    if (this.modoNuevoCliente) {
      this.clienteSeleccionado = null;
      this.nuevoClienteForm.telefono = this.busquedaCliente;
    }
  }

  // Evaluación FEFO por farmacia
  protected evaluarDisponibilidadFarmacias(): void {
    if (this.itemsCarrito().length === 0) {
      const sel = this.productoSeleccionado();
      if (sel) {
        this.evaluarDisponibilidadParaProducto(sel, this.cantidadAgregar());
        return;
      }
      this.sucursalesDisponibles.set([]);
      this.sucursalPreparacionId = 0;
      return;
    }

    this.consultandoStock.set(true);
    const payload = this.itemsCarrito().map((i) => ({
      productoId: i.producto.productoId,
      cantidad: i.cantidad,
    }));

    this.pedidosService.consultarDisponibilidad(payload).subscribe({
      next: (sucursales) => {
        this.sucursalesDisponibles.set(sucursales);
        this.consultandoStock.set(false);
        this.autoSeleccionarSucursalOptima(sucursales);
      },
      error: () => this.consultandoStock.set(false),
    });
  }

  protected evaluarDisponibilidadParaProducto(prod: MedicamentoCallCenter, cantidad = 1): void {
    this.consultandoStock.set(true);
    const payload = [
      {
        productoId: prod.productoId,
        cantidad: cantidad || 1,
      },
    ];

    this.pedidosService.consultarDisponibilidad(payload).subscribe({
      next: (sucursales) => {
        this.sucursalesDisponibles.set(sucursales);
        this.consultandoStock.set(false);
        this.autoSeleccionarSucursalOptima(sucursales);
      },
      error: () => this.consultandoStock.set(false),
    });
  }

  private autoSeleccionarSucursalOptima(sucursales: SucursalDisponibilidad[]): void {
    const primeraOptima = sucursales.find((s) => s.puedeEntregarCompleto && s.tieneCajaAbierta !== false);
    const primeraConStockYCaja = sucursales.find(
      (s) => s.tieneCajaAbierta !== false && s.items?.some((i) => i.stockDisponibleEnSucursal > 0),
    );
    const primeraConStock = sucursales.find((s) => s.items?.some((i) => i.stockDisponibleEnSucursal > 0));

    if (primeraOptima && (!this.sucursalPreparacionId || !sucursales.some((s) => s.sucursalId === this.sucursalPreparacionId))) {
      this.sucursalPreparacionId = primeraOptima.sucursalId;
    } else if (primeraConStockYCaja && (!this.sucursalPreparacionId || !sucursales.some((s) => s.sucursalId === this.sucursalPreparacionId))) {
      this.sucursalPreparacionId = primeraConStockYCaja.sucursalId;
    } else if (primeraConStock && (!this.sucursalPreparacionId || !sucursales.some((s) => s.sucursalId === this.sucursalPreparacionId))) {
      this.sucursalPreparacionId = primeraConStock.sucursalId;
    } else if (!this.sucursalPreparacionId && sucursales.length > 0) {
      this.sucursalPreparacionId = sucursales[0].sucursalId;
    }
  }

  protected onTelefonoInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const digitos = (input.value || '').replace(/\D/g, '').slice(0, 8);
    this.nuevoClienteForm.telefono = digitos;
    input.value = digitos;
  }

  protected seleccionarSucursal(suc: SucursalDisponibilidad): void {
    if (suc.tieneCajaAbierta === false) {
      this.toastService.warning(
        'Caja Cerrada en Sucursal',
        `La sucursal "${suc.nombre}" tiene su caja cerrada. Debe haber un turno abierto para despachar pedidos.`,
      );
      return;
    }
    this.sucursalPreparacionId = suc.sucursalId;
  }

  protected submit(): void {
    this.error.set(null);

    // 1. Validar selección o registro de cliente
    if (!this.clienteSeleccionado && !this.modoNuevoCliente) {
      if (this.clientesEncontrados().length === 1) {
        this.seleccionarCliente(this.clientesEncontrados()[0]);
      } else {
        const msg = this.busquedaCliente.trim()
          ? 'Por favor selecciona el cliente que apareció en la lista o activa "+ Registrar nuevo cliente".'
          : 'Debe buscar y seleccionar un cliente existente, o activar "+ Registrar nuevo cliente".';
        this.error.set(msg);
        this.toastService.warning('Falta Cliente', msg);
        return;
      }
    }

    if (this.modoNuevoCliente) {
      const nom = (this.nuevoClienteForm.nombre || '').trim();
      const tel = (this.nuevoClienteForm.telefono || '').trim();
      const dir = (this.nuevoClienteForm.direccion || '').trim();

      if (!nom || !tel || !dir) {
        const msg = 'Nombre, teléfono y dirección son obligatorios para registrar al nuevo cliente.';
        this.error.set(msg);
        this.toastService.warning('Datos Incompletos', msg);
        return;
      }

      if (!/^\d{8}$/.test(tel)) {
        const msg = 'El teléfono del cliente debe tener exactamente 8 dígitos numéricos.';
        this.error.set(msg);
        this.toastService.warning('Teléfono Inválido', msg);
        return;
      }
    }

    // 2. Validar medicamentos en carrito
    if (this.itemsCarrito().length === 0) {
      const msg = 'Debe agregar al menos un medicamento a la orden antes de despachar.';
      this.error.set(msg);
      this.toastService.warning('Carrito Vacío', msg);
      return;
    }

    // 3. Validar sucursal preparadora
    if (!this.sucursalPreparacionId) {
      const msg = 'Debe seleccionar la farmacia o sucursal que preparará y despachará la orden.';
      this.error.set(msg);
      this.toastService.warning('Seleccionar Farmacia', msg);
      return;
    }

    const sucSeleccionada = this.sucursalesDisponibles().find(
      (s) => s.sucursalId === Number(this.sucursalPreparacionId),
    );
    if (sucSeleccionada && sucSeleccionada.tieneCajaAbierta === false) {
      const msg = `La sucursal "${sucSeleccionada.nombre}" tiene su caja cerrada actualmente. Se requiere un turno de caja abierto en esa sede para despachar.`;
      this.error.set(msg);
      this.toastService.error('Caja Cerrada', msg, 5000);
      return;
    }

    // 4. Validar método de pago
    if (!this.metodoPagoId) {
      const msg = 'Debe seleccionar la forma de pago acordada con el cliente.';
      this.error.set(msg);
      this.toastService.warning('Forma de Pago', msg);
      return;
    }

    // 5. Normalizar fecha estimada de entrega
    if (!this.fechaEstimadaEntrega) {
      this.inicializarFechaEstimada();
    }

    let fechaIso: string;
    try {
      const d = this.fechaEstimadaEntrega ? new Date(this.fechaEstimadaEntrega) : new Date();
      fechaIso = isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
    } catch {
      fechaIso = new Date().toISOString();
    }

    this.guardando.set(true);

    const req: CreatePedidoCallCenterRequest = {
      clienteId: this.clienteSeleccionado?.clienteId,
      nuevoCliente: this.modoNuevoCliente ? this.nuevoClienteForm : undefined,
      sucursalPreparacionId: Number(this.sucursalPreparacionId),
      metodoPagoId: Number(this.metodoPagoId),
      origen: 'CALL_CENTER',
      fechaEstimadaEntrega: fechaIso,
      personaRecibe: this.personaRecibe.trim() || undefined,
      observacion: this.observacion.trim() || undefined,
      items: this.itemsCarrito().map((i) => ({
        productoId: i.producto.productoId,
        cantidad: i.cantidad,
      })),
    };

    this.pedidosService.crearPedidoCallCenter(req).subscribe({
      next: () => {
        this.guardando.set(false);
        this.toastService.success(
          '¡Pedido Despachado!',
          'El pedido ha sido transmitido exitosamente a la farmacia preparadora.',
          4000,
        );
        this.pedidoCreado.emit();
      },
      error: (err) => {
        this.guardando.set(false);
        const mensajeError = err.error?.message || 'Error al coordinar y despachar el pedido en el servidor.';
        this.error.set(mensajeError);
        this.toastService.error('Error al Despachar', mensajeError, 6000);
      },
    });
  }
}
