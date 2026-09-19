import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AuditoriaEvento,
  EstadisticasAuditoria,
  FiltrosAuditoria,
  RespuestaPaginadaAuditoria,
  RolesYUsuariosRespuesta,
} from '../models/auditoria.models';

@Injectable({ providedIn: 'root' })
export class AuditoriaService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/auditoria`;

  listarEventos(filtros?: FiltrosAuditoria): Observable<RespuestaPaginadaAuditoria> {
    let params = new HttpParams();

    if (filtros) {
      if (filtros.modulo) params = params.set('modulo', filtros.modulo);
      if (filtros.operacion) params = params.set('operacion', filtros.operacion);
      if (filtros.tablaAfectada) params = params.set('tablaAfectada', filtros.tablaAfectada);
      if (filtros.usuarioBd) params = params.set('usuarioBd', filtros.usuarioBd);
      if (filtros.clientIdentifier) params = params.set('clientIdentifier', filtros.clientIdentifier);
      if (filtros.ipCliente) params = params.set('ipCliente', filtros.ipCliente);
      if (filtros.fechaInicio) params = params.set('fechaInicio', filtros.fechaInicio);
      if (filtros.fechaFin) params = params.set('fechaFin', filtros.fechaFin);
      if (filtros.q) params = params.set('q', filtros.q);
      if (filtros.page) params = params.set('page', filtros.page.toString());
      if (filtros.limit) params = params.set('limit', filtros.limit.toString());
    }

    return this.http.get<RespuestaPaginadaAuditoria>(this.apiUrl, { params });
  }

  obtenerEstadisticas(): Observable<EstadisticasAuditoria> {
    return this.http.get<EstadisticasAuditoria>(`${this.apiUrl}/estadisticas`);
  }

  obtenerRolesYUsuarios(): Observable<RolesYUsuariosRespuesta> {
    return this.http.get<RolesYUsuariosRespuesta>(`${this.apiUrl}/roles-usuarios`);
  }

  obtenerEvento(id: number): Observable<AuditoriaEvento> {
    return this.http.get<AuditoriaEvento>(`${this.apiUrl}/${id}`);
  }
}
