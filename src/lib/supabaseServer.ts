import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

/**
 * Cliente de Supabase para route handlers que actúa COMO el usuario logueado
 * (lee la sesión de las cookies), así RLS limita lo que puede ver o tocar.
 * Devuelve null si faltan las variables de entorno.
 */
export async function createUserServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Faltan NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY.');
    return null;
  }

  const cookieStore = await cookies();
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // En algunos contextos de solo lectura no se pueden setear cookies; no es crítico.
        }
      },
    },
  });
}
