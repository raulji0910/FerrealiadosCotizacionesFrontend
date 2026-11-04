export type EstadoConciliacion = 'Cuadra' | 'Diferencia' | 'Parcial' | 'SinOrdenCompra';

export interface FacturaConciliada {
  facturaId: number;
  numero: string;
  fechaEmision: string;
  nitProveedor: string;
  nombreProveedor: string;
  subtotal: number;
  iva: number;
  total: number;
  referenciaOrden: string | null;
  estado: EstadoConciliacion;
  ordenCompraNumero: number | null;
  ordenCompraFecha: string | null;
  ordenCompraSubtotal: number | null;
  ordenCompraIva: number | null;
  diferenciaSubtotal: number | null;
  diferenciaIva: number | null;
  detalle: string;
}

export interface OrdenPendiente {
  numero: number;
  fecha: string;
  nitProveedor: string;
  nombreProveedor: string;
  subtotal: number;
  iva: number;
  saldoSubtotal: number;
}

export interface ResumenConciliacion {
  cuadran: number;
  conDiferencia: number;
  parciales: number;
  sinOrdenCompra: number;
  ordenesPendientes: number;
}

export interface Conciliacion {
  desde: string;
  hasta: string;
  resumen: ResumenConciliacion;
  facturas: FacturaConciliada[];
  ordenesPendientes: OrdenPendiente[];
  ultimaSincronizacionOrdenes: string | null;
  ultimaFacturaRecibida: string | null;
}

export interface RenglonComparacion {
  codigo: string | null;
  descripcion: string;
  cantidad: number;
  valorUnitario: number;
  subtotal: number;
  porcentajeIva: number | null;
}

export interface DetalleFacturaConciliada {
  conciliacion: FacturaConciliada;
  renglonesFactura: RenglonComparacion[];
  renglonesOrdenCompra: RenglonComparacion[];
}
