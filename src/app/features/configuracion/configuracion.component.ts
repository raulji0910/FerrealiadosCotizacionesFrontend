import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ConfiguracionService } from '../../core/services/configuracion.service';

@Component({
  selector: 'app-configuracion',
  standalone: true,
  imports: [FormsModule, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  templateUrl: './configuracion.component.html',
  styleUrl: './configuracion.component.scss'
})
export class ConfiguracionComponent implements OnInit {
  readonly guardando = signal(false);
  mesesVigenciaPrecio: number | null = null;

  constructor(private readonly configuracionService: ConfiguracionService, private readonly snackBar: MatSnackBar) {}

  ngOnInit(): void {
    this.configuracionService.obtener().subscribe((config) => {
      this.mesesVigenciaPrecio = config.mesesVigenciaPrecio;
    });
  }

  guardar(): void {
    if (!this.mesesVigenciaPrecio || this.mesesVigenciaPrecio <= 0) return;

    this.guardando.set(true);
    this.configuracionService.actualizar({ mesesVigenciaPrecio: this.mesesVigenciaPrecio }).subscribe({
      next: () => {
        this.guardando.set(false);
        this.snackBar.open('Configuración actualizada', 'Cerrar', { duration: 3000 });
      },
      error: () => {
        this.guardando.set(false);
        this.snackBar.open('No se pudo actualizar la configuración.', 'Cerrar', { duration: 4000 });
      }
    });
  }
}
