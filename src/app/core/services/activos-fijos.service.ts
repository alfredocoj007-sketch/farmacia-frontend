import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ActivoFijo,
  ActivoFijoDetalle,
  CategoriaActivo,
  CreateActivoFijoRequest,
  EstadisticasActivosFijos,
  MantenimientoActivoRequest,
  QueryActivoFijoParams,
  TrasladarActivoRequest,
} from '../models/activo-fijo.models';

@Injectable({ providedIn: 'root' })
export class ActivosFijosService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/activos-fijos`;

  listar(params?: QueryActivoFijoParams): Observable<ActivoFijo[]> {
    let httpParams = new HttpParams();
    if (params?.sucursalId) {
      httpParams = httpParams.set('sucursalId', params.sucursalId.toString());
    }
    if (params?.categoriaActivoId) {
      httpParams = httpParams.set('categoriaActivoId', params.categoriaActivoId.toString());
    }
    if (params?.estado) {
      httpParams = httpParams.set('estado', params.estado);
    }
    if (params?.busqueda) {
      httpParams = httpParams.set('busqueda', params.busqueda);
    }
    return this.http.get<ActivoFijo[]>(this.apiUrl, { params: httpParams });
  }

  obtenerPorId(activoId: number): Observable<ActivoFijoDetalle> {
    return this.http.get<ActivoFijoDetalle>(`${this.apiUrl}/${activoId}`);
  }

  listarCategorias(): Observable<CategoriaActivo[]> {
    return this.http.get<CategoriaActivo[]>(`${this.apiUrl}/categorias`);
  }

  obtenerEstadisticas(sucursalId?: number): Observable<EstadisticasActivosFijos> {
    let httpParams = new HttpParams();
    if (sucursalId) {
      httpParams = httpParams.set('sucursalId', sucursalId.toString());
    }
    return this.http.get<EstadisticasActivosFijos>(`${this.apiUrl}/estadisticas`, { params: httpParams });
  }

  crear(req: CreateActivoFijoRequest): Observable<ActivoFijoDetalle> {
    return this.http.post<ActivoFijoDetalle>(this.apiUrl, req);
  }

  trasladar(activoId: number, req: TrasladarActivoRequest): Observable<ActivoFijoDetalle> {
    return this.http.post<ActivoFijoDetalle>(`${this.apiUrl}/${activoId}/trasladar`, req);
  }

  registrarMantenimiento(activoId: number, req: MantenimientoActivoRequest): Observable<ActivoFijoDetalle> {
    return this.http.patch<ActivoFijoDetalle>(`${this.apiUrl}/${activoId}/mantenimiento`, req);
  }
}
