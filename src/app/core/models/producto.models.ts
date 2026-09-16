export interface CategoriaProducto {
  categoriaId: number;
  nombre: string;
  descripcion: string | null;
}

export interface Laboratorio {
  laboratorioId: number;
  nombre: string;
  telefono: string | null;
}

export interface UnidadMedida {
  unidadMedidaId: number;
  nombre: string;
  abreviatura: string;
  estado: string;
}

export interface Producto {
  productoId: number;
  nombre: string;
  codigoProducto: string;
  precioVenta: number;
  porcentajeIva: number;
  requiereReceta: 'S' | 'N';
  principioActivo: string | null;
  presentacion: string | null;
  concentracion: string | null;
  estado: 'ACTIVO' | 'INACTIVO';
  categoria: CategoriaProducto | null;
  laboratorio: Laboratorio | null;
  unidadMedida: UnidadMedida | null;
}

export interface ProductosPaginados {
  data: Producto[];
  total: number;
  page: number;
  limit: number;
}

export interface ProductoPayload {
  nombre: string;
  codigoProducto: string;
  precioVenta: number;
  porcentajeIva?: number;
  requiereReceta?: boolean;
  principioActivo?: string;
  presentacion?: string;
  concentracion?: string;
  categoriaId?: number;
  laboratorioId?: number;
  unidadMedidaId?: number;
}

export interface QueryProductos {
  q?: string;
  estado?: 'ACTIVO' | 'INACTIVO';
  page?: number;
  limit?: number;
}
