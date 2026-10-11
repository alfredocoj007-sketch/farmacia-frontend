import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  CambiarEstadoPedidoRequest,
  ClienteSimple,
  CreatePedidoCallCenterRequest,
  EstadisticasCallCenter,
  ItemConsultaDisponibilidad,
  MedicamentoCallCenter,
  PedidoCallCenter,
  QueryPedidosParams,
  SucursalDisponibilidad,
} from '../models/pedido.models';

@Injectable({ providedIn: 'root' })
export class PedidosService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/pedidos`;

  readonly conteoBadge = signal<number>(0);
  readonly estadisticasEnVivo = signal<EstadisticasCallCenter | null>(null);

  actualizarNotificaciones(sucursalId?: number): Observable<EstadisticasCallCenter> {
    return this.obtenerEstadisticas(sucursalId).pipe(
      tap((stats) => {
        const porDespachar = (stats.recibidos || 0) + (stats.enPreparacion || 0);
        this.conteoBadge.set(porDespachar);
        this.estadisticasEnVivo.set(stats);
      }),
    );
  }

  listar(params?: QueryPedidosParams): Observable<PedidoCallCenter[]> {
    let httpParams = new HttpParams();
    if (params?.estado) {
      httpParams = httpParams.set('estado', params.estado);
    }
    if (params?.sucursalId) {
      httpParams = httpParams.set('sucursalId', params.sucursalId.toString());
    }
    if (params?.busqueda) {
      httpParams = httpParams.set('busqueda', params.busqueda);
    }
    if (params?.limit) {
      httpParams = httpParams.set('limit', params.limit.toString());
    }
    return this.http.get<PedidoCallCenter[]>(this.apiUrl, { params: httpParams });
  }

  obtenerPorId(id: number): Observable<PedidoCallCenter> {
    return this.http.get<PedidoCallCenter>(`${this.apiUrl}/${id}`);
  }

  obtenerEstadisticas(sucursalId?: number): Observable<EstadisticasCallCenter> {
    let params = new HttpParams();
    if (sucursalId) {
      params = params.set('sucursalId', sucursalId.toString());
    }
    return this.http.get<EstadisticasCallCenter>(`${this.apiUrl}/estadisticas`, { params });
  }

  buscarClientes(termino: string): Observable<ClienteSimple[]> {
    const params = new HttpParams().set('q', termino);
    return this.http.get<ClienteSimple[]>(`${this.apiUrl}/clientes/buscar`, { params });
  }

  obtenerMedicamentosDisponibles(): Observable<MedicamentoCallCenter[]> {
    return this.http.get<MedicamentoCallCenter[]>(`${this.apiUrl}/medicamentos-disponibles`);
  }

  consultarDisponibilidad(items: ItemConsultaDisponibilidad[]): Observable<SucursalDisponibilidad[]> {
    return this.http.post<SucursalDisponibilidad[]>(`${this.apiUrl}/disponibilidad`, { items });
  }

  crearPedidoCallCenter(req: CreatePedidoCallCenterRequest): Observable<PedidoCallCenter> {
    return this.http.post<PedidoCallCenter>(`${this.apiUrl}/call-center`, req);
  }

  actualizarEstado(id: number, req: CambiarEstadoPedidoRequest): Observable<PedidoCallCenter> {
    return this.http.patch<PedidoCallCenter>(`${this.apiUrl}/${id}/estado`, req);
  }
}
