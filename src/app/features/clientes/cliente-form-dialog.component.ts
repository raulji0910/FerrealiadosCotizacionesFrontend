import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { Cliente, ClienteActualizar, ClienteCrear } from '../../core/models/cliente.model';

export interface ClienteFormDialogData {
  cliente: Cliente | null;
}

@Component({
  selector: 'app-cliente-form-dialog',
  standalone: true,
  imports: [FormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  templateUrl: './cliente-form-dialog.component.html'
})
export class ClienteFormDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<ClienteFormDialogComponent>);
  readonly data = inject<ClienteFormDialogData>(MAT_DIALOG_DATA);

  readonly editando = this.data.cliente !== null;

  formulario: ClienteCrear & { activo?: boolean } = this.data.cliente
    ? { ...this.data.cliente }
    : { nombre: '', nit: null, direccion: null, telefono: null, ciudad: null, contacto: null, email: null };

  guardar(): void {
    if (!this.formulario.nombre) return;

    if (this.editando) {
      const dto: ClienteActualizar = {
        nombre: this.formulario.nombre,
        nit: this.formulario.nit,
        direccion: this.formulario.direccion,
        telefono: this.formulario.telefono,
        ciudad: this.formulario.ciudad,
        contacto: this.formulario.contacto,
        email: this.formulario.email,
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
