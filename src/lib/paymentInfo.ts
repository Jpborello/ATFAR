// Textos claros y únicos para mostrar el estado de una boleta en cualquier
// pantalla. La idea es que una persona sin experiencia con sistemas entienda
// de un vistazo qué pasa con cada pago, sin palabras técnicas.

import { formatDateAR } from '@/lib/dateUtils';

export type PaymentLike = {
  status?: string | null;
  amount?: number | string | null;
  due_date?: string | null;
  pay_date?: string | null;
  receipt_url?: string | null;
  payment_provider?: string | null;
  transaction_code?: string | null;
  approved_at?: string | null;
  approved_by_name?: string | null;
};

/** Las 4 situaciones posibles de una boleta, en palabras simples. */
export type PaymentSituation = 'pagado' | 'revisar' | 'vencida' | 'por_pagar';

export const SITUATION_TEXT: Record<PaymentSituation, { label: string; help: string }> = {
  pagado: { label: 'Pagada', help: 'El pago está confirmado.' },
  revisar: { label: 'Para revisar', help: 'La farmacia avisó que pagó. ATFAR tiene que controlar el comprobante.' },
  vencida: { label: 'Vencida, sin pagar', help: 'Ya pasó la fecha de vencimiento y no hay pago.' },
  por_pagar: { label: 'Por pagar', help: 'Todavía está dentro del plazo para pagar.' },
};

/** Clases de color (fondo + texto + borde) para cada situación. */
export const SITUATION_STYLE: Record<PaymentSituation, string> = {
  pagado: 'bg-emerald-50 text-emerald-800 border-emerald-300',
  revisar: 'bg-amber-50 text-amber-800 border-amber-300',
  vencida: 'bg-red-50 text-red-800 border-red-300',
  por_pagar: 'bg-slate-50 text-slate-700 border-slate-300',
};

export function todayISO(): string {
  // Fecha de hoy en Argentina (YYYY-MM-DD), sin desfase por zona horaria.
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date());
}

export function paymentSituation(p: PaymentLike, today = todayISO()): PaymentSituation {
  if (p.status === 'pagado') return 'pagado';
  if (p.status === 'en_revision') return 'revisar';
  if (p.due_date && p.due_date.slice(0, 10) < today) return 'vencida';
  return 'por_pagar';
}

/** Cómo pagó la farmacia, o null si todavía no hay pago. */
export function paymentMethodLabel(p: PaymentLike): string | null {
  if (p.status !== 'pagado' && p.status !== 'en_revision') return null;
  if (p.receipt_url) return 'Transferencia bancaria';
  if (p.status === 'pagado' && p.payment_provider === 'plus_pagos') return 'Pago online (Banco Santa Fe)';
  if (p.status === 'pagado' && Number(p.amount || 0) === 0) return 'Sin monto a pagar';
  if (p.status === 'pagado') return 'Registrado por ATFAR';
  return 'Transferencia bancaria';
}

/** "18/11/2026" a partir de un timestamp, en hora argentina. */
export function formatTimestampAR(ts: string | null | undefined): string {
  if (!ts) return '---';
  return new Date(ts).toLocaleDateString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/** Quién dio el pago por bueno y cuándo, en una frase. null si no se sabe. */
export function approvalText(p: PaymentLike): string | null {
  if (p.status !== 'pagado') return null;
  if (!p.approved_by_name && !p.approved_at) return null;
  const who = p.approved_by_name || 'ATFAR';
  return p.approved_at ? `${who}, el ${formatTimestampAR(p.approved_at)}` : who;
}

export function formatMoney(n: number | string | null | undefined): string {
  return `$${Number(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export { formatDateAR };
