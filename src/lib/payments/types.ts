export interface CreateCheckoutParams {
  paymentId: string;
  invoiceNumber: string;
  amount: number;
  description: string;
}

export interface CreateCheckoutResult {
  checkoutUrl: string;
  externalReference: string;
}

export type WebhookEventStatus = 'approved' | 'pending' | 'rejected';

export interface WebhookEvent {
  externalReference: string;
  status: WebhookEventStatus;
  transactionCode?: string;
  paidAt?: string;
}

/**
 * Generic seam so a new gateway (Plus Pagos today, maybe another one later)
 * only needs a new file implementing this interface — nothing else in the
 * app should need to change.
 */
export interface PaymentProvider {
  readonly name: string;
  isConfigured(): boolean;
  createCheckout(params: CreateCheckoutParams): Promise<CreateCheckoutResult>;
  verifyWebhookSignature(request: Request, rawBody: string): boolean;
  parseWebhookEvent(rawBody: string): WebhookEvent;
}
