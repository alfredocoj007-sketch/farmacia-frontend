export interface DepartamentoGeo {
  departamentoId: number;
  nombre: string;
  municipios?: MunicipioGeo[];
}

export interface MunicipioGeo {
  municipioId: number;
  nombre: string;
  departamentoId: number;
  departamento?: DepartamentoGeo;
}

export interface SucursalRed {
  sucursalId: number;
  nombre: string;
  tipoSucursal: 'FARMACIA' | 'MALL_STAND' | 'GAS_STAND' | 'BODEGA_MATRIZ' | string;
  direccion: string;
  telefono: string | null;
  estado: 'ACTIVA' | 'INACTIVA' | 'MANTENIMIENTO' | string;
  fechaApertura: string;
  latitud: number | null;
  longitud: number | null;
  municipio?: {
    municipioId: number;
    nombre: string;
    departamento?: {
      departamentoId: number;
      nombre: string;
    };
  };
  totalEmpleados: number;
  totalCajas: number;
  totalActivos: number;
  totalStockUnidades: number;
  valorInventarioQ: number;
}

export interface DistribucionTipoSede {
  tipo: string;
  label: string;
  total: number;
  porcentaje: number;
}

export interface EstadisticasRed {
  totalPuntosVenta: number;
  farmaciasMatriz: number;
  standsMall: number;
  standsGasolinera: number;
  activas: number;
  inactivas: number;
  totalEmpleadosRed: number;
  totalCajasRed: number;
  municipiosCubiertos: number;
  departamentosCubiertos: number;
  distribucion: DistribucionTipoSede[];
}

export interface SucursalDetalleCompleto {
  sucursal: SucursalRed;
  resumen: {
    totalEmpleados: number;
    empleadosActivos: number;
    totalCajas: number;
    cajasActivas: number;
    totalActivos: number;
    totalValorActivos: number;
    totalItemsConStock: number;
    totalStockUnidades: number;
    totalValorInventario: number;
  };
  empleados: {
    empleadoId: number;
    nombreCompleto: string;
    puesto: string;
    telefono: string;
    estado: string;
    fechaIngreso: string;
  }[];
  cajas: {
    cajaId: number;
    codigoCaja: string;
    descripcion: string | null;
    estado: string;
    ultimaSesion: any;
  }[];
  activosFijos: {
    activoId: number;
    codigoActivo: string;
    descripcion: string;
    marca: string | null;
    modelo: string | null;
    categoria: string;
    valorAdquisicion: number;
    estado: string;
  }[];
  inventarioDestacado: {
    productoId: number;
    nombre: string;
    loteNumero: string;
    fechaVencimiento: string;
    stockDisponible: number;
    costoUnitario: number;
    valorTotal: number;
  }[];
}

export interface CreateSucursalRequest {
  nombre: string;
  tipoSucursal: string;
  direccion: string;
  telefono?: string;
  municipioId: number;
  latitud?: number;
  longitud?: number;
  estado?: string;
}

export interface UpdateSucursalRequest {
  nombre?: string;
  tipoSucursal?: string;
  direccion?: string;
  telefono?: string;
  municipioId?: number;
  latitud?: number;
  longitud?: number;
  estado?: string;
}

export interface QuerySucursalesParams {
  busqueda?: string;
  tipoSucursal?: string;
  estado?: string;
  departamentoId?: number;
  municipioId?: number;
}
