import { Routes } from '@angular/router';
import { authGuard, adminGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/login/login.component').then((m) => m.LoginComponent)
  },
  {
    path: '',
    loadComponent: () => import('./layout/layout.component').then((m) => m.LayoutComponent),
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'productos', pathMatch: 'full' },
      {
        path: 'productos',
        loadComponent: () => import('./features/productos/productos-list.component').then((m) => m.ProductosListComponent)
      },
      {
        path: 'productos/:id',
        loadComponent: () => import('./features/productos/producto-detalle.component').then((m) => m.ProductoDetalleComponent)
      },
      {
        path: 'proveedores',
        loadComponent: () => import('./features/proveedores/proveedores-list.component').then((m) => m.ProveedoresListComponent)
      },
      {
        path: 'alertas',
        loadComponent: () => import('./features/alertas/alertas.component').then((m) => m.AlertasComponent)
      },
      {
        path: 'clientes',
        loadComponent: () => import('./features/clientes/clientes-list.component').then((m) => m.ClientesListComponent)
      },
      {
        path: 'cotizaciones',
        loadComponent: () => import('./features/cotizaciones/cotizaciones-list.component').then((m) => m.CotizacionesListComponent)
      },
      {
        path: 'cotizaciones/:id',
        loadComponent: () => import('./features/cotizaciones/cotizacion-detalle.component').then((m) => m.CotizacionDetalleComponent)
      },
      {
        path: 'configuracion',
        loadComponent: () => import('./features/configuracion/configuracion.component').then((m) => m.ConfiguracionComponent),
        canActivate: [adminGuard]
      },
      {
        path: 'usuarios',
        loadComponent: () => import('./features/usuarios/usuarios-list.component').then((m) => m.UsuariosListComponent),
        canActivate: [adminGuard]
      }
    ]
  },
  { path: '**', redirectTo: '' }
];
