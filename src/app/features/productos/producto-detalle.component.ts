import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
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
import { CotizacionService } from '../../core/services/cotizacion.service';
import { Producto } from '../../core/models/producto.model';
import { Proveedor } from '../../core/models/proveedor.model';
import { PrecioProveedor } from '../../core/models/precio.model';
import { PrecioFormDialogComponent } from './precio-form-dialog.component';
import { ProductoFormDialogComponent } from './producto-form-dialog.component';
import { ConfirmacionDialogComponent } from '../../core/dialogs/confirmacion-dialog.component';

// Estado transitorio de UI para "agregar una marca" — no viene del backend, se agrega directo
// sobre la fila igual que el resto de la edición inline de esta grilla (porcentaje, IVA).
interface PrecioProveedorVista extends PrecioProveedor {
  agregandoMarca?: boolean;
  nuevoCodigo?: string;
  nuevaCantidad?: number;
}

@Component({
  selector: 'app-producto-detalle',
  standalone: true,
  imports: [FormsModule, MatTableModule, MatButtonModule, MatIconModule, MatChipsModule, MatProgressBarModule, CurrencyPipe, DatePipe],
  templateUrl: './producto-detalle.component.html',
  styleUrl: './producto-detalle.component.scss'
})
export class ProductoDetalleComponent implements OnInit {
  readonly columnas = ['proveedor', 'costo', 'costoConPorcentaje', 'costoConIva', 'fecha', 'dias', 'estado', 'cotizar'];
  readonly ivasDisponibles = [19, 5, 0];
  readonly producto = signal<Producto | null>(null);
  readonly precios = signal<PrecioProveedorVista[]>([]);
  readonly proveedores = signal<Proveedor[]>([]);
  readonly cargando = signal(false);

  private productoId!: number;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly productoService: ProductoService,
    private readonly proveedorService: ProveedorService,
    private readonly cotizacionService: CotizacionService,
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

  abrirDialogoEditar(producto: Producto): void {
    const dialogRef = this.dialog.open(ProductoFormDialogComponent, {
      width: '28rem',
      autoFocus: 'dialog',
      data: { producto, proveedores: this.proveedores() }
    });

    dialogRef.afterOpened().subscribe(() => window.dispatchEvent(new Event('resize')));

    dialogRef.afterClosed().subscribe((resultado) => {
      if (!resultado) return;

      this.productoService.actualizar(producto.id, resultado.producto).subscribe({
        next: (actualizado) => {
          this.producto.set(actualizado);
          this.snackBar.open('Producto actualizado', 'Cerrar', { duration: 3000 });
        },
        error: (error) => {
          const mensaje = error?.error?.mensaje ?? 'No se pudo actualizar el producto.';
          this.snackBar.open(mensaje, 'Cerrar', { duration: 4000 });
        }
      });
    });
  }

  abrirDialogoEliminar(producto: Producto): void {
    const dialogRef = this.dialog.open(ConfirmacionDialogComponent, {
      width: '26rem',
      data: {
        titulo: 'Eliminar producto',
        mensaje: `¿Seguro que quieres eliminar "${producto.nombre}"? Se borrará también todo su historial de precios de proveedor. Esta acción no se puede deshacer.`,
        textoConfirmar: 'Sí, eliminar'
      }
    });

    dialogRef.afterClosed().subscribe((confirmado) => {
      if (!confirmado) return;

      this.productoService.eliminar(producto.id).subscribe({
        next: () => {
          this.snackBar.open('Producto eliminado', 'Cerrar', { duration: 3000 });
          this.volver();
        },
        error: (error) => {
          const mensaje = error?.error?.mensaje ?? 'No se pudo eliminar el producto.';
          this.snackBar.open(mensaje, 'Cerrar', { duration: 4000 });
        }
      });
    });
  }

  // Vista previa inmediata mientras se escribe; el guardado real ocurre al salir del campo.
  costoConPorcentajePreview(precio: PrecioProveedor): number {
    return Math.round(precio.costoBase * (1 + precio.porcentajeAjuste / 100) * 100) / 100;
  }

  onCambioPorcentajeLocal(precio: PrecioProveedor, valor: number): void {
    precio.porcentajeAjuste = valor;
  }

  guardarPorcentaje(precio: PrecioProveedor): void {
    const valor = Math.max(-100, Math.min(100, Math.round(precio.porcentajeAjuste)));
    precio.porcentajeAjuste = valor;

    this.productoService.actualizarPorcentajePrecio(this.productoId, precio.precioId, valor).subscribe({
      next: (resultado) => {
        precio.costo = resultado.costo;
        precio.porcentajeAjuste = resultado.porcentajeAjuste;
      },
      error: (error) => {
        const mensaje = error?.error?.mensaje ?? 'No se pudo actualizar el porcentaje.';
        this.snackBar.open(mensaje, 'Cerrar', { duration: 4000 });
      }
    });
  }

  // Vista previa inmediata mientras se elige el IVA; el guardado real ocurre al confirmar el cambio.
  // Ojo: 0% es un valor de IVA válido y distinto de "Sin IVA" (null) — no usar chequeo por falsy.
  costoConIvaPreview(precio: PrecioProveedor): number | null {
    if (precio.iva === null || precio.iva === undefined) return null;
    return Math.round(precio.costoBase * (1 + precio.iva / 100) * 100) / 100;
  }

  onCambioIvaLocal(precio: PrecioProveedor, valor: number | null): void {
    // El <select> usa [ngValue], así que $event ya llega con el tipo real (number | null),
    // no como string — convertir con Number() rompería "Sin IVA" (Number(null) es 0, no null).
    precio.iva = valor;
    this.guardarIva(precio);
  }

  guardarIva(precio: PrecioProveedor): void {
    this.productoService.actualizarIvaPrecio(this.productoId, precio.precioId, precio.iva).subscribe({
      next: (resultado) => {
        precio.iva = resultado.iva;
        precio.costoConIva = resultado.costoConIva;
      },
      error: (error) => {
        const mensaje = error?.error?.mensaje ?? 'No se pudo actualizar el IVA.';
        this.snackBar.open(mensaje, 'Cerrar', { duration: 4000 });
      }
    });
  }

  // Marcado para cotización: un mismo precio puede tener varias marcas activas simultáneas, cada
  // una en su propio código (una cotización distinta en construcción). El checkbox no es un toggle
  // exclusivo — cada confirmación agrega una marca nueva, y vuelve a su estado inicial listo para otra.
  iniciarMarca(precio: PrecioProveedorVista): void {
    precio.agregandoMarca = true;
    precio.nuevoCodigo = '';
    precio.nuevaCantidad = 1;
  }

  cancelarMarca(precio: PrecioProveedorVista): void {
    precio.agregandoMarca = false;
  }

  confirmarMarca(precio: PrecioProveedorVista): void {
    const codigo = (precio.nuevoCodigo || '').trim();
    if (!codigo) return;

    const cantidad = Math.max(1, Math.round(precio.nuevaCantidad || 1));

    this.cotizacionService.marcarPrecio({ precioId: precio.precioId, codigo, cantidad }).subscribe({
      next: () => {
        precio.agregandoMarca = false;
        this.snackBar.open(`Agregado a la cotización "${codigo.toUpperCase()}"`, 'Cerrar', { duration: 3000 });
        this.cargar();
      },
      error: (error) => {
        const mensaje = error?.error?.mensaje ?? 'No se pudo agregar el ítem a la cotización.';
        this.snackBar.open(mensaje, 'Cerrar', { duration: 4000 });
      }
    });
  }

  quitarMarca(cotizacionItemId: number): void {
    this.cotizacionService.quitarItem(cotizacionItemId).subscribe({
      next: () => this.cargar(),
      error: (error) => {
        const mensaje = error?.error?.mensaje ?? 'No se pudo quitar la marca.';
        this.snackBar.open(mensaje, 'Cerrar', { duration: 4000 });
      }
    });
  }

  volver(): void {
    this.router.navigate(['/productos']);
  }
}
