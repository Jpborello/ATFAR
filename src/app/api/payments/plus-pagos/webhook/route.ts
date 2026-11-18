import { NextResponse } from 'next/server';
import { plusPagos } from '@/lib/payments/plusPagos';
import { findPaymentByTransactionId, verifyAndSettle } from '@/lib/payments/plusPagosSettlement';

// URL de notificación registrada en Plus Pagos / ASJ Servicios (planilla de alta).
//
// El contenido del aviso NO decide nada: el GUID del comercio viaja visible en
// el formulario de pago, así que cualquiera podría armar un aviso "aprobado".
// Del aviso solo se toma el TransaccionComercioId y se consulta el estado real
// a la API de Plus Pagos; la boleta se marca pagada únicamente si la API
// confirma que está aprobada y el monto coincide.
export async function POST(request: Request) {
  const rawBody = await request.text();

  if (!plusPagos.verifyWebhookSignature(request, rawBody)) {
    return NextResponse.json({ error: 'Aviso inválido.' }, { status: 400 });
  }

  const event = plusPagos.parseWebhookEvent(rawBody);
  if (!event.externalReference) {
    console.warn('[Plus Pagos] Aviso sin TransaccionComercioId.');
    return NextResponse.json({ error: 'Falta TransaccionComercioId.' }, { status: 400 });
  }

  const payment = await findPaymentByTransactionId(event.externalReference);
  if (!payment) {
    console.error('[Plus Pagos] Aviso de una transacción sin boleta asociada:', event.externalReference);
    // 200 para que el banco no reintente indefinidamente; queda en el log para revisión.
    return NextResponse.json({ ok: false, reason: 'boleta_no_encontrada' });
  }

  const result = await verifyAndSettle(payment, 'aviso del banco', event.externalReference);

  if (result.outcome === 'error') {
    // La API no respondió: 503 para que el banco reintente. Igual el control
    // diario y el regreso de la farmacia vuelven a verificarlo.
    return NextResponse.json({ ok: false, reason: 'consulta_fallida' }, { status: 503 });
  }

  return NextResponse.json({ ok: true, result: result.outcome });
}
