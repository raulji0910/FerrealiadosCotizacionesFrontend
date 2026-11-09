import { Injectable } from '@angular/core';
import { HttpClient, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CargaArchivosResultado, Conciliacion, DetalleFacturaConciliada } from '../models/conciliacion.model';

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

  // ZIP/XML descargados de la DIAN, varios en una sola petición. Con eventos para mostrar el avance
  // de la subida.
  cargarArchivos(archivos: File[]): Observable<HttpEvent<CargaArchivosResultado>> {
    const datos = new FormData();
    for (const archivo of archivos) datos.append('archivos', archivo, archivo.name);
    return this.http.post<CargaArchivosResultado>(`${this.baseUrl}/cargar-archivos`, datos, {
      reportProgress: true,
      observe: 'events'
    });
  }
}
