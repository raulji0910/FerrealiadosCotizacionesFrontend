import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.estaAutenticado) return true;

  router.navigate(['/login']);
  return false;
};

// Multirol: cada guard pregunta por el permiso, no por un rol único (el usuario ve la suma).
function permitir(condicion: (auth: AuthService) => boolean): CanActivateFn {
  return () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (condicion(authService)) return true;

    router.navigate([authService.rutaInicio]);
    return false;
  };
}

export const adminGuard = permitir((a) => a.esAdmin);

// Módulos de cotización (productos, proveedores, clientes, cotizaciones, alertas).
export const cotizacionGuard = permitir((a) => a.puedeCotizar);

// Conciliación de facturas de proveedor.
export const conciliacionGuard = permitir((a) => a.puedeVerConciliacion);

// Cartera de clientes.
export const carteraGuard = permitir((a) => a.puedeVerCartera);