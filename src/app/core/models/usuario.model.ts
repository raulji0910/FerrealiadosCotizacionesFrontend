export type Rol = 'Admin' | 'Cotizador' | 'Conciliador' | 'Cartera';

// Multirol: un usuario tiene uno o varios roles y ve la suma de todos.
export interface Usuario {
  id: number;
  nombre: string;
  email: string;
  roles: Rol[];
  activo: boolean;
}

export interface UsuarioCrear {
  nombre: string;
  email: string;
  password: string;
  roles: Rol[];
}

export interface UsuarioActualizar {
  nombre: string;
  roles: Rol[];
  activo: boolean;
  nuevaPassword: string | null;
}