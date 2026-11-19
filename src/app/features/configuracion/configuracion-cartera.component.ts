import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CarteraService } from '../../core/services/cartera.service';
import { ConfiguracionCartera, PruebaCorreo } from '../../core/models/cartera.model';

// Parámetros del envío de estados de cuenta (solo Administrador): remitente, copias visibles,
// saldo mínimo, textos del correo y la clave del buzón remitente. La clave se escribe aquí, el
// servidor la comprueba con el servidor de correo y la guarda cifrada; nunca vuelve al navegador.
@Component({
  selector: 'app-configuracion-cartera',
  standalone: true,
  imports: [FormsModule, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule],
  templateUrl: './configuracion-cartera.component.html',
  styleUrl: './configuracion-cartera.component.scss'
})
export class ConfiguracionCarteraComponent implements OnInit {
  private readonly carteraService = inject(CarteraService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly datePipe = new DatePipe('es-CO');

  readonly config = signal<ConfiguracionCartera | null>(null);
  readonly guardando = signal(false);

  // Remitente tal como está guardado: la clave es de esa cuenta, no de lo que se esté escribiendo.
  readonly remitenteGuardado = signal('');

  clave = '';
  readonly verClave = signal(false);
  readonly editandoClave = signal(false);
  readonly guardandoClave = signal(false);
  readonly errorClave = signal<string | null>(null);
  readonly probando = signal(false);
  readonly prueba = signal<PruebaCorreo | null>(null);

  ngOnInit(): void {
    this.carteraService.obtenerConfiguracion().subscribe((c) => this.aplicar(c));
  }

  guardar(): void {
    const c = this.config();
    if (!c) return;
    this.guardando.set(true);
    this.carteraService.actualizarConfiguracion(c).subscribe({
      next: (nueva) => {
        this.aplicar(nueva);
        this.guardando.set(false);
        this.snackBar.open('Configuración de cartera guardada', 'Cerrar', { duration: 3000 });
      },
      error: (e: HttpErrorResponse) => {
        this.guardando.set(false);
        this.snackBar.open(this.mensaje(e, 'No se pudo guardar.'), 'Cerrar', { duration: 6000 });
      }
    });
  }

  guardarClave(): void {
    if (!this.clave) {
      this.errorClave.set('Escribe la clave del correo.');
      return;
    }
    this.guardandoClave.set(true);
    this.errorClave.set(null);
    this.prueba.set(null);
    this.carteraService.guardarClaveCorreo(this.clave).subscribe({
      next: (nueva) => {
        this.guardandoClave.set(false);
        this.cancelarClave();
        // Solo se refresca lo de la clave: no se pierde lo que se esté editando en el resto del formulario.
        this.config.update((c) => (c ? { ...c, ...this.soloClave(nueva) } : { ...nueva }));
        this.snackBar.open('Clave comprobada y guardada', 'Cerrar', { duration: 4000 });
      },
      error: (e: HttpErrorResponse) => {
        this.guardandoClave.set(false);
        this.errorClave.set(this.mensaje(e, 'No se pudo guardar la clave.'));
      }
    });
  }

  cancelarClave(): void {
    this.clave = '';
    this.verClave.set(false);
    this.editandoClave.set(false);
    this.errorClave.set(null);
  }

  probar(): void {
    this.probando.set(true);
    this.prueba.set(null);
    this.carteraService.probarCorreo().subscribe({
      next: (p) => {
        this.probando.set(false);
        this.prueba.set(p);
      },
      error: (e: HttpErrorResponse) => {
        this.probando.set(false);
        this.prueba.set({ exitosa: false, mensaje: this.mensaje(e, 'No se pudo probar la conexión.') });
      }
    });
  }

  // " el 19/11/2026 12:44 p. m. por admin@…". La API manda la hora en UTC, a veces sin la 'Z'.
  detalleClave(c: ConfiguracionCartera): string {
    let texto = '';
    if (c.claveCorreoActualizada) {
      const utc = /[zZ]|[+-]\d\d:\d\d$/.test(c.claveCorreoActualizada) ? c.claveCorreoActualizada : c.claveCorreoActualizada + 'Z';
      texto += ' el ' + (this.datePipe.transform(utc, 'dd/MM/yyyy h:mm a') ?? '');
    }
    if (c.claveCorreoActualizadaPor) texto += ' por ' + c.claveCorreoActualizadaPor;
    return texto;
  }

  private aplicar(c: ConfiguracionCartera): void {
    this.config.set({ ...c });
    this.remitenteGuardado.set(c.remitente);
  }

  private soloClave(c: ConfiguracionCartera): Partial<ConfiguracionCartera> {
    return {
      servidorCorreoConfigurado: c.servidorCorreoConfigurado,
      origenClaveCorreo: c.origenClaveCorreo,
      claveCorreoActualizada: c.claveCorreoActualizada,
      claveCorreoActualizadaPor: c.claveCorreoActualizadaPor,
      claveCorreoDeOtraCuenta: c.claveCorreoDeOtraCuenta
    };
  }

  private mensaje(e: HttpErrorResponse, porDefecto: string): string {
    return typeof e.error === 'string' && e.error ? e.error : porDefecto;
  }
}
