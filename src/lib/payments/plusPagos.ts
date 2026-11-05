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
 * Variables de entorno de Plus Pagos (Administradora San Juan S.A. / Nuevo Banco de Santa Fe)
 *
 * En producción se obtienen al formalizar el convenio comercial con el banco:
 *   - PLUS_PAGOS_API_URL: Endpoint base provisto por el banco (ej: https://api.pluspagos.com/v1)
 *   - PLUS_PAGOS_API_KEY: Llave de autenticación API / Bearer token del comercio
 *   - PLUS_PAGOS_MERCHANT_ID: Código de ente / comercio asignado a ATFAR
 *   - PLUS_PAGOS_WEBHOOK_SECRET: Clave secreta para validación de firma HMAC SHA-256 en notificaciones
 *   - PLUS_PAGOS_SANDBOX: 'true' para habilitar pasarela de prueba local / sandbox
 */
const API_URL = process.env.PLUS_PAGOS_API_URL || '';
const API_KEY = process.env.PLUS_PAGOS_API_KEY || '';
const MERCHANT_ID = process.env.PLUS_PAGOS_MERCHANT_ID || '';
const WEBHOOK_SECRET = process.env.PLUS_PAGOS_WEBHOOK_SECRET || '';
const IS_SANDBOX = process.env.PLUS_PAGOS_SANDBOX === 'true';

export const plusPagos: PaymentProvider = {
  name: 'plus_pagos',

  /**
   * Indica si el proveedor está habilitado (por credenciales reales o modo sandbox local).
   */
  isConfigured() {
    return Boolean((API_URL && API_KEY && MERCHANT_ID) || IS_SANDBOX);
  },

  /**
   * Crea una orden de pago / link de checkout en Plus Pagos.
   */
  async createCheckout(params: CreateCheckoutParams): Promise<CreateCheckoutResult> {
    if (!this.isConfigured()) {
      throw new PaymentProviderNotConfiguredError('Plus Pagos');
    }

    // Modo Sandbox / Simulación local: permite pruebas integrales sin esperar credenciales bancarias
    if (IS_SANDBOX && (!API_URL || !API_KEY)) {
      return {
        checkoutUrl: `/api/payments/plus-pagos/simulate?paymentId=${encodeURIComponent(params.paymentId)}&amount=${params.amount}&desc=${encodeURIComponent(params.description)}`,
        externalReference: `SIM-${params.paymentId}-${Date.now()}`,
      };
    }

    // Integración API real con Administradora San Juan S.A. (Nuevo Banco de Santa Fe)
    const endpoint = `${API_URL.replace(/\/$/, '')}/checkout`;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`,
          'X-Merchant-Id': MERCHANT_ID,
        },
        body: JSON.stringify({
          merchant_id: MERCHANT_ID,
          external_reference: params.paymentId,
          invoice_number: params.invoiceNumber,
          amount: params.amount,
          description: params.description,
          redirect_url: `${appUrl}/farmacia`,
          webhook_url: `${appUrl}/api/payments/plus-pagos/webhook`,
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error('Error respuesta Plus Pagos API:', res.status, errorText);
        throw new Error(`Plus Pagos rechazó la creación del checkout (${res.status})`);
      }

      const data = await res.json();
      return {
        checkoutUrl: data.checkout_url || data.url || data.link,
        externalReference: data.id || data.external_reference || params.paymentId,
      };
    } catch (err: unknown) {
      console.error('Error al conectar con Plus Pagos:', err);
      throw err;
    }
  },

  /**
   * Verifica la autenticidad de la notificación server-to-server mediante firma criptográfica.
   */
  verifyWebhookSignature(request: Request, rawBody: string): boolean {
    if (IS_SANDBOX && (!WEBHOOK_SECRET || process.env.NODE_ENV !== 'production')) {
      return true; // Bypass seguro para pruebas locales
    }

    if (!WEBHOOK_SECRET) {
      return false; // Fail-closed en producción sin secreto
    }

    // Firma HMAC SHA256 estándar esperada en headers (X-Signature o X-PlusPagos-Signature)
    const signature = request.headers.get('x-signature') || request.headers.get('x-pluspagos-signature') || '';
    if (!signature) return false;

    try {
      const computedHash = crypto
        .createHmac('sha256', WEBHOOK_SECRET)
        .update(rawBody)
        .digest('hex');

      return crypto.timingSafeEqual(Buffer.from(computedHash), Buffer.from(signature));
    } catch (err) {
      console.error('Error verificando firma webhook de Plus Pagos:', err);
      return false;
    }
  },

  /**
   * Parsea el payload de la notificación entrante.
   */
  parseWebhookEvent(rawBody: string): WebhookEvent {
    const payload = JSON.parse(rawBody);
    
    // Normalizar status proveniente del gateway de Santa Fe ('APPROVED', 'PAID', 'pagado', etc.)
    const rawStatus = (payload.status || payload.estado || '').toString().toLowerCase();
    const isApproved = ['approved', 'aprobado', 'paid', 'pagado', 'acreditado', 'success'].includes(rawStatus);

    return {
      externalReference: payload.external_reference || payload.externalReference || payload.payment_id,
      status: isApproved ? 'approved' : 'rejected',
      transactionCode: payload.id || payload.transaction_id || payload.codigo_operacion,
      paidAt: payload.paid_at || payload.fecha_pago || new Date().toISOString(),
    };
  },
};
