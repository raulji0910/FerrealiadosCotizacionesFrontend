import { Component, OnInit, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe, DecimalPipe, NgTemplateOutlet } from '@angular/common';
import { MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ConciliacionService } from '../../core/services/conciliacion.service';
import { DetalleFacturaConciliada, EstadoConciliacion } from '../../core/models/conciliacion.model';

export interface ConciliacionDetalleDialogData {
  facturaId: number;
}

interface FilaComparacion {
  concepto: string;
  factura: number;
  oc: number | null;
  diferencia: number | null;
}

// Factura del proveedor y OC de World Office lado a lado, renglón por renglón, para ver de dónde
// sale una diferencia (precio, cantidad o un producto que no venía en la OC).
@Component({
  selector: 'app-conciliacion-detalle-dialog',
  standalone: true,
  imports: [
    CurrencyPipe,
    DatePipe,
    DecimalPipe,
    NgTemplateOutlet,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatProgressBarModule
  ],
  templateUrl: './conciliacion-detalle-dialog.component.html',
  styleUrl: './conciliacion-detalle-dialog.component.scss'
})
export class ConciliacionDetalleDialogComponent implements OnInit {
  private readonly data = inject<ConciliacionDetalleDialogData>(MAT_DIALOG_DATA);
  private readonly conciliacionService = inject(ConciliacionService);

  readonly columnas = ['descripcion', 'cantidad', 'valorUnitario', 'iva', 'subtotal'];
  readonly detalle = signal<DetalleFacturaConciliada | null>(null);
  readonly cargando = signal(true);

  readonly etiquetas: Record<EstadoConciliacion, string> = {
    Cuadra: 'Cuadra',
    Diferencia: 'Con diferencia',
    Parcial: 'Entrega parcial',
    SinOrdenCompra: 'Sin OC'
  };

  readonly iconos: Record<EstadoConciliacion, string> = {
    Cuadra: 'check_circle',
    Diferencia: 'warning',
    Parcial: 'call_split',
    SinOrdenCompra: 'help'
  };

  ngOnInit(): void {
    this.conciliacionService.obtenerDetalle(this.data.facturaId).subscribe({
      next: (detalle) => {
        this.detalle.set(detalle);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false)
    });
  }

  // Diferencia = factura − OC (negativa: el proveedor cobró menos que la OC).
  comparacion(d: DetalleFacturaConciliada): FilaComparacion[] {
    const c = d.conciliacion;
    const hayOc = c.ordenCompraNumero !== null;
    const ocSubtotal = hayOc ? (c.ordenCompraSubtotal ?? 0) : null;
    const ocIva = hayOc ? (c.ordenCompraIva ?? 0) : null;
    const ocTotal = ocSubtotal === null || ocIva === null ? null : ocSubtotal + ocIva;
    const fila = (concepto: string, factura: number, oc: number | null): FilaComparacion => ({
      concepto,
      factura,
      oc,
      diferencia: oc === null ? null : factura - oc
    });
    return [fila('Subtotal', c.subtotal, ocSubtotal), fila('IVA', c.iva, ocIva), fila('Total', c.subtotal + c.iva, ocTotal)];
  }
}
