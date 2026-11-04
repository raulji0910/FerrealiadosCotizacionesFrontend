import { Component, OnInit, computed, signal } from '@angular/core';
import { CurrencyPipe, DatePipe, DecimalPipe, PercentPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { ConciliacionService } from '../../core/services/conciliacion.service';
import { Conciliacion, EstadoConciliacion, FacturaConciliada, OrdenPendiente } from '../../core/models/conciliacion.model';
import { ConciliacionDetalleDialogComponent } from './conciliacion-detalle-dialog.component';

type Filtro = 'Todas' | EstadoConciliacion | 'OrdenesPendientes';

interface Tarjeta {
  filtro: Filtro;
  titulo: string;
  icono: string;
  cantidad: number;
  valor: number;
}

// Cruce diario de las facturas electrónicas que llegan a facturacion@ (las sube el Sincronizador)
// contra las OC de World Office. El cálculo lo hace la API al vuelo en cada consulta; los filtros
// de proveedor/OC/factura y el paginado se aplican aquí sobre lo ya traído.
@Component({
  selector: 'app-conciliacion',
  standalone: true,
  imports: [
    CurrencyPipe,
    DatePipe,
    DecimalPipe,
    PercentPipe,
    FormsModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressBarModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatPaginatorModule,
    MatTooltipModule
  ],
  templateUrl: './conciliacion.component.html',
  styleUrl: './conciliacion.component.scss'
})
export class ConciliacionComponent implements OnInit {
  readonly columnasFacturas = ['fecha', 'proveedor', 'factura', 'subtotal', 'iva', 'oc', 'diferencia', 'estado', 'acciones'];
  readonly columnasOrdenes = ['fecha', 'dias', 'proveedor', 'oc', 'subtotal', 'saldo'];

  readonly etiquetas: Record<EstadoConciliacion, string> = {
    Cuadra: 'Cuadra',
    Diferencia: 'Diferencia',
    Parcial: 'Parcial',
    SinOrdenCompra: 'Sin OC'
  };

  desde: Date;
  hasta: Date;
  readonly conciliacion = signal<Conciliacion | null>(null);
  readonly cargando = signal(false);
  readonly filtro = signal<Filtro>('Todas');

  readonly proveedor = signal('');
  readonly numeroOc = signal('');
  readonly numeroFactura = signal('');

  readonly pageIndex = signal(0);
  readonly pageSize = signal(25);

  readonly hayFiltrosTexto = computed(() => !!(this.proveedor() || this.numeroOc() || this.numeroFactura()));

  // Facturas y OC pendientes después de los filtros de texto (antes del filtro por estado), para que
  // las tarjetas de resumen cuenten sobre lo mismo que se está buscando.
  private readonly facturasBuscadas = computed(() => {
    const datos = this.conciliacion();
    if (!datos) return [];
    const proveedor = this.normalizar(this.proveedor());
    const oc = this.numeroOc().trim();
    const factura = this.normalizar(this.numeroFactura());
    return datos.facturas.filter(
      (f) =>
        (!proveedor || this.coincideProveedor(f.nombreProveedor, f.nitProveedor, proveedor)) &&
        (!oc || String(f.ordenCompraNumero ?? '').includes(oc)) &&
        (!factura || this.normalizar(f.numero).includes(factura))
    );
  });

  private readonly ordenesBuscadas = computed(() => {
    const datos = this.conciliacion();
    if (!datos) return [];
    const proveedor = this.normalizar(this.proveedor());
    const oc = this.numeroOc().trim();
    // Una OC pendiente no tiene factura: si se busca por número de factura no hay nada que mostrar.
    if (this.numeroFactura().trim()) return [];
    return datos.ordenesPendientes.filter(
      (o) =>
        (!proveedor || this.coincideProveedor(o.nombreProveedor, o.nitProveedor, proveedor)) &&
        (!oc || String(o.numero).includes(oc))
    );
  });

  readonly tarjetas = computed<Tarjeta[]>(() => {
    const facturas = this.facturasBuscadas();
    const ordenes = this.ordenesBuscadas();
    const grupo = (estado: EstadoConciliacion) => facturas.filter((f) => f.estado === estado);
    const sumar = (lista: FacturaConciliada[]) => lista.reduce((t, f) => t + f.subtotal, 0);
    return [
      { filtro: 'Todas', titulo: 'Facturas', icono: 'receipt_long', cantidad: facturas.length, valor: sumar(facturas) },
      { filtro: 'Cuadra', titulo: 'Cuadran', icono: 'check_circle', cantidad: grupo('Cuadra').length, valor: sumar(grupo('Cuadra')) },
      { filtro: 'Diferencia', titulo: 'Con diferencia', icono: 'warning', cantidad: grupo('Diferencia').length, valor: sumar(grupo('Diferencia')) },
      { filtro: 'Parcial', titulo: 'Parciales', icono: 'call_split', cantidad: grupo('Parcial').length, valor: sumar(grupo('Parcial')) },
      { filtro: 'SinOrdenCompra', titulo: 'Sin OC', icono: 'help', cantidad: grupo('SinOrdenCompra').length, valor: sumar(grupo('SinOrdenCompra')) },
      {
        filtro: 'OrdenesPendientes',
        titulo: 'OC sin factura',
        icono: 'pending_actions',
        cantidad: ordenes.length,
        valor: ordenes.reduce((t, o) => t + o.saldoSubtotal, 0)
      }
    ];
  });

  readonly porcentajeCuadran = computed(() => {
    const facturas = this.facturasBuscadas();
    return facturas.length ? facturas.filter((f) => f.estado === 'Cuadra').length / facturas.length : 0;
  });

  readonly facturasFiltradas = computed(() => {
    const filtro = this.filtro();
    const facturas = this.facturasBuscadas();
    return filtro === 'Todas' ? facturas : facturas.filter((f) => f.estado === filtro);
  });

  readonly totalFilas = computed(() =>
    this.filtro() === 'OrdenesPendientes' ? this.ordenesBuscadas().length : this.facturasFiltradas().length
  );

  readonly paginaFacturas = computed(() => this.paginar(this.facturasFiltradas()));
  readonly paginaOrdenes = computed(() => this.paginar(this.ordenesBuscadas()));

  constructor(
    private readonly conciliacionService: ConciliacionService,
    private readonly dialog: MatDialog
  ) {
    this.hasta = new Date();
    this.desde = new Date();
    this.desde.setDate(this.desde.getDate() - 30);
  }

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    if (!this.desde || !this.hasta) return;
    this.cargando.set(true);
    this.conciliacionService.conciliar(this.aIso(this.desde), this.aIso(this.hasta)).subscribe({
      next: (resultado) => {
        this.conciliacion.set(resultado);
        this.pageIndex.set(0);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false)
    });
  }

  seleccionar(filtro: Filtro): void {
    this.filtro.set(filtro);
    this.pageIndex.set(0);
  }

  // Cada cambio en un filtro de texto vuelve a la primera página.
  cambiarTexto(campo: 'proveedor' | 'numeroOc' | 'numeroFactura', valor: string): void {
    this[campo].set(valor);
    this.pageIndex.set(0);
  }

  limpiarFiltros(): void {
    this.proveedor.set('');
    this.numeroOc.set('');
    this.numeroFactura.set('');
    this.pageIndex.set(0);
  }

  alCambiarPagina(evento: PageEvent): void {
    this.pageIndex.set(evento.pageIndex);
    this.pageSize.set(evento.pageSize);
  }

  verDetalle(factura: FacturaConciliada): void {
    const dialogRef = this.dialog.open(ConciliacionDetalleDialogComponent, {
      width: '72rem',
      maxWidth: '95vw',
      autoFocus: 'dialog',
      data: { facturaId: factura.facturaId }
    });
    dialogRef.afterOpened().subscribe(() => window.dispatchEvent(new Event('resize')));
  }

  etiqueta(estado: EstadoConciliacion): string {
    return this.etiquetas[estado];
  }

  claseEstado(estado: EstadoConciliacion): string {
    return `conciliacion__chip--${estado.toLowerCase()}`;
  }

  diasDesde(orden: OrdenPendiente): number {
    const fecha = new Date(`${orden.fecha}T00:00:00`);
    return Math.max(0, Math.floor((Date.now() - fecha.getTime()) / 86_400_000));
  }

  private paginar<T>(lista: T[]): T[] {
    const inicio = this.pageIndex() * this.pageSize();
    return lista.slice(inicio, inicio + this.pageSize());
  }

  private coincideProveedor(nombre: string, nit: string, buscado: string): boolean {
    const digitos = buscado.replace(/\D/g, '');
    return this.normalizar(nombre).includes(buscado) || (digitos.length >= 3 && nit.includes(digitos));
  }

  // Minúsculas y sin tildes, para que "PARAMO" encuentre "PÁRAMO".
  private normalizar(texto: string): string {
    return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  }

  // DateOnly del backend: se arma a mano con la fecha local (toISOString() la pasaría a UTC y
  // de noche en Colombia correría el día).
  private aIso(fecha: Date): string {
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${fecha.getFullYear()}-${mes}-${dia}`;
  }
}
