export interface ClienteSimple {
  clienteId: number;
  nombre: string;
  apellido?: string;
  telefono: string;
  direccion: string;
  referenciaDireccion?: string;
}

export interface SucursalPreparacion {
  sucursalId: number;
  nombre: string;
  tipoSucursal: string;
  direccion?: string;
  telefono?: string;
}

export interface EntregaDetalle {
  entregaId: number;
  estado: 'PENDIENTE' | 'EN_RUTA' | 'ENTREGADA' | 'FALLIDA';
  personaRecibe: string | null;
  fechaProgramada: string | null;
  fechaSalida: string | null;
  fechaEntrega: string | null;
  observacion?: string | null;
}

export interface PedidoItemDetalle {
  pedidoDetalleId: number;
  productoId?: number;
  productoNombre: string;
  principioActivo?: string;
  requiereReceta?: string;
  loteNumero?: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

export interface PedidoCallCenter {
  pedidoId: number;
  origen: string;
  estado: 'RECIBIDO' | 'EN_PREPARACION' | 'EN_RUTA' | 'ENTREGADO' | 'CANCELADO';
  total: number;
  fechaPedido: string;
  fechaEstimadaEntrega: string | null;
  fechaConfirmacion: string | null;
  observacion: string | null;
  cliente: ClienteSimple | null;
  sucursalPreparacion: SucursalPreparacion | null;
  metodoPago: string;
  entrega: EntregaDetalle | null;
  totalItems: number;
  detalles: PedidoItemDetalle[];
}

export interface ItemConsultaDisponibilidad {
  productoId: number;
  cantidad: number;
}

export interface ItemDisponibilidadSucursal {
  productoId: number;
  nombre: string;
  requiereReceta?: string;
  precioVenta: number;
  cantidadSolicitada: number;
  stockDisponibleEnSucursal: number;
  disponibilidad: 'COMPLETO' | 'PARCIAL' | 'SIN_STOCK';
}

export interface SucursalDisponibilidad {
  sucursalId: number;
  nombre: string;
  tipoSucursal: string;
  direccion: string;
  telefono: string | null;
  puedeEntregarCompleto: boolean;
  tieneCajaAbierta?: boolean;
  tiempoEstimadoMinutos: string;
  items: ItemDisponibilidadSucursal[];
}

export interface CreatePedidoCallCenterRequest {
  clienteId?: number;
  nuevoCliente?: {
    nombre: string;
    apellido?: string;
    telefono: string;
    direccion: string;
    referenciaDireccion?: string;
    email?: string;
  };
  sucursalPreparacionId: number;
  metodoPagoId: number;
  origen?: string;
  fechaEstimadaEntrega: string;
  personaRecibe?: string;
  observacion?: string;
  items: { productoId: number; cantidad: number }[];
}

export interface CambiarEstadoPedidoRequest {
  estado: 'RECIBIDO' | 'EN_PREPARACION' | 'EN_RUTA' | 'ENTREGADO' | 'CANCELADO';
  personaRecibe?: string;
  observacion?: string;
}

export interface EstadisticasCallCenter {
  totalPedidos: number;
  recibidos: number;
  enPreparacion: number;
  enRuta: number;
  entregados: number;
  cancelados: number;
  montoTotal: number;
  porDespachar?: number;
  ultimoPedido?: {
    pedidoId: number;
    estado: string;
    total: number;
    sucursalNombre: string;
    clienteNombre: string;
  } | null;
}

export interface QueryPedidosParams {
  estado?: string;
  sucursalId?: number;
  busqueda?: string;
  limit?: number;
}

export interface FefoLoteInfo {
  loteId: number;
  numeroLote: string;
  fechaVencimiento: string;
  diasParaVencer: number;
  sucursalNombre?: string;
  cantidadDisponibleEnLote?: number;
}

export interface MedicamentoCallCenter {
  productoId: number;
  codigoProducto: string;
  nombre: string;
  principioActivo?: string;
  presentacion?: string;
  concentracion?: string;
  unidadMedida?: string;
  unidadMedidaAbrev?: string;
  precioVenta: number;
  requiereReceta: boolean;
  categoria?: { categoriaId: number; nombre: string } | null;
  laboratorio?: { laboratorioId: number; nombre: string } | null;
  stockTotal: number;
  agotado: boolean;
  fefoLote: FefoLoteInfo | null;
  sucursalesConStock: {
    sucursalId: number;
    nombre: string;
    stock: number;
  }[];
}
