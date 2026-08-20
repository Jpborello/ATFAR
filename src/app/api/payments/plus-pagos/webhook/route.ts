import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { plusPagos } from '@/lib/payments/plusPagos';

// Endpoint que Plus Pagos va a llamar server-to-server para avisar que una
// boleta se pagó. No hay sesión de usuario acá, por eso usa supabaseAdmin
// (service role) para poder actualizar el pago sin pasar por RLS.
export async function POST(request: Request) {
  const rawBody = await request.text();

  if (!plusPagos.verifyWebhookSignature(request, rawBody)) {
    // Fail-closed a propósito: hasta no implementar la verificación real de
    // firma, este endpoint no debe aceptar ningún evento como válido.
    return NextResponse.json({ error: 'Firma inválida o verificación no implementada.' }, { status: 401 });
  }

  let event;
  try {
    event = plusPagos.parseWebhookEvent(rawBody);
  } catch (err) {
    console.error('Webhook de Plus Pagos: payload inválido', err);
    return NextResponse.json({ error: 'Payload inválido.' }, { status: 400 });
  }

  if (event.status !== 'approved') {
    return NextResponse.json({ ok: true });
  }

  const { data: payment } = await supabaseAdmin
    .from('payments')
    .select('id, status')
    .eq('external_reference', event.externalReference)
    .single();

  if (!payment) {
    console.error('Webhook de Plus Pagos: no se encontró el pago', event.externalReference);
    return NextResponse.json({ error: 'Pago no encontrado.' }, { status: 404 });
  }

  if (payment.status === 'pagado') {
    return NextResponse.json({ ok: true }); // idempotente: ya estaba procesado
  }

  await supabaseAdmin
    .from('payments')
    .update({
      status: 'pagado',
      pay_date: event.paidAt ? event.paidAt.slice(0, 10) : new Date().toISOString().slice(0, 10),
      transaction_code: event.transactionCode || event.externalReference,
    })
    .eq('id', payment.id);

  return NextResponse.json({ ok: true });
}
