export type EstadoCotizacion = 'Borrador' | 'Emitida';

// Un precio puede tener varias marcas activas simultáneas (una por cada cotización en
// construcción que lo incluya). Las de estado Emitida son de solo lectura (trazabilidad).
export interface MarcaCotizacion {
  cotizacionItemId: number;
  cotizacionId: number;
  codigo: string;
  estado: EstadoCotizacion;
  cantidad: number;
}

export interface MarcarPrecio {
  precioId: number;
  codigo: string;
  cantidad: number;
}

export interface CotizacionItem {
  id: number;
  cotizacionId: number;
  productoProveedorPrecioId: number | null;
  productoId: number;
  productoNombre: string;
  productoCodigo: string | null;
  proveedorId: number;
  proveedorNombre: string;
  precioUnitario: number;
  ivaSnapshot: number | null;
  cantidad: number;
  subtotal: number;
}

export interface CotizacionResumen {
  id: number;
  codigo: string;
  estado: EstadoCotizacion;
  consecutivo: number | null;
  consecutivoFormateado: string | null;
  clienteId: number | null;
  clienteNombre: string | null;
  fechaEmision: string | null;
  fechaCreacion: string;
  cantidadItems: number;
  total: number;
}

// Desglose del IVA del total por cada tarifa presente en los ítems (pueden convivir varias:
// 19%, 5%, 0%). Base = subtotal de esa tarifa ya con el descuento prorrateado.
export interface IvaDesglose {
  tarifa: number;
  base: number;
  valor: number;
}

export interface CotizacionDetalle extends CotizacionResumen {
  clienteNit: string | null;
  clienteContacto: string | null;
  clienteEmail: string | null;
  clienteDireccion: string | null;
  clienteCiudad: string | null;
  formaPago: string | null;
  nota: string | null;
  creadoPor: string | null;
  items: CotizacionItem[];
  descuento: number;
  subtotal: number;
  ivaDesglose: IvaDesglose[];
  totalGeneral: number;
}

export interface EmitirCotizacion {
  clienteId: number;
  formaPago: string | null;
  nota: string | null;
  descuento: number | null;
}

export interface ActualizarCantidadItem {
  cantidad: number;
}
