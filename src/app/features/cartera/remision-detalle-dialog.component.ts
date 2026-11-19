import { Component, inject } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RemisionSinFactura } from '../../core/models/cartera.model';

// Detalle de una remisión pendiente: qué facturas (y recibos de caja) le han abonado y con cuánto.
@Component({
  selector: 'app-remision-detalle-dialog',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './remision-detalle-dialog.component.html',
  styleUrl: './remision-detalle-dialog.component.scss'
})
export class RemisionDetalleDialogComponent {
  readonly r = inject<RemisionSinFactura>(MAT_DIALOG_DATA);

  readonly facturas = this.r.abonos.filter((a) => a.prefijo === 'FVE');
  readonly recibos = this.r.abonos.filter((a) => a.prefijo === 'RC');
  readonly otros = this.r.abonos.filter((a) => a.prefijo !== 'FVE' && a.prefijo !== 'RC');
  readonly porcentajeFacturado = this.r.valor > 0 ? Math.min(100, Math.round((this.r.facturado / this.r.valor) * 100)) : 0;
}
