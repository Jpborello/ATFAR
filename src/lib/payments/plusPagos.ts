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

// Env vars pendientes de completar cuando el banco entregue las credenciales.
const API_URL = process.env.PLUS_PAGOS_API_URL || '';
const API_KEY = process.env.PLUS_PAGOS_API_KEY || '';
const MERCHANT_ID = process.env.PLUS_PAGOS_MERCHANT_ID || '';
const WEBHOOK_SECRET = process.env.PLUS_PAGOS_WEBHOOK_SECRET || '';

/**
 * Adaptador para Plus Pagos (Administradora San Juan S.A. / Nuevo Banco de
 * Santa Fe). Todavía no hay documentación pública de la API — esto es un
 * esqueleto listo para completar apenas el banco la entregue.
 *
 * Lo único que hay que hacer en ese momento:
 *   1. Cargar las 4 variables de entorno de arriba.
 *   2. Completar `createCheckout` con el endpoint real (crear link de pago / QR).
 *   3. Completar `verifyWebhookSignature` con el mecanismo de firma que use Plus Pagos.
 *   4. Completar `parseWebhookEvent` mapeando el payload real a `WebhookEvent`.
 * Nada en las rutas de API ni en la UI debería necesitar cambios.
 */
export const plusPagos: PaymentProvider = {
  name: 'plus_pagos',

  isConfigured() {
    return Boolean(API_URL && API_KEY && MERCHANT_ID);
  },

  async createCheckout(params: CreateCheckoutParams): Promise<CreateCheckoutResult> {
    if (!this.isConfigured()) {
      throw new PaymentProviderNotConfiguredError('Plus Pagos');
    }

    // TODO: reemplazar por el endpoint real de Plus Pagos. Forma esperada
    // (a confirmar con la documentación que entregue el banco):
    //
    //   POST {API_URL}/checkout   (o /payment-links, /qr, etc.)
    //   Headers: Authorization/x-api-key con API_KEY
    //   Body: {
    //     merchant_id: MERCHANT_ID,
    //     external_reference: params.paymentId,
    //     amount: params.amount,
    //     description: params.description,
    //   }
    //   Response: { id: string, checkout_url: string }
    //
    // const res = await fetch(`${API_URL}/checkout`, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` },
    //   body: JSON.stringify({
    //     merchant_id: MERCHANT_ID,
    //     external_reference: params.paymentId,
    //     amount: params.amount,
    //     description: params.description,
    //   }),
    // });
    // if (!res.ok) throw new Error(`Plus Pagos rechazó la creación del checkout (${res.status})`);
    // const data = await res.json();
    // return { checkoutUrl: data.checkout_url, externalReference: data.id };

    void params;
    throw new Error('plusPagos.createCheckout: pendiente de implementar con la API real.');
  },

  verifyWebhookSignature(request: Request, rawBody: string): boolean {
    // TODO: implementar la verificación real (HMAC sobre rawBody con
    // WEBHOOK_SECRET, header de firma, etc.) apenas Plus Pagos confirme el
    // mecanismo. Devuelve false a propósito (fail-closed): sin esto, el
    // webhook no debe aceptar ningún evento como válido en producción.
    void request;
    void rawBody;
    void WEBHOOK_SECRET;
    return false;
  },

  parseWebhookEvent(rawBody: string): WebhookEvent {
    // TODO: mapear el payload real que envía Plus Pagos a este shape genérico.
    const payload = JSON.parse(rawBody);
    return {
      externalReference: payload.external_reference,
      status: payload.status,
      transactionCode: payload.id,
      paidAt: payload.paid_at,
    };
  },
};
