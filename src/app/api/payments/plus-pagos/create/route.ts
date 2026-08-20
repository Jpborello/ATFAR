import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { plusPagos, PaymentProviderNotConfiguredError } from '@/lib/payments/plusPagos';

export async function POST(request: Request) {
  try {
    const { paymentId } = await request.json();

    if (!paymentId) {
      return NextResponse.json({ error: 'Falta paymentId.' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Faltan NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY.');
      return NextResponse.json({ error: 'El servidor no está configurado correctamente.' }, { status: 500 });
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        },
      },
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
    }

    // RLS ("Owners can view own payments") ya restringe esto a boletas de
    // farmacias del usuario logueado (o a un admin) — no hace falta chequear
    // la propiedad a mano acá.
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

    const { checkoutUrl, externalReference } = await plusPagos.createCheckout({
      paymentId: payment.id,
      invoiceNumber: payment.invoice_number,
      amount: Number(payment.amount),
      description: `ATFAR - Aportes ${payment.period} - Boleta ${payment.invoice_number}`,
    });

    await supabase
      .from('payments')
      .update({
        payment_provider: 'plus_pagos',
        external_reference: externalReference,
        checkout_url: checkoutUrl,
      })
      .eq('id', payment.id);

    return NextResponse.json({ checkoutUrl });
  } catch (err) {
    if (err instanceof PaymentProviderNotConfiguredError) {
      return NextResponse.json({ error: err.message, notConfigured: true }, { status: 501 });
    }
    console.error('Error creando checkout de Plus Pagos:', err);
    return NextResponse.json({ error: 'No pudimos iniciar el pago online.' }, { status: 502 });
  }
}
