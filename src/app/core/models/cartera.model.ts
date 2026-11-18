// Saldo repartido por días de vencimiento a la fecha de corte.
export interface EdadesCartera {
  porVencer: number;
  de1A30: number;
  de31A60: number;
  de61A90: number;
  masDe90: number;
  vencido: number;
  total: number;
}

export interface UltimoEnvio {
  fecha: string; // UTC sin zona
  usuario: string;
  exitoso: boolean;
  error: string | null;
}

export interface ClienteCarteraResumen {
  nit: string;
  nombre: string;
  documentos: number;
  edades: EdadesCartera;
  diasMaximoVencido: number;
  correosCobro: string | null;
  contacto: string | null;
  ultimoEnvio: UltimoEnvio | null;
}

export interface Cartera {
  fechaCorte: string | null; // UTC sin zona
  totales: EdadesCartera;
  saldoMinimo: number;
  clientes: ClienteCarteraResumen[];
}

export interface DocumentoCartera {
  tipoDocumento: string;
  prefijo: string;
  numero: number;
  fecha: string;
  vencimiento: string;
  diasVencido: number;
  saldo: number;
}

export interface EnvioCartera {
  id: number;
  nit: string;
  nombreCliente: string;
  fecha: string; // UTC sin zona
  usuario: string;
  para: string;
  copias: string | null;
  asunto: string;
  documentos: number;
  saldo: number;
  saldoVencido: number;
  exitoso: boolean;
  error: string | null;
}

export interface ClienteCarteraDetalle {
  nit: string;
  nombre: string;
  correosWorldOffice: string | null;
  correosCobro: string | null;
  contacto: string | null;
  telefono: string | null;
  edades: EdadesCartera;
  documentos: DocumentoCartera[];
  envios: EnvioCartera[];
}

export interface ContactoCobro {
  correosCobro: string | null;
  contacto: string | null;
  telefono: string | null;
}

export interface CorreoCartera {
  nit: string;
  nombreCliente: string;
  remitente: string;
  para: string[];
  copias: string[];
  asunto: string;
  html: string;
  documentos: number;
  saldo: number;
  saldoVencido: number;
  noSePuedeEnviar: string | null;
}

export interface ResultadoEnvioCartera {
  nit: string;
  nombreCliente: string;
  enviado: boolean;
  motivo: string | null;
}

// pendienteFacturar = valor - facturado - otros. pagadaSinFactura: un recibo de caja le abonó
// directamente a la remisión (se cobró algo que no tiene factura).
export interface RemisionSinFactura {
  nit: string;
  nombreCliente: string;
  numero: number;
  fecha: string;
  diasSinFacturar: number;
  valor: number;
  facturado: number;
  pagado: number;
  pendienteFacturar: number;
  pagadaSinFactura: boolean;
}

export interface ConfiguracionCartera {
  remitente: string;
  nombreRemitente: string;
  copias: string | null;
  saldoMinimo: number;
  asunto: string;
  cuerpo: string;
  datosPago: string | null;
  servidorCorreoConfigurado: boolean;
}
