import { NextResponse } from 'next/server';
import { createUserServerClient } from '@/lib/supabaseServer';
import { verifyAndSettle, type SettlementPayment } from '@/lib/payments/plusPagosSettlement';

// La pantalla de pagos llama a esta ruta cuando la farmacia vuelve del banco
// (CallbackSuccess). Confirma el pago con la API de Plus Pagos al instante,
// sin esperar el aviso del banco.
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

    // RLS: solo boletas de las farmacias del usuario (o admin).
    const { data: payment, error } = await supabase
      .from('payments')
      .select('id, pharmacy_id, invoice_number, period, amount, status, external_reference')
      .eq('id', paymentId)
      .single();
    if (error || !payment) {
      return NextResponse.json({ error: 'Boleta no encontrada.' }, { status: 404 });
    }

    const result = await verifyAndSettle(payment as SettlementPayment, 'regreso de la farmacia');
    return NextResponse.json(result);
  } catch (err) {
    console.error('Error verificando pago de Plus Pagos:', err);
    return NextResponse.json({ outcome: 'error', message: 'No pudimos verificar el pago.' }, { status: 500 });
  }
}
