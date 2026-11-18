import { Component, OnInit, inject, signal } from '@angular/core';
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
import { CarteraService } from '../../core/services/cartera.service';
import { ClienteCarteraDetalle, CorreoCartera } from '../../core/models/cartera.model';
import { ConfirmacionDialogComponent, ConfirmacionDialogData } from '../../core/dialogs/confirmacion-dialog.component';

export interface CarteraClienteDialogData {
  nit: string;
}

// Estado de cuenta de un cliente: documentos pendientes, correos de cobro (editables), vista previa
// exacta del correo y su historial de envíos. Cierra con true si algo cambió.
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

  readonly detalle = signal<ClienteCarteraDetalle | null>(null);
  readonly correo = signal<CorreoCartera | null>(null);
  readonly htmlCorreo = signal<SafeHtml | null>(null);
  readonly cargando = signal(true);
  readonly guardando = signal(false);
  readonly enviando = signal(false);

  correosCobro = '';
  contacto = '';
  telefono = '';
  private huboCambios = false;

  ngOnInit(): void {
    this.cargarDetalle();
    this.cargarCorreo();
  }

  cargarDetalle(): void {
    this.carteraService.obtenerCliente(this.data.nit).subscribe({
      next: (d) => {
        this.detalle.set(d);
        this.correosCobro = d.correosCobro ?? '';
        this.contacto = d.contacto ?? '';
        this.telefono = d.telefono ?? '';
        this.cargando.set(false);
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

  usarCorreosWorldOffice(): void {
    const deWo = this.detalle()?.correosWorldOffice;
    if (!deWo) return;
    this.correosCobro = this.correosCobro.trim() ? `${this.correosCobro.trim()}; ${deWo}` : deWo;
  }

  guardarContacto(): void {
    this.guardando.set(true);
    this.carteraService
      .actualizarContacto(this.data.nit, {
        correosCobro: this.correosCobro.trim() || null,
        contacto: this.contacto.trim() || null,
        telefono: this.telefono.trim() || null
      })
      .subscribe({
        next: (d) => {
          this.detalle.set(d);
          this.correosCobro = d.correosCobro ?? '';
          this.guardando.set(false);
          this.huboCambios = true;
          this.cargarCorreo();
          this.snackBar.open('Contacto de cobro guardado', 'Cerrar', { duration: 3000 });
        },
        error: (e: HttpErrorResponse) => {
          this.guardando.set(false);
          this.snackBar.open(typeof e.error === 'string' && e.error ? e.error : 'No se pudo guardar el contacto.', 'Cerrar', { duration: 6000 });
        }
      });
  }

  enviar(): void {
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

  cerrar(): void {
    this.dialogRef.close(this.huboCambios);
  }
}
