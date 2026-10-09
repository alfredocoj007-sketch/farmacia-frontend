import { Component, EventEmitter, OnInit, Output, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PedidosService } from '../../../core/services/pedidos.service';
import { CajasService } from '../../../core/services/cajas.service';
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
  }

  protected deseleccionarMedicamento(): void {
    this.productoSeleccionado.set(null);
    this.cantidadAgregar.set(1);
  }

  protected ajustarCantidad(delta: number): void {
    const maxStock = this.productoSeleccionado()?.stockTotal || 999;
    const nueva = this.cantidadAgregar() + delta;
    if (nueva >= 1 && nueva <= maxStock) {
      this.cantidadAgregar.set(nueva);
    }
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

        // Preseleccionar la primera que tenga stock completo si no hay una seleccionada
        const primeraCompleta = sucursales.find((s) => s.puedeEntregarCompleto);
        if (primeraCompleta && (!this.sucursalPreparacionId || !sucursales.some(s => s.sucursalId === this.sucursalPreparacionId))) {
          this.sucursalPreparacionId = primeraCompleta.sucursalId;
        } else if (!this.sucursalPreparacionId && sucursales.length > 0) {
          this.sucursalPreparacionId = sucursales[0].sucursalId;
        }
      },
      error: () => this.consultandoStock.set(false),
    });
  }

  protected submit(): void {
    if (!this.clienteSeleccionado && !this.modoNuevoCliente) {
      this.error.set('Debe seleccionar un cliente existente o registrar un nuevo cliente.');
      return;
    }

    if (this.modoNuevoCliente) {
      if (!this.nuevoClienteForm.nombre.trim() || !this.nuevoClienteForm.telefono.trim() || !this.nuevoClienteForm.direccion.trim()) {
        this.error.set('Nombre, teléfono y dirección son requeridos para el nuevo cliente.');
        return;
      }
    }

    if (this.itemsCarrito().length === 0) {
      this.error.set('Debe agregar al menos un medicamento a la orden.');
      return;
    }

    if (!this.sucursalPreparacionId) {
      this.error.set('Debe seleccionar la farmacia que preparará y despachará el medicamento.');
      return;
    }

    if (!this.metodoPagoId) {
      this.error.set('Debe seleccionar la forma de pago acordada.');
      return;
    }

    if (!this.fechaEstimadaEntrega) {
      this.error.set('Debe indicar la fecha u hora estimada de entrega.');
      return;
    }

    this.guardando.set(true);
    this.error.set(null);

    const req: CreatePedidoCallCenterRequest = {
      clienteId: this.clienteSeleccionado?.clienteId,
      nuevoCliente: this.modoNuevoCliente ? this.nuevoClienteForm : undefined,
      sucursalPreparacionId: Number(this.sucursalPreparacionId),
      metodoPagoId: Number(this.metodoPagoId),
      origen: 'CALL_CENTER',
      fechaEstimadaEntrega: new Date(this.fechaEstimadaEntrega).toISOString(),
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
        this.pedidoCreado.emit();
      },
      error: (err) => {
        this.guardando.set(false);
        this.error.set(err.error?.message || 'Error al coordinar y despachar el pedido.');
      },
    });
  }
}
