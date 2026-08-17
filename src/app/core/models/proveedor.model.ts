export interface Proveedor {
  id: number;
  nombre: string;
  nit: string | null;
  direccion: string | null;
  telefono: string | null;
  ciudad: string | null;
  activo: boolean;
}

export interface ProveedorCrear {
  nombre: string;
  nit: string | null;
  direccion: string | null;
  telefono: string | null;
  ciudad: string | null;
}

export interface ProveedorActualizar {
  nombre: string;
  nit: string | null;
  direccion: string | null;
  telefono: string | null;
  ciudad: string | null;
  activo: boolean;
}
