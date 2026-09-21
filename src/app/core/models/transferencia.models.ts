import { Lote, Sucursal } from './lote.models';

export type EstadoTransferencia =
  | 'SOLICITADA'
  | 'EN_TRANSITO'
  | 'RECIBIDA'
  | 'CANCELADA';

export interface TransferenciaDetalle {
  transferenciaDetalleId: number;
  transferenciaId: number;
  loteId: number;
  cantidadSolicitada: number;
  cantidadEnviada: number;
  cantidadRecibida: number;
  lote?: Lote;
}

export interface Transferencia {
  transferenciaId: number;
  fechaSolicitud: string;
  fechaEnvio: string | null;
  fechaRecepcion: string | null;
  estado: EstadoTransferencia;
  observacion: string | null;
  sucursalOrigen: Sucursal;
  sucursalDestino: Sucursal;
  transferenciaDetalles: TransferenciaDetalle[];
}

export interface TransferenciasPaginadas {
  data: Transferencia[];
  total: number;
  page: number;
  limit: number;
}

export interface CrearTransferenciaPayload {
  sucursalOrigenId: number;
  sucursalDestinoId: number;
  observacion?: string;
  detalles: {
    loteId: number;
    cantidadSolicitada: number;
  }[];
}

export interface EnviarTransferenciaPayload {
  observacion?: string;
  detalles?: {
    loteId: number;
    cantidadEnviada: number;
  }[];
}

export interface RecibirTransferenciaPayload {
  observacion?: string;
  detalles?: {
    loteId: number;
    cantidadRecibida: number;
  }[];
}

export interface QueryTransferencias {
  page?: number;
  limit?: number;
  estado?: string;
  sucursalOrigenId?: number;
  sucursalDestinoId?: number;
}
