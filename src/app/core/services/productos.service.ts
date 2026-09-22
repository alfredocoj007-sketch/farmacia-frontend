import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Producto, ProductoPayload, ProductosPaginados, QueryProductos } from '../models/producto.models';

@Injectable({ providedIn: 'root' })
export class ProductosService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/productos`;

  findAll(query: QueryProductos = {}): Observable<ProductosPaginados> {
    let params = new HttpParams();
    if (query.q) params = params.set('q', query.q);
    if (query.estado) params = params.set('estado', query.estado);
    if (query.categoriaId) params = params.set('categoriaId', query.categoriaId);
    if (query.page) params = params.set('page', query.page);
    if (query.limit) params = params.set('limit', query.limit);

    return this.http.get<ProductosPaginados>(this.baseUrl, { params });
  }

  findOne(productoId: number): Observable<Producto> {
    return this.http.get<Producto>(`${this.baseUrl}/${productoId}`);
  }

  create(payload: ProductoPayload): Observable<Producto> {
    return this.http.post<Producto>(this.baseUrl, payload);
  }

  update(productoId: number, payload: Partial<ProductoPayload>): Observable<Producto> {
    return this.http.patch<Producto>(`${this.baseUrl}/${productoId}`, payload);
  }

  desactivar(productoId: number): Observable<Producto> {
    return this.http.patch<Producto>(`${this.baseUrl}/${productoId}/desactivar`, {});
  }

  activar(productoId: number): Observable<Producto> {
    return this.http.patch<Producto>(`${this.baseUrl}/${productoId}/activar`, {});
  }
}
