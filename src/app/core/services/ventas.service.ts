import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CreateVentaPosRequest,
  MetodoPagoSimple,
  ProductoPosItem,
  SesionCajaInfo,
  VentaListadoItem,
  VentaRespuesta,
} from '../models/venta.models';

@Injectable({ providedIn: 'root' })
export class VentasService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/ventas`;

  registrarVenta(dto: CreateVentaPosRequest): Observable<VentaRespuesta> {
    return this.http.post<VentaRespuesta>(this.apiUrl, dto);
  }

  listarVentas(filtros?: {
    sucursalId?: number;
    busqueda?: string;
    limit?: number;
  }): Observable<VentaListadoItem[]> {
    let params = new HttpParams();
    if (filtros?.sucursalId) {
      params = params.set('sucursalId', filtros.sucursalId.toString());
    }
    if (filtros?.busqueda) {
      params = params.set('busqueda', filtros.busqueda);
    }
    if (filtros?.limit) {
      params = params.set('limit', filtros.limit.toString());
    }
    return this.http.get<VentaListadoItem[]>(this.apiUrl, { params });
  }

  obtenerVentaPorId(id: number): Observable<VentaRespuesta> {
    return this.http.get<VentaRespuesta>(`${this.apiUrl}/${id}`);
  }

  buscarProductos(termino: string, sucursalId: number): Observable<ProductoPosItem[]> {
    let params = new HttpParams()
      .set('termino', termino)
      .set('sucursalId', sucursalId.toString());
    return this.http.get<ProductoPosItem[]>(`${this.apiUrl}/productos`, { params });
  }

  verificarSesionCaja(sucursalId: number): Observable<SesionCajaInfo> {
    return this.http.get<SesionCajaInfo>(`${this.apiUrl}/sesion-caja/${sucursalId}`);
  }

  listarMetodosPago(): Observable<MetodoPagoSimple[]> {
    return this.http.get<MetodoPagoSimple[]>(`${this.apiUrl}/metodos-pago`);
  }
}
