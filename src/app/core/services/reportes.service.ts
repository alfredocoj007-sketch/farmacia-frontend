import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  FiltroReporte,
  ReporteCaducidadResponse,
  ReporteCuadreCajasResponse,
  ReporteTopProductosResponse,
  ReporteValoracionInventarioResponse,
  ReporteVentasResponse,
} from '../models/reportes.models';

@Injectable({ providedIn: 'root' })
export class ReportesService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/reportes`;

  private construirParams(filtro: FiltroReporte): HttpParams {
    let params = new HttpParams();
    if (filtro.sucursalId) {
      params = params.set('sucursalId', filtro.sucursalId.toString());
    }
    if (filtro.periodo) {
      params = params.set('periodo', filtro.periodo);
    }
    if (filtro.fechaInicio) {
      params = params.set('fechaInicio', filtro.fechaInicio);
    }
    if (filtro.fechaFin) {
      params = params.set('fechaFin', filtro.fechaFin);
    }
    if (filtro.limite) {
      params = params.set('limite', filtro.limite.toString());
    }
    return params;
  }

  // 1. Reporte Consolidado de Ventas e Ingresos
  obtenerReporteVentas(filtro: FiltroReporte): Observable<ReporteVentasResponse> {
    const params = this.construirParams(filtro);
    return this.http.get<ReporteVentasResponse>(`${this.apiUrl}/ventas`, { params });
  }

  // 2. Reporte de Riesgo de Caducidad y Mermas (FEFO)
  obtenerReporteCaducidad(filtro: FiltroReporte): Observable<ReporteCaducidadResponse> {
    const params = this.construirParams(filtro);
    return this.http.get<ReporteCaducidadResponse>(`${this.apiUrl}/caducidad-fefo`, { params });
  }

  // 3. Reporte de Valoración Global de Inventario
  obtenerReporteValoracion(filtro: FiltroReporte): Observable<ReporteValoracionInventarioResponse> {
    const params = this.construirParams(filtro);
    return this.http.get<ReporteValoracionInventarioResponse>(`${this.apiUrl}/valoracion-inventario`, { params });
  }

  // 4. Top 10 Medicamentos Más Vendidos
  obtenerReporteTopProductos(filtro: FiltroReporte): Observable<ReporteTopProductosResponse> {
    const params = this.construirParams(filtro);
    return this.http.get<ReporteTopProductosResponse>(`${this.apiUrl}/top-productos`, { params });
  }

  // 5. Reporte de Arqueos y Cuadre de Cajas
  obtenerReporteCuadreCajas(filtro: FiltroReporte): Observable<ReporteCuadreCajasResponse> {
    const params = this.construirParams(filtro);
    return this.http.get<ReporteCuadreCajasResponse>(`${this.apiUrl}/cuadre-cajas`, { params });
  }
}
