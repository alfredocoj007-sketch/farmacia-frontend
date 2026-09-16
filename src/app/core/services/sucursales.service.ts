import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Sucursal } from '../models/lote.models';

@Injectable({ providedIn: 'root' })
export class SucursalesService {
  private readonly http = inject(HttpClient);

  findAll(): Observable<Sucursal[]> {
    return this.http.get<Sucursal[]>(`${environment.apiUrl}/sucursales`);
  }
}
