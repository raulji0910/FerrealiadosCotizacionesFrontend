import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { ProductoService } from '../../core/services/producto.service';
import { ProveedorService } from '../../core/services/proveedor.service';
import { Producto } from '../../core/models/producto.model';
import { Proveedor } from '../../core/models/proveedor.model';
import { PrecioProveedor } from '../../core/models/precio.model';
import { PrecioFormDialogComponent } from './precio-form-dialog.component';

@Component({
  selector: 'app-producto-detalle',
  standalone: true,
  imports: [MatTableModule, MatButtonModule, MatIconModule, MatChipsModule, MatProgressBarModule, CurrencyPipe, DatePipe],
  templateUrl: './producto-detalle.component.html',
  styleUrl: './producto-detalle.component.scss'
})
export class ProductoDetalleComponent implements OnInit {
  readonly columnas = ['proveedor', 'costo', 'costoConPorcentaje', 'fecha', 'dias', 'estado'];
  readonly producto = signal<Producto | null>(null);
  readonly precios = signal<PrecioProveedor[]>([]);
  readonly proveedores = signal<Proveedor[]>([]);
  readonly cargando = signal(false);

  private productoId!: number;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly productoService: ProductoService,
    private readonly proveedorService: ProveedorService,
    private readonly dialog: MatDialog,
    private readonly snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.productoId = Number(this.route.snapshot.paramMap.get('id'));
    this.cargar();
    this.proveedorService.listarActivos().subscribe((proveedores) => this.proveedores.set(proveedores));
  }

  cargar(): void {
    this.cargando.set(true);
    this.productoService.obtenerPorId(this.productoId).subscribe((producto) => this.producto.set(producto));
    this.productoService.obtenerPrecios(this.productoId).subscribe({
      next: (precios) => {
        this.precios.set(precios);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false)
    });
  }

  abrirDialogoPrecio(): void {
    const dialogRef = this.dialog.open(PrecioFormDialogComponent, {
      width: '28rem',
      autoFocus: 'dialog',
      data: { proveedores: this.proveedores() }
    });

    // Ver comentario equivalente en proveedores-list.component.ts.
    dialogRef.afterOpened().subscribe(() => window.dispatchEvent(new Event('resize')));

    dialogRef.afterClosed().subscribe((resultado) => {
      if (!resultado) return;

      this.productoService.registrarPrecio(this.productoId, resultado).subscribe({
        next: () => {
          this.snackBar.open('Precio registrado', 'Cerrar', { duration: 3000 });
          this.cargar();
        },
        error: (error) => {
          const mensaje = error?.error?.mensaje ?? 'No se pudo registrar el precio.';
          this.snackBar.open(mensaje, 'Cerrar', { duration: 4000 });
        }
      });
    });
  }

  volver(): void {
    this.router.navigate(['/productos']);
  }
}
