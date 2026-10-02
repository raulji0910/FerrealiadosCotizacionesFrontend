import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { CotizacionService } from '../../core/services/cotizacion.service';
import { CotizacionResumen, EstadoCotizacion } from '../../core/models/cotizacion.model';

@Component({
  selector: 'app-cotizaciones-list',
  standalone: true,
  imports: [
    FormsModule,
    CurrencyPipe,
    DatePipe,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatChipsModule,
    MatProgressBarModule,
    MatPaginatorModule
  ],
  templateUrl: './cotizaciones-list.component.html',
  styleUrl: './cotizaciones-list.component.scss'
})
export class CotizacionesListComponent implements OnInit {
  readonly columnas = ['codigo', 'estado', 'consecutivo', 'cliente', 'fecha', 'items', 'total'];
  readonly cotizaciones = signal<CotizacionResumen[]>([]);
  readonly total = signal(0);
  readonly pageIndex = signal(0);
  readonly pageSize = signal(10);
  readonly cargando = signal(false);
  texto = '';
  estado: EstadoCotizacion | '' = '';

  precioId: number | null = null;
  filtroProducto: string | null = null;
  filtroProveedor: string | null = null;

  constructor(
    private readonly cotizacionService: CotizacionService,
    private readonly router: Router,
    private readonly route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // El estado de búsqueda vive en la URL (query params) para que, al entrar al detalle de una
    // cotización y volver (botón "Cotizaciones" o el "atrás" del navegador), se conserve tal cual
    // — ver volver() en cotizacion-detalle.component.ts, que usa Location.back().
    const params = this.route.snapshot.queryParamMap;
    this.texto = params.get('texto') ?? '';
    this.estado = (params.get('estado') as EstadoCotizacion | null) ?? '';

    const pagina = params.get('pagina');
    const tamanoPagina = params.get('tamanoPagina');
    if (pagina) this.pageIndex.set(Math.max(0, Number(pagina) - 1));
    if (tamanoPagina) this.pageSize.set(Number(tamanoPagina));

    const precioId = params.get('precioId');
    this.precioId = precioId ? Number(precioId) : null;
    this.filtroProducto = params.get('producto');
    this.filtroProveedor = params.get('proveedor');

    this.cargarPagina(); // no buscar(): eso resetearía a la página 1 perdiendo la restaurada de la URL
  }

  quitarFiltroPrecio(): void {
    this.precioId = null;
    this.filtroProducto = null;
    this.filtroProveedor = null;
    this.pageIndex.set(0);
    this.actualizarUrl();
    this.cargarPagina();
  }

  buscar(): void {
    this.pageIndex.set(0);
    this.actualizarUrl();
    this.cargarPagina();
  }

  limpiarBusqueda(): void {
    this.texto = '';
    this.buscar();
  }

  alCambiarPagina(evento: PageEvent): void {
    this.pageIndex.set(evento.pageIndex);
    this.pageSize.set(evento.pageSize);
    this.actualizarUrl();
    this.cargarPagina();
  }

  // replaceUrl: true evita apilar una entrada de historial por cada tecla escrita en el buscador
  // — el botón "atrás" del navegador debe volver a la pantalla anterior a esta lista, no a un
  // estado de búsqueda intermedio.
  private actualizarUrl(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      replaceUrl: true,
      queryParams: {
        texto: this.texto || null,
        estado: this.estado || null,
        pagina: this.pageIndex() + 1,
        tamanoPagina: this.pageSize(),
        precioId: this.precioId,
        producto: this.filtroProducto,
        proveedor: this.filtroProveedor
      }
    });
  }

  abrir(cotizacion: CotizacionResumen): void {
    this.router.navigate(['/cotizaciones', cotizacion.id]);
  }

  private cargarPagina(): void {
    this.cargando.set(true);
    this.cotizacionService
      .buscar(
        this.estado || undefined,
        this.texto || undefined,
        this.pageIndex() + 1,
        this.pageSize(),
        this.precioId ?? undefined
      )
      .subscribe({
        next: (resultado) => {
          this.cotizaciones.set(resultado.items);
          this.total.set(resultado.total);
          this.cargando.set(false);
        },
        error: () => this.cargando.set(false)
      });
  }
}
