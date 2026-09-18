export interface CategoriaActivo {
  categoriaActivoId: number;
  nombre: string;
  vidaUtilMeses: number;
  estado?: string;
}

export interface SucursalSimple {
  sucursalId: number;
  nombre: string;
  tipoSucursal?: string;
  direccion?: string;
}

export interface HistorialMovimientoActivo {
  historialActivoId: number;
  tipoMovimiento: 'ALTA_INICIAL' | 'TRASLADO' | 'MANTENIMIENTO' | 'BAJA';
  fechaMovimiento: string;
  valorLibros: number | null;
  observacion: string | null;
  sucursalOrigen: SucursalSimple | null;
  sucursalDestino: SucursalSimple | null;
}

export interface ActivoFijo {
  activoId: number;
  codigoActivo: string;
  descripcion: string;
  marca: string | null;
  modelo: string | null;
  numeroSerie: string | null;
  fechaAdquisicion: string;
  valorAdquisicion: number;
  valorResidual: number;
  valorLibros: number;
  depreciacionAcumulada: number;
  porcentajeDepreciado: number;
  mesesUso: number;
  mesesRestantes: number;
  estado: 'ACTIVO' | 'EN_MANTENIMIENTO' | 'DE_BAJA';
  categoria: CategoriaActivo | null;
  sucursal: SucursalSimple | null;
}

export interface ActivoFijoDetalle extends ActivoFijo {
  historial: HistorialMovimientoActivo[];
}

export interface CreateActivoFijoRequest {
  codigoActivo: string;
  descripcion: string;
  categoriaActivoId: number;
  sucursalId: number;
  marca?: string;
  modelo?: string;
  numeroSerie?: string;
  fechaAdquisicion: string;
  valorAdquisicion: number;
  valorResidual?: number;
}

export interface TrasladarActivoRequest {
  sucursalDestinoId: number;
  observacion?: string;
}

export interface MantenimientoActivoRequest {
  estado: 'ACTIVO' | 'EN_MANTENIMIENTO' | 'DE_BAJA';
  observacion?: string;
}

export interface EstadisticasActivosFijos {
  totalActivos: number;
  totalOperativos: number;
  totalMantenimiento: number;
  totalBaja: number;
  inversionTotal: number;
  valorLibrosTotal: number;
  depreciacionAcumuladaTotal: number;
  porSucursal: {
    sucursalId: number;
    nombre: string;
    tipo: string;
    cantidad: number;
    valorLibros: number;
  }[];
  porCategoria: {
    categoriaId: number;
    nombre: string;
    cantidad: number;
    valorLibros: number;
  }[];
}

export interface QueryActivoFijoParams {
  sucursalId?: number;
  categoriaActivoId?: number;
  estado?: string;
  busqueda?: string;
}
