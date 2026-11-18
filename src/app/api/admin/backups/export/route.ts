import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { createUserServerClient } from '@/lib/supabaseServer';
import { LocalDbSnapshot } from '@/lib/localDatabase';

// Respaldo completo de la base para descargar en la computadora de ATFAR.
//
// Devuelve TODOS los datos (CUIL, sueldos, contactos), así que solo puede
// pedirlo un administrador logueado. El archivo lo descarga el navegador en la
// carpeta "Descargas" de la computadora: el servidor (Vercel) no tiene acceso
// al disco de esa PC, así que acá no se escribe ningún archivo.

const PAGE = 1000; // Supabase devuelve como máximo 1000 filas por consulta.

async function fetchAll(table: string, orderBy: string): Promise<Record<string, unknown>[]> {
  const rows: Record<string, unknown>[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabaseAdmin
      .from(table)
      .select('*')
      .order(orderBy, { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`No se pudo leer la tabla ${table}: ${error.message}`);
    rows.push(...(data || []));
    if (!data || data.length < PAGE) break;
  }
  return rows;
}

export async function POST() {
  // 1) Solo administradores.
  const userClient = await createUserServerClient();
  if (!userClient) {
    return NextResponse.json({ error: 'Configuración de servidor incompleta.' }, { status: 500 });
  }
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Tu sesión expiró. Volvé a iniciar sesión.' }, { status: 401 });
  }
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Solo un administrador puede descargar el respaldo.' }, { status: 403 });
  }

  // 2) Todas las tablas, completas (paginadas para no cortar en 1000 filas).
  try {
    const [
      pharmacies,
      employees,
      payments,
      salaryScales,
      pharmacyMembers,
      benefitRequests,
      jobApplications,
      monthMarks,
      profiles,
      scaleDocs,
      announcements,
      sorteoEntries,
    ] = await Promise.all([
      fetchAll('pharmacies', 'id'),
      fetchAll('employees', 'id'),
      fetchAll('payments', 'id'),
      fetchAll('salary_scales', 'id'),
      fetchAll('pharmacy_members', 'id'),
      fetchAll('benefit_requests', 'id'),
      fetchAll('job_applications', 'id'),
      fetchAll('pharmacy_month_marks', 'id'),
      fetchAll('profiles', 'id'),
      fetchAll('salary_scales_docs', 'id'),
      fetchAll('announcements', 'id'),
      fetchAll('sorteo_dia_madre_entries', 'id'),
    ]);

    const byName = (a: Record<string, unknown>, b: Record<string, unknown>, key: string) =>
      String(a[key] ?? '').localeCompare(String(b[key] ?? ''), 'es');
    pharmacies.sort((a, b) => byName(a, b, 'name'));
    employees.sort((a, b) => byName(a, b, 'full_name'));

    const now = new Date();
    const timestamp = `${now.toISOString().slice(0, 10)}_${now.toTimeString().slice(0, 8).replace(/:/g, '-')}`;

    const snapshot: LocalDbSnapshot = {
      version: '2.0.0',
      exportedAt: now.toISOString(),
      counts: {
        pharmacies: pharmacies.length,
        employees: employees.length,
        payments: payments.length,
        scales: salaryScales.length,
        members: pharmacyMembers.length,
        benefits: benefitRequests.length,
        jobApplications: jobApplications.length,
        monthMarks: monthMarks.length,
        profiles: profiles.length,
        scaleDocs: scaleDocs.length,
        announcements: announcements.length,
        sorteoEntries: sorteoEntries.length,
      },
      data: {
        pharmacies,
        employees,
        payments,
        salaryScales,
        pharmacyMembers,
        benefitRequests,
        jobApplications,
        monthMarks,
        profiles,
        scaleDocs,
        announcements,
        sorteoEntries,
      },
    };

    return NextResponse.json(
      { success: true, timestamp, counts: snapshot.counts, snapshot },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('Error generando respaldo de ATFAR:', error);
    return NextResponse.json(
      { error: 'No se pudo armar el respaldo. Probá de nuevo en unos minutos.' },
      { status: 500 }
    );
  }
}
