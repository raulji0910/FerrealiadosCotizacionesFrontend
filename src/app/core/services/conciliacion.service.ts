import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Conciliacion, DetalleFacturaConciliada } from '../models/conciliacion.model';

@Injectable({ providedIn: 'root' })
export class ConciliacionService {
  private readonly baseUrl = `${environment.apiUrl}/conciliacion`;

  constructor(private readonly http: HttpClient) {}

  // Fechas como 'yyyy-MM-dd' (DateOnly del backend).
  conciliar(desde: string, hasta: string): Observable<Conciliacion> {
    return this.http.get<Conciliacion>(this.baseUrl, { params: { desde, hasta } });
  }

  obtenerDetalle(facturaId: number): Observable<DetalleFacturaConciliada> {
    return this.http.get<DetalleFacturaConciliada>(`${this.baseUrl}/facturas/${facturaId}`);
  }
}
