import { Component, EventEmitter, OnInit, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PedidosService } from '../../../core/services/pedidos.service';
import { ProductosService } from '../../../core/services/productos.service';
import { CajasService } from '../../../core/services/cajas.service';
import {
  ClienteSimple,
  CreatePedidoCallCenterRequest,
  SucursalDisponibilidad,
} from '../../../core/models/pedido.models';
import { Producto } from '../../../core/models/producto.models';
import { MetodoPago } from '../../../core/models/caja.models';

interface ItemCarrito {
  producto: Producto;
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
  private readonly productosService = inject(ProductosService);
  private readonly cajasService = inject(CajasService);

  @Output() pedidoCreado = new EventEmitter<void>();
  @Output() cancelar = new EventEmitter<void>();

  protected readonly guardando = signal(false);
  protected readonly consultandoStock = signal(false);
  protected readonly error = signal<string | null>(null);

  // Catálogos
  protected readonly productos = signal<Producto[]>([]);
  protected readonly metodosPago = signal<MetodoPago[]>([]);

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
  protected productoIdSeleccionado = 0;
  protected cantidadAgregar = 1;

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
    this.fechaEstimadaEntrega = ahora.toISOString().substring(0, 16);
  }

  private cargarCatalogos(): void {
    this.productosService.findAll({ limit: 100 }).subscribe({
      next: (res) => this.productos.set(res.data),
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

  protected agregarProducto(): void {
    if (!this.productoIdSeleccionado || this.cantidadAgregar <= 0) return;

    const prod = this.productos().find((p) => p.productoId === Number(this.productoIdSeleccionado));
    if (!prod) return;

    const items = [...this.itemsCarrito()];
    const index = items.findIndex((i) => i.producto.productoId === prod.productoId);

    const precioUnitario = Number(prod.precioVenta);
    if (index >= 0) {
      items[index].cantidad += Number(this.cantidadAgregar);
      items[index].subtotal = Number((items[index].cantidad * precioUnitario).toFixed(2));
    } else {
      items.push({
        producto: prod,
        cantidad: Number(this.cantidadAgregar),
        precioUnitario,
        subtotal: Number((this.cantidadAgregar * precioUnitario).toFixed(2)),
      });
    }

    this.itemsCarrito.set(items);
    this.productoIdSeleccionado = 0;
    this.cantidadAgregar = 1;

    // Actualizar disponibilidad por farmacia automáticamente
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
