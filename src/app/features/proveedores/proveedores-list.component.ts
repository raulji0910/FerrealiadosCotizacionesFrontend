import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ProveedorService } from '../../core/services/proveedor.service';
import { Proveedor } from '../../core/models/proveedor.model';
import { ProveedorFormDialogComponent } from './proveedor-form-dialog.component';

@Component({
  selector: 'app-proveedores-list',
  standalone: true,
  imports: [
    FormsModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatChipsModule,
    MatProgressBarModule,
    MatPaginatorModule
  ],
  templateUrl: './proveedores-list.component.html',
  styleUrl: './proveedores-list.component.scss'
})
export class ProveedoresListComponent implements OnInit {
  readonly columnas = ['nombre', 'nit', 'direccion', 'telefono', 'ciudad', 'estado', 'acciones'];
  readonly proveedores = signal<Proveedor[]>([]);
  readonly total = signal(0);
  readonly pageIndex = signal(0);
  readonly pageSize = signal(10);
  readonly cargando = signal(false);
  texto = '';

  constructor(
    private readonly proveedorService: ProveedorService,
    private readonly dialog: MatDialog,
    private readonly snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.buscar();
  }

  buscar(): void {
    this.pageIndex.set(0);
    this.cargarPagina();
  }

  alCambiarPagina(evento: PageEvent): void {
    this.pageIndex.set(evento.pageIndex);
    this.pageSize.set(evento.pageSize);
    this.cargarPagina();
  }

  private cargarPagina(): void {
    this.cargando.set(true);
    this.proveedorService.buscar(this.texto || undefined, this.pageIndex() + 1, this.pageSize()).subscribe({
      next: (resultado) => {
        this.proveedores.set(resultado.items);
        this.total.set(resultado.total);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false)
    });
  }

  abrirNuevo(): void {
    this.abrirDialogo(null);
  }

  abrirEditar(proveedor: Proveedor): void {
    this.abrirDialogo(proveedor);
  }

  private abrirDialogo(proveedor: Proveedor | null): void {
    const dialogRef = this.dialog.open(ProveedorFormDialogComponent, {
      width: '28rem',
      autoFocus: 'dialog',
      data: { proveedor }
    });

    // El hueco del borde para el label flotante no se recalcula bien mientras el diálogo
    // todavía está animando su entrada (transform/scale no dispara el ResizeObserver de
    // Material) — se fuerza el recálculo disparando un resize una vez terminó de abrir.
    dialogRef.afterOpened().subscribe(() => window.dispatchEvent(new Event('resize')));

    dialogRef.afterClosed().subscribe((resultado) => {
      if (!resultado) return;

      const peticion = proveedor
        ? this.proveedorService.actualizar(proveedor.id, resultado)
        : this.proveedorService.crear(resultado);

      peticion.subscribe({
        next: () => {
          this.snackBar.open(proveedor ? 'Proveedor actualizado' : 'Proveedor creado', 'Cerrar', { duration: 3000 });
          this.buscar();
        },
        error: (error) => {
          const mensaje = error?.error?.mensaje ?? 'No se pudo guardar el proveedor.';
          this.snackBar.open(mensaje, 'Cerrar', { duration: 4000 });
        }
      });
    });
  }
}
