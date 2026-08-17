import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { Producto, ProductoActualizar, ProductoCrear } from '../../core/models/producto.model';

export interface ProductoFormDialogData {
  producto: Producto | null;
}

@Component({
  selector: 'app-producto-form-dialog',
  standalone: true,
  imports: [FormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  templateUrl: './producto-form-dialog.component.html'
})
export class ProductoFormDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<ProductoFormDialogComponent>);
  readonly data = inject<ProductoFormDialogData>(MAT_DIALOG_DATA);

  readonly editando = this.data.producto !== null;

  producto: ProductoCrear & { activo?: boolean } = this.data.producto
    ? { ...this.data.producto }
    : { codigo: null, nombre: '', descripcion: null, unidadMedida: null };

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
      this.dialogRef.close(dto);
    } else {
      this.dialogRef.close(this.producto);
    }
  }

  cancelar(): void {
    this.dialogRef.close(null);
  }
}
