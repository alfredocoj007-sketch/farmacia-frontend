export interface ItemVentaPosRequest {
  productoId: number;
  loteId?: number;
  cantidad: number;
}

export interface ClienteVentaPos {
  nit?: string;
  nombre?: string;
  direccion?: string;
  telefono?: string;
}

export interface CreateVentaPosRequest {
  sucursalId: number;
  cajaId?: number;
  metodoPagoId: number;
  montoRecibido?: number;
  observacion?: string;
  cliente?: ClienteVentaPos;
  items: ItemVentaPosRequest[];
}

export interface ProductoPosItem {
  productoId: number;
  codigoProducto: string;
  nombre: string;
  principioActivo?: string;
  presentacion?: string;
  categoria: string;
  requiereReceta: boolean;
  precioVenta: number;
  stockDisponible: number;
  proximoLote?: {
    loteId: number;
    numeroLote: string;
    fechaVencimiento: string;
  } | null;
}

export interface SesionCajaInfo {
  abierta: boolean;
  cajaId?: number;
  codigoCaja?: string;
  sesionCajaId?: number;
  cajero?: string;
  saldoInicial?: number;
  totalIngresos?: number;
  fechaApertura?: string;
  mensaje?: string;
}

export interface MetodoPagoSimple {
  metodoPagoId: number;
  nombre: string;
  estado: string;
}

export interface FelTotales {
  baseImponible: number;
  iva: number;
  total: number;
  montoRecibido: number;
  cambio: number;
}

export interface FelEmisor {
  nombre: string;
  nombreComercial: string;
  nit: string;
  direccion: string;
  telefono: string;
}

export interface FelReceptor {
  nit: string;
  nombre: string;
  direccion: string;
}

export interface FelData {
  numeroFactura: string;
  serie: string;
  autorizacionDte: string;
  fechaCertificacion: string;
  emisor: FelEmisor;
  receptor: FelReceptor;
  totales: FelTotales;
  caja?: { codigo: string; sesionId?: number } | null;
}

export interface VentaRespuesta {
  pedidoId: number;
  fechaVenta: string;
  estado: string;
  total: number;
  metodoPago: string;
  sucursal: {
    sucursalId: number;
    nombre: string;
  };
  fel: FelData;
  items: {
    productoId: number;
    nombre: string;
    principioActivo?: string;
    lote: string;
    fechaVencimiento: string;
    cantidad: number;
    precioUnitario: number;
    subtotal: number;
  }[];
}

export interface VentaListadoItem {
  pedidoId: number;
  numeroFactura: string;
  fecha: string;
  total: number;
  baseImponible: number;
  iva: number;
  estado: string;
  metodoPago: string;
  sucursal: string;
  cliente: string;
  totalItems: number;
  detalles: {
    producto: string;
    lote: string;
    cantidad: number;
    precioUnitario: number;
    subtotal: number;
  }[];
}
