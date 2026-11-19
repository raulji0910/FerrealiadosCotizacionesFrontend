import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '../../core/services/auth.service';
import { Rol, Usuario, UsuarioActualizar, UsuarioCrear } from '../../core/models/usuario.model';

export interface UsuarioFormDialogData {
  usuario: Usuario | null;
}

@Component({
  selector: 'app-usuario-form-dialog',
  standalone: true,
  imports: [
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatSlideToggleModule,
    MatButtonModule
  ],
  templateUrl: './usuario-form-dialog.component.html'
})
export class UsuarioFormDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<UsuarioFormDialogComponent>);
  private readonly authService = inject(AuthService);
  readonly data = inject<UsuarioFormDialogData>(MAT_DIALOG_DATA);

  readonly editando = this.data.usuario !== null;
  readonly esUsuarioActual = this.data.usuario !== null && this.data.usuario.email === this.authService.usuario()?.email;

  nombre = this.data.usuario?.nombre ?? '';
  email = this.data.usuario?.email ?? '';
  roles: Rol[] = [...(this.data.usuario?.roles ?? ['Cotizador'])];

  readonly opcionesRol: { valor: Rol; titulo: string; ayuda: string }[] = [
    { valor: 'Admin', titulo: 'Administrador', ayuda: 'Todo, incluidos usuarios y configuración' },
    { valor: 'Cotizador', titulo: 'Cotizador', ayuda: 'Productos, proveedores, clientes y cotizaciones; consulta conciliación' },
    { valor: 'Conciliador', titulo: 'Conciliador', ayuda: 'Conciliación de facturas: carga ZIP y escribe observaciones' },
    { valor: 'Cartera', titulo: 'Cartera', ayuda: 'Cartera de clientes: estados de cuenta y remisiones sin factura' }
  ];
  activo = this.data.usuario?.activo ?? true;
  password = '';
  nuevaPassword = '';

  tieneRol(rol: Rol): boolean {
    return this.roles.includes(rol);
  }

  alternarRol(rol: Rol, marcado: boolean): void {
    this.roles = marcado ? [...this.roles.filter((r) => r !== rol), rol] : this.roles.filter((r) => r !== rol);
  }

  guardar(): void {
    if (!this.nombre || this.roles.length === 0 || (!this.editando && (!this.email || !this.password))) return;

    if (this.editando) {
      const dto: UsuarioActualizar = {
        nombre: this.nombre,
        roles: this.roles,
        activo: this.activo,
        nuevaPassword: this.nuevaPassword || null
      };
      this.dialogRef.close(dto);
    } else {
      const dto: UsuarioCrear = {
        nombre: this.nombre,
        email: this.email,
        password: this.password,
        roles: this.roles
      };
      this.dialogRef.close(dto);
    }
  }

  cancelar(): void {
    this.dialogRef.close(null);
  }
}
