import { Component, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { Producto, ProductoActualizar, ProductoCrear } from '../../core/models/producto.model';
import { Proveedor } from '../../core/models/proveedor.model';

export interface ProductoFormDialogData {
  producto: Producto | null;
  proveedores: Proveedor[];
}

export interface ProductoFormDialogResultado {
  producto: ProductoCrear | ProductoActualizar;
  precioInicial: { proveedorId: number; costo: number; iva: number | null } | null;
}

const MAXIMO_SUGERENCIAS = 50;
const IVAS_DISPONIBLES = [19, 5];

@Component({
  selector: 'app-producto-form-dialog',
  standalone: true,
  imports: [
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatSelectModule
  ],
  templateUrl: './producto-form-dialog.component.html'
})
export class ProductoFormDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<ProductoFormDialogComponent>);
  readonly data = inject<ProductoFormDialogData>(MAT_DIALOG_DATA);

  readonly editando = this.data.producto !== null;

  producto: ProductoCrear & { activo?: boolean } = this.data.producto
    ? { ...this.data.producto }
    : { codigo: null, nombre: '', descripcion: null, unidadMedida: null };

  // Solo aplica al crear un producto nuevo: primer proveedor + costo, ambos opcionales.
  proveedorSeleccionado: Proveedor | string | null = null;
  costo: number | null = null;

  // Igual que en el diálogo "Registrar cotización": el costo sin IVA y el costo con IVA
  // (19%/5%) se calculan mutuamente según el último campo que el usuario edita.
  readonly ivasDisponibles = IVAS_DISPONIBLES;
  costoConIva: number | null = null;
  ivaSeleccionado = IVAS_DISPONIBLES[0];
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
    if (!this.producto.nombre) return;

    if (this.editando) {
      const dto: ProductoActualizar = {
        codigo: this.producto.codigo,
        nombre: this.producto.nombre,
        descripcion: this.producto.descripcion,
        unidadMedida: this.producto.unidadMedida,
        activo: this.producto.activo ?? true
      };
      const resultado: ProductoFormDialogResultado = { producto: dto, precioInicial: null };
      this.dialogRef.close(resultado);
      return;
    }

    const proveedorId = this.proveedorSeleccionado && typeof this.proveedorSeleccionado !== 'string'
      ? this.proveedorSeleccionado.id
      : null;
    const precioInicial = proveedorId && this.costo
      ? { proveedorId, costo: this.costo, iva: this.costoConIva !== null ? this.ivaSeleccionado : null }
      : null;

    const resultado: ProductoFormDialogResultado = { producto: this.producto, precioInicial };
    this.dialogRef.close(resultado);
  }

  cancelar(): void {
    this.dialogRef.close(null);
  }
}
