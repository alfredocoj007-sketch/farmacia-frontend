import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CategoriaProducto } from '../models/producto.models';

@Injectable({ providedIn: 'root' })
export class CategoriasProductoService {
  private readonly http = inject(HttpClient);

  findAll(): Observable<CategoriaProducto[]> {
    return this.http.get<CategoriaProducto[]>(`${environment.apiUrl}/categorias-producto`);
  }
}
