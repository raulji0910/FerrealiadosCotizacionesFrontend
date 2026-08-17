import { Component, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { AlertaService } from '../../core/services/alerta.service';
import { AlertaPrecio } from '../../core/models/precio.model';

@Component({
  selector: 'app-alertas',
  standalone: true,
  imports: [
    CurrencyPipe,
    DatePipe,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressBarModule,
    MatPaginatorModule
  ],
  templateUrl: './alertas.component.html',
  styleUrl: './alertas.component.scss'
})
export class AlertasComponent implements OnInit {
  readonly columnas = ['producto', 'proveedor', 'costo', 'fecha', 'dias', 'acciones'];
  readonly alertas = signal<AlertaPrecio[]>([]);
  readonly total = signal(0);
  readonly pageIndex = signal(0);
  readonly pageSize = signal(10);
  readonly cargando = signal(false);

  constructor(private readonly alertaService: AlertaService, private readonly router: Router) {}

  ngOnInit(): void {
    this.cargarPagina();
  }

  alCambiarPagina(evento: PageEvent): void {
    this.pageIndex.set(evento.pageIndex);
    this.pageSize.set(evento.pageSize);
    this.cargarPagina();
  }

  private cargarPagina(): void {
    this.cargando.set(true);
    this.alertaService.obtenerPreciosVencidos(this.pageIndex() + 1, this.pageSize()).subscribe({
      next: (resultado) => {
        this.alertas.set(resultado.items);
        this.total.set(resultado.total);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false)
    });
  }

  irAProducto(alerta: AlertaPrecio): void {
    this.router.navigate(['/productos', alerta.productoId]);
  }
}
