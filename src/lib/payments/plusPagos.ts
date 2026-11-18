import crypto from 'crypto';
import type {
  PaymentProvider,
  CreateCheckoutParams,
  CreateCheckoutResult,
  WebhookEvent,
} from './types';

export class PaymentProviderNotConfiguredError extends Error {
  constructor(provider: string) {
    super(`${provider} no está configurado todavía (faltan credenciales de la API).`);
    this.name = 'PaymentProviderNotConfiguredError';
  }
}

/**
 * Plus Pagos / ASJ Servicios (Nuevo Banco de Santa Fe) — Botón de pago simple.
 *
 * El algoritmo replica la librería oficial de ASJ Servicios
 * (github.com/asjservicios/pluspagosfirm y pluspagosfirm-java, versión
 * "clásica" que usa el backend del banco):
 *   - Los campos sensibles del formulario (Monto, SucursalComercio, URLs de
 *     callback) se cifran con AES-256-CBC usando la SECRET KEY como clave:
 *     el TEXTO de la clave repetido/recortado a 32 caracteres (no se
 *     decodifica Base64). Salida: base64(iv + ciphertext).
 *   - Hash = sha256(ip*comercio*sucursal*montoEnCentavos*secretKey).
 *   - La FRASE (Base64) no cifra el formulario: es la credencial para
 *     autenticarse en la API (POST /sesion { guid, frase }).
 *
 * Variables de entorno:
 *   - PLUS_PAGOS_API_URL: URL del POST del formulario (https://botonpp.asjservicios.com.ar/)
 *   - PLUS_PAGOS_API_BASE: base de la API de consultas (default: https://botonpp.asjservicios.com.ar:8082/)
 *   - PLUS_PAGOS_MERCHANT_ID: GUID del comercio
 *   - PLUS_PAGOS_SECRET_KEY: clave secreta (cifrado del formulario + hash)
 *   - PLUS_PAGOS_PHRASE: frase para autenticarse en la API de consultas
 *   - PLUS_PAGOS_FORM_KEY_SOURCE: 'secret_key' (default, como la librería oficial) o 'phrase',
 *     solo por si el banco indicara otra cosa al hacer la prueba real.
 */
const API_URL = process.env.PLUS_PAGOS_API_URL || 'https://botonpp.asjservicios.com.ar/';
const API_BASE = process.env.PLUS_PAGOS_API_BASE || 'https://botonpp.asjservicios.com.ar:8082/';
const MERCHANT_ID = process.env.PLUS_PAGOS_MERCHANT_ID || '';
const SECRET_KEY = process.env.PLUS_PAGOS_SECRET_KEY || '';
const PHRASE = process.env.PLUS_PAGOS_PHRASE || '';
const FORM_KEY_SOURCE = process.env.PLUS_PAGOS_FORM_KEY_SOURCE === 'phrase' ? 'phrase' : 'secret_key';

/** Clave AES igual que la librería oficial: texto repetido hasta 32 caracteres, en bytes UTF-8. */
export function getAesKey(keyText: string): Buffer {
  if (!keyText) {
    throw new Error('Falta la clave de cifrado de Plus Pagos.');
  }
  let k = keyText;
  while (k.length < 32) k += k;
  return Buffer.from(k.slice(0, 32), 'utf-8');
}

function formKeyText(): string {
  return FORM_KEY_SOURCE === 'phrase' ? PHRASE : SECRET_KEY;
}

/** AES-256-CBC con IV aleatorio. Retorna base64(iv + ciphertext). */
export function aesEncrypt(plainText: string, keyText: string = formKeyText()): string {
  const key = getAesKey(keyText);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf-8'), cipher.final()]);
  return Buffer.concat([iv, encrypted]).toString('base64');
}

export function aesDecrypt(cipherTextB64: string, keyText: string = formKeyText()): string {
  const key = getAesKey(keyText);
  const raw = Buffer.from(cipherTextB64, 'base64');
  if (raw.length < 17) {
    throw new Error('Texto cifrado inválido: longitud insuficiente.');
  }
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, raw.subarray(0, 16));
  return Buffer.concat([decipher.update(raw.subarray(16)), decipher.final()]).toString('utf-8');
}

/** sha256(ip*comercio*sucursal*monto*secretKey), en hex minúscula. */
export function generateHash(
  ipAddress: string,
  comercio: string,
  sucursal: string,
  amount: string,
  secretKey: string = SECRET_KEY
): string {
  const input = `${ipAddress}*${comercio}*${sucursal}*${amount}*${secretKey}`;
  return crypto.createHash('sha256').update(input, 'utf-8').digest('hex').toLowerCase();
}

/** Normaliza la IP del cliente (quita el prefijo IPv6 de una IPv4 mapeada, ej. "::ffff:1.2.3.4"). */
export function normalizeClientIp(ip: string): string {
  const trimmed = ip.trim();
  return trimmed.toLowerCase().startsWith('::ffff:') ? trimmed.slice(7) : trimmed;
}

export interface PlusPagosCheckoutFormFields {
  COMERCIO: string;
  SucursalComercio: string;
  TransaccionComercioId: string;
  Monto: string;
  Hash: string;
  CallbackSuccess: string;
  CallbackCancel: string;
  'Producto[0]': string;
}

/** Interpretación de una transacción consultada a la API de Plus Pagos. */
export interface PlusPagosTransactionStatus {
  found: boolean;
  status: 'approved' | 'pending' | 'rejected' | 'unknown';
  /** Monto informado por el banco en centavos, si se pudo leer. */
  amountCents: number | null;
  transactionCode: string | null;
  paidAt: string | null;
  raw: unknown;
}

export class PlusPagosApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PlusPagosApiError';
  }
}

// Token de la API en memoria del proceso (se renueva solo si vence o da 401).
let cachedToken: { value: string; expiresAt: number } | null = null;
const TOKEN_TTL_MS = 10 * 60 * 1000;

async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(new URL(path, API_BASE), {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init.headers || {}) },
    cache: 'no-store',
    signal: AbortSignal.timeout(15000),
  });
}

/** Lee el campo `data` de la respuesta estándar de la API ({ status, code, message, data }). */
function readApiData(body: unknown): unknown {
  if (body && typeof body === 'object' && 'data' in body) {
    const data = (body as { data: unknown }).data;
    if (typeof data === 'string') {
      try { return JSON.parse(data); } catch { return data; }
    }
    return data;
  }
  return body;
}

async function getAccessToken(forceRefresh = false): Promise<string> {
  if (!forceRefresh && cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.value;
  }
  if (!MERCHANT_ID || !PHRASE) {
    throw new PaymentProviderNotConfiguredError('La API de consultas de Plus Pagos');
  }
  const res = await apiFetch('sesion', {
    method: 'POST',
    body: JSON.stringify({ guid: MERCHANT_ID, frase: PHRASE }),
  });
  if (!res.ok) {
    throw new PlusPagosApiError(`Plus Pagos rechazó la autenticación (HTTP ${res.status}).`);
  }
  const token = readApiData(await res.json());
  if (typeof token !== 'string' || !token) {
    throw new PlusPagosApiError('Plus Pagos no devolvió un token de sesión.');
  }
  cachedToken = { value: token, expiresAt: Date.now() + TOKEN_TTL_MS };
  return token;
}

async function authorizedGet(path: string): Promise<{ status: number; body: unknown }> {
  let token = await getAccessToken();
  let res = await apiFetch(path, { headers: { Authorization: `Bearer ${token}` } });
  if (res.status === 401 || res.status === 403) {
    token = await getAccessToken(true);
    res = await apiFetch(path, { headers: { Authorization: `Bearer ${token}` } });
  }
  let body: unknown = null;
  try { body = await res.json(); } catch { body = null; }
  return { status: res.status, body };
}

/** Busca una clave sin importar mayúsculas, también dentro de objetos anidados de un nivel. */
function pick(obj: Record<string, unknown>, names: string[]): unknown {
  const lowerNames = names.map((n) => n.toLowerCase());
  for (const [k, v] of Object.entries(obj)) {
    if (lowerNames.includes(k.toLowerCase()) && v !== null && v !== undefined && v !== '') return v;
  }
  for (const v of Object.values(obj)) {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      const nested = pick(v as Record<string, unknown>, names);
      if (nested !== undefined) return nested;
    }
  }
  return undefined;
}

/**
 * Interpreta una transacción devuelta por la API. Plus Pagos no publica el
 * esquema, así que se lee de forma defensiva: estado aprobado = EstadoId 3 o
 * un texto de estado aprobado/acreditado/pagado. Ante cualquier duda queda
 * 'unknown' y la boleta NO se marca como pagada.
 */
export function interpretTransaction(tx: unknown): PlusPagosTransactionStatus {
  const base: PlusPagosTransactionStatus = { found: false, status: 'unknown', amountCents: null, transactionCode: null, paidAt: null, raw: tx };
  if (!tx || typeof tx !== 'object') return base;
  const obj = (Array.isArray(tx) ? tx[0] : tx) as Record<string, unknown> | undefined;
  if (!obj || typeof obj !== 'object') return base;

  const estadoId = Number(pick(obj, ['EstadoId', 'estadoTransaccionId', 'idEstado']));
  const estadoText = String(pick(obj, ['Estado', 'EstadoDescripcion', 'estadoTransaccion', 'status', 'estado']) ?? '').toLowerCase();

  let status: PlusPagosTransactionStatus['status'] = 'unknown';
  if (estadoId === 3 || /aprob|acredit|pagad|complet|approved|paid|success/.test(estadoText)) status = 'approved';
  else if (estadoId === 2 || estadoId === 10 || /pend|proces|curso|pending/.test(estadoText)) status = 'pending';
  else if (/rechaz|cancel|anul|venc|error|fail|reject|denied/.test(estadoText)) status = 'rejected';

  // El monto puede venir en centavos (como se envía) o en pesos con decimales.
  const rawAmount = pick(obj, ['MontoCentavos', 'Monto', 'TotalOperacion', 'MontoTotal', 'Importe', 'amount']);
  let amountCents: number | null = null;
  if (rawAmount !== undefined) {
    const s = String(rawAmount).replace(',', '.');
    const n = Number(s);
    if (Number.isFinite(n)) amountCents = s.includes('.') ? Math.round(n * 100) : Math.round(n);
  }

  const code = pick(obj, ['TransaccionPlataformaId', 'TransaccionId', 'Id', 'CodigoOperacion', 'NroOperacion']);
  const paid = pick(obj, ['FechaPago', 'FechaAcreditacion', 'Fecha', 'fechaTransaccion']);

  return {
    found: true,
    status,
    amountCents,
    transactionCode: code !== undefined ? String(code) : null,
    paidAt: paid !== undefined ? String(paid) : null,
    raw: tx,
  };
}

export const plusPagos: PaymentProvider & {
  getPostUrl(): string;
  getMerchantId(): string;
  buildFormPayload(params: {
    clientIp: string;
    amount: number;
    transactionId: string;
    description: string;
    callbackSuccess: string;
    callbackCancel: string;
    sucursal?: string;
  }): PlusPagosCheckoutFormFields;
  queryTransaction(transactionId: string): Promise<PlusPagosTransactionStatus>;
  listTransactions(): Promise<unknown[]>;
} = {
  name: 'plus_pagos',

  getPostUrl() {
    return API_URL;
  },

  getMerchantId() {
    return MERCHANT_ID;
  },

  isConfigured() {
    return Boolean(API_URL && MERCHANT_ID && formKeyText());
  },

  buildFormPayload({ clientIp, amount, transactionId, description, callbackSuccess, callbackCancel, sucursal = '' }) {
    // Monto en centavos como entero (ej: 45000 -> "4500000"; 1500.5 -> "150050")
    const amountCents = Math.round(amount * 100).toString();
    const ip = normalizeClientIp(clientIp);

    return {
      COMERCIO: MERCHANT_ID,
      SucursalComercio: aesEncrypt(sucursal),
      TransaccionComercioId: transactionId,
      Monto: aesEncrypt(amountCents),
      Hash: generateHash(ip, MERCHANT_ID, sucursal, amountCents),
      CallbackSuccess: aesEncrypt(callbackSuccess),
      CallbackCancel: aesEncrypt(callbackCancel),
      'Producto[0]': description,
    };
  },

  async createCheckout(params: CreateCheckoutParams): Promise<CreateCheckoutResult> {
    if (!this.isConfigured()) {
      throw new PaymentProviderNotConfiguredError('Plus Pagos');
    }
    // Un TransaccionComercioId distinto por intento: si la farmacia cancela y
    // reintenta, el banco no rechaza el ID por repetido. El prefijo es el
    // número de boleta para poder rastrearlo.
    const externalReference = `${params.invoiceNumber}-${Date.now().toString(36).toUpperCase()}`;
    return {
      checkoutUrl: `/api/payments/plus-pagos/checkout?paymentId=${encodeURIComponent(params.paymentId)}`,
      externalReference,
    };
  },

  /**
   * El aviso entrante NO se usa para decidir si una boleta está paga (se
   * puede falsificar: el GUID del comercio viaja visible en el formulario).
   * Solo se acepta como "pista" para ir a consultar la transacción a la API.
   */
  verifyWebhookSignature(_request: Request, rawBody: string): boolean {
    return rawBody.length > 0 && rawBody.length < 100_000;
  },

  parseWebhookEvent(rawBody: string): WebhookEvent {
    let payload: Record<string, unknown> = {};
    try {
      payload = JSON.parse(rawBody);
    } catch {
      // Algunos avisos llegan como formulario (application/x-www-form-urlencoded)
      payload = Object.fromEntries(new URLSearchParams(rawBody));
    }
    const ref = pick(payload, ['TransaccionComercioId', 'transaccionComercioId', 'external_reference', 'externalReference']);
    return {
      externalReference: ref !== undefined ? String(ref) : '',
      // El estado real se consulta a la API; lo del aviso es solo informativo.
      status: 'pending',
    };
  },

  async queryTransaction(transactionId: string) {
    const { status, body } = await authorizedGet(`transaction/${encodeURIComponent(transactionId)}`);
    if (status === 404) return interpretTransaction(null);
    if (status >= 400) {
      throw new PlusPagosApiError(`La consulta a Plus Pagos falló (HTTP ${status}).`);
    }
    const data = readApiData(body);
    if (body && typeof body === 'object' && (body as { status?: unknown }).status === false && !data) {
      return interpretTransaction(null);
    }
    return interpretTransaction(data);
  },

  async listTransactions() {
    const { status, body } = await authorizedGet('transactions');
    if (status >= 400) {
      throw new PlusPagosApiError(`El listado de transacciones de Plus Pagos falló (HTTP ${status}).`);
    }
    const data = readApiData(body);
    return Array.isArray(data) ? data : [];
  },
};
