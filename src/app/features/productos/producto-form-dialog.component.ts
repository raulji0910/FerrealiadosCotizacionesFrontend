import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { ProductoCrear } from '../../core/models/producto.model';

@Component({
  selector: 'app-producto-form-dialog',
  standalone: true,
  imports: [FormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  templateUrl: './producto-form-dialog.component.html'
})
export class ProductoFormDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<ProductoFormDialogComponent>);

  producto: ProductoCrear = { codigo: '', nombre: '', descripcion: null, unidadMedida: null };

  guardar(): void {
    if (!this.producto.codigo || !this.producto.nombre) return;
    this.dialogRef.close(this.producto);
  }

  cancelar(): void {
    this.dialogRef.close(null);
  }
}
