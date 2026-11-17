import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { plusPagos } from '@/lib/payments/plusPagos';

// Endpoint que Plus Pagos / ASJ Servicios llama server-to-server para notificar
// la acreditación de una boleta. No hay sesión de usuario acá, por eso usa supabaseAdmin
// (service role) para actualizar el estado del pago directamente.
export async function POST(request: Request) {
  const rawBody = await request.text();

  if (!plusPagos.verifyWebhookSignature(request, rawBody)) {
    console.warn('Webhook de Plus Pagos rechazado por validación de firma/comercio.');
    return NextResponse.json({ error: 'Firma o autenticación de webhook inválida.' }, { status: 401 });
  }

  let event;
  try {
    event = plusPagos.parseWebhookEvent(rawBody);
  } catch (err) {
    console.error('Webhook de Plus Pagos: payload JSON inválido', err);
    return NextResponse.json({ error: 'Payload JSON inválido.' }, { status: 400 });
  }

  // Si no está aprobado (ej: pending o rejected), respondemos 200 para confirmar recepción
  if (event.status !== 'approved') {
    return NextResponse.json({ ok: true, receivedStatus: event.status });
  }

  if (!event.externalReference) {
    console.error('Webhook de Plus Pagos: payload sin externalReference / TransaccionComercioId');
    return NextResponse.json({ error: 'Falta referencia de transacción.' }, { status: 400 });
  }

  // Búsqueda resiliente de la boleta:
  // 1. Por external_reference exacto
  let { data: payment } = await supabaseAdmin
    .from('payments')
    .select('id, status, invoice_number')
    .eq('external_reference', event.externalReference)
    .maybeSingle();

  // 2. Por número de boleta (invoice_number)
  if (!payment) {
    const res = await supabaseAdmin
      .from('payments')
      .select('id, status, invoice_number')
      .eq('invoice_number', event.externalReference)
      .maybeSingle();
    payment = res.data;
  }

  // 3. Por UUID de pago (id)
  if (!payment && event.externalReference.length === 36) {
    const res = await supabaseAdmin
      .from('payments')
      .select('id, status, invoice_number')
      .eq('id', event.externalReference)
      .maybeSingle();
    payment = res.data;
  }

  // 4. Si la referencia contiene prefijo (ej: "BLT-202611-001-1731900000")
  if (!payment && event.externalReference.includes('-')) {
    const parts = event.externalReference.split('-');
    // Si tenía formato BLT-YYYYMM-XXXX-TIMESTAMP
    if (parts.length >= 4) {
      const reconstructedInvoice = `${parts[0]}-${parts[1]}-${parts[2]}`;
      const res = await supabaseAdmin
        .from('payments')
        .select('id, status, invoice_number')
        .eq('invoice_number', reconstructedInvoice)
        .maybeSingle();
      payment = res.data;
    }
  }

  if (!payment) {
    console.error('Webhook de Plus Pagos: no se encontró la boleta para la referencia:', event.externalReference);
    return NextResponse.json({ error: 'Boleta no encontrada.' }, { status: 404 });
  }

  if (payment.status === 'pagado') {
    return NextResponse.json({ ok: true, alreadyPaid: true }); // Idempotencia: ya estaba procesado
  }

  const payDate = event.paidAt ? event.paidAt.slice(0, 10) : new Date().toISOString().slice(0, 10);
  const transactionCode = event.transactionCode || event.externalReference;

  await supabaseAdmin
    .from('payments')
    .update({
      status: 'pagado',
      pay_date: payDate,
      transaction_code: transactionCode,
      payment_provider: 'plus_pagos',
    })
    .eq('id', payment.id);

  console.log(`[Plus Pagos] Boleta ${payment.invoice_number} (ID: ${payment.id}) marcada como PAGADA.`);

  return NextResponse.json({ ok: true, invoiceNumber: payment.invoice_number });
}
