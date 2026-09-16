import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  EntradaLotePayload,
  Lote,
  LotesPaginados,
  MovimientoInventario,
  QueryLotes,
  SalidaLotePayload,
} from '../models/lote.models';

@Injectable({ providedIn: 'root' })
export class LotesService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/lotes`;

  findAll(query: QueryLotes = {}): Observable<LotesPaginados> {
    let params = new HttpParams();
    if (query.productoId) params = params.set('productoId', query.productoId);
    if (query.page) params = params.set('page', query.page);
    if (query.limit) params = params.set('limit', query.limit);

    return this.http.get<LotesPaginados>(this.baseUrl, { params });
  }

  findOne(loteId: number): Observable<Lote> {
    return this.http.get<Lote>(`${this.baseUrl}/${loteId}`);
  }

  findMovimientos(loteId: number): Observable<MovimientoInventario[]> {
    return this.http.get<MovimientoInventario[]>(`${this.baseUrl}/${loteId}/movimientos`);
  }

  registrarEntrada(payload: EntradaLotePayload): Observable<unknown> {
    return this.http.post(`${this.baseUrl}/entrada`, payload);
  }

  registrarSalida(payload: SalidaLotePayload): Observable<MovimientoInventario[]> {
    return this.http.post<MovimientoInventario[]>(`${this.baseUrl}/salida`, payload);
  }
}
