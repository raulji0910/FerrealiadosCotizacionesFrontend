import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
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
import { DatePipe } from '@angular/common';
import { ProductoService } from '../../core/services/producto.service';
import { ProveedorService } from '../../core/services/proveedor.service';
import { Producto } from '../../core/models/producto.model';
import { Proveedor } from '../../core/models/proveedor.model';
import { ProductoFormDialogComponent } from './producto-form-dialog.component';

@Component({
  selector: 'app-productos-list',
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
    MatPaginatorModule,
    DatePipe
  ],
  templateUrl: './productos-list.component.html',
  styleUrl: './productos-list.component.scss'
})
export class ProductosListComponent implements OnInit {
  readonly columnas = ['codigo', 'nombre', 'ultimaFechaCotizacion', 'estado', 'acciones'];
  readonly productos = signal<Producto[]>([]);
  readonly proveedores = signal<Proveedor[]>([]);
  readonly total = signal(0);
  readonly pageIndex = signal(0);
  readonly pageSize = signal(10);
  readonly cargando = signal(false);
  texto = '';

  constructor(
    private readonly productoService: ProductoService,
    private readonly proveedorService: ProveedorService,
    private readonly router: Router,
    private readonly dialog: MatDialog,
    private readonly snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.buscar();
    this.proveedorService.listarActivos().subscribe((proveedores) => this.proveedores.set(proveedores));
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
    this.productoService.buscar(this.texto || undefined, this.pageIndex() + 1, this.pageSize()).subscribe({
      next: (resultado) => {
        this.productos.set(resultado.items);
        this.total.set(resultado.total);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false)
    });
  }

  abrirNuevo(): void {
    const dialogRef = this.dialog.open(ProductoFormDialogComponent, {
      width: '28rem',
      autoFocus: 'dialog',
      data: { producto: null, proveedores: this.proveedores() }
    });

    // Ver comentario equivalente en proveedores-list.component.ts.
    dialogRef.afterOpened().subscribe(() => window.dispatchEvent(new Event('resize')));

    dialogRef.afterClosed().subscribe((resultado) => {
      if (!resultado) return;

      this.productoService.crear(resultado.producto).subscribe({
        next: (creado) => {
          if (!resultado.precioInicial) {
            this.snackBar.open(`Producto "${creado.nombre}" creado`, 'Cerrar', { duration: 3000 });
            this.buscar();
            return;
          }

          this.productoService
            .registrarPrecio(creado.id, {
              proveedorId: resultado.precioInicial.proveedorId,
              costo: resultado.precioInicial.costo,
              porcentajeAjuste: 0,
              iva: resultado.precioInicial.iva,
              fechaCotizacion: this.fechaHoyIso(),
              observaciones: null,
              creadoPor: null
            })
            .subscribe({
              next: () => {
                this.snackBar.open(`Producto "${creado.nombre}" creado`, 'Cerrar', { duration: 3000 });
                this.router.navigate(['/productos', creado.id]);
              },
              error: () => {
                this.snackBar.open('Producto creado, pero no se pudo registrar el precio inicial', 'Cerrar', { duration: 4000 });
                this.router.navigate(['/productos', creado.id]);
              }
            });
        },
        error: (error) => {
          const mensaje = error?.error?.mensaje ?? 'No se pudo crear el producto.';
          this.snackBar.open(mensaje, 'Cerrar', { duration: 4000 });
        }
      });
    });
  }

  verDetalle(producto: Producto): void {
    this.router.navigate(['/productos', producto.id]);
  }

  private fechaHoyIso(): string {
    const hoy = new Date();
    const anio = hoy.getFullYear();
    const mes = String(hoy.getMonth() + 1).padStart(2, '0');
    const dia = String(hoy.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
  }
}
