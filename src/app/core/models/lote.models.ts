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
}

export interface LotesPaginados {
  data: Lote[];
  total: number;
  page: number;
  limit: number;
}

export interface MovimientoInventario {
  movimientoInventarioId: number;
  tipoMovimiento: 'ENTRADA' | 'VENTA' | 'AJUSTE';
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
