export interface PrecioProveedor {
  precioId: number;
  proveedorId: number;
  proveedorNombre: string;
  costo: number;
  costoBase: number;
  porcentajeAjuste: number;
  fechaCotizacion: string;
  diasDesdeCotizacion: number;
  vencido: boolean;
  esMejorPrecio: boolean;
}

export interface RegistrarPrecio {
  proveedorId: number;
  costo: number;
  porcentajeAjuste: number;
  fechaCotizacion: string;
  observaciones: string | null;
  creadoPor: string | null;
}

export interface AlertaPrecio {
  productoId: number;
  productoCodigo: string;
  productoNombre: string;
  proveedorId: number;
  proveedorNombre: string;
  costo: number;
  fechaCotizacion: string;
  diasDesdeCotizacion: number;
}
