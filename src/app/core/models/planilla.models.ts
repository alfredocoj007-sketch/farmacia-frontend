export interface Puesto {
  puestoId: number;
  nombre: string;
  descripcion?: string | null;
}

export interface EmpleadoSucursal {
  sucursalId: number;
  nombre: string;
  tipoSucursal?: string;
}

export interface HistorialSalarioItem {
  historialSalarioId: number;
  salarioAnterior: number | null;
  salarioNuevo: number;
  motivo: string | null;
  fechaCambio: string;
}

export interface Empleado {
  empleadoId: number;
  nombre: string;
  apellido: string;
  nombreCompleto: string;
  dpi: string | null;
  telefono: string | null;
  fechaIngreso: string;
  salarioActual: number;
  estado: 'ACTIVO' | 'INACTIVO' | 'SUSPENDIDO';
  puesto: Puesto | null;
  sucursal: EmpleadoSucursal | null;
}

export interface EmpleadoDetalle extends Empleado {
  historialSalarios: HistorialSalarioItem[];
}

export interface PlanillaDetalle {
  planillaDetalleId: number;
  empleadoId: number;
  nombreEmpleado: string;
  dpi: string;
  puestoNombre: string;
  sucursalNombre: string;
  salarioBase: number;
  salarioMensual?: number;
  bonificaciones: number;
  horasExtra: number;
  descuentos: number;
  totalPagar: number;
}

export interface Planilla {
  planillaId: number;
  fechaInicio: string;
  fechaFin: string;
  fechaPago: string | null;
  estado: 'ABIERTA' | 'PROCESADA' | 'PAGADA' | 'CANCELADA';
  cuentaOrigen?: string | null;
  metodoPago?: string | null;
  esQuincenal?: boolean;
  totalBruto: number;
  totalDescuentos: number;
  totalNeto: number;
  colaboradoresCount?: number;
}

export interface PlanillaCompleta extends Planilla {
  detalles: PlanillaDetalle[];
}

export interface EstadisticasNomina {
  totalEmpleados: number;
  empleadosActivos: number;
  masaSalarialMensualProyectada: number;
  igssLaboralMensualProyectado: number;
  ultimaPlanilla: {
    planillaId: number;
    estado: string;
    totalNeto: number;
    fechaInicio: string;
    fechaFin: string;
    fechaPago: string | null;
  } | null;
}

export interface CreateEmpleadoRequest {
  nombre: string;
  apellido: string;
  dpi?: string;
  telefono?: string;
  fechaIngreso: string;
  salarioActual: number;
  puestoId: number;
  sucursalId: number;
}

export interface UpdateEmpleadoRequest {
  nombre?: string;
  apellido?: string;
  dpi?: string;
  telefono?: string;
  fechaIngreso?: string;
  estado?: 'ACTIVO' | 'INACTIVO' | 'SUSPENDIDO';
  puestoId?: number;
  sucursalId?: number;
}

export interface AjustarSalarioRequest {
  nuevoSalario: number;
  motivo: string;
}

export interface CreatePlanillaRequest {
  fechaInicio: string;
  fechaFin: string;
  observacion?: string;
}

export interface UpdatePlanillaDetalleRequest {
  horasExtra?: number;
  bonificaciones?: number;
  descuentos?: number;
}

export interface QueryEmpleadosParams {
  busqueda?: string;
  sucursalId?: number;
  puestoId?: number;
  estado?: string;
}
