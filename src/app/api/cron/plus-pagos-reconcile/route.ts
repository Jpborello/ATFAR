import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { plusPagos } from '@/lib/payments/plusPagos';
import {
  findPaymentByTransactionId,
  verifyAndSettle,
  type SettlementPayment,
} from '@/lib/payments/plusPagosSettlement';

// Control diario (Vercel Cron, ver vercel.json): revisa contra la API de Plus
// Pagos las boletas con un pago online iniciado que siguen impagas. Es la red
// de seguridad por si un aviso del banco no llegó.
//
// Vercel manda "Authorization: Bearer <CRON_SECRET>". Sin CRON_SECRET
// configurado la ruta no corre, para que nadie la dispare desde afuera.
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }

  const summary = { revisadas: 0, pagadas: 0, sinPago: 0, montoDistinto: 0, errores: 0, desdeListado: 0 };

  // 1) Boletas impagas con un intento de pago online vigente.
  const { data: pending, error } = await supabaseAdmin
    .from('payments')
    .select('id, pharmacy_id, invoice_number, period, amount, status, external_reference')
    .eq('payment_provider', 'plus_pagos')
    .eq('status', 'impago')
    .not('external_reference', 'is', null)
    .limit(200);
  if (error) {
    console.error('[Plus Pagos cron] Error leyendo boletas:', error);
    return NextResponse.json({ error: 'No se pudieron leer las boletas.' }, { status: 500 });
  }

  for (const payment of (pending || []) as SettlementPayment[]) {
    summary.revisadas++;
    const result = await verifyAndSettle(payment, 'control diario');
    if (result.outcome === 'paid') summary.pagadas++;
    else if (result.outcome === 'amount_mismatch') summary.montoDistinto++;
    else if (result.outcome === 'error') summary.errores++;
    else summary.sinPago++;
  }

  // 2) Pagos aprobados hechos con un intento anterior (el ID ya no es el
  //    vigente en la boleta). Se buscan en el listado de transacciones del banco.
  try {
    const transactions = await plusPagos.listTransactions();
    for (const tx of transactions) {
      if (!tx || typeof tx !== 'object') continue;
      const record = tx as Record<string, unknown>;
      const txId = Object.entries(record).find(([k]) => k.toLowerCase() === 'transaccioncomercioid')?.[1];
      if (!txId) continue;
      const payment = await findPaymentByTransactionId(String(txId));
      if (!payment || payment.status === 'pagado') continue;
      const result = await verifyAndSettle(payment, 'control diario', String(txId));
      if (result.outcome === 'paid') { summary.pagadas++; summary.desdeListado++; }
    }
  } catch (err) {
    // El listado es opcional; si la API no lo ofrece, alcanza con el paso 1.
    console.warn('[Plus Pagos cron] No se pudo leer el listado de transacciones:', err);
  }

  console.log('[Plus Pagos cron] Resumen:', summary);
  return NextResponse.json({ ok: true, ...summary });
}
