import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { UnidadMedida } from '../models/producto.models';

@Injectable({ providedIn: 'root' })
export class UnidadesMedidaService {
  private readonly http = inject(HttpClient);

  findAll(): Observable<UnidadMedida[]> {
    return this.http.get<UnidadMedida[]>(`${environment.apiUrl}/unidades-medida`);
  }
}
