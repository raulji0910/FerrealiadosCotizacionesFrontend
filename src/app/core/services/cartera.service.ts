import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Cartera,
  ClienteCarteraDetalle,
  ConfiguracionCartera,
  ContactoCobro,
  CorreoCartera,
  EnvioCartera,
  PruebaCorreo,
  RemisionSinFactura,
  ResultadoEnvioCartera
} from '../models/cartera.model';

@Injectable({ providedIn: 'root' })
export class CarteraService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/cartera`;

  obtener(): Observable<Cartera> {
    return this.http.get<Cartera>(this.baseUrl);
  }

  obtenerCliente(nit: string): Observable<ClienteCarteraDetalle> {
    return this.http.get<ClienteCarteraDetalle>(`${this.baseUrl}/clientes/${encodeURIComponent(nit)}`);
  }

  vistaPrevia(nit: string): Observable<CorreoCartera> {
    return this.http.get<CorreoCartera>(`${this.baseUrl}/clientes/${encodeURIComponent(nit)}/correo`);
  }

  // Un cliente por petición; el envío masivo los recorre uno a uno desde la pantalla.
  enviar(nit: string): Observable<ResultadoEnvioCartera> {
    return this.http.post<ResultadoEnvioCartera>(`${this.baseUrl}/clientes/${encodeURIComponent(nit)}/enviar`, {});
  }

  actualizarContacto(nit: string, contacto: ContactoCobro): Observable<ClienteCarteraDetalle> {
    return this.http.put<ClienteCarteraDetalle>(`${this.baseUrl}/clientes/${encodeURIComponent(nit)}/contacto`, contacto);
  }

  remisiones(): Observable<RemisionSinFactura[]> {
    return this.http.get<RemisionSinFactura[]>(`${this.baseUrl}/remisiones`);
  }

  envios(): Observable<EnvioCartera[]> {
    return this.http.get<EnvioCartera[]>(`${this.baseUrl}/envios`);
  }

  obtenerConfiguracion(): Observable<ConfiguracionCartera> {
    return this.http.get<ConfiguracionCartera>(`${this.baseUrl}/configuracion`);
  }

  actualizarConfiguracion(dto: ConfiguracionCartera): Observable<ConfiguracionCartera> {
    return this.http.put<ConfiguracionCartera>(`${this.baseUrl}/configuracion`, dto);
  }

  // El servidor comprueba la clave con el servidor de correo antes de guardarla (cifrada).
  guardarClaveCorreo(clave: string): Observable<ConfiguracionCartera> {
    return this.http.put<ConfiguracionCartera>(`${this.baseUrl}/configuracion/clave-correo`, { clave });
  }

  probarCorreo(): Observable<PruebaCorreo> {
    return this.http.post<PruebaCorreo>(`${this.baseUrl}/configuracion/probar-correo`, {});
  }
}
