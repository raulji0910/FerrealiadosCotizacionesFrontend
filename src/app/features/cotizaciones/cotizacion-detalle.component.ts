import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CotizacionService } from '../../core/services/cotizacion.service';
import { CotizacionDetalle, CotizacionItem } from '../../core/models/cotizacion.model';
import { EmitirCotizacionDialogComponent } from './emitir-cotizacion-dialog.component';
import { ConfirmacionDialogComponent } from '../../core/dialogs/confirmacion-dialog.component';

@Component({
  selector: 'app-cotizacion-detalle',
  standalone: true,
  imports: [FormsModule, CurrencyPipe, DatePipe, MatTableModule, MatButtonModule, MatIconModule, MatChipsModule, MatProgressBarModule],
  templateUrl: './cotizacion-detalle.component.html',
  styleUrl: './cotizacion-detalle.component.scss'
})
export class CotizacionDetalleComponent implements OnInit {
  readonly cotizacion = signal<CotizacionDetalle | null>(null);
  readonly cargando = signal(false);
  readonly descargandoPdf = signal(false);

  private cotizacionId!: number;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly cotizacionService: CotizacionService,
    private readonly dialog: MatDialog,
    private readonly snackBar: MatSnackBar
  ) {}

  readonly ivasDisponibles = [19, 5, 0];

  get columnas(): string[] {
    const esBorrador = this.cotizacion()?.estado === 'Borrador';
    return esBorrador
      ? ['producto', 'proveedor', 'cantidad', 'precioUnitario', 'iva', 'subtotal', 'quitar']
      : ['producto', 'proveedor', 'cantidad', 'precioUnitario', 'iva', 'subtotal'];
  }

  ngOnInit(): void {
    this.cotizacionId = Number(this.route.snapshot.paramMap.get('id'));
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.cotizacionService.obtenerPorId(this.cotizacionId).subscribe({
      next: (cotizacion) => {
        this.cotizacion.set(cotizacion);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false)
    });
  }

  volver(): void {
    this.router.navigate(['/cotizaciones']);
  }

  onCambioCantidadLocal(item: CotizacionItem, valor: number): void {
    item.cantidad = valor;
    item.subtotal = item.precioUnitario * valor;
  }

  guardarCantidad(item: CotizacionItem): void {
    const valor = Math.max(1, Math.round(item.cantidad));
    item.cantidad = valor;

    this.cotizacionService.actualizarCantidad(item.id, { cantidad: valor }).subscribe({
      // La cantidad cambia la base gravable de la tarifa de IVA de este ítem, así que el
      // desglose completo (y el total con descuento prorrateado) puede quedar desactualizado con
      // un simple parche local — se recarga todo del servidor para que quede siempre consistente.
      next: () => this.cargar(),
      error: (error) => {
        const mensaje = error?.error?.mensaje ?? 'No se pudo actualizar la cantidad.';
        this.snackBar.open(mensaje, 'Cerrar', { duration: 4000 });
      }
    });
  }

  onCambioPrecioLocal(item: CotizacionItem, valor: number): void {
    item.precioUnitario = valor;
    item.subtotal = valor * item.cantidad;
  }

  guardarPrecio(item: CotizacionItem): void {
    const valor = Math.max(0, item.precioUnitario);
    item.precioUnitario = valor;

    this.cotizacionService.actualizarPrecio(item.id, { precioUnitario: valor }).subscribe({
      next: () => this.cargar(), // ver comentario en guardarCantidad
      error: (error) => {
        const mensaje = error?.error?.mensaje ?? 'No se pudo actualizar el precio.';
        this.snackBar.open(mensaje, 'Cerrar', { duration: 4000 });
      }
    });
  }

  guardarIva(item: CotizacionItem, valor: number | null): void {
    item.ivaSnapshot = valor;

    this.cotizacionService.actualizarIva(item.id, { iva: valor }).subscribe({
      next: () => this.cargar(), // ver comentario en guardarCantidad
      error: (error) => {
        const mensaje = error?.error?.mensaje ?? 'No se pudo actualizar el IVA.';
        this.snackBar.open(mensaje, 'Cerrar', { duration: 4000 });
      }
    });
  }

  quitarItem(item: CotizacionItem): void {
    this.cotizacionService.quitarItem(item.id).subscribe({
      next: () => {
        const cotizacion = this.cotizacion();
        if (!cotizacion) return;

        const quedan = cotizacion.items.length - 1;
        if (quedan === 0) {
          // El borrador se borró en el servidor al quedar sin ítems (ver CotizacionService).
          this.snackBar.open('Cotización eliminada: no quedaban ítems', 'Cerrar', { duration: 4000 });
          this.volver();
          return;
        }

        this.cargar(); // ver comentario en guardarCantidad
      },
      error: (error) => {
        const mensaje = error?.error?.mensaje ?? 'No se pudo quitar el ítem.';
        this.snackBar.open(mensaje, 'Cerrar', { duration: 4000 });
      }
    });
  }

  abrirDialogoEmitir(): void {
    const dialogRef = this.dialog.open(EmitirCotizacionDialogComponent, {
      width: '28rem',
      autoFocus: 'dialog'
    });

    dialogRef.afterOpened().subscribe(() => window.dispatchEvent(new Event('resize')));

    dialogRef.afterClosed().subscribe((resultado) => {
      if (!resultado) return;

      this.cotizacionService.emitir(this.cotizacionId, resultado).subscribe({
        next: (emitida) => {
          this.cotizacion.set(emitida);
          this.snackBar.open(`Cotización N.° ${emitida.consecutivo} emitida`, 'Cerrar', { duration: 4000 });
        },
        error: (error) => {
          const mensaje = error?.error?.mensaje ?? 'No se pudo cargar la cotización al cliente.';
          this.snackBar.open(mensaje, 'Cerrar', { duration: 4000 });
        }
      });
    });
  }

  abrirDialogoReabrir(): void {
    const cotizacion = this.cotizacion();
    if (!cotizacion) return;

    const dialogRef = this.dialog.open(ConfirmacionDialogComponent, {
      width: '26rem',
      data: {
        titulo: 'Reabrir cotización',
        mensaje: `¿Seguro que quieres volver la cotización ${cotizacion.consecutivoFormateado} a borrador para seguir agregándole productos? Al volver a cargarla a un cliente conservará el mismo número.`,
        textoConfirmar: 'Sí, reabrir',
        colorConfirmar: 'primary'
      }
    });

    dialogRef.afterClosed().subscribe((confirmado) => {
      if (!confirmado) return;

      this.cotizacionService.reabrir(this.cotizacionId).subscribe({
        next: (reabierta) => {
          this.cotizacion.set(reabierta);
          this.snackBar.open('Cotización reabierta como borrador', 'Cerrar', { duration: 4000 });
        },
        error: (error) => {
          const mensaje = error?.error?.mensaje ?? 'No se pudo reabrir la cotización.';
          this.snackBar.open(mensaje, 'Cerrar', { duration: 4000 });
        }
      });
    });
  }

  descargarPdf(): void {
    const cotizacion = this.cotizacion();
    if (!cotizacion) return;

    this.descargandoPdf.set(true);
    this.cotizacionService.descargarPdf(this.cotizacionId).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const enlace = document.createElement('a');
        enlace.href = url;
        enlace.download = `cotizacion-${cotizacion.consecutivo}.pdf`;
        enlace.click();
        URL.revokeObjectURL(url);
        this.descargandoPdf.set(false);
      },
      error: () => {
        this.snackBar.open('No se pudo generar el PDF.', 'Cerrar', { duration: 4000 });
        this.descargandoPdf.set(false);
      }
    });
  }
}
