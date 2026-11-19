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
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CarteraService } from '../../core/services/cartera.service';
import { Cartera, ClienteCarteraResumen, EnvioCartera, RemisionSinFactura } from '../../core/models/cartera.model';
import { CarteraClienteDialogComponent } from './cartera-cliente-dialog.component';
import { EnvioMasivoDialogComponent, EnvioMasivoDialogData } from './envio-masivo-dialog.component';
import { RemisionDetalleDialogComponent } from './remision-detalle-dialog.component';

type ValorOrden = string | number | null;
const sinOrden: Sort = { active: '', direction: '' };

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
    MatTooltipModule,
    MatSortModule
  ],
  templateUrl: './cartera.component.html',
  styleUrl: './cartera.component.scss'
})
export class CarteraComponent implements OnInit {
  private readonly carteraService = inject(CarteraService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  readonly columnasClientes = ['seleccion', 'cliente', 'total', 'vencido', 'dias', 'contacto', 'envio'];
  readonly columnasRemisiones = ['fecha', 'cliente', 'remision', 'dias', 'valor', 'facturado', 'pendiente'];
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

  // Orden elegido con clic en los encabezados (asc → desc → como llega). Uno por tabla.
  readonly ordenClientes = signal<Sort>(sinOrden);
  readonly ordenRemisiones = signal<Sort>(sinOrden);
  readonly ordenEnvios = signal<Sort>(sinOrden);

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

  readonly clientesOrdenados = computed(() =>
    this.ordenarLista(this.clientesFiltrados(), this.ordenClientes(), (c, columna) => this.valorCliente(c, columna))
  );

  readonly enviosOrdenados = computed(() =>
    this.ordenarLista(this.envios() ?? [], this.ordenEnvios(), (e, columna) => this.valorEnvio(e, columna))
  );

  readonly sinContacto = computed(() => this.cartera()?.clientes.filter((c) => !c.correosCobro).length ?? 0);

  // Clientes que sí deberían recibir cobro (saldo sobre el mínimo) pero no tienen a quién enviarlo:
  // típicamente clientes nuevos que acaban de aparecer en la cartera de WO.
  readonly pendientesDeCorreo = computed(() => {
    const datos = this.cartera();
    if (!datos) return { cantidad: 0, total: 0 };
    const lista = datos.clientes.filter((c) => !c.correosCobro && c.edades.total >= datos.saldoMinimo);
    return { cantidad: lista.length, total: lista.reduce((t, c) => t + c.edades.total, 0) };
  });
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
      mes.total += r.pendienteFacturar;
    }
    const orden = this.ordenRemisiones();
    for (const mes of meses.values()) {
      mes.remisiones = this.ordenarLista(mes.remisiones, orden, (r, columna) => this.valorRemision(r, columna));
    }
    return [...meses.values()].sort((a, b) => b.clave.localeCompare(a.clave));
  });

  readonly totalRemisiones = computed(() => this.remisionesPorMes().reduce((t, m) => t + m.total, 0));
  readonly cantidadRemisiones = computed(() => this.remisionesPorMes().reduce((t, m) => t + m.remisiones.length, 0));

  // Remisiones que el cliente ya pagó (recibo de caja contra la REM) sin que exista factura.
  readonly pagadasSinFactura = computed(() => (this.remisiones() ?? []).filter((r) => r.pagadaSinFactura));

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

  abrirRemision(remision: RemisionSinFactura): void {
    this.dialog.open(RemisionDetalleDialogComponent, { width: '36rem', maxWidth: '96vw', autoFocus: false, data: remision });
  }

  verPendientesDeCorreo(): void {
    this.soloSinContacto.set(true);
    this.soloVencidos.set(false);
    this.busqueda.set('');
  }

  // Los vacíos (sin correo, nunca enviado) van siempre al final, en los dos sentidos.
  private ordenarLista<T>(lista: T[], orden: Sort, valor: (item: T, columna: string) => ValorOrden): T[] {
    if (!orden.active || !orden.direction) return lista;
    const signo = orden.direction === 'asc' ? 1 : -1;
    return [...lista].sort((a, b) => {
      const va = valor(a, orden.active);
      const vb = valor(b, orden.active);
      if (va === null || vb === null) return va === vb ? 0 : va === null ? 1 : -1;
      const comparacion =
        typeof va === 'number' && typeof vb === 'number'
          ? va - vb
          : String(va).localeCompare(String(vb), 'es', { numeric: true, sensitivity: 'base' });
      return comparacion * signo;
    });
  }

  private valorCliente(c: ClienteCarteraResumen, columna: string): ValorOrden {
    switch (columna) {
      case 'cliente': return c.nombre;
      case 'total': return c.edades.total;
      case 'vencido': return c.edades.vencido;
      case 'dias': return c.diasMaximoVencido;
      case 'contacto': return c.correosCobro || null;
      case 'envio': return c.ultimoEnvio?.fecha ?? null;
      default: return null;
    }
  }

  private valorRemision(r: RemisionSinFactura, columna: string): ValorOrden {
    switch (columna) {
      case 'fecha': return r.fecha;
      case 'cliente': return r.nombreCliente;
      case 'remision': return r.numero;
      case 'dias': return r.diasSinFacturar;
      case 'valor': return r.valor;
      case 'facturado': return r.facturado;
      case 'pendiente': return r.pendienteFacturar;
      default: return null;
    }
  }

  private valorEnvio(e: EnvioCartera, columna: string): ValorOrden {
    switch (columna) {
      case 'fecha': return e.fecha;
      case 'cliente': return e.nombreCliente;
      case 'para': return e.para;
      case 'saldo': return e.saldo;
      case 'usuario': return e.usuario;
      case 'estado': return e.exitoso ? 1 : 0;
      default: return null;
    }
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
