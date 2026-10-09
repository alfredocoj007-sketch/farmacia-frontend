import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CompraItemPayload,
  CompraLotePayload,
  CompraLoteResponse,
  EntradaLotePayload,
  Lote,
  LotesPaginados,
  MovimientoInventario,
  MovimientosPaginados,
  QueryLotes,
  QueryMovimientos,
  SalidaLotePayload,
} from '../models/lote.models';

@Injectable({ providedIn: 'root' })
export class LotesService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/lotes`;

  findAll(query: QueryLotes = {}): Observable<LotesPaginados> {
    let params = new HttpParams();
    if (query.sucursalId) params = params.set('sucursalId', query.sucursalId);
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

  findAllMovimientos(query: QueryMovimientos = {}): Observable<MovimientosPaginados> {
    let params = new HttpParams();
    if (query.sucursalId) params = params.set('sucursalId', query.sucursalId);
    if (query.productoId) params = params.set('productoId', query.productoId);
    if (query.loteId) params = params.set('loteId', query.loteId);
    if (query.tipoMovimiento) params = params.set('tipoMovimiento', query.tipoMovimiento);
    if (query.busqueda) params = params.set('busqueda', query.busqueda);
    if (query.fechaDesde) params = params.set('fechaDesde', query.fechaDesde);
    if (query.fechaHasta) params = params.set('fechaHasta', query.fechaHasta);
    if (query.page) params = params.set('page', query.page);
    if (query.limit) params = params.set('limit', query.limit);

    return this.http.get<MovimientosPaginados>(`${this.baseUrl}/movimientos/todos`, { params });
  }

  registrarEntrada(payload: EntradaLotePayload): Observable<unknown> {
    return this.http.post(`${this.baseUrl}/entrada`, payload);
  }

  registrarCompra(payload: CompraLotePayload): Observable<CompraLoteResponse> {
    return this.http.post<CompraLoteResponse>(`${this.baseUrl}/compra`, payload);
  }

  registrarSalida(payload: SalidaLotePayload): Observable<MovimientoInventario[]> {
    return this.http.post<MovimientoInventario[]>(`${this.baseUrl}/salida`, payload);
  }
}
