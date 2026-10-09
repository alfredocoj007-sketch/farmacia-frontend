import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ConteoPendientesTransferencia,
  CrearTransferenciaPayload,
  EnviarTransferenciaPayload,
  LoteDisponibleTransferencia,
  QueryTransferencias,
  RecibirTransferenciaPayload,
  Transferencia,
  TransferenciasPaginadas,
} from '../models/transferencia.models';

@Injectable({ providedIn: 'root' })
export class TransferenciasService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/transferencias`;

  findAll(query: QueryTransferencias = {}): Observable<TransferenciasPaginadas> {
    let params = new HttpParams();
    if (query.page) params = params.set('page', query.page);
    if (query.limit) params = params.set('limit', query.limit);
    if (query.estado) params = params.set('estado', query.estado);
    if (query.sucursalOrigenId)
      params = params.set('sucursalOrigenId', query.sucursalOrigenId);
    if (query.sucursalDestinoId)
      params = params.set('sucursalDestinoId', query.sucursalDestinoId);

    return this.http.get<TransferenciasPaginadas>(this.baseUrl, { params });
  }

  findOne(id: number): Observable<Transferencia> {
    return this.http.get<Transferencia>(`${this.baseUrl}/${id}`);
  }

  create(payload: CrearTransferenciaPayload): Observable<Transferencia> {
    return this.http.post<Transferencia>(this.baseUrl, payload);
  }

  enviar(
    id: number,
    payload: EnviarTransferenciaPayload = {},
  ): Observable<Transferencia> {
    return this.http.patch<Transferencia>(`${this.baseUrl}/${id}/enviar`, payload);
  }

  recibir(
    id: number,
    payload: RecibirTransferenciaPayload = {},
  ): Observable<Transferencia> {
    return this.http.patch<Transferencia>(`${this.baseUrl}/${id}/recibir`, payload);
  }

  cancelar(id: number, observacion?: string): Observable<Transferencia> {
    return this.http.patch<Transferencia>(`${this.baseUrl}/${id}/cancelar`, {
      observacion,
    });
  }

  readonly conteoBadge = signal<number>(0);
  readonly infoBadge = signal<ConteoPendientesTransferencia | null>(null);

  actualizarConteoPendientes(): Observable<ConteoPendientesTransferencia> {
    return this.http
      .get<ConteoPendientesTransferencia>(`${this.baseUrl}/pendientes-conteo`)
      .pipe(
        tap((info) => {
          this.conteoBadge.set(info.conteoBadge);
          this.infoBadge.set(info);
        }),
      );
  }

  getLotesDisponibles(
    sucursalOrigenId?: number,
  ): Observable<LoteDisponibleTransferencia[]> {
    let params = new HttpParams();
    if (sucursalOrigenId) {
      params = params.set('sucursalOrigenId', sucursalOrigenId);
    }
    return this.http.get<LoteDisponibleTransferencia[]>(
      `${this.baseUrl}/lotes-disponibles`,
      { params },
    );
  }
}
