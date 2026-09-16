import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Laboratorio } from '../models/producto.models';

@Injectable({ providedIn: 'root' })
export class LaboratoriosService {
  private readonly http = inject(HttpClient);

  findAll(): Observable<Laboratorio[]> {
    return this.http.get<Laboratorio[]>(`${environment.apiUrl}/laboratorios`);
  }
}
