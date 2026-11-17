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
 * Variables de entorno de Plus Pagos / ASJ Servicios (Nuevo Banco de Santa Fe)
 *
 * Provistas oficialmente por Administradora San Juan S.A.:
 *   - PLUS_PAGOS_API_URL: URL para el POST (https://botonpp.asjservicios.com.ar/)
 *   - PLUS_PAGOS_MERCHANT_ID: Identificador de comercio (GUID del comercio)
 *   - PLUS_PAGOS_SECRET_KEY: Clave secreta para generación de Hash SHA-256
 *   - PLUS_PAGOS_PHRASE: Frase clave de 32 bytes (en Base64) para cifrado AES-256-CBC
 *   - PLUS_PAGOS_WEBHOOK_SECRET: Opcional, para firma HMAC en webhooks
 *   - PLUS_PAGOS_SANDBOX: 'true' para modo sandbox / simulación local
 */
const API_URL = process.env.PLUS_PAGOS_API_URL || 'https://botonpp.asjservicios.com.ar/';
const MERCHANT_ID = process.env.PLUS_PAGOS_MERCHANT_ID || '';
const SECRET_KEY = process.env.PLUS_PAGOS_SECRET_KEY || '';
const PHRASE = process.env.PLUS_PAGOS_PHRASE || '';
const WEBHOOK_SECRET = process.env.PLUS_PAGOS_WEBHOOK_SECRET || '';
const IS_SANDBOX = process.env.PLUS_PAGOS_SANDBOX === 'true';

/**
 * Obtiene la clave de 32 bytes requerida para el algoritmo AES-256-CBC.
 * Si la frase viene codificada en Base64 (típicamente 44 caracteres con '=' al final),
 * se decodifica a su buffer binario de 32 bytes. De lo contrario, se normaliza
 * la cadena rellenando o truncando a 32 caracteres utf-8.
 */
export function getAesKey(customPhrase?: string): Buffer {
  const p = customPhrase || PHRASE;
  if (!p) {
    throw new Error('No se ha configurado la frase / clave AES (PLUS_PAGOS_PHRASE).');
  }

  // Si es Base64 válido de 32 bytes (256 bits)
  try {
    const buf = Buffer.from(p, 'base64');
    if (buf.length === 32) {
      return buf;
    }
  } catch {
    // Continuar al fallback de normalización de string
  }

  // Normalización de cadena (estándar especificado en integraciones de ASJ Servicios / PHP)
  let keyStr = p;
  if (keyStr.length < 32) {
    while (keyStr.length < 32) {
      keyStr += keyStr;
    }
  }
  return Buffer.from(keyStr.slice(0, 32), 'utf-8');
}

/**
 * Cifra un texto plano utilizando AES-256-CBC con IV aleatorio de 16 bytes.
 * Retorna base64(iv + ciphertext).
 */
export function aesEncrypt(plainText: string, customPhrase?: string): string {
  const key = getAesKey(customPhrase);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf-8'), cipher.final()]);
  return Buffer.concat([iv, encrypted]).toString('base64');
}

/**
 * Descifra una cadena base64 generada por aesEncrypt.
 */
export function aesDecrypt(cipherTextB64: string, customPhrase?: string): string {
  const key = getAesKey(customPhrase);
  const raw = Buffer.from(cipherTextB64, 'base64');
  if (raw.length < 17) {
    throw new Error('Texto cifrado inválido: longitud insuficiente.');
  }
  const iv = raw.subarray(0, 16);
  const ciphertext = raw.subarray(16);
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf-8');
}

/**
 * Genera el hash de control SHA-256 exigido por ASJ Servicios / Nuevo Banco de Santa Fe:
 * sha256(ipAddress + "*" + comercio + "*" + sucursal + "*" + amount + "*" + secretKey)
 */
export function generateHash(
  ipAddress: string,
  comercio: string,
  sucursal: string,
  amount: string,
  customSecretKey?: string
): string {
  const key = customSecretKey || SECRET_KEY;
  const input = `${ipAddress}*${comercio}*${sucursal}*${amount}*${key}`;
  return crypto.createHash('sha256').update(input, 'utf-8').digest('hex').toLowerCase();
}

export interface PlusPagosCheckoutFormFields {
  Comercio: string;
  SucursalComercio: string;
  TransaccionComercioId: string;
  Monto: string;
  Hash: string;
  CallbackSuccess: string;
  CallbackCancel: string;
  'Producto[0]': string;
}

export const plusPagos: PaymentProvider & {
  getPostUrl(): string;
  getMerchantId(): string;
  getSecretKey(): string;
  getPhrase(): string;
  buildFormPayload(params: {
    clientIp: string;
    amount: number;
    transactionId: string;
    description: string;
    callbackSuccess: string;
    callbackCancel: string;
    sucursal?: string;
  }): PlusPagosCheckoutFormFields;
} = {
  name: 'plus_pagos',

  getPostUrl() {
    return API_URL;
  },

  getMerchantId() {
    return MERCHANT_ID;
  },

  getSecretKey() {
    return SECRET_KEY;
  },

  getPhrase() {
    return PHRASE;
  },

  /**
   * Indica si el proveedor está habilitado (por credenciales reales o modo sandbox local).
   */
  isConfigured() {
    const hasLiveCredentials = Boolean(API_URL && MERCHANT_ID && (SECRET_KEY || PHRASE));
    return hasLiveCredentials || IS_SANDBOX;
  },

  /**
   * Genera la carga útil de campos ocultos del formulario POST para la pasarela oficial.
   */
  buildFormPayload({
    clientIp,
    amount,
    transactionId,
    description,
    callbackSuccess,
    callbackCancel,
    sucursal = '',
  }) {
    // Formateo del monto en centavos (ej: 45000 -> "4500000", o 1500.50 -> "150050")
    const amountCents = Math.round(amount * 100).toString();

    const encryptedMonto = aesEncrypt(amountCents);
    const encryptedSucursal = aesEncrypt(sucursal);
    const encryptedCallbackSuccess = aesEncrypt(callbackSuccess);
    const encryptedCallbackCancel = aesEncrypt(callbackCancel);
    const hash = generateHash(clientIp, MERCHANT_ID, sucursal, amountCents);

    return {
      Comercio: MERCHANT_ID,
      SucursalComercio: encryptedSucursal,
      TransaccionComercioId: transactionId,
      Monto: encryptedMonto,
      Hash: hash,
      CallbackSuccess: encryptedCallbackSuccess,
      CallbackCancel: encryptedCallbackCancel,
      'Producto[0]': description,
    };
  },

  /**
   * Crea una orden de pago / link de checkout en Plus Pagos.
   * En modo real, devuelve la URL interna /api/payments/plus-pagos/checkout
   * que auto-envía el formulario POST hacia https://botonpp.asjservicios.com.ar/.
   */
  async createCheckout(params: CreateCheckoutParams): Promise<CreateCheckoutResult> {
    if (!this.isConfigured()) {
      throw new PaymentProviderNotConfiguredError('Plus Pagos');
    }

    // Modo Sandbox / Simulación local para desarrollo desconectado
    if (IS_SANDBOX && (!MERCHANT_ID || !SECRET_KEY)) {
      return {
        checkoutUrl: `/api/payments/plus-pagos/simulate?paymentId=${encodeURIComponent(params.paymentId)}&amount=${params.amount}&desc=${encodeURIComponent(params.description)}`,
        externalReference: `SIM-${params.paymentId}-${Date.now()}`,
      };
    }

    // En producción con Botón de Pago directo de ASJ Servicios:
    // Redirige al intermediario seguro de checkout que genera los campos encriptados
    // y ejecuta el POST hacia https://botonpp.asjservicios.com.ar/
    return {
      checkoutUrl: `/api/payments/plus-pagos/checkout?paymentId=${encodeURIComponent(params.paymentId)}`,
      externalReference: params.invoiceNumber,
    };
  },

  /**
   * Verifica la autenticidad de la notificación server-to-server mediante firma criptográfica
   * o validación de comercio en payload directo de ASJ Servicios.
   */
  verifyWebhookSignature(request: Request, rawBody: string): boolean {
    if (IS_SANDBOX && (!WEBHOOK_SECRET || process.env.NODE_ENV !== 'production')) {
      return true; // Bypass seguro para pruebas locales
    }

    // 1. Si viene encabezado de firma HMAC (x-signature o x-pluspagos-signature)
    const signature = request.headers.get('x-signature') || request.headers.get('x-pluspagos-signature') || '';
    const secret = WEBHOOK_SECRET || SECRET_KEY;
    if (signature && secret) {
      try {
        const computedHash = crypto
          .createHmac('sha256', secret)
          .update(rawBody)
          .digest('hex');

        if (crypto.timingSafeEqual(Buffer.from(computedHash), Buffer.from(signature))) {
          return true;
        }
      } catch (err) {
        console.error('Error verificando firma HMAC webhook de Plus Pagos:', err);
      }
      return false;
    }

    // 2. Validación de payload directo proveniente de ASJ Servicios / Nuevo Banco de Santa Fe:
    // Verifica que el payload sea JSON válido y pertenezca al comercio de ATFAR
    try {
      const payload = JSON.parse(rawBody);
      if (payload.Comercio && MERCHANT_ID) {
        if (payload.Comercio.toLowerCase() !== MERCHANT_ID.toLowerCase()) {
          console.warn('Webhook descartado: Comercio no coincide con ATFAR:', payload.Comercio);
          return false;
        }
      }
      // Asegurar que contenga algún identificador de transacción reconocible
      if (payload.TransaccionComercioId || payload.external_reference || payload.id || payload.paymentId) {
        return true;
      }
    } catch {
      return false;
    }

    return false;
  },

  /**
   * Parsea el payload de la notificación entrante de Plus Pagos / ASJ Servicios.
   */
  parseWebhookEvent(rawBody: string): WebhookEvent {
    const payload = JSON.parse(rawBody);

    // Normalizar status:
    // ASJ Servicios usa EstadoId: 3 = Completado / Aprobado; 2 ó 10 = En proceso / Pendiente; otros = Rechazado
    const estadoId = payload.EstadoId !== undefined ? Number(payload.EstadoId) : null;
    const rawStatus = (payload.status || payload.estado || '').toString().toLowerCase();

    let status: 'approved' | 'pending' | 'rejected' = 'rejected';
    if (estadoId === 3 || ['approved', 'aprobado', 'paid', 'pagado', 'acreditado', 'success', 'completed'].includes(rawStatus)) {
      status = 'approved';
    } else if (estadoId === 2 || estadoId === 10 || ['pending', 'procesando', 'pendiente', 'en_proceso'].includes(rawStatus)) {
      status = 'pending';
    }

    // Identificador de la boleta o transacción del comercio
    const externalReference =
      payload.TransaccionComercioId ||
      payload.external_reference ||
      payload.externalReference ||
      payload.payment_id ||
      payload.invoiceNumber ||
      '';

    // Código de operación único del banco
    const transactionCode =
      (payload.Id || payload.TransaccionId || payload.id || payload.transaction_id || payload.codigo_operacion || '').toString();

    // Fecha de pago informada por la entidad
    const paidAt =
      payload.FechaPago ||
      payload.Fecha ||
      payload.paid_at ||
      payload.fecha_pago ||
      new Date().toISOString();

    return {
      externalReference,
      status,
      transactionCode,
      paidAt,
    };
  },
};
