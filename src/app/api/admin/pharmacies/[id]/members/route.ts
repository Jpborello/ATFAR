import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

async function getAdminClients() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return { error: 'Configuración incompleta de servidor.', status: 500 };
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
    return { error: 'No autenticado.', status: 401 };
  }

  const { data: profile } = await supabaseUser
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (profile?.role !== 'admin') {
    return { error: 'Acceso denegado. Se requiere rol administrador.', status: 403 };
  }

  const adminClient = serviceRoleKey
    ? createClient(supabaseUrl, serviceRoleKey)
    : supabaseUser;

  return { adminClient };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: pharmacyId } = await params;
    const authResult = await getAdminClients();
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const { adminClient } = authResult;

    const { data: members, error } = await adminClient
      .from('pharmacy_members')
      .select('id, user_id, role, created_at, profiles:user_id(id, full_name, email, phone)')
      .eq('pharmacy_id', pharmacyId);

    if (error) throw error;

    return NextResponse.json({ members: members || [] });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error al obtener miembros.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: pharmacyId } = await params;
    const authResult = await getAdminClients();
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const { adminClient } = authResult;

    const body = await request.json();
    const { action, email, memberId } = body;

    if (action === 'add') {
      const cleanEmail = (email || '').trim().toLowerCase();
      if (!cleanEmail) {
        return NextResponse.json({ error: 'Ingresá un correo electrónico.' }, { status: 400 });
      }

      // Buscar perfil por correo
      const { data: profile, error: profErr } = await adminClient
        .from('profiles')
        .select('id, full_name, email, role')
        .ilike('email', cleanEmail)
        .maybeSingle();

      if (profErr) throw profErr;

      let targetUserId = profile?.id;

      // Si no está en profiles, buscar en auth.users
      if (!targetUserId) {
        const { data: authUsers } = await adminClient.auth.admin.listUsers();
        const found = authUsers?.users?.find((u) => (u.email || '').toLowerCase() === cleanEmail);
        if (found) {
          targetUserId = found.id;
        }
      }

      if (!targetUserId) {
        return NextResponse.json(
          { error: `No existe ningún usuario registrado con el correo "${cleanEmail}". Pedile que se registre primero en la página.` },
          { status: 404 }
        );
      }

      // Verificar si ya está vinculado
      const { data: existing } = await adminClient
        .from('pharmacy_members')
        .select('id')
        .eq('pharmacy_id', pharmacyId)
        .eq('user_id', targetUserId)
        .maybeSingle();

      if (existing) {
        return NextResponse.json(
          { error: 'El usuario ya se encuentra vinculado a esta farmacia.' },
          { status: 400 }
        );
      }

      const { data: newMember, error: insertErr } = await adminClient
        .from('pharmacy_members')
        .insert({
          pharmacy_id: pharmacyId,
          user_id: targetUserId,
          role: 'owner',
        })
        .select('id, user_id, role, created_at, profiles:user_id(id, full_name, email, phone)')
        .single();

      if (insertErr) throw insertErr;

      return NextResponse.json({
        message: 'Usuario vinculado exitosamente a la farmacia.',
        member: newMember,
      });
    }

    if (action === 'remove') {
      if (!memberId) {
        return NextResponse.json({ error: 'Falta memberId.' }, { status: 400 });
      }

      const { error: delErr } = await adminClient
        .from('pharmacy_members')
        .delete()
        .eq('id', memberId)
        .eq('pharmacy_id', pharmacyId);

      if (delErr) throw delErr;

      return NextResponse.json({ message: 'Vinculación eliminada correctamente.' });
    }

    return NextResponse.json({ error: 'Acción no soportada.' }, { status: 400 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error al procesar la vinculación.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

