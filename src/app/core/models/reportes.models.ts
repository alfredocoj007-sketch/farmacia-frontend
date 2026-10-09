export interface FiltroReporte {
  sucursalId?: number;
  periodo?: string; // 'HOY' | 'SEMANA' | 'MES' | 'ANIO' | 'HISTORICO' | 'PERSONALIZADO'
  fechaInicio?: string;
  fechaFin?: string;
  limite?: number;
}

// 1. REPORTE DE VENTAS E INGRESOS
export interface KpisVentas {
  totalVentas: number;
  montoTotal: number;
  baseImponible: number;
  ivaTotal: number;
  ticketPromedio: number;
}

export interface MetodoPagoDesglose {
  metodoPagoId: number;
  nombre: string;
  cantidadTransacciones: number;
  totalRecaudado: number;
  porcentaje: number;
}

export interface SucursalVentaDesglose {
  sucursalId: number;
  nombre: string;
  cantidadVentas: number;
  totalVentas: number;
  porcentaje: number;
}

export interface DetalleVentaItem {
  pedidoId: number;
  fecha: string;
  total: number;
  estado: string;
  metodoPago: string;
  sucursalNombre: string;
  clienteNombre: string;
  clienteNit: string;
}

export interface ReporteVentasResponse {
  kpis: KpisVentas;
  porMetodoPago: MetodoPagoDesglose[];
  porSucursal: SucursalVentaDesglose[];
  detalleVentas: DetalleVentaItem[];
}

// 2. REPORTE DE CADUCIDAD Y MERMAS (FEFO)
export interface KpisCaducidad {
  totalLotesRiesgo: number;
  unidadesTotalesRiesgo: number;
  costoTotalEnRiesgo: number;
  valorVentaEnRiesgo: number;
  lotesVencidosCount: number;
  costoVencidos: number;
  lotes30DiasCount: number;
  costo30Dias: number;
  lotes60DiasCount: number;
  costo60Dias: number;
  lotes90DiasCount: number;
  costo90Dias: number;
}

export interface DetalleLoteCaducidad {
  loteId: number;
  numeroLote: string;
  productoId: number;
  productoNombre: string;
  laboratorioNombre: string;
  sucursalId: number;
  sucursalNombre: string;
  stockActual: number;
  precioCosto: number;
  precioVenta: number;
  costoRiesgo: number;
  valorVentaRiesgo: number;
  fechaVencimiento: string;
  diasRestantes: number;
  estadoUrgencia: 'VENCIDO' | 'CRITICO_30' | 'ALERTA_60' | 'PREVENCION_90' | 'NORMAL';
  accionRecomendada: string;
}

export interface ReporteCaducidadResponse {
  kpis: KpisCaducidad;
  lotes: DetalleLoteCaducidad[];
}

// 3. REPORTE DE VALORACIÓN DE INVENTARIO
export interface KpisValoracion {
  totalItems: number;
  stockTotalUnidades: number;
  costoTotalInventario: number;
  valorTotalVentaPVP: number;
  gananciaPotencial: number;
  margenGlobalPct: number;
}

export interface DesgloseSucursalInventario {
  sucursalId: number;
  nombre: string;
  totalItems: number;
  stockTotal: number;
  costoTotal: number;
  valorVentaTotal: number;
  gananciaEstimada: number;
  margenPct: number;
}

export interface DesgloseCategoriaInventario {
  categoriaId: number;
  categoriaNombre: string;
  totalItems: number;
  stockTotal: number;
  costoTotal: number;
  valorVentaTotal: number;
}

export interface DetalleInventarioItem {
  inventarioId: number;
  productoId: number;
  productoNombre: string;
  categoriaNombre: string;
  sucursalId: number;
  sucursalNombre: string;
  stockActual: number;
  stockMinimo: number;
  stockMaximo: number;
  precioCosto: number;
  precioVenta: number;
  costoTotal: number;
  valorVentaTotal: number;
  gananciaEstimada: number;
  margenPct: number;
}

export interface ReporteValoracionInventarioResponse {
  kpis: KpisValoracion;
  porSucursal: DesgloseSucursalInventario[];
  porCategoria: DesgloseCategoriaInventario[];
  detalleInventario: DetalleInventarioItem[];
}

// 4. TOP PRODUCTOS
export interface KpisTopProductos {
  totalProductosVendidos: number;
  totalUnidadesVendidas: number;
  ingresosTotalesTop: number;
}

export interface TopProductoItem {
  productoId: number;
  nombre: string;
  codigoBarras: string;
  precioVentaActual: number;
  unidadesVendidas: number;
  montoTotalGenerado: number;
  porcentajeIngresos?: number;
}

export interface ReporteTopProductosResponse {
  kpis: KpisTopProductos;
  topPorUnidades: TopProductoItem[];
  topPorIngresos: TopProductoItem[];
}

// 5. CUADRE Y ARQUEO DE CAJAS
export interface KpisCuadreCajas {
  totalSesiones: number;
  sesionesAbiertas: number;
  sesionesCerradas: number;
  montoTotalVentasCajas: number;
  montoTotalAperturas: number;
  diferenciaNetaTotal: number;
  sesionesConFaltante: number;
  sesionesConSobrante: number;
  sesionesCuadradas: number;
}

export interface DetalleSesionCajaItem {
  sesionId: number;
  cajaId: number;
  cajaNombre: string;
  sucursalNombre: string;
  empleadoNombre: string;
  fechaApertura: string;
  fechaCierre: string | null;
  montoApertura: number;
  montoVentasCalculado: number;
  montoEfectivoEsperado: number;
  montoEfectivoReal: number | null;
  diferencia: number | null;
  estadoDiferencia: 'ABIERTA' | 'CUADRADA' | 'SOBRANTE' | 'FALTANTE';
  estadoSesion: string;
}

export interface ReporteCuadreCajasResponse {
  kpis: KpisCuadreCajas;
  sesiones: DetalleSesionCajaItem[];
}
