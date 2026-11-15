import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { LocalDbSnapshot } from '@/lib/localDatabase';

// Helper para generar CSV compatible con Excel en español (BOM UTF-8 y punto y coma)
function generateCsv(rows: Record<string, unknown>[], columns: { key: string; label: string }[]): string {
  const header = columns.map((c) => `"${c.label.replace(/"/g, '""')}"`).join(';');
  const lines = rows.map((row) =>
    columns
      .map((c) => {
        const val = row[c.key];
        if (val === null || val === undefined) return '""';
        if (typeof val === 'boolean') return val ? '"SÍ"' : '"NO"';
        const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
        return `"${str.replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`;
      })
      .join(';')
  );
  return '\uFEFF' + [header, ...lines].join('\r\n');
}

export async function POST() {
  try {
    const isSupabaseConfigured =
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_URL !== 'your_supabase_project_url_here';

    let pharmacies: any[] = [];
    let employees: any[] = [];
    let payments: any[] = [];
    let salaryScales: any[] = [];
    let pharmacyMembers: any[] = [];
    let benefitRequests: any[] = [];
    let jobApplications: any[] = [];

    if (isSupabaseConfigured) {
      // Extracción masiva en paralelo con supabaseAdmin
      const [
        pharmRes,
        empRes,
        payRes,
        scalesRes,
        membersRes,
        benefitsRes,
        jobsRes,
      ] = await Promise.all([
        supabaseAdmin.from('pharmacies').select('*').order('name'),
        supabaseAdmin.from('employees').select('*').order('full_name'),
        supabaseAdmin.from('payments').select('*').order('period', { ascending: false }),
        supabaseAdmin.from('salary_scales').select('*').order('category'),
        supabaseAdmin.from('pharmacy_members').select('*'),
        supabaseAdmin.from('benefit_requests').select('*'),
        supabaseAdmin.from('job_applications').select('*'),
      ]);

      pharmacies = pharmRes.data || [];
      employees = empRes.data || [];
      payments = payRes.data || [];
      salaryScales = scalesRes.data || [];
      pharmacyMembers = membersRes.data || [];
      benefitRequests = benefitsRes.data || [];
      jobApplications = jobsRes.data || [];
    } else {
      // Datos simulados en entorno local sin Supabase conectado
      pharmacies = [
        {
          id: 'farm-1',
          name: 'Farmacia Castelli',
          nombre_fantasia: 'Farmacia Castelli',
          razon_social: 'Farmacia Castelli S.R.L.',
          cuit: '27267319885',
          address: 'Av. Güemes 166, Rosario',
          has_debt: false,
          registered: true,
          phone_alt: '03464445779',
        },
        {
          id: 'farm-2',
          name: 'Farmacia Balducchi',
          nombre_fantasia: 'Farmacia Balducchi',
          razon_social: 'Daniela Balducchi',
          cuit: '27343989313',
          address: 'San Martín 1200, Rosario',
          has_debt: false,
          registered: true,
        },
      ];
      employees = [
        {
          id: 'emp-1',
          pharmacy_id: 'farm-1',
          full_name: 'María Luz Castelli',
          cuil: '27-26731988-5',
          category: 'Farmacéutico',
          active: true,
          is_affiliate: true,
        },
      ];
      payments = [
        {
          id: 'pay-1',
          pharmacy_id: 'farm-1',
          period: '07/2026',
          amount: 85000,
          status: 'pagado',
          invoice_number: 'B-0001-00007785',
        },
      ];
    }

    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '-');
    const timestamp = `${dateStr}_${timeStr}`;

    // 1. Detección de carpeta de usuario en Windows (o SO host)
    const homeDir = process.env.USERPROFILE || process.env.HOME || os.homedir();
    const backupDir = path.join(homeDir, 'Backups_ATFAR');

    let savedToDisk = false;
    let diskError: string | null = null;
    let savedMasterJsonPath = '';

    try {
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      // Snapshot maestro JSON
      const snapshot: LocalDbSnapshot = {
        version: '1.0.0-local-first',
        exportedAt: now.toISOString(),
        windowsPath: backupDir,
        counts: {
          pharmacies: pharmacies.length,
          employees: employees.length,
          payments: payments.length,
          scales: salaryScales.length,
          members: pharmacyMembers.length,
          benefits: benefitRequests.length,
          jobApplications: jobApplications.length,
        },
        data: {
          pharmacies,
          employees,
          payments,
          salaryScales,
          pharmacyMembers,
          benefitRequests,
          jobApplications,
        },
      };

      savedMasterJsonPath = path.join(backupDir, `backup_atfar_${timestamp}.json`);
      const recentJsonPath = path.join(backupDir, 'base_completa_atfar_reciente.json');
      const jsonString = JSON.stringify(snapshot, null, 2);

      fs.writeFileSync(savedMasterJsonPath, jsonString, 'utf8');
      fs.writeFileSync(recentJsonPath, jsonString, 'utf8');

      // Generar CSVs tabulares para Excel
      const csvFarmacias = generateCsv(pharmacies, [
        { key: 'id', label: 'ID' },
        { key: 'cuit', label: 'CUIT' },
        { key: 'name', label: 'Nombre' },
        { key: 'nombre_fantasia', label: 'Nombre de Fantasía' },
        { key: 'razon_social', label: 'Razón Social' },
        { key: 'address', label: 'Domicilio' },
        { key: 'whatsapp', label: 'WhatsApp' },
        { key: 'phone_alt', label: 'Teléfono' },
        { key: 'has_debt', label: 'Tiene Deuda' },
        { key: 'registered', label: 'Registrada' },
      ]);
      fs.writeFileSync(path.join(backupDir, `farmacias_${dateStr}.csv`), csvFarmacias, 'utf8');

      const csvEmpleados = generateCsv(employees, [
        { key: 'id', label: 'ID' },
        { key: 'pharmacy_id', label: 'ID Farmacia' },
        { key: 'full_name', label: 'Nombre y Apellido' },
        { key: 'cuil', label: 'CUIL' },
        { key: 'category', label: 'Categoría CCT' },
        { key: 'entry_date', label: 'Fecha Ingreso' },
        { key: 'is_affiliate', label: 'Afiliado ATFAR' },
        { key: 'weekly_hours', label: 'Horas Semanales' },
        { key: 'custom_salary', label: 'Sueldo Pactado' },
        { key: 'active', label: 'Activo' },
      ]);
      fs.writeFileSync(path.join(backupDir, `nomina_empleados_${dateStr}.csv`), csvEmpleados, 'utf8');

      const csvPagos = generateCsv(payments, [
        { key: 'id', label: 'ID' },
        { key: 'pharmacy_id', label: 'ID Farmacia' },
        { key: 'invoice_number', label: 'Nro Boleta' },
        { key: 'period', label: 'Período' },
        { key: 'amount', label: 'Monto Total' },
        { key: 'status', label: 'Estado' },
        { key: 'pay_date', label: 'Fecha de Pago' },
        { key: 'due_date', label: 'Fecha de Vencimiento' },
        { key: 'transaction_code', label: 'Código Transacción' },
        { key: 'payment_provider', label: 'Medio de Pago' },
      ]);
      fs.writeFileSync(path.join(backupDir, `ddjj_y_pagos_${dateStr}.csv`), csvPagos, 'utf8');

      savedToDisk = true;
    } catch (fsErr: any) {
      console.warn('No se pudo escribir en disco físico (ej. entorno cloud sin permisos):', fsErr?.message);
      diskError = fsErr?.message || 'Error de escritura en disco';
    }

    const responseSnapshot: LocalDbSnapshot = {
      version: '1.0.0-local-first',
      exportedAt: now.toISOString(),
      windowsPath: savedMasterJsonPath || backupDir,
      counts: {
        pharmacies: pharmacies.length,
        employees: employees.length,
        payments: payments.length,
        scales: salaryScales.length,
        members: pharmacyMembers.length,
        benefits: benefitRequests.length,
        jobApplications: jobApplications.length,
      },
      data: {
        pharmacies,
        employees,
        payments,
        salaryScales,
        pharmacyMembers,
        benefitRequests,
        jobApplications,
      },
    };

    return NextResponse.json({
      success: true,
      savedToDisk,
      diskError,
      backupDir,
      filePath: savedMasterJsonPath,
      timestamp,
      counts: responseSnapshot.counts,
      snapshot: responseSnapshot,
    });
  } catch (error: any) {
    console.error('Error generando respaldo local de ATFAR:', error);
    return NextResponse.json(
      { error: error?.message || 'Error interno al exportar respaldo' },
      { status: 500 }
    );
  }
}

