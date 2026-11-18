import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CarteraService } from '../../core/services/cartera.service';
import { Cartera, ClienteCarteraResumen, EnvioCartera, RemisionSinFactura } from '../../core/models/cartera.model';
import { CarteraClienteDialogComponent } from './cartera-cliente-dialog.component';
import { EnvioMasivoDialogComponent, EnvioMasivoDialogData } from './envio-masivo-dialog.component';

interface Tarjeta {
  titulo: string;
  valor: number;
  clase: string;
}

interface MesRemisiones {
  clave: string;
  fecha: Date;
  remisiones: RemisionSinFactura[];
  total: number;
}

// Cartera de clientes (FVE y demás documentos de la cuenta 1305 de World Office, ya con abonos
// descontados): estado de cuenta por cliente y envío por correo a sus contactos de cobro. Las
// remisiones sin factura van en su propia pestaña, mes por mes.
@Component({
  selector: 'app-cartera',
  standalone: true,
  imports: [
    CurrencyPipe,
    DatePipe,
    DecimalPipe,
    FormsModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatSlideToggleModule,
    MatTabsModule,
    MatTooltipModule
  ],
  templateUrl: './cartera.component.html',
  styleUrl: './cartera.component.scss'
})
export class CarteraComponent implements OnInit {
  private readonly carteraService = inject(CarteraService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  readonly columnasClientes = ['seleccion', 'cliente', 'total', 'vencido', 'dias', 'contacto', 'envio'];
  readonly columnasRemisiones = ['fecha', 'cliente', 'remision', 'dias', 'saldo'];
  readonly columnasEnvios = ['fecha', 'cliente', 'para', 'saldo', 'usuario', 'estado'];

  readonly cartera = signal<Cartera | null>(null);
  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);

  readonly busqueda = signal('');
  readonly soloVencidos = signal(false);
  readonly soloSinContacto = signal(false);
  readonly seleccion = signal<ReadonlySet<string>>(new Set());

  readonly remisiones = signal<RemisionSinFactura[] | null>(null);
  readonly busquedaRemisiones = signal('');
  readonly envios = signal<EnvioCartera[] | null>(null);

  readonly tarjetas = computed<Tarjeta[]>(() => {
    const t = this.cartera()?.totales;
    if (!t) return [];
    return [
      { titulo: 'Total cartera', valor: t.total, clase: 'total' },
      { titulo: 'Por vencer', valor: t.porVencer, clase: 'al-dia' },
      { titulo: '1 a 30 días', valor: t.de1A30, clase: 'd30' },
      { titulo: '31 a 60 días', valor: t.de31A60, clase: 'd60' },
      { titulo: '61 a 90 días', valor: t.de61A90, clase: 'd90' },
      { titulo: 'Más de 90 días', valor: t.masDe90, clase: 'mas90' }
    ];
  });

  readonly clientesFiltrados = computed(() => {
    const datos = this.cartera();
    if (!datos) return [];
    const texto = this.normalizar(this.busqueda());
    return datos.clientes.filter(
      (c) =>
        (!texto || this.normalizar(c.nombre).includes(texto) || c.nit.includes(texto)) &&
        (!this.soloVencidos() || c.edades.vencido > 0) &&
        (!this.soloSinContacto() || !c.correosCobro)
    );
  });

  readonly sinContacto = computed(() => this.cartera()?.clientes.filter((c) => !c.correosCobro).length ?? 0);
  readonly cantidadSeleccionados = computed(() => this.seleccion().size);
  readonly todosSeleccionados = computed(() => {
    const visibles = this.clientesFiltrados();
    return visibles.length > 0 && visibles.every((c) => this.seleccion().has(c.nit));
  });

  readonly remisionesPorMes = computed<MesRemisiones[]>(() => {
    const texto = this.normalizar(this.busquedaRemisiones());
    const meses = new Map<string, MesRemisiones>();
    for (const r of this.remisiones() ?? []) {
      if (texto && !this.normalizar(r.nombreCliente).includes(texto) && !r.nit.includes(texto) && !String(r.numero).includes(texto)) continue;
      const clave = r.fecha.substring(0, 7);
      let mes = meses.get(clave);
      if (!mes) {
        const [anio, numeroMes] = clave.split('-').map(Number);
        mes = { clave, fecha: new Date(anio, numeroMes - 1, 1), remisiones: [], total: 0 };
        meses.set(clave, mes);
      }
      mes.remisiones.push(r);
      mes.total += r.saldo;
    }
    return [...meses.values()].sort((a, b) => b.clave.localeCompare(a.clave));
  });

  readonly totalRemisiones = computed(() => this.remisionesPorMes().reduce((t, m) => t + m.total, 0));
  readonly cantidadRemisiones = computed(() => this.remisionesPorMes().reduce((t, m) => t + m.remisiones.length, 0));

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.carteraService.obtener().subscribe({
      next: (datos) => {
        this.cartera.set(datos);
        // La selección solo conserva clientes que siguen en la cartera.
        const nits = new Set(datos.clientes.map((c) => c.nit));
        this.seleccion.set(new Set([...this.seleccion()].filter((n) => nits.has(n))));
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No se pudo cargar la cartera.');
        this.cargando.set(false);
      }
    });
  }

  alCambiarPestana(indice: number): void {
    if (indice === 1 && this.remisiones() === null) this.cargarRemisiones();
    if (indice === 2) this.cargarEnvios();
  }

  cargarRemisiones(): void {
    this.carteraService.remisiones().subscribe({
      next: (r) => this.remisiones.set(r),
      error: () => this.snackBar.open('No se pudieron cargar las remisiones.', 'Cerrar', { duration: 4000 })
    });
  }

  cargarEnvios(): void {
    this.carteraService.envios().subscribe({
      next: (e) => this.envios.set(e),
      error: () => this.snackBar.open('No se pudo cargar el historial de envíos.', 'Cerrar', { duration: 4000 })
    });
  }

  alternar(nit: string, marcado: boolean): void {
    const nueva = new Set(this.seleccion());
    if (marcado) nueva.add(nit);
    else nueva.delete(nit);
    this.seleccion.set(nueva);
  }

  alternarTodos(marcado: boolean): void {
    const nueva = new Set(this.seleccion());
    for (const c of this.clientesFiltrados()) {
      if (marcado) nueva.add(c.nit);
      else nueva.delete(c.nit);
    }
    this.seleccion.set(nueva);
  }

  abrirCliente(cliente: ClienteCarteraResumen): void {
    const ref = this.dialog.open(CarteraClienteDialogComponent, {
      width: '62rem',
      maxWidth: '96vw',
      autoFocus: false,
      data: { nit: cliente.nit }
    });
    ref.afterClosed().subscribe((cambio) => {
      if (cambio) this.cargar();
    });
  }

  enviarSeleccionados(): void {
    const sel = this.seleccion();
    this.abrirEnvioMasivo(this.cartera()?.clientes.filter((c) => sel.has(c.nit)) ?? [], 'los clientes seleccionados');
  }

  enviarVencidos(): void {
    this.abrirEnvioMasivo(this.cartera()?.clientes.filter((c) => c.edades.vencido > 0) ?? [], 'todos los clientes con saldo vencido');
  }

  private abrirEnvioMasivo(clientes: ClienteCarteraResumen[], descripcion: string): void {
    const datos = this.cartera();
    if (!datos || clientes.length === 0) return;
    const data: EnvioMasivoDialogData = { clientes, saldoMinimo: datos.saldoMinimo, descripcion };
    const ref = this.dialog.open(EnvioMasivoDialogComponent, { width: '40rem', maxWidth: '96vw', disableClose: true, data });
    ref.afterClosed().subscribe((huboEnvios) => {
      if (huboEnvios) {
        this.seleccion.set(new Set());
        this.cargar();
        this.envios.set(null);
      }
    });
  }

  claseDias(dias: number): string {
    if (dias > 90) return 'cartera__dias--mas90';
    if (dias > 60) return 'cartera__dias--d90';
    if (dias > 30) return 'cartera__dias--d60';
    if (dias > 0) return 'cartera__dias--d30';
    return 'cartera__dias--al-dia';
  }

  private normalizar(texto: string): string {
    return texto
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .trim();
  }
}
