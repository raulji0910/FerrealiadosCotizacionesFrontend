import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Producto, ProductoActualizar, ProductoCrear } from '../models/producto.model';
import { IvaActualizado, PrecioActualizado, PrecioProveedor, RegistrarPrecio } from '../models/precio.model';
import { PaginaResultado } from '../models/pagina.model';

@Injectable({ providedIn: 'root' })
export class ProductoService {
  private readonly baseUrl = `${environment.apiUrl}/productos`;

  constructor(private readonly http: HttpClient) {}

  buscar(texto: string | undefined, pagina: number, tamanoPagina: number): Observable<PaginaResultado<Producto>> {
    const params: Record<string, string> = { pagina: String(pagina), tamanoPagina: String(tamanoPagina) };
    if (texto) params['buscar'] = texto;
    return this.http.get<PaginaResultado<Producto>>(this.baseUrl, { params });
  }

  obtenerPorId(id: number): Observable<Producto> {
    return this.http.get<Producto>(`${this.baseUrl}/${id}`);
  }

  crear(dto: ProductoCrear): Observable<Producto> {
    return this.http.post<Producto>(this.baseUrl, dto);
  }

  actualizar(id: number, dto: ProductoActualizar): Observable<Producto> {
    return this.http.put<Producto>(`${this.baseUrl}/${id}`, dto);
  }

  obtenerPrecios(id: number): Observable<PrecioProveedor[]> {
    return this.http.get<PrecioProveedor[]>(`${this.baseUrl}/${id}/precios`);
  }

  registrarPrecio(id: number, dto: RegistrarPrecio): Observable<PrecioProveedor> {
    return this.http.post<PrecioProveedor>(`${this.baseUrl}/${id}/precios`, dto);
  }

  actualizarPorcentajePrecio(productoId: number, precioId: number, porcentajeAjuste: number): Observable<PrecioActualizado> {
    return this.http.put<PrecioActualizado>(`${this.baseUrl}/${productoId}/precios/${precioId}`, { porcentajeAjuste });
  }

  actualizarIvaPrecio(productoId: number, precioId: number, iva: number | null): Observable<IvaActualizado> {
    return this.http.put<IvaActualizado>(`${this.baseUrl}/${productoId}/precios/${precioId}/iva`, { iva });
  }
}
