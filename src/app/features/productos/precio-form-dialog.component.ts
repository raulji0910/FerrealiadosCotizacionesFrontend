import { Component, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CurrencyPipe } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { Proveedor } from '../../core/models/proveedor.model';
import { RegistrarPrecio } from '../../core/models/precio.model';

export interface PrecioFormDialogData {
  proveedores: Proveedor[];
}

const MAXIMO_SUGERENCIAS = 50;
const IVAS_DISPONIBLES = [19, 5, 0];

@Component({
  selector: 'app-precio-form-dialog',
  standalone: true,
  imports: [
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    MatDatepickerModule,
    MatButtonModule,
    MatSelectModule,
    CurrencyPipe
  ],
  templateUrl: './precio-form-dialog.component.html'
})
export class PrecioFormDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<PrecioFormDialogComponent>);
  readonly data = inject<PrecioFormDialogData>(MAT_DIALOG_DATA);

  // Mientras el usuario escribe, guarda el texto (string); al elegir una opción, guarda el Proveedor completo.
  proveedorSeleccionado: Proveedor | string | null = null;
  costo: number | null = null;
  porcentajeAjuste = 0;
  fecha: Date = new Date();
  observaciones = '';

  // El usuario puede ingresar el costo por cualquiera de los dos lados (sin IVA o con IVA) y el
  // otro se calcula solo, según la tarifa elegida. Se guardan ambos (costo sin IVA e IVA elegido).
  readonly ivasDisponibles = IVAS_DISPONIBLES;
  costoConIva: number | null = null;
  ivaSeleccionado = IVAS_DISPONIBLES[0];

  // Para saber, cuando cambia el IVA, cuál de los dos campos de costo hay que recalcular a partir del otro.
  private ultimoCampoCosto: 'sinIva' | 'conIva' = 'sinIva';

  private readonly filtroProveedor = signal('');

  readonly proveedoresFiltrados = computed(() => {
    const filtro = this.filtroProveedor().trim().toLowerCase();
    const lista = filtro
      ? this.data.proveedores.filter((proveedor) => proveedor.nombre.toLowerCase().includes(filtro))
      : this.data.proveedores;
    return lista.slice(0, MAXIMO_SUGERENCIAS);
  });

  alEscribirProveedor(valor: string | Proveedor): void {
    this.filtroProveedor.set(typeof valor === 'string' ? valor : valor.nombre);
  }

  mostrarNombreProveedor = (proveedor: Proveedor | string | null): string =>
    proveedor && typeof proveedor !== 'string' ? proveedor.nombre : (proveedor ?? '');

  get costoFinal(): number | null {
    if (this.costo === null) return null;
    return Math.round(this.costo * (1 + this.porcentajeAjuste / 100) * 100) / 100;
  }

  onCambioCosto(): void {
    this.ultimoCampoCosto = 'sinIva';
    this.recalcularDesdeIva();
  }

  onCambioCostoConIva(): void {
    this.ultimoCampoCosto = 'conIva';
    this.recalcularDesdeIva();
  }

  onCambioIva(): void {
    this.recalcularDesdeIva();
  }

  private recalcularDesdeIva(): void {
    if (this.ultimoCampoCosto === 'conIva') {
      if (this.costoConIva === null) return;
      this.costo = Math.round((this.costoConIva / (1 + this.ivaSeleccionado / 100)) * 100) / 100;
    } else {
      if (this.costo === null) return;
      this.costoConIva = Math.round(this.costo * (1 + this.ivaSeleccionado / 100) * 100) / 100;
    }
  }

  guardar(): void {
    const proveedorId = this.proveedorSeleccionado && typeof this.proveedorSeleccionado !== 'string'
      ? this.proveedorSeleccionado.id
      : null;
    if (!proveedorId || !this.costo) return;

    const dto: RegistrarPrecio = {
      proveedorId,
      costo: this.costo,
      porcentajeAjuste: this.porcentajeAjuste,
      iva: this.costoConIva !== null ? this.ivaSeleccionado : null,
      fechaCotizacion: this.formatearFecha(this.fecha),
      observaciones: this.observaciones || null,
      creadoPor: null
    };

    this.dialogRef.close(dto);
  }

  cancelar(): void {
    this.dialogRef.close(null);
  }

  private formatearFecha(fecha: Date): string {
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
  }
}
