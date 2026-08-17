export interface Producto {
  id: number;
  codigo: string | null;
  nombre: string;
  descripcion: string | null;
  unidadMedida: string | null;
  activo: boolean;
  ultimaFechaCotizacion: string | null;
}

export interface ProductoCrear {
  codigo: string | null;
  nombre: string;
  descripcion: string | null;
  unidadMedida: string | null;
}

export interface ProductoActualizar {
  codigo: string | null;
  nombre: string;
  descripcion: string | null;
  unidadMedida: string | null;
  activo: boolean;
}
