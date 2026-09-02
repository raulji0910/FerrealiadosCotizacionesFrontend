import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PaginaResultado } from '../models/pagina.model';
import {
  ActualizarCantidadItem,
  ActualizarIvaItem,
  ActualizarPrecioItem,
  CotizacionDetalle,
  CotizacionItem,
  CotizacionResumen,
  EmitirCotizacion,
  EstadoCotizacion,
  MarcarPrecio
} from '../models/cotizacion.model';

@Injectable({ providedIn: 'root' })
export class CotizacionService {
  private readonly baseUrl = `${environment.apiUrl}/cotizaciones`;

  constructor(private readonly http: HttpClient) {}

  buscar(
    estado: EstadoCotizacion | undefined,
    texto: string | undefined,
    pagina: number,
    tamanoPagina: number
  ): Observable<PaginaResultado<CotizacionResumen>> {
    const params: Record<string, string> = { pagina: String(pagina), tamanoPagina: String(tamanoPagina) };
    if (estado) params['estado'] = estado;
    if (texto) params['texto'] = texto;
    return this.http.get<PaginaResultado<CotizacionResumen>>(this.baseUrl, { params });
  }

  obtenerPorId(id: number): Observable<CotizacionDetalle> {
    return this.http.get<CotizacionDetalle>(`${this.baseUrl}/${id}`);
  }

  obtenerBorradorPorCodigo(codigo: string): Observable<CotizacionDetalle> {
    return this.http.get<CotizacionDetalle>(`${this.baseUrl}/borrador/${encodeURIComponent(codigo)}`);
  }

  marcarPrecio(dto: MarcarPrecio): Observable<CotizacionItem> {
    return this.http.post<CotizacionItem>(`${this.baseUrl}/marcas`, dto);
  }

  quitarItem(itemId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/items/${itemId}`);
  }

  actualizarCantidad(itemId: number, dto: ActualizarCantidadItem): Observable<CotizacionItem> {
    return this.http.put<CotizacionItem>(`${this.baseUrl}/items/${itemId}`, dto);
  }

  actualizarPrecio(itemId: number, dto: ActualizarPrecioItem): Observable<CotizacionItem> {
    return this.http.put<CotizacionItem>(`${this.baseUrl}/items/${itemId}/precio`, dto);
  }

  actualizarIva(itemId: number, dto: ActualizarIvaItem): Observable<CotizacionItem> {
    return this.http.put<CotizacionItem>(`${this.baseUrl}/items/${itemId}/iva`, dto);
  }

  emitir(id: number, dto: EmitirCotizacion): Observable<CotizacionDetalle> {
    return this.http.post<CotizacionDetalle>(`${this.baseUrl}/${id}/emitir`, dto);
  }

  reabrir(id: number): Observable<CotizacionDetalle> {
    return this.http.post<CotizacionDetalle>(`${this.baseUrl}/${id}/reabrir`, {});
  }

  // La API exige [Authorize]; un <a href> plano no pasa por el interceptor que inyecta el Bearer
  // token, así que se pide como blob por HttpClient y el componente arma el object URL de descarga.
  descargarPdf(id: number): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/${id}/pdf`, { responseType: 'blob' });
  }
}
