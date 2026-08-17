import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AlertaPrecio } from '../models/precio.model';
import { PaginaResultado } from '../models/pagina.model';

@Injectable({ providedIn: 'root' })
export class AlertaService {
  private readonly baseUrl = `${environment.apiUrl}/alertas`;

  constructor(private readonly http: HttpClient) {}

  obtenerPreciosVencidos(pagina: number, tamanoPagina: number): Observable<PaginaResultado<AlertaPrecio>> {
    const params = { pagina: String(pagina), tamanoPagina: String(tamanoPagina) };
    return this.http.get<PaginaResultado<AlertaPrecio>>(`${this.baseUrl}/precios-vencidos`, { params });
  }
}
