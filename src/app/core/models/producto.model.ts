export interface Producto {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  unidadMedida: string | null;
  activo: boolean;
  ultimaFechaCotizacion: string | null;
}

export interface ProductoCrear {
  codigo: string;
  nombre: string;
  descripcion: string | null;
  unidadMedida: string | null;
}

export interface ProductoActualizar {
  nombre: string;
  descripcion: string | null;
  unidadMedida: string | null;
  activo: boolean;
}
