import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

export async function POST() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: 'Configuración incompleta.' }, { status: 500 });
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
    if (!user || !user.email) {
      return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
    }

    const userEmail = user.email.trim().toLowerCase();
    const adminClient = serviceRoleKey
      ? createClient(supabaseUrl, serviceRoleKey)
      : supabaseUser;

    // Buscar farmacias donde este email haya sido declarado como HR / Estudio Contable
    const { data: matchedPharmacies, error: searchErr } = await adminClient
      .from('pharmacies')
      .select('id, name, cuit')
      .eq('registered', true)
      .or(`hr_email.ilike.${userEmail},resp_alt_email.ilike.${userEmail},hr_alt_email.ilike.${userEmail}`);

    if (searchErr) {
      console.error('Error searching pharmacies by hr_email:', searchErr);
      return NextResponse.json({ error: searchErr.message }, { status: 500 });
    }

    if (!matchedPharmacies || matchedPharmacies.length === 0) {
      return NextResponse.json({ linked: 0, names: [] });
    }

    // Traer las membresías que ya tiene el usuario
    const { data: currentMemberships } = await adminClient
      .from('pharmacy_members')
      .select('pharmacy_id')
      .eq('user_id', user.id);

    const existingIds = new Set((currentMemberships || []).map((m: { pharmacy_id: string }) => m.pharmacy_id));
    const toLink = matchedPharmacies.filter((p: { id: string }) => !existingIds.has(p.id));

    if (toLink.length === 0) {
      return NextResponse.json({ linked: 0, names: [] });
    }

    // Insertar las nuevas vinculaciones
    const inserts = toLink.map((p: { id: string }) => ({
      pharmacy_id: p.id,
      user_id: user.id,
      role: 'accountant',
    }));

    const { error: insertErr } = await adminClient
      .from('pharmacy_members')
      .upsert(inserts, { onConflict: 'pharmacy_id,user_id' });

    if (insertErr) {
      console.error('Error inserting pharmacy_members:', insertErr);
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    const linkedNames = toLink.map((p: { name: string }) => p.name);
    return NextResponse.json({
      linked: toLink.length,
      names: linkedNames,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error al sincronizar membresías.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
