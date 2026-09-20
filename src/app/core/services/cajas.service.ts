import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AbrirSesionRequest,
  Caja,
  CerrarSesionRequest,
  HistorialSesion,
  MetodoPago,
  RegistrarMovimientoRequest,
  ResultadoArqueo,
  SesionActivaDetalle,
} from '../models/caja.models';

@Injectable({ providedIn: 'root' })
export class CajasService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/cajas`;

  listarPorSucursal(sucursalId: number): Observable<Caja[]> {
    return this.http.get<Caja[]>(`${this.apiUrl}/sucursal/${sucursalId}`);
  }

  obtenerSesionActiva(cajaId: number): Observable<SesionActivaDetalle | null> {
    return this.http.get<SesionActivaDetalle | null>(`${this.apiUrl}/${cajaId}/sesion-activa`);
  }

  obtenerHistorial(cajaId: number): Observable<HistorialSesion[]> {
    return this.http.get<HistorialSesion[]>(`${this.apiUrl}/${cajaId}/historial`);
  }

  listarMetodosPago(): Observable<MetodoPago[]> {
    return this.http.get<MetodoPago[]>(`${this.apiUrl}/metodos-pago`);
  }

  abrirSesion(req: AbrirSesionRequest): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/sesion/abrir`, req);
  }

  registrarMovimiento(req: RegistrarMovimientoRequest): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/sesion/movimiento`, req);
  }

  cerrarYArquearSesion(req: CerrarSesionRequest): Observable<ResultadoArqueo> {
    return this.http.post<ResultadoArqueo>(`${this.apiUrl}/sesion/cerrar`, req);
  }
}
