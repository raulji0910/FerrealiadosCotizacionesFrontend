import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CarteraService } from '../../core/services/cartera.service';
import { ConfiguracionCartera } from '../../core/models/cartera.model';

// Parámetros del envío de estados de cuenta (solo Administrador): remitente, copias visibles,
// saldo mínimo y textos del correo. La cuenta y clave del servidor de correo van en el servidor.
@Component({
  selector: 'app-configuracion-cartera',
  standalone: true,
  imports: [FormsModule, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule],
  templateUrl: './configuracion-cartera.component.html',
  styleUrl: './configuracion-cartera.component.scss'
})
export class ConfiguracionCarteraComponent implements OnInit {
  private readonly carteraService = inject(CarteraService);
  private readonly snackBar = inject(MatSnackBar);

  readonly config = signal<ConfiguracionCartera | null>(null);
  readonly guardando = signal(false);

  ngOnInit(): void {
    this.carteraService.obtenerConfiguracion().subscribe((c) => this.config.set({ ...c }));
  }

  guardar(): void {
    const c = this.config();
    if (!c) return;
    this.guardando.set(true);
    this.carteraService.actualizarConfiguracion(c).subscribe({
      next: (nueva) => {
        this.config.set({ ...nueva });
        this.guardando.set(false);
        this.snackBar.open('Configuración de cartera guardada', 'Cerrar', { duration: 3000 });
      },
      error: (e: HttpErrorResponse) => {
        this.guardando.set(false);
        this.snackBar.open(typeof e.error === 'string' && e.error ? e.error : 'No se pudo guardar.', 'Cerrar', { duration: 6000 });
      }
    });
  }
}
