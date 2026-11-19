import { Component, ElementRef, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable } from 'rxjs';
import { CarteraService } from '../../core/services/cartera.service';
import { ClienteCarteraDetalle, CorreoCartera } from '../../core/models/cartera.model';
import { ConfirmacionDialogComponent, ConfirmacionDialogData } from '../../core/dialogs/confirmacion-dialog.component';

export interface CarteraClienteDialogData {
  nit: string;
  // 'correo' abre directo en la pestaña donde se escriben los correos de cobro.
  pestana?: 'documentos' | 'correo';
}

interface CorreoReferencia {
  origen: string;
  correo: string;
}

const PESTANA_CORREO = 1;

// Estado de cuenta de un cliente: documentos pendientes, correos de cobro (editables), vista previa
// exacta del correo y su historial de envíos. Cierra con true si algo cambió.
// Se cierra solo por cerrar(): así nunca se pierde en silencio un correo escrito y sin guardar.
@Component({
  selector: 'app-cartera-cliente-dialog',
  standalone: true,
  imports: [
    CurrencyPipe,
    DatePipe,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressBarModule,
    MatTooltipModule
  ],
  templateUrl: './cartera-cliente-dialog.component.html',
  styleUrl: './cartera-cliente-dialog.component.scss'
})
export class CarteraClienteDialogComponent implements OnInit {
  private readonly carteraService = inject(CarteraService);
  private readonly dialogRef = inject(MatDialogRef<CarteraClienteDialogComponent, boolean>);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly sanitizer = inject(DomSanitizer);
  readonly data = inject<CarteraClienteDialogData>(MAT_DIALOG_DATA);

  private readonly campoCorreo = viewChild<ElementRef<HTMLInputElement>>('campoCorreo');

  readonly detalle = signal<ClienteCarteraDetalle | null>(null);
  readonly correo = signal<CorreoCartera | null>(null);
  readonly htmlCorreo = signal<SafeHtml | null>(null);
  readonly cargando = signal(true);
  readonly guardando = signal(false);
  readonly enviando = signal(false);
  readonly pestana = signal(this.data.pestana === 'correo' ? PESTANA_CORREO : 0);

  // Campos del formulario (signals para saber al instante si hay cambios sin guardar).
  readonly correo1 = signal('');
  readonly correo2 = signal('');
  readonly contacto = signal('');
  readonly telefono = signal('');
  private readonly guardado = signal({ correo1: '', correo2: '', contacto: '', telefono: '' });

  readonly hayCambios = computed(() => {
    const g = this.guardado();
    return (
      this.correo1().trim() !== g.correo1 ||
      this.correo2().trim() !== g.correo2 ||
      this.contacto().trim() !== g.contacto ||
      this.telefono().trim() !== g.telefono
    );
  });

  // Correos que el cliente ya tiene en otras partes (WO y módulo Clientes) para pasarlos con un clic.
  readonly referencias = computed<CorreoReferencia[]>(() => {
    const d = this.detalle();
    if (!d) return [];
    const lista: CorreoReferencia[] = [];
    for (const c of separarCorreos(d.correoModuloClientes)) lista.push({ origen: 'Módulo Clientes', correo: c });
    for (const c of separarCorreos(d.correosWorldOffice)) {
      if (!lista.some((r) => mismo(r.correo, c))) lista.push({ origen: 'World Office', correo: c });
    }
    return lista;
  });

  // Barra de edades: solo los tramos con saldo, en proporción al total.
  readonly segmentos = computed(() => {
    const e = this.detalle()?.edades;
    if (!e) return [];
    const tramos = [
      { titulo: 'Por vencer', valor: e.porVencer, clase: 'al-dia' },
      { titulo: '1-30 días', valor: e.de1A30, clase: 'd30' },
      { titulo: '31-60 días', valor: e.de31A60, clase: 'd60' },
      { titulo: '61-90 días', valor: e.de61A90, clase: 'd90' },
      { titulo: 'Más de 90', valor: e.masDe90, clase: 'mas90' }
    ].filter((t) => t.valor > 0);
    const suma = tramos.reduce((s, t) => s + t.valor, 0);
    return tramos.map((t) => ({ ...t, porcentaje: suma > 0 ? (t.valor / suma) * 100 : 0 }));
  });

  readonly porcentajeVencido = computed(() => {
    const e = this.detalle()?.edades;
    return e && e.total > 0 ? Math.round((e.vencido / e.total) * 100) : 0;
  });

  readonly moraMaxima = computed(() =>
    Math.max(0, ...(this.detalle()?.documentos ?? []).filter((d) => d.saldo > 0).map((d) => d.diasVencido))
  );

  // Si hay un correo escrito sin guardar, "Enviar" lo guarda primero: no se bloquea por un
  // "sin correo de cobro" que ya no es cierto.
  readonly puedeEnviar = computed(() => {
    if (this.enviando() || this.guardando()) return false;
    if (this.hayCambios()) return !!this.correo1().trim() || !!this.correo2().trim();
    const c = this.correo();
    return !!c && !c.noSePuedeEnviar;
  });

  private huboCambios = false;

  constructor() {
    // El cierre (X, Esc, clic afuera) pasa siempre por cerrar() para avisar si hay algo sin guardar.
    this.dialogRef.disableClose = true;
    this.dialogRef.backdropClick().subscribe(() => this.cerrar());
    this.dialogRef.keydownEvents().subscribe((e) => {
      if (e.key === 'Escape') this.cerrar();
    });
  }

  ngOnInit(): void {
    this.cargarDetalle();
    this.cargarCorreo();
  }

  cargarDetalle(): void {
    this.carteraService.obtenerCliente(this.data.nit).subscribe({
      next: (d) => {
        this.aplicarDetalle(d);
        this.cargando.set(false);
        if (this.pestana() === PESTANA_CORREO) this.enfocarCorreo();
      },
      error: () => {
        this.cargando.set(false);
        this.snackBar.open('No se pudo cargar el cliente.', 'Cerrar', { duration: 4000 });
      }
    });
  }

  // El HTML lo arma la API (con los datos del cliente ya escapados) y se muestra en un iframe
  // aislado (sandbox, sin scripts), tal cual le llega al cliente.
  cargarCorreo(): void {
    this.carteraService.vistaPrevia(this.data.nit).subscribe({
      next: (c) => {
        this.correo.set(c);
        this.htmlCorreo.set(this.sanitizer.bypassSecurityTrustHtml(c.html));
      }
    });
  }

  irACorreo(): void {
    this.pestana.set(PESTANA_CORREO);
    this.enfocarCorreo();
  }

  claseDias(dias: number, saldo: number): string {
    if (saldo <= 0 || dias <= 0) return 'al-dia';
    if (dias > 90) return 'mas90';
    if (dias > 60) return 'd90';
    if (dias > 30) return 'd60';
    return 'd30';
  }

  yaEsta(correo: string): boolean {
    return mismo(this.correo1(), correo) || mismo(this.correo2(), correo);
  }

  // Lo pone en el primer campo vacío.
  usar(correo: string): void {
    if (this.yaEsta(correo)) return;
    if (!this.correo1().trim()) this.correo1.set(correo);
    else if (!this.correo2().trim()) this.correo2.set(correo);
  }

  guardarContacto(): void {
    this.guardar$().subscribe((ok) => {
      if (ok) this.snackBar.open('Correo de cobro guardado', 'Cerrar', { duration: 3000 });
    });
  }

  enviar(): void {
    if (!this.puedeEnviar()) return;
    if (!this.hayCambios()) {
      this.confirmarEnvio();
      return;
    }
    // Primero se guarda lo escrito; la vista previa (destinatarios, motivo) se recalcula con eso.
    this.guardar$().subscribe((ok) => {
      if (!ok) return;
      this.carteraService.vistaPrevia(this.data.nit).subscribe((c) => {
        this.correo.set(c);
        this.htmlCorreo.set(this.sanitizer.bypassSecurityTrustHtml(c.html));
        if (c.noSePuedeEnviar) {
          this.snackBar.open(`Correo guardado, pero no se puede enviar: ${c.noSePuedeEnviar}`, 'Cerrar', { duration: 8000 });
          return;
        }
        this.confirmarEnvio();
      });
    });
  }

  cerrar(): void {
    if (this.guardando() || this.enviando()) return;
    if (!this.hayCambios()) {
      this.dialogRef.close(this.huboCambios);
      return;
    }
    const data: ConfirmacionDialogData = {
      titulo: 'Cambios sin guardar',
      mensaje: 'Escribiste datos de cobro de este cliente que no se han guardado. ¿Quieres guardarlos antes de cerrar?',
      textoConfirmar: 'Guardar y cerrar',
      textoCancelar: 'Cerrar sin guardar',
      colorConfirmar: 'primary'
    };
    this.dialog
      .open(ConfirmacionDialogComponent, { width: '28rem', data })
      .afterClosed()
      .subscribe((respuesta) => {
        // undefined = cerró el aviso con clic afuera o Esc: sigue editando.
        if (respuesta === true) {
          this.guardar$().subscribe((ok) => {
            if (ok) this.dialogRef.close(true);
          });
        } else if (respuesta === false) {
          this.dialogRef.close(this.huboCambios);
        }
      });
  }

  private confirmarEnvio(): void {
    const c = this.correo();
    if (!c || c.noSePuedeEnviar) return;

    const data: ConfirmacionDialogData = {
      titulo: 'Enviar estado de cuenta',
      mensaje: `Se enviará el estado de cuenta de ${c.nombreCliente} a ${c.para.join(', ')}` +
        (c.copias.length ? `, con copia a ${c.copias.join(', ')}` : '') + '.',
      textoConfirmar: 'Enviar',
      colorConfirmar: 'primary'
    };
    this.dialog
      .open(ConfirmacionDialogComponent, { width: '30rem', data })
      .afterClosed()
      .subscribe((ok) => {
        if (!ok) return;
        this.enviando.set(true);
        this.carteraService.enviar(this.data.nit).subscribe({
          next: (r) => {
            this.enviando.set(false);
            this.huboCambios = true;
            this.cargarDetalle();
            this.snackBar.open(r.enviado ? 'Estado de cuenta enviado' : `No se envió: ${r.motivo}`, 'Cerrar', { duration: r.enviado ? 4000 : 8000 });
          },
          error: (e: HttpErrorResponse) => {
            this.enviando.set(false);
            this.snackBar.open(typeof e.error === 'string' && e.error ? e.error : 'No se pudo enviar el correo.', 'Cerrar', { duration: 8000 });
          }
        });
      });
  }

  // Guarda y emite true si quedó guardado (los errores se muestran aquí mismo).
  private guardar$(): Observable<boolean> {
    const c1 = this.correo1().trim();
    const c2 = this.correo2().trim();
    const correos = [c1, c2].filter((c) => c).filter((c, i, todos) => todos.findIndex((x) => mismo(x, c)) === i);
    this.guardando.set(true);
    return new Observable<boolean>((suscriptor) => {
      this.carteraService
        .actualizarContacto(this.data.nit, {
          correosCobro: correos.length ? correos.join('; ') : null,
          contacto: this.contacto().trim() || null,
          telefono: this.telefono().trim() || null
        })
        .subscribe({
          next: (d) => {
            this.aplicarDetalle(d);
            this.guardando.set(false);
            this.huboCambios = true;
            this.cargarCorreo();
            suscriptor.next(true);
            suscriptor.complete();
          },
          error: (e: HttpErrorResponse) => {
            this.guardando.set(false);
            this.irACorreo();
            this.snackBar.open(typeof e.error === 'string' && e.error ? e.error : 'No se pudo guardar el correo de cobro.', 'Cerrar', {
              duration: 8000
            });
            suscriptor.next(false);
            suscriptor.complete();
          }
        });
    });
  }

  private aplicarDetalle(d: ClienteCarteraDetalle): void {
    this.detalle.set(d);
    const [c1 = '', c2 = ''] = separarCorreos(d.correosCobro);
    const valores = { correo1: c1, correo2: c2, contacto: d.contacto ?? '', telefono: d.telefono ?? '' };
    this.correo1.set(valores.correo1);
    this.correo2.set(valores.correo2);
    this.contacto.set(valores.contacto);
    this.telefono.set(valores.telefono);
    this.guardado.set(valores);
  }

  private enfocarCorreo(): void {
    // Espera a que la pestaña se pinte.
    setTimeout(() => this.campoCorreo()?.nativeElement.focus(), 150);
  }
}

function separarCorreos(texto: string | null | undefined): string[] {
  return (texto ?? '')
    .split(/[;,\s]+/)
    .map((c) => c.trim())
    .filter((c) => c.includes('@'));
}

function mismo(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}
