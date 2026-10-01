import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const { paymentId, invoiceNumber } = await request.json();

    if (!paymentId && !invoiceNumber) {
      return NextResponse.json({ error: 'Falta paymentId o invoiceNumber.' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: 'Configuración de servidor incompleta.' }, { status: 500 });
    }

    const cookieStore = await cookies();
    const supabaseUser = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        },
      },
    });

    const { data: { user } } = await supabaseUser.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
    }

    // Verificar si el usuario es administrador
    const { data: profile } = await supabaseUser
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    const isAdmin = profile?.role === 'admin';

    // Cliente con privilegios para consultar y operar
    const adminClient = serviceRoleKey 
      ? createClient(supabaseUrl, serviceRoleKey)
      : supabaseUser;

    // Buscar el pago objetivo
    let query = adminClient.from('payments').select('id, pharmacy_id, invoice_number, period, status');
    if (paymentId) {
      query = query.eq('id', paymentId);
    } else {
      query = query.eq('invoice_number', invoiceNumber);
    }

    const { data: payment, error: fetchErr } = await query.maybeSingle();

    if (fetchErr || !payment) {
      return NextResponse.json({ error: 'Boleta no encontrada.' }, { status: 404 });
    }

    // Si NO es admin, verificar que sea miembro o dueño de la farmacia
    if (!isAdmin) {
      const { data: member } = await adminClient
        .from('pharmacy_members')
        .select('id')
        .eq('pharmacy_id', payment.pharmacy_id)
        .eq('user_id', user.id)
        .maybeSingle();

      const { data: owner } = await adminClient
        .from('pharmacies')
        .select('id')
        .eq('id', payment.pharmacy_id)
        .eq('owner_id', user.id)
        .maybeSingle();

      if (!member && !owner) {
        return NextResponse.json({ error: 'No tenés permisos para gestionar esta farmacia.' }, { status: 403 });
      }

      // Los usuarios de farmacia solo pueden borrar boletas impagas (no pagadas ni en revisión)
      if (payment.status !== 'impago') {
        return NextResponse.json({ 
          error: 'Solo podés anular boletas impagas. Si el pago ya fue emitido o está en revisión, comunicate con ATFAR.' 
        }, { status: 400 });
      }
    }

    // Proceder a eliminar la boleta
    const { error: delErr } = await adminClient
      .from('payments')
      .delete()
      .eq('id', payment.id);

    if (delErr) {
      console.error('Error al eliminar boleta:', delErr);
      return NextResponse.json({ error: 'Error al eliminar la boleta en la base de datos.' }, { status: 500 });
    }

    // Recomputar deuda de la farmacia
    if (payment.pharmacy_id) {
      try {
        await adminClient.rpc('recompute_pharmacy_debt', { p_pharmacy_id: payment.pharmacy_id });
      } catch (rpcErr) {
        console.warn('No se pudo recomputar deuda automáticamente:', rpcErr);
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Boleta ${payment.invoice_number} eliminada con éxito.`,
      deletedId: payment.id
    });
  } catch (err: unknown) {
    console.error('Error en delete payment API:', err);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
