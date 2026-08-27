import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Cliente, ClienteActualizar, ClienteCrear } from '../models/cliente.model';
import { PaginaResultado } from '../models/pagina.model';

@Injectable({ providedIn: 'root' })
export class ClienteService {
  private readonly baseUrl = `${environment.apiUrl}/clientes`;

  constructor(private readonly http: HttpClient) {}

  buscar(texto: string | undefined, pagina: number, tamanoPagina: number): Observable<PaginaResultado<Cliente>> {
    const params: Record<string, string> = { pagina: String(pagina), tamanoPagina: String(tamanoPagina) };
    if (texto) params['buscar'] = texto;
    return this.http.get<PaginaResultado<Cliente>>(this.baseUrl, { params });
  }

  // Sin paginar: para poblar el select de clientes al cargar una cotización.
  listarActivos(): Observable<Cliente[]> {
    return this.http.get<Cliente[]>(`${this.baseUrl}/activos`);
  }

  obtenerPorId(id: number): Observable<Cliente> {
    return this.http.get<Cliente>(`${this.baseUrl}/${id}`);
  }

  crear(dto: ClienteCrear): Observable<Cliente> {
    return this.http.post<Cliente>(this.baseUrl, dto);
  }

  actualizar(id: number, dto: ClienteActualizar): Observable<Cliente> {
    return this.http.put<Cliente>(`${this.baseUrl}/${id}`, dto);
  }
}
