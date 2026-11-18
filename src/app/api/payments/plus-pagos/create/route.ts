import { NextResponse } from 'next/server';
import { createUserServerClient } from '@/lib/supabaseServer';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { plusPagos, PaymentProviderNotConfiguredError } from '@/lib/payments/plusPagos';

// Inicia un intento de pago online: genera un TransaccionComercioId nuevo para
// la boleta y devuelve la URL intermedia que arma el formulario hacia el banco.
export async function POST(request: Request) {
  try {
    const { paymentId } = await request.json();
    if (!paymentId || typeof paymentId !== 'string') {
      return NextResponse.json({ error: 'Falta paymentId.' }, { status: 400 });
    }

    const supabase = await createUserServerClient();
    if (!supabase) {
      return NextResponse.json({ error: 'El servidor no está configurado correctamente.' }, { status: 500 });
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
    }

    // Se lee con la sesión del usuario: RLS solo deja ver boletas de sus
    // farmacias (o todas si es admin).
    const { data: payment, error } = await supabase
      .from('payments')
      .select('id, amount, invoice_number, period, status')
      .eq('id', paymentId)
      .single();

    if (error || !payment) {
      return NextResponse.json({ error: 'Boleta no encontrada.' }, { status: 404 });
    }
    if (payment.status !== 'impago') {
      return NextResponse.json({ error: 'Esta boleta ya no está impaga.' }, { status: 409 });
    }
    if (!(Number(payment.amount) > 0)) {
      return NextResponse.json({ error: 'Esta boleta no tiene importe a pagar.' }, { status: 409 });
    }

    const { checkoutUrl, externalReference } = await plusPagos.createCheckout({
      paymentId: payment.id,
      invoiceNumber: payment.invoice_number,
      amount: Number(payment.amount),
      description: `ATFAR - Aportes ${payment.period} - Boleta ${payment.invoice_number}`,
    });

    // Se guarda el intento vigente con service role, solo después de haber
    // comprobado arriba (con RLS) que la boleta es del usuario.
    const { error: updErr } = await supabaseAdmin
      .from('payments')
      .update({
        payment_provider: 'plus_pagos',
        external_reference: externalReference,
        checkout_url: checkoutUrl,
      })
      .eq('id', payment.id)
      .eq('status', 'impago');
    if (updErr) throw updErr;

    return NextResponse.json({ checkoutUrl });
  } catch (err) {
    if (err instanceof PaymentProviderNotConfiguredError) {
      return NextResponse.json({ error: err.message, notConfigured: true }, { status: 501 });
    }
    console.error('Error creando checkout de Plus Pagos:', err);
    return NextResponse.json({ error: 'No pudimos iniciar el pago online.' }, { status: 502 });
  }
}
