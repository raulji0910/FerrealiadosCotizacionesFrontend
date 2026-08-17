import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { Proveedor, ProveedorActualizar, ProveedorCrear } from '../../core/models/proveedor.model';

export interface ProveedorFormDialogData {
  proveedor: Proveedor | null;
}

@Component({
  selector: 'app-proveedor-form-dialog',
  standalone: true,
  imports: [FormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  templateUrl: './proveedor-form-dialog.component.html'
})
export class ProveedorFormDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<ProveedorFormDialogComponent>);
  readonly data = inject<ProveedorFormDialogData>(MAT_DIALOG_DATA);

  readonly editando = this.data.proveedor !== null;

  formulario: ProveedorCrear & { activo?: boolean } = this.data.proveedor
    ? { ...this.data.proveedor }
    : { nombre: '', nit: null, direccion: null, telefono: null, ciudad: null };

  guardar(): void {
    if (!this.formulario.nombre) return;

    if (this.editando) {
      const dto: ProveedorActualizar = {
        nombre: this.formulario.nombre,
        nit: this.formulario.nit,
        direccion: this.formulario.direccion,
        telefono: this.formulario.telefono,
        ciudad: this.formulario.ciudad,
        activo: this.formulario.activo ?? true
      };
      this.dialogRef.close(dto);
    } else {
      this.dialogRef.close(this.formulario);
    }
  }

  cancelar(): void {
    this.dialogRef.close(null);
  }
}
