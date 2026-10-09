export interface MetodoPago {
  metodoPagoId: number;
  nombre: string;
  estado: string;
}

export interface SesionActivaResumen {
  sesionCajaId: number;
  saldoInicial: number;
  totalIngresos: number;
  totalEgresos: number;
  fechaApertura: string;
  cajeroNombre: string;
  ultimoMovimiento?: {
    fecha: string;
    descripcion: string;
    monto: number;
    tipo: 'INGRESO' | 'EGRESO';
  } | null;
}

export interface Caja {
  cajaId: number;
  sucursalId: number;
  codigoCaja: string;
  descripcion?: string | null;
  estado: string;
  sesionActiva?: SesionActivaResumen | null;
}

export interface MovimientoDetalle {
  movimientoCajaId: number;
  tipoMovimiento: 'INGRESO' | 'EGRESO';
  monto: number;
  descripcion: string;
  fechaMovimiento: string;
  metodoPago?: string;
  cajero: string;
}

export interface SesionActivaDetalle {
  sesionCajaId: number;
  cajaId: number;
  codigoCaja: string;
  sucursalNombre?: string;
  estado: string;
  saldoInicial: number;
  totalIngresos: number;
  totalEgresos: number;
  saldoTotalSistema: number;
  efectivoEsperado: number;
  desglose: {
    ingresosEfectivo: number;
    ingresosTarjeta: number;
    ingresosTransferencia?: number;
    ingresosOtros: number;
    egresosEfectivo: number;
  };
  fechaApertura: string;
  cajeroApertura: string;
  movimientos: MovimientoDetalle[];
}

export interface AbrirSesionRequest {
  cajaId: number;
  saldoInicial: number;
  observacion?: string;
}

export interface RegistrarMovimientoRequest {
  sesionCajaId: number;
  tipoMovimiento: 'INGRESO' | 'EGRESO';
  monto: number;
  metodoPagoId: number;
  descripcion: string;
  referenciaTipo?: string;
  referenciaId?: number;
}

export interface CerrarSesionRequest {
  sesionCajaId: number;
  efectivoContado: number;
  observacionCierre?: string;
}

export interface ResultadoArqueo {
  sesionCajaId: number;
  estado: string;
  saldoInicial: number;
  totalIngresos: number;
  totalEgresos: number;
  efectivoEsperado: number;
  efectivoContado: number;
  diferencia: number;
  resultadoArqueo: 'CUADRADA' | 'SOBRANTE' | 'FALTANTE';
  observacionCierre?: string | null;
  fechaCierre: string;
}

export interface HistorialSesion {
  sesionCajaId: number;
  estado: string;
  saldoInicial: number;
  totalIngresos: number;
  totalEgresos: number;
  efectivoEsperado: number | null;
  efectivoContado: number | null;
  diferencia: number | null;
  fechaApertura: string;
  fechaCierre: string | null;
  cajeroApertura: string;
  cajeroCierre: string | null;
  observacionCierre: string | null;
}
