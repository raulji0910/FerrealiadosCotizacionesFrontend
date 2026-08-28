import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { ClienteService } from '../../core/services/cliente.service';
import { Cliente } from '../../core/models/cliente.model';
import { EmitirCotizacion } from '../../core/models/cotizacion.model';

const MAXIMO_SUGERENCIAS = 50;
const FORMAS_PAGO = ['Contado', 'Crédito'];

@Component({
  selector: 'app-emitir-cotizacion-dialog',
  standalone: true,
  imports: [FormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatAutocompleteModule, MatSelectModule, MatButtonModule],
  templateUrl: './emitir-cotizacion-dialog.component.html'
})
export class EmitirCotizacionDialogComponent implements OnInit {
  private readonly dialogRef = inject(MatDialogRef<EmitirCotizacionDialogComponent>);
  private readonly clienteService = inject(ClienteService);

  readonly formasPago = FORMAS_PAGO;

  // Mientras el usuario escribe, guarda el texto (string); al elegir una opción, guarda el Cliente completo.
  clienteSeleccionado: Cliente | string | null = null;
  formaPago: string | null = null;
  nota = '';
  descuento: number | null = null;

  private readonly clientes = signal<Cliente[]>([]);
  private readonly filtroCliente = signal('');

  readonly clientesFiltrados = computed(() => {
    const filtro = this.filtroCliente().trim().toLowerCase();
    const lista = filtro
      ? this.clientes().filter((cliente) => cliente.nombre.toLowerCase().includes(filtro))
      : this.clientes();
    return lista.slice(0, MAXIMO_SUGERENCIAS);
  });

  ngOnInit(): void {
    this.clienteService.listarActivos().subscribe((clientes) => this.clientes.set(clientes));
  }

  alEscribirCliente(valor: string | Cliente): void {
    this.filtroCliente.set(typeof valor === 'string' ? valor : valor.nombre);
  }

  mostrarNombreCliente = (cliente: Cliente | string | null): string =>
    cliente && typeof cliente !== 'string' ? cliente.nombre : (cliente ?? '');

  guardar(): void {
    const clienteId = this.clienteSeleccionado && typeof this.clienteSeleccionado !== 'string'
      ? this.clienteSeleccionado.id
      : null;
    if (!clienteId) return;

    const dto: EmitirCotizacion = {
      clienteId,
      formaPago: this.formaPago,
      nota: this.nota || null,
      descuento: this.descuento || null
    };

    this.dialogRef.close(dto);
  }

  cancelar(): void {
    this.dialogRef.close(null);
  }
}
