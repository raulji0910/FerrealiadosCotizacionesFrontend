import { Component, computed, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { CarteraService } from '../../core/services/cartera.service';
import { ClienteCarteraResumen } from '../../core/models/cartera.model';

export interface EnvioMasivoDialogData {
  clientes: ClienteCarteraResumen[];
  saldoMinimo: number;
  descripcion: string;
}

interface Resultado {
  nombre: string;
  enviado: boolean;
  motivo: string | null;
}

type Paso = 'confirmar' | 'enviando' | 'fin';

// Pausa entre correo y correo para que el servidor de correo no tome el envío como spam.
const PAUSA_MS = 3000;

// Envío del estado de cuenta a varios clientes: uno por petición, en orden, con pausa entre cada
// uno, mostrando el avance. Se puede detener a mitad. Cierra con true si se envió alguno.
@Component({
  selector: 'app-envio-masivo-dialog',
  standalone: true,
  imports: [CurrencyPipe, MatDialogModule, MatButtonModule, MatIconModule, MatProgressBarModule],
  templateUrl: './envio-masivo-dialog.component.html',
  styleUrl: './envio-masivo-dialog.component.scss'
})
export class EnvioMasivoDialogComponent {
  private readonly carteraService = inject(CarteraService);
  private readonly dialogRef = inject(MatDialogRef<EnvioMasivoDialogComponent, boolean>);
  readonly data = inject<EnvioMasivoDialogData>(MAT_DIALOG_DATA);

  // Se separan antes de empezar: a quiénes sí y a quiénes no (y por qué).
  readonly aEnviar = this.data.clientes.filter((c) => !!c.correosCobro && c.edades.total >= this.data.saldoMinimo && c.edades.total > 0);
  readonly sinCorreo = this.data.clientes.filter((c) => !c.correosCobro);
  readonly bajoMinimo = this.data.clientes.filter((c) => !!c.correosCobro && (c.edades.total < this.data.saldoMinimo || c.edades.total <= 0));
  readonly nombresSinCorreo = this.sinCorreo.map((c) => c.nombre).join(', ');
  readonly totalAEnviar = this.aEnviar.reduce((t, c) => t + c.edades.total, 0);
  readonly minutosAprox = Math.max(1, Math.ceil((this.aEnviar.length * (PAUSA_MS + 2000)) / 60000));

  readonly paso = signal<Paso>('confirmar');
  readonly actual = signal<string | null>(null);
  readonly resultados = signal<Resultado[]>([]);
  readonly detenido = signal(false);
  private detener = false;

  readonly avance = computed(() => (this.aEnviar.length ? Math.round((this.resultados().length / this.aEnviar.length) * 100) : 0));
  readonly enviados = computed(() => this.resultados().filter((r) => r.enviado).length);
  readonly fallidos = computed(() => this.resultados().filter((r) => !r.enviado));

  async iniciar(): Promise<void> {
    this.paso.set('enviando');
    for (let i = 0; i < this.aEnviar.length; i++) {
      if (this.detener) break;
      const cliente = this.aEnviar[i];
      this.actual.set(cliente.nombre);
      let resultado: Resultado;
      try {
        const r = await firstValueFrom(this.carteraService.enviar(cliente.nit));
        resultado = { nombre: cliente.nombre, enviado: r.enviado, motivo: r.motivo };
      } catch (e) {
        const error = e as HttpErrorResponse;
        const motivo = typeof error.error === 'string' && error.error ? error.error : 'Error de conexión con el servidor.';
        resultado = { nombre: cliente.nombre, enviado: false, motivo };
        // Si el servidor de correo no está configurado, no tiene sentido seguir.
        if (error.status === 409) this.detener = true;
      }
      this.resultados.update((lista) => [...lista, resultado]);
      if (i < this.aEnviar.length - 1 && !this.detener) await this.esperar(PAUSA_MS);
    }
    this.detenido.set(this.detener && this.resultados().length < this.aEnviar.length);
    this.actual.set(null);
    this.paso.set('fin');
  }

  pedirDetener(): void {
    this.detener = true;
  }

  cerrar(): void {
    this.dialogRef.close(this.resultados().length > 0);
  }

  private esperar(ms: number): Promise<void> {
    return new Promise((resolver) => setTimeout(resolver, ms));
  }
}
