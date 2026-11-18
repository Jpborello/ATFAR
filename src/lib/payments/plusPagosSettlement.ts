import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { plusPagos, PlusPagosApiError, type PlusPagosTransactionStatus } from './plusPagos';

// Lógica de servidor (service role): nunca importar desde un componente 'use client'.

const MONTHS_ES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

/** "Septiembre 2026" -> "2026-09-01" (formato de pharmacy_month_marks.period). */
function periodLabelToMonthDate(label: string | null | undefined): string | null {
  if (!label) return null;
  const [name, yearStr] = label.trim().split(' ');
  const month = MONTHS_ES.findIndex((m) => m.toLowerCase() === (name || '').toLowerCase());
  const year = parseInt(yearStr, 10);
  if (month === -1 || isNaN(year)) return null;
  return `${year}-${String(month + 1).padStart(2, '0')}-01`;
}

export interface SettlementPayment {
  id: string;
  pharmacy_id: string;
  invoice_number: string | null;
  period: string | null;
  amount: number | string;
  status: string;
  external_reference: string | null;
}

const PAYMENT_COLUMNS = 'id, pharmacy_id, invoice_number, period, amount, status, external_reference';

export type SettlementResult =
  | { outcome: 'paid'; transactionCode: string }
  | { outcome: 'already_paid' }
  | { outcome: 'not_paid'; providerStatus: PlusPagosTransactionStatus['status'] }
  | { outcome: 'amount_mismatch'; expectedCents: number; providerCents: number }
  | { outcome: 'no_attempt' }
  | { outcome: 'error'; message: string };

/**
 * Encuentra la boleta de un TransaccionComercioId. Primero por el intento
 * vigente (external_reference); si no, por el número de boleta que va como
 * prefijo ("BLT-202610-ABCDE-LXYZ123" -> "BLT-202610-ABCDE"), para no perder
 * pagos hechos con un intento anterior.
 */
export async function findPaymentByTransactionId(transactionId: string): Promise<SettlementPayment | null> {
  const { data: byRef } = await supabaseAdmin
    .from('payments')
    .select(PAYMENT_COLUMNS)
    .eq('external_reference', transactionId)
    .maybeSingle();
  if (byRef) return byRef as SettlementPayment;

  const lastDash = transactionId.lastIndexOf('-');
  const candidates = [transactionId, lastDash > 0 ? transactionId.slice(0, lastDash) : null].filter(Boolean) as string[];
  for (const invoice of candidates) {
    const { data } = await supabaseAdmin
      .from('payments')
      .select(PAYMENT_COLUMNS)
      .eq('invoice_number', invoice)
      .limit(2);
    // Si el número de boleta no es único, no se adivina: queda para revisión manual.
    if (data && data.length === 1) return data[0] as SettlementPayment;
  }
  return null;
}

/**
 * Marca la boleta como pagada y deja la marca del mes en el almanaque con el
 * detalle de la operación, para la auditoría. Es idempotente: si ya estaba
 * pagada no hace nada.
 */
async function markPaid(
  payment: SettlementPayment,
  details: { transactionCode: string; paidAt: string | null; source: string; transactionId: string }
): Promise<boolean> {
  const payDate = (details.paidAt && !isNaN(Date.parse(details.paidAt)))
    ? new Date(details.paidAt).toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10);

  // Update condicionado: si dos avisos llegan a la vez, solo uno lo cambia.
  const { data: updated, error } = await supabaseAdmin
    .from('payments')
    .update({
      status: 'pagado',
      pay_date: payDate,
      transaction_code: details.transactionCode,
      payment_provider: 'plus_pagos',
      external_reference: details.transactionId,
    })
    .eq('id', payment.id)
    .neq('status', 'pagado')
    .select('id');
  if (error) throw error;
  if (!updated || updated.length === 0) return false;

  const monthDate = periodLabelToMonthDate(payment.period);
  if (monthDate) {
    const { error: markErr } = await supabaseAdmin.from('pharmacy_month_marks').upsert(
      {
        pharmacy_id: payment.pharmacy_id,
        period: monthDate,
        paid: true,
        note: `Pago online con Plus Pagos (Banco Santa Fe). Operación ${details.transactionCode}. Confirmado por ${details.source}.`,
        marked_by: null,
        marked_by_name: 'Plus Pagos (automático)',
        marked_at: new Date().toISOString(),
      },
      { onConflict: 'pharmacy_id,period' }
    );
    // La boleta ya quedó pagada; si falla la marca del almanaque solo se registra.
    if (markErr) console.error('[Plus Pagos] No se pudo guardar la marca del almanaque:', markErr);
  }
  return true;
}

/**
 * Consulta a la API de Plus Pagos el estado real del intento de pago de la
 * boleta y, solo si está aprobado y el monto coincide, la marca como pagada.
 * Es la única puerta para dar por pagada una boleta online.
 */
export async function verifyAndSettle(
  payment: SettlementPayment,
  source: 'aviso del banco' | 'regreso de la farmacia' | 'control diario',
  transactionId: string | null = payment.external_reference
): Promise<SettlementResult> {
  if (payment.status === 'pagado') return { outcome: 'already_paid' };
  if (!transactionId) return { outcome: 'no_attempt' };

  let tx: PlusPagosTransactionStatus;
  try {
    tx = await plusPagos.queryTransaction(transactionId);
  } catch (err) {
    const message = err instanceof PlusPagosApiError || err instanceof Error ? err.message : 'Error consultando Plus Pagos';
    console.error(`[Plus Pagos] Falló la consulta de ${transactionId}:`, err);
    return { outcome: 'error', message };
  }

  if (!tx.found || tx.status !== 'approved') {
    return { outcome: 'not_paid', providerStatus: tx.status };
  }

  const expectedCents = Math.round(Number(payment.amount) * 100);
  if (tx.amountCents !== null && tx.amountCents !== expectedCents) {
    console.error(`[Plus Pagos] Monto distinto en ${transactionId}: boleta ${expectedCents} vs banco ${tx.amountCents}`);
    return { outcome: 'amount_mismatch', expectedCents, providerCents: tx.amountCents };
  }

  const transactionCode = tx.transactionCode || transactionId;
  const changed = await markPaid(payment, { transactionCode, paidAt: tx.paidAt, source, transactionId });
  if (!changed) return { outcome: 'already_paid' };

  console.log(`[Plus Pagos] Boleta ${payment.invoice_number} (${payment.id}) PAGADA. Operación ${transactionCode} (${source}).`);
  return { outcome: 'paid', transactionCode };
}
