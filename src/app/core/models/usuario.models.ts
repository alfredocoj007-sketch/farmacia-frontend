export interface RolItem {
  rolId: number;
  nombre: string;
  descripcion?: string | null;
  estado?: string;
}

export interface UsuarioItem {
  credencialId: number;
  username: string;
  estado: 'ACTIVO' | 'INACTIVO' | string;
  ultimoLogin: string | Date | null;
  fechaRegistro: string | Date;
  empleado?: {
    empleadoId: number;
    nombre: string;
    apellido: string;
    telefono?: string | null;
    dpi?: string | null;
    estado: string;
    sucursal?: {
      sucursalId: number;
      nombre: string;
      tipoSucursal: string;
    };
    puesto?: {
      puestoId: number;
      nombre: string;
    };
  } | null;
  rol: RolItem;
}

export interface EmpleadoDisponibleItem {
  empleadoId: number;
  nombre: string;
  apellido: string;
  nombreCompleto: string;
  dpi?: string | null;
  telefono?: string | null;
  estado: string;
  puesto?: {
    puestoId: number;
    nombre: string;
  } | null;
  sucursal?: {
    sucursalId: number;
    nombre: string;
    tipoSucursal: string;
  } | null;
  tieneUsuario: boolean;
  username?: string | null;
  rolNombre?: string | null;
}

export interface CreateUsuarioPayload {
  username: string;
  password: string;
  nombre: string;
  apellido: string;
  telefono?: string;
  dpi?: string;
  rolId: number;
  sucursalId: number;
  empleadoId?: number;
}

export interface UpdateUsuarioPayload {
  nombre?: string;
  apellido?: string;
  telefono?: string;
  rolId?: number;
  sucursalId?: number;
  estado?: string;
  password?: string;
}

export interface QueryUsuariosParams {
  buscar?: string;
  rolId?: string;
  sucursalId?: string;
  estado?: string;
}
