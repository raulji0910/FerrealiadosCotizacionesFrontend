import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Configuracion } from '../models/configuracion.model';

@Injectable({ providedIn: 'root' })
export class ConfiguracionService {
  private readonly baseUrl = `${environment.apiUrl}/configuracion`;

  constructor(private readonly http: HttpClient) {}

  obtener(): Observable<Configuracion> {
    return this.http.get<Configuracion>(this.baseUrl);
  }

  actualizar(dto: Configuracion): Observable<Configuracion> {
    return this.http.put<Configuracion>(this.baseUrl, dto);
  }
}
