import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Proveedor, ProveedorActualizar, ProveedorCrear } from '../models/proveedor.model';
import { PaginaResultado } from '../models/pagina.model';

@Injectable({ providedIn: 'root' })
export class ProveedorService {
  private readonly baseUrl = `${environment.apiUrl}/proveedores`;

  constructor(private readonly http: HttpClient) {}

  buscar(texto: string | undefined, pagina: number, tamanoPagina: number): Observable<PaginaResultado<Proveedor>> {
    const params: Record<string, string> = { pagina: String(pagina), tamanoPagina: String(tamanoPagina) };
    if (texto) params['buscar'] = texto;
    return this.http.get<PaginaResultado<Proveedor>>(this.baseUrl, { params });
  }

  // Sin paginar: para poblar el select de proveedores al registrar un precio.
  listarActivos(): Observable<Proveedor[]> {
    return this.http.get<Proveedor[]>(`${this.baseUrl}/activos`);
  }

  obtenerPorId(id: number): Observable<Proveedor> {
    return this.http.get<Proveedor>(`${this.baseUrl}/${id}`);
  }

  crear(dto: ProveedorCrear): Observable<Proveedor> {
    return this.http.post<Proveedor>(this.baseUrl, dto);
  }

  actualizar(id: number, dto: ProveedorActualizar): Observable<Proveedor> {
    return this.http.put<Proveedor>(`${this.baseUrl}/${id}`, dto);
  }
}
