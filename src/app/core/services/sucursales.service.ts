import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CreateSucursalRequest,
  DepartamentoGeo,
  EstadisticasRed,
  MunicipioGeo,
  QuerySucursalesParams,
  SucursalDetalleCompleto,
  SucursalRed,
  UpdateSucursalRequest,
} from '../models/sucursal.models';

@Injectable({ providedIn: 'root' })
export class SucursalesService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/sucursales`;

  findAll(params?: QuerySucursalesParams): Observable<SucursalRed[]> {
    let httpParams = new HttpParams();
    if (params) {
      if (params.busqueda) httpParams = httpParams.set('busqueda', params.busqueda);
      if (params.tipoSucursal) httpParams = httpParams.set('tipoSucursal', params.tipoSucursal);
      if (params.estado) httpParams = httpParams.set('estado', params.estado);
      if (params.departamentoId) httpParams = httpParams.set('departamentoId', params.departamentoId.toString());
      if (params.municipioId) httpParams = httpParams.set('municipioId', params.municipioId.toString());
    }
    return this.http.get<SucursalRed[]>(this.apiUrl, { params: httpParams });
  }

  obtenerPorId(id: number): Observable<SucursalDetalleCompleto> {
    return this.http.get<SucursalDetalleCompleto>(`${this.apiUrl}/${id}`);
  }

  obtenerEstadisticas(): Observable<EstadisticasRed> {
    return this.http.get<EstadisticasRed>(`${this.apiUrl}/estadisticas`);
  }

  crear(dto: CreateSucursalRequest): Observable<SucursalRed> {
    return this.http.post<SucursalRed>(this.apiUrl, dto);
  }

  actualizar(id: number, dto: UpdateSucursalRequest): Observable<SucursalRed> {
    return this.http.patch<SucursalRed>(`${this.apiUrl}/${id}`, dto);
  }

  cambiarEstado(id: number, estado: string): Observable<SucursalRed> {
    return this.http.patch<SucursalRed>(`${this.apiUrl}/${id}/estado`, { estado });
  }

  obtenerDepartamentos(): Observable<DepartamentoGeo[]> {
    return this.http.get<DepartamentoGeo[]>(`${this.apiUrl}/departamentos`);
  }

  obtenerMunicipios(departamentoId?: number): Observable<MunicipioGeo[]> {
    let params = new HttpParams();
    if (departamentoId) {
      params = params.set('departamentoId', departamentoId.toString());
    }
    return this.http.get<MunicipioGeo[]>(`${this.apiUrl}/municipios`, { params });
  }
}
