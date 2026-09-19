export interface AuditoriaEvento {
  auditoriaId: number;
  usuarioBd: string | null;
  tablaAfectada: string;
  registroId: number | null;
  operacion: string;
  modulo: string | null;
  ipCliente: string | null;
  host: string | null;
  fechaEvento: string;
  descripcion: string | null;
  clientIdentifier: string | null;
}

export interface DesgloseModulo {
  modulo: string;
  total: number;
  porcentaje: number;
}

export interface DesgloseOperacion {
  operacion: string;
  total: number;
}

export interface EstadisticasAuditoria {
  totalEventosPeriodo: number;
  totalEventosHoy: number;
  operacionesCriticas: number;
  desgloseModulos: DesgloseModulo[];
  desgloseOperaciones: DesgloseOperacion[];
  ipsUnicas: number;
  ultimosEventosCriticos: AuditoriaEvento[];
}

export interface RolSeguridad {
  rolId: number;
  nombre: string;
  estado: string;
  descripcion: string | null;
  totalUsuarios: number;
}

export interface CredencialSeguridad {
  credencialId: number;
  username: string;
  ultimoLogin: string | null;
  fechaRegistro: string;
  estado: string;
  rol: string;
  empleado: {
    empleadoId: number;
    nombreCompleto: string;
    puesto: string;
    sucursal: string;
  } | null;
}

export interface RolesYUsuariosRespuesta {
  roles: RolSeguridad[];
  credenciales: CredencialSeguridad[];
}

export interface FiltrosAuditoria {
  modulo?: string;
  operacion?: string;
  tablaAfectada?: string;
  usuarioBd?: string;
  clientIdentifier?: string;
  ipCliente?: string;
  fechaInicio?: string;
  fechaFin?: string;
  q?: string;
  page?: number;
  limit?: number;
}

export interface RespuestaPaginadaAuditoria {
  items: AuditoriaEvento[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
