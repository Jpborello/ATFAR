/* eslint-disable @next/next/no-img-element */
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FileText, ArrowLeft, Send, CheckCircle2, Clock, Loader2, Users, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { calculateSeniorityYears, isReceiptValid } from '@/lib/dateUtils';

import { Employee, Pharmacy, SalaryScale } from '@/types';

interface DeclarationItem {
  period: string;
  submitDate: string;
  amount: number;
  status: 'validada' | 'pendiente';
}

const FALLBACK_SALARIES: Record<string, number> = {
  'Cadetes': 1381087.99,
  'Aprendiz Ayudante': 1439467.77,
  'Personal Auxiliar Interno y Externo': 1470925.27,
  'Personal con Asignación Específica': 1524238.50,
  'Ayudante en Gestión de Farmacia': 1555707.88,
  'Personal en Gestión de Farmacia': 1644204.40,
  'Farmacéutico': 1895145.60
};

// Nombres de mes en español (índice 0 = Enero) y su clave correspondiente en salary_scales.period.
// Antes esto estaba hardcodeado a mano solo para Junio/Julio/Agosto 2026 - se rompía apenas pasaba ese trimestre.
const MONTHS_ES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const SALARY_PERIOD_KEYS = ['jan', 'feb', 'march', 'april', 'may', 'june', 'july', 'aug', 'sep', 'oct', 'nov', 'dec'];

/** Parsea una etiqueta "Mes AAAA" (ej. "Julio 2026") a { year, monthIndex } (0-indexado). */
function parsePeriodLabel(label: string): { year: number; monthIndex: number } | null {
  const [monthName, yearStr] = label.split(' ');
  const monthIndex = MONTHS_ES.findIndex((m) => m === monthName);
  const year = parseInt(yearStr, 10);
  if (monthIndex === -1 || isNaN(year)) return null;
  return { year, monthIndex };
}

/** Genera las opciones de período declarable: el mes actual y los dos anteriores. */
function buildDeclarablePeriods(): string[] {
  const now = new Date();
  const options: string[] = [];
  for (let i = 0; i < 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    options.push(`${MONTHS_ES[d.getMonth()]} ${d.getFullYear()}`);
  }
  return options;
}

export default function DeclaracionesPage() {
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [pharmacy, setPharmacy] = useState<Pharmacy | null>(null);
  const [salaryScales, setSalaryScales] = useState<SalaryScale[]>([]);
  
  const [observations, setObservations] = useState('');
  const declarablePeriods = buildDeclarablePeriods();
  const [period, setPeriod] = useState(declarablePeriods[0]);
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const [history, setHistory] = useState<DeclarationItem[]>([
    { period: 'Mayo 2026', submitDate: '24/05/2026', amount: 45000, status: 'validada' },
    { period: 'Abril 2026', submitDate: '25/04/2026', amount: 45000, status: 'validada' },
    { period: 'Marzo 2026', submitDate: '28/03/2026', amount: 41800, status: 'validada' },
  ]);

  useEffect(() => {
    async function loadData() {
      try {
        const isConfigured = 
          process.env.NEXT_PUBLIC_SUPABASE_URL !== 'your_supabase_project_url_here' && 
          !!process.env.NEXT_PUBLIC_SUPABASE_URL;

        if (!isConfigured) {
          setEmployees([
            { id: '1', full_name: 'Estela Maris Gómez', fullName: 'Estela Maris Gómez', cuil: '27-30444555-8', category: 'Personal en Gestión de Farmacia', entry_date: '2024-03-15', entryDate: '2024-03-15', active: true, is_affiliate: true, isAffiliate: true },
            { id: '2', full_name: 'Carlos Alberto Rossi', fullName: 'Carlos Alberto Rossi', cuil: '20-25666777-2', category: 'Personal con Asignación Específica', entry_date: '2025-01-10', entryDate: '2025-01-10', active: true, is_affiliate: false, isAffiliate: false },
            { id: '3', full_name: 'Matias Nicolás Fernández', fullName: 'Matias Nicolás Fernández', cuil: '20-41222333-5', category: 'Personal con Asignación Específica', entry_date: '2025-11-01', entryDate: '2025-11-01', active: true, is_affiliate: true, isAffiliate: true },
          ]);
          setLoading(false);
          return;
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setLoading(false);
          return;
        }

        const { data: pharm } = await supabase
          .from('pharmacies')
          .select('*')
          .eq('owner_id', session.user.id)
          .single();

        if (pharm) {
          setPharmacy(pharm);

          const { data: list } = await supabase
            .from('employees')
            .select('*')
            .eq('pharmacy_id', pharm.id)
            .eq('active', true);

          if (list) {
            setEmployees(list.map(emp => ({
              id: emp.id,
              full_name: emp.full_name,
              fullName: emp.full_name,
              cuil: emp.cuil,
              category: emp.category || 'Cadetes',
              entry_date: emp.entry_date,
              entryDate: emp.entry_date,
              active: emp.active,
              is_affiliate: !!emp.is_affiliate,
              isAffiliate: !!emp.is_affiliate,
              receipt_url: emp.receipt_url,
              receiptUrl: emp.receipt_url,
              receipt_date: emp.receipt_date,
              receiptDate: emp.receipt_date
            })));
          }

          const { data: scales } = await supabase
            .from('salary_scales')
            .select('*');
          if (scales) {
            setSalaryScales(scales);
          }

          const { data: payHistory } = await supabase
            .from('payments')
            .select('*')
            .eq('pharmacy_id', pharm.id)
            .order('created_at', { ascending: false });

          if (payHistory && payHistory.length > 0) {
            setHistory(payHistory.map(p => ({
              period: p.period,
              submitDate: new Date(p.created_at).toLocaleDateString('es-AR'),
              amount: Number(p.amount),
              status: p.status === 'pagado' ? 'validada' : 'pendiente'
            })));
          }
        }
      } catch (err) {
        console.error("Error loading DDJJ data:", err);
        toast.error('No pudimos cargar los datos de tu declaración.', {
          description: 'Revisá tu conexión y volvé a intentarlo.',
        });
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [period]);

  const getEmployeeCalculation = (emp: Employee) => {
    const categoryName = emp.category || 'Cadetes';
    let basic = FALLBACK_SALARIES[categoryName] || 1381087.99;
    let noRem = 0;

    const parsedPeriod = parsePeriodLabel(period);
    const dbPeriodStr = parsedPeriod ? SALARY_PERIOD_KEYS[parsedPeriod.monthIndex] : null;

    const dbScale = dbPeriodStr
      ? salaryScales.find(s =>
          s.category.toLowerCase().trim() === categoryName.toLowerCase().trim() &&
          s.period === dbPeriodStr &&
          !s.is_additional
        )
      : undefined;
    if (dbScale) {
      basic = Number(dbScale.basic ?? dbScale.base_salary ?? 0);
      noRem = Number(dbScale.no_rem ?? dbScale.non_remunerative ?? 0);
    }

    const years = calculateSeniorityYears(emp.entryDate);
    const seniorityAmount = basic * years * 0.01;
    const grossSalary = basic + seniorityAmount;

    let unionAporte = 0;
    let mutualAporte = 0;

    if (emp.isAffiliate) {
      // Afiliado: 2% de lo remunerativo + 2% de lo no remunerativo
      unionAporte = (grossSalary + noRem) * 0.02;
      // Mutual: 1.5% de lo remunerativo
      mutualAporte = grossSalary * 0.015;
    } else {
      // No Afiliado: 2% de lo no remunerativo (nada sobre lo remunerativo, sin mutual)
      unionAporte = noRem * 0.02;
      mutualAporte = 0;
    }

    const totalAporte = unionAporte + mutualAporte;

    return {
      basic,
      years,
      seniorityAmount,
      grossSalary,
      noRem,
      unionAporte,
      mutualAporte,
      totalAporte
    };
  };

  const calculations = employees.map(emp => ({
    employee: emp,
    calc: getEmployeeCalculation(emp)
  }));

  // Si el sindicato todavía no cargó la escala salarial oficial de este período (Admin > Escalas),
  // los montos de abajo son un valor de referencia viejo, no la escala vigente.
  const currentPeriodKey = (() => {
    const parsed = parsePeriodLabel(period);
    return parsed ? SALARY_PERIOD_KEYS[parsed.monthIndex] : null;
  })();
  const hasOfficialScaleForPeriod = salaryScales.some(s => s.period === currentPeriodKey);

  const totalSalaries = calculations.reduce((sum, item) => sum + item.calc.grossSalary, 0);
  const totalNoRem = calculations.reduce((sum, item) => sum + item.calc.noRem, 0);
  const totalAmount = calculations.reduce((sum, item) => sum + item.calc.totalAporte, 0);

  const invalidReceiptEmployees = employees.filter(emp => !isReceiptValid(emp.receiptDate || emp.receipt_date));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (employees.length === 0) {
      toast.warning('No tenés empleados activos registrados para declarar.', {
        description: 'Agregalos primero en el panel de inicio.',
      });
      return;
    }
    if (invalidReceiptEmployees.length > 0) {
      toast.warning('Debés actualizar el recibo de sueldo de tus empleados para emitir la boleta de pago.');
      return;
    }
    if (!confirmed) {
      toast.warning('Debés confirmar los términos de la declaración jurada.');
      return;
    }

    setSubmitting(true);
    try {
      const isConfigured = 
        process.env.NEXT_PUBLIC_SUPABASE_URL !== 'your_supabase_project_url_here' && 
        !!process.env.NEXT_PUBLIC_SUPABASE_URL;

      let generatedInvoiceNum = '';

      if (isConfigured && pharmacy) {
        const shortId = (pharmacy.id || 'BLT').replace(/-/g, '').substring(0, 5).toUpperCase();

        const parsedPeriod = parsePeriodLabel(period);
        if (!parsedPeriod) throw new Error('Período inválido, volvé a seleccionarlo.');

        const yearMonth = `${parsedPeriod.year}${String(parsedPeriod.monthIndex + 1).padStart(2, '0')}`;
        generatedInvoiceNum = `BLT-${yearMonth}-${shortId}`;

        // Vencimiento: el 10 del mes siguiente al período declarado (calculado, no hardcodeado)
        const dueDateObj = new Date(parsedPeriod.year, parsedPeriod.monthIndex + 1, 10);
        const dueDate = `${dueDateObj.getFullYear()}-${String(dueDateObj.getMonth() + 1).padStart(2, '0')}-${String(dueDateObj.getDate()).padStart(2, '0')}`;

        const { error } = await supabase
          .from('payments')
          .insert({
            pharmacy_id: pharmacy.id,
            invoice_number: generatedInvoiceNum,
            period: period,
            amount: totalAmount,
            status: 'impago',
            due_date: dueDate
          });

        if (error) throw error;
      } else {
        generatedInvoiceNum = `BLT-202607-MOCK`;
        console.warn("Supabase not configured, simulating invoice generation.");
      }

      setSuccess(true);
      setObservations('');
      setConfirmed(false);
      
      // Reload history
      if (isConfigured && pharmacy) {
        const { data: payHistory } = await supabase
          .from('payments')
          .select('*')
          .eq('pharmacy_id', pharmacy.id)
          .order('created_at', { ascending: false });

        if (payHistory) {
          setHistory(payHistory.map(p => ({
            period: p.period,
            submitDate: new Date(p.created_at).toLocaleDateString('es-AR'),
            amount: Number(p.amount),
            status: p.status === 'pagado' ? 'validada' : 'pendiente'
          })));
        }
      }
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : 'Error al presentar la declaración jurada.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Cargando datos declarativos...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#f8fafc] text-[#1e293b] min-h-screen">
      {/* Top Header */}
      <header className="bg-card border-b border-border/80 py-4 px-6 flex items-center justify-between shadow-premium">
        <div className="flex items-center gap-3">
          <Link href="/farmacia">
            <img src="/images/logo.jpg" alt="Logo" className="h-9 w-auto object-contain bg-white p-0.5 rounded border border-border" />
          </Link>
          <div>
            <span className="text-xs font-black uppercase tracking-wider text-primary block leading-none">ATFAR</span>
            <span className="text-[9px] text-muted-foreground block font-bold">Declaraciones Juradas</span>
          </div>
        </div>

        <Link 
          href="/farmacia"
          className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver al Panel</span>
        </Link>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        
        {success ? (
          <div className="bg-card border border-emerald-500/20 rounded-3xl p-8 text-center space-y-6 shadow-premium max-w-2xl mx-auto glass">
            <div className="inline-flex p-4 bg-emerald-500/10 text-emerald-500 rounded-full">
              <CheckCircle2 className="w-12 h-12" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-foreground">¡Declaración Presentada e Importes Liquidados!</h2>
              <p className="text-sm text-muted-foreground leading-relaxed font-medium">
                La declaración jurada para el período **{period}** fue generada con éxito por un total de **${totalAmount.toLocaleString('es-AR')}** en concepto de aportes obligatorios. 
                Se ha generado la boleta de pago correspondiente y ya podés verla y abonarla.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
              <Link
                href="/farmacia/pagos"
                className="px-6 py-2.5 rounded-xl bg-secondary text-secondary-foreground font-bold hover:bg-secondary/90 transition-all text-xs uppercase tracking-wider shadow-premium"
              >
                Ir a Pagar Boleta
              </Link>
              <button
                onClick={() => setSuccess(false)}
                className="px-6 py-2.5 rounded-xl border border-border bg-card font-bold hover:bg-muted/10 transition-all text-xs uppercase tracking-wider"
              >
                Nueva DDJJ
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left: Form */}
            <form onSubmit={handleSubmit} className="lg:col-span-8 bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-xl space-y-6 glass">
              <h2 className="font-extrabold text-foreground text-lg border-b border-border pb-3 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-secondary" />
                  Nueva Presentación Mensual
                </span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-widest">
                  CUIT: {pharmacy?.cuit || '...'}
                </span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label htmlFor="period-select" className="text-xs font-semibold text-muted-foreground">Período Declarable</label>
                  <select
                    id="period-select"
                    value={period}
                    onChange={(e) => setPeriod(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-secondary/50 text-xs transition-all font-bold text-foreground"
                  >
                    {declarablePeriods.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>

                <div className="bg-[#f1f5f9] p-3.5 rounded-xl border border-slate-200/60 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-slate-700">
                    <Users className="w-4 h-4 text-secondary" />
                    <span className="font-semibold">Empleados Activos:</span>
                  </div>
                  <span className="font-extrabold text-sm text-foreground">{employees.length}</span>
                </div>
              </div>

              {!hasOfficialScaleForPeriod && (
                <div className="flex items-start gap-3 p-3.5 bg-amber-500/10 border border-amber-500/25 rounded-xl text-amber-700 dark:text-amber-400 text-xs font-semibold">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>
                    El sindicato todavía no cargó la escala salarial oficial para {period} en el sistema. Los montos
                    de abajo se calculan con la última referencia disponible y pueden no coincidir con el CCT vigente
                    para este período.
                  </span>
                </div>
              )}

              {/* Employees calculation breakdown */}
              <div className="space-y-2">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider block">Liquidación Analítica de Aportes</h3>
                {employees.length === 0 ? (
                  <div className="border border-dashed border-border rounded-xl p-6 text-center text-xs text-muted-foreground font-semibold">
                    No hay empleados cargados en tu nómina. Registralos en la pantalla principal antes de declarar.
                  </div>
                ) : (
                  <div className="border border-border rounded-xl overflow-hidden shadow-sm bg-background">
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-left text-[11px] text-foreground font-sans">
                        <thead>
                          <tr className="border-b border-border bg-slate-50/75 text-[9px] font-bold text-muted-foreground uppercase">
                            <th className="py-2.5 px-3">Empleado / Categoría</th>
                            <th className="py-2.5 px-3 text-center">Afiliado</th>
                            <th className="py-2.5 px-3 text-right">Base Remun.</th>
                            <th className="py-2.5 px-3 text-right">No Remun.</th>
                            <th className="py-2.5 px-3 text-right">Aportes (Sind / Mut)</th>
                            <th className="py-2.5 px-3 text-right font-black">Total Aporte</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60">
                          {calculations.map(({ employee, calc }) => (
                            <tr key={employee.id} className="hover:bg-muted/5 transition-colors">
                              <td className="py-2 px-3 font-semibold">
                                {employee.fullName}
                                <span className="block text-[9px] text-muted-foreground font-mono">{employee.cuil} • <span className="font-sans font-medium text-slate-500">{employee.category}</span></span>
                              </td>
                              <td className="py-2 px-3 text-center">
                                {employee.isAffiliate ? (
                                  <span className="inline-flex items-center px-1.5 py-0.5 bg-emerald-500/10 text-emerald-600 rounded text-[9px] font-black uppercase border border-emerald-500/20">
                                    Sí
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-1.5 py-0.5 bg-slate-500/10 text-slate-500 rounded text-[9px] font-black uppercase border border-slate-500/10">
                                    No
                                  </span>
                                )}
                              </td>
                              <td className="py-2 px-3 text-right font-mono text-slate-600">
                                ${calc.grossSalary.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="py-2 px-3 text-right font-mono text-slate-600">
                                ${calc.noRem.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="py-2 px-3 text-right font-mono text-slate-500 text-[10px]">
                                <div className="flex flex-col items-end leading-tight">
                                  <span>Sind (2%): ${calc.unionAporte.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                  {calc.mutualAporte > 0 && (
                                    <span className="text-[9px] text-slate-400">Mut (1.5%): ${calc.mutualAporte.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                  )}
                                </div>
                              </td>
                              <td className="py-2 px-3 text-right font-mono font-extrabold text-primary">
                                ${calc.totalAporte.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                            </tr>
                          ))}
                          <tr className="bg-slate-50/50 border-t border-border font-bold">
                            <td colSpan={2} className="py-2.5 px-3 text-right text-[10px] text-muted-foreground uppercase">Totales del Período:</td>
                            <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                              ${totalSalaries.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                              ${totalNoRem.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="py-2.5 px-3"></td>
                            <td className="py-2.5 px-3 text-right font-mono font-black text-sm text-primary">
                              ${totalAmount.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label htmlFor="observations" className="text-xs font-semibold text-muted-foreground">Observaciones (Licencias, bajas temporales)</label>
                <textarea
                  id="observations"
                  rows={3}
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  placeholder="Detallá si hubo altas, jubilaciones o suspensiones durante este período..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-secondary/50 text-xs transition-all resize-none font-medium text-foreground"
                />
              </div>

              {/* Salary Receipt Expiration Warning Banner */}
              {invalidReceiptEmployees.length > 0 && (
                <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs space-y-2">
                  <div className="flex items-center gap-2 font-bold text-red-800">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                    <span>Documentación Requerida (Recibo de Sueldo):</span>
                  </div>
                  <p className="leading-relaxed font-semibold">
                    Para generar la boleta de pago del período, debes regularizar la carga del recibo de sueldo (renovación obligatoria cada 6 meses) de los siguientes empleados:
                  </p>
                  <ul className="list-disc list-inside font-bold space-y-0.5 pl-2 text-red-900">
                    {invalidReceiptEmployees.map(emp => (
                      <li key={emp.id}>{emp.fullName || emp.full_name} ({emp.cuil})</li>
                    ))}
                  </ul>
                  <div className="pt-1">
                    <Link href="/farmacia" className="underline font-bold text-red-800 hover:opacity-80 inline-flex items-center gap-1">
                      Ir al Panel de Farmacia para subir los recibos →
                    </Link>
                  </div>
                </div>
              )}

              {/* Sworn Confirmation */}
              <div className="flex items-start gap-3 p-3.5 bg-muted/40 rounded-xl border border-border/80">
                <input
                  type="checkbox"
                  id="confirm-ddjj"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  className="w-4.5 h-4.5 accent-primary mt-0.5 flex-shrink-0 cursor-pointer"
                />
                <label htmlFor="confirm-ddjj" className="text-[10px] text-muted-foreground font-semibold leading-relaxed cursor-pointer select-none">
                  Declaro bajo juramento de ley que la cantidad de empleados informada y las novedades consignadas se ajustan estrictamente a la realidad y a los libros de sueldos vigentes.
                </label>
              </div>

              <button
                type="submit"
                disabled={submitting || employees.length === 0 || invalidReceiptEmployees.length > 0}
                className="w-full inline-flex items-center justify-center px-6 py-3.5 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/95 transition-all text-xs uppercase tracking-wider shadow-premium disabled:opacity-50 disabled:cursor-not-allowed group cursor-pointer"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Procesando Liquidación...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2 group-hover:translate-x-0.5 transition-transform" />
                    Presentar DDJJ y Generar Boleta de Pago
                  </>
                )}
              </button>
            </form>

            {/* Right: History */}
            <div className="lg:col-span-4 bg-card border border-border rounded-3xl p-6 shadow-lg glass space-y-6">
              <h3 className="font-bold text-foreground text-md border-b border-border pb-3">Historial de Presentaciones</h3>
              
              <div className="divide-y divide-border/60 max-h-[350px] overflow-y-auto pr-1">
                {history.length === 0 ? (
                  <div className="py-6 text-center text-xs text-muted-foreground font-semibold">
                    No se han registrado presentaciones previas.
                  </div>
                ) : (
                  history.map((item, idx) => (
                    <div key={idx} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-4 text-xs font-semibold">
                      <div className="space-y-0.5">
                        <span className="text-foreground block">{item.period}</span>
                        <span className="text-[9px] text-muted-foreground font-medium block">Presentada: {item.submitDate}</span>
                      </div>

                      <div className="flex items-center gap-3.5">
                        <span className="text-foreground font-black">${Number(item.amount).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        
                        {item.status === 'validada' ? (
                          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-emerald-500/10 text-emerald-600 rounded text-[9px] font-black uppercase">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Validada</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-amber-500/10 text-amber-600 rounded text-[9px] font-black uppercase">
                            <Clock className="w-3 h-3 animate-pulse" />
                            <span>Pendiente</span>
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        )}
      </main>
    </div>
  );
}
