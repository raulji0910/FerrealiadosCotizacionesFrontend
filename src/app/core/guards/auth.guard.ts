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

export const adminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.esAdmin) return true;

  router.navigate([authService.rutaInicio]);
  return false;
};

// Módulos de cotización (productos, proveedores, clientes, cotizaciones, alertas): todos menos el
// Conciliador y Cartera, que solo ven su módulo.
export const cotizacionGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.esConciliador && !authService.esCartera) return true;

  router.navigate([authService.rutaInicio]);
  return false;
};

// Conciliación de facturas de proveedor: todos menos el rol Cartera.
export const conciliacionGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.esCartera) return true;

  router.navigate([authService.rutaInicio]);
  return false;
};

// Cartera de clientes: Administrador y rol Cartera.
export const carteraGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.esAdmin || authService.esCartera) return true;

  router.navigate([authService.rutaInicio]);
  return false;
};
