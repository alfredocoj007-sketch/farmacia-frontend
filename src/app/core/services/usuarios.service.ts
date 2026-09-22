import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CreateUsuarioPayload,
  QueryUsuariosParams,
  RolItem,
  UpdateUsuarioPayload,
  UsuarioItem,
} from '../models/usuario.models';

@Injectable({ providedIn: 'root' })
export class UsuariosService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/usuarios`;

  findAll(params?: QueryUsuariosParams): Observable<UsuarioItem[]> {
    let httpParams = new HttpParams();
    if (params) {
      if (params.buscar) httpParams = httpParams.set('buscar', params.buscar);
      if (params.rolId) httpParams = httpParams.set('rolId', params.rolId);
      if (params.sucursalId) httpParams = httpParams.set('sucursalId', params.sucursalId);
      if (params.estado) httpParams = httpParams.set('estado', params.estado);
    }
    return this.http
      .get<{ data: UsuarioItem[]; total: number }>(this.apiUrl, { params: httpParams })
      .pipe(map((res) => res.data));
  }

  obtenerPorId(id: number): Observable<UsuarioItem> {
    return this.http.get<UsuarioItem>(`${this.apiUrl}/${id}`);
  }

  listarRoles(): Observable<RolItem[]> {
    return this.http.get<RolItem[]>(`${this.apiUrl}/roles`);
  }

  crear(payload: CreateUsuarioPayload): Observable<UsuarioItem> {
    return this.http.post<UsuarioItem>(this.apiUrl, payload);
  }

  actualizar(id: number, payload: UpdateUsuarioPayload): Observable<UsuarioItem> {
    return this.http.patch<UsuarioItem>(`${this.apiUrl}/${id}`, payload);
  }

  cambiarEstado(id: number, estado: 'ACTIVO' | 'INACTIVO'): Observable<UsuarioItem> {
    return this.http.patch<UsuarioItem>(`${this.apiUrl}/${id}/estado`, { estado });
  }
}
