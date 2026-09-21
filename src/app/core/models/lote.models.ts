import { Producto } from './producto.models';

export interface Sucursal {
  sucursalId: number;
  nombre: string;
  direccion: string;
  estado: string;
  tipoSucursal: string;
}

export interface Inventario {
  inventarioId: number;
  sucursalId: number;
  loteId: number;
  cantidadDisponible: number;
  cantidadReservada: number;
  stockMinimo: number;
  stockMaximo: number | null;
  fechaActualizacion: string;
  sucursal?: Sucursal;
  lote?: Lote;
}

export interface Lote {
  loteId: number;
  productoId: number;
  numeroLote: string;
  fechaVencimiento: string;
  fechaFabricacion: string | null;
  costoUnitario: number;
  producto?: Producto;
  inventarios?: Inventario[];
  tieneKardex?: boolean;
  totalMovimientos?: number;
}

export interface LotesPaginados {
  data: Lote[];
  total: number;
  page: number;
  limit: number;
}

export type TipoMovimientoInventario =
  | 'ENTRADA'
  | 'VENTA'
  | 'SALIDA'
  | 'AJUSTE'
  | 'RESERVA'
  | 'LIBERACION'
  | 'TRANSFERENCIA_SALIDA'
  | 'TRANSFERENCIA_ENTRADA';

export interface MovimientoInventario {
  movimientoInventarioId: number;
  tipoMovimiento: TipoMovimientoInventario;
  referenciaTipo: string | null;
  referenciaId: number | null;
  observacion: string | null;
  fechaMovimiento: string;
  cantidadAnterior: number;
  cantidad: number;
  cantidadNueva: number;
  inventario?: Inventario;
}

export interface EntradaLotePayload {
  productoId: number;
  sucursalId: number;
  numeroLote: string;
  fechaVencimiento: string;
  fechaFabricacion?: string;
  costoUnitario: number;
  cantidad: number;
  observacion?: string;
}

export interface SalidaLotePayload {
  productoId: number;
  sucursalId: number;
  cantidad: number;
  tipoMovimiento: 'VENTA' | 'AJUSTE';
  loteId?: number;
  observacion?: string;
}

export interface QueryLotes {
  productoId?: number;
  page?: number;
  limit?: number;
}

export interface QueryMovimientos {
  sucursalId?: number;
  productoId?: number;
  loteId?: number;
  tipoMovimiento?: string;
  busqueda?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  page?: number;
  limit?: number;
}

export interface MovimientosPaginados {
  data: MovimientoInventario[];
  total: number;
  page: number;
  limit: number;
}

export interface CompraItemPayload {
  productoId: number;
  numeroLote: string;
  fechaVencimiento: string;
  fechaFabricacion?: string;
  costoUnitario: number;
  cantidad: number;
}

export interface CompraLotePayload {
  proveedorId?: number;
  proveedorNombre?: string;
  numeroFactura: string;
  fechaFactura: string;
  sucursalId: number;
  observacion?: string;
  items: CompraItemPayload[];
}

export interface CompraLoteResponse {
  mensaje: string;
  numeroFactura: string;
  fechaFactura: string;
  proveedor: string;
  sucursalId: number;
  sucursalNombre: string;
  totalItems: number;
  totalUnidades: number;
  totalMonto: number;
  detalles: Array<{
    productoId: number;
    nombreProducto: string;
    numeroLote: string;
    cantidad: number;
    costoUnitario: number;
    subtotal: number;
    cantidadNueva: number;
    movimientoId: number;
  }>;
}
