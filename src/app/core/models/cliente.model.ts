export interface Cliente {
  id: number;
  nombre: string;
  nit: string | null;
  direccion: string | null;
  telefono: string | null;
  ciudad: string | null;
  activo: boolean;
}

export interface ClienteCrear {
  nombre: string;
  nit: string | null;
  direccion: string | null;
  telefono: string | null;
  ciudad: string | null;
}

export interface ClienteActualizar {
  nombre: string;
  nit: string | null;
  direccion: string | null;
  telefono: string | null;
  ciudad: string | null;
  activo: boolean;
}
