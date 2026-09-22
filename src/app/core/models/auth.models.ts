export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  usuario: {
    credencialId: number;
    username: string;
    nombre: string;
    rol: string;
    sucursalId: number | null;
    sucursalNombre?: string | null;
  };
}

export interface AuthenticatedUser {
  credencialId: number;
  username: string;
  empleadoId: number;
  rolId: number;
  rolNombre: string;
  sucursalId?: number | null;
  sucursalNombre?: string | null;
}
