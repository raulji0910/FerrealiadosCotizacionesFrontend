export interface PrecioProveedor {
  precioId: number;
  proveedorId: number;
  proveedorNombre: string;
  costo: number;
  costoBase: number;
  porcentajeAjuste: number;
  iva: number | null;
  costoConIva: number | null;
  fechaCotizacion: string;
  diasDesdeCotizacion: number;
  vencido: boolean;
  esMejorPrecio: boolean;
}

export interface RegistrarPrecio {
  proveedorId: number;
  costo: number;
  porcentajeAjuste: number;
  iva: number | null;
  fechaCotizacion: string;
  observaciones: string | null;
  creadoPor: string | null;
}

export interface PrecioActualizado {
  precioId: number;
  costo: number;
  porcentajeAjuste: number;
}

export interface IvaActualizado {
  precioId: number;
  iva: number | null;
  costoConIva: number | null;
}

export interface AlertaPrecio {
  productoId: number;
  productoCodigo: string | null;
  productoNombre: string;
  proveedorId: number;
  proveedorNombre: string;
  costo: number;
  fechaCotizacion: string;
  diasDesdeCotizacion: number;
}
