import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AjustarSalarioRequest,
  CreateEmpleadoRequest,
  CreatePlanillaRequest,
  Empleado,
  EmpleadoDetalle,
  EstadisticasNomina,
  Planilla,
  PlanillaCompleta,
  Puesto,
  QueryEmpleadosParams,
  UpdateEmpleadoRequest,
  UpdatePlanillaDetalleRequest,
} from '../models/planilla.models';

@Injectable({ providedIn: 'root' })
export class PlanillasService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/planillas`;

  // Puestos
  listarPuestos(): Observable<Puesto[]> {
    return this.http.get<Puesto[]>(`${this.apiUrl}/puestos`);
  }

  // Estadísticas
  obtenerEstadisticas(): Observable<EstadisticasNomina> {
    return this.http.get<EstadisticasNomina>(`${this.apiUrl}/estadisticas`);
  }

  // Empleados
  listarEmpleados(params?: QueryEmpleadosParams): Observable<Empleado[]> {
    let httpParams = new HttpParams();
    if (params?.busqueda) httpParams = httpParams.set('busqueda', params.busqueda);
    if (params?.sucursalId) httpParams = httpParams.set('sucursalId', params.sucursalId.toString());
    if (params?.puestoId) httpParams = httpParams.set('puestoId', params.puestoId.toString());
    if (params?.estado) httpParams = httpParams.set('estado', params.estado);

    return this.http.get<Empleado[]>(`${this.apiUrl}/empleados`, { params: httpParams });
  }

  obtenerEmpleadoPorId(id: number): Observable<EmpleadoDetalle> {
    return this.http.get<EmpleadoDetalle>(`${this.apiUrl}/empleados/${id}`);
  }

  crearEmpleado(req: CreateEmpleadoRequest): Observable<EmpleadoDetalle> {
    return this.http.post<EmpleadoDetalle>(`${this.apiUrl}/empleados`, req);
  }

  actualizarEmpleado(id: number, req: UpdateEmpleadoRequest): Observable<EmpleadoDetalle> {
    return this.http.patch<EmpleadoDetalle>(`${this.apiUrl}/empleados/${id}`, req);
  }

  ajustarSalario(id: number, req: AjustarSalarioRequest): Observable<EmpleadoDetalle> {
    return this.http.post<EmpleadoDetalle>(`${this.apiUrl}/empleados/${id}/ajustar-salario`, req);
  }

  // Planillas
  listarPlanillas(): Observable<Planilla[]> {
    return this.http.get<Planilla[]>(this.apiUrl);
  }

  obtenerPlanillaPorId(id: number): Observable<PlanillaCompleta> {
    return this.http.get<PlanillaCompleta>(`${this.apiUrl}/${id}`);
  }

  generarPlanilla(req: CreatePlanillaRequest): Observable<PlanillaCompleta> {
    return this.http.post<PlanillaCompleta>(this.apiUrl, req);
  }

  actualizarDetallePlanilla(
    planillaId: number,
    detalleId: number,
    req: UpdatePlanillaDetalleRequest,
  ): Observable<PlanillaCompleta> {
    return this.http.patch<PlanillaCompleta>(`${this.apiUrl}/${planillaId}/detalle/${detalleId}`, req);
  }

  pagarPlanilla(
    id: number,
    req?: { cuentaOrigen?: string; metodoPago?: string },
  ): Observable<PlanillaCompleta> {
    return this.http.patch<PlanillaCompleta>(`${this.apiUrl}/${id}/pagar`, req || {});
  }

  cancelarPlanilla(id: number): Observable<PlanillaCompleta> {
    return this.http.patch<PlanillaCompleta>(`${this.apiUrl}/${id}/cancelar`, {});
  }

  descargarBoletasPlanillaPdf(planillaId: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${planillaId}/boletas-pdf`, {
      responseType: 'blob',
    });
  }

  descargarBoletaIndividualPdf(
    planillaId: number,
    detalleId: number,
  ): Observable<Blob> {
    return this.http.get(
      `${this.apiUrl}/${planillaId}/detalle/${detalleId}/boleta-pdf`,
      {
        responseType: 'blob',
      },
    );
  }
}
