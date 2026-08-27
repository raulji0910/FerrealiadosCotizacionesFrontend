import { Component, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
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

  constructor(
    private readonly cotizacionService: CotizacionService,
    private readonly router: Router
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

  abrir(cotizacion: CotizacionResumen): void {
    this.router.navigate(['/cotizaciones', cotizacion.id]);
  }

  private cargarPagina(): void {
    this.cargando.set(true);
    this.cotizacionService
      .buscar(this.estado || undefined, this.texto || undefined, this.pageIndex() + 1, this.pageSize())
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
