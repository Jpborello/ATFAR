'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FileText, ArrowLeft, Send, CheckCircle2, AlertCircle, Clock, Plus, Loader2, Users } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { calculateSeniorityYears } from '@/lib/dateUtils';

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

export default function DeclaracionesPage() {
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<any[]>([]);
  const [pharmacy, setPharmacy] = useState<any | null>(null);
  const [salaryScales, setSalaryScales] = useState<any[]>([]);
  
  const [observations, setObservations] = useState('');
  const [period, setPeriod] = useState('Junio 2026');
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
            { id: '1', fullName: 'Estela Maris Gómez', cuil: '27-30444555-8', category: 'Personal en Gestión de Farmacia', entryDate: '2024-03-15', active: true },
            { id: '2', fullName: 'Carlos Alberto Rossi', cuil: '20-25666777-2', category: 'Personal con Asignación Específica', entryDate: '2025-01-10', active: true },
            { id: '3', fullName: 'Matias Nicolás Fernández', cuil: '20-41222333-5', category: 'Personal con Asignación Específica', entryDate: '2025-11-01', active: true },
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
              fullName: emp.full_name,
              cuil: emp.cuil,
              category: emp.category || 'Cadetes',
              entryDate: emp.entry_date,
              active: emp.active
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
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [period]);

  const getEmployeeCalculation = (emp: any) => {
    const categoryName = emp.category || 'Cadetes';
    let basic = FALLBACK_SALARIES[categoryName] || 1381087.99;

    let dbPeriodStr = 'july';
    if (period.includes('Junio')) dbPeriodStr = 'june';
    if (period.includes('Mayo')) dbPeriodStr = 'may';

    const dbScale = salaryScales.find(s => 
      s.category.toLowerCase().trim() === categoryName.toLowerCase().trim() &&
      s.period === dbPeriodStr &&
      !s.is_additional
    );
    if (dbScale) {
      basic = Number(dbScale.basic);
    }

    const years = calculateSeniorityYears(emp.entryDate);
    const seniorityAmount = basic * years * 0.01;
    const grossSalary = basic + seniorityAmount;

    const unionAporte = grossSalary * 0.02;
    const mutualAporte = grossSalary * 0.015;
    const totalAporte = unionAporte + mutualAporte;

    return {
      basic,
      years,
      seniorityAmount,
      grossSalary,
      unionAporte,
      mutualAporte,
      totalAporte
    };
  };

  const calculations = employees.map(emp => ({
    employee: emp,
    calc: getEmployeeCalculation(emp)
  }));

  const totalSalaries = calculations.reduce((sum, item) => sum + item.calc.grossSalary, 0);
  const totalAmount = calculations.reduce((sum, item) => sum + item.calc.totalAporte, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (employees.length === 0) {
      alert('No tenés empleados activos registrados para declarar. Agregalos primero en el panel de inicio.');
      return;
    }
    if (!confirmed) {
      alert('Debe confirmar los términos de la declaración jurada.');
      return;
    }

    setSubmitting(true);
    try {
      const isConfigured = 
        process.env.NEXT_PUBLIC_SUPABASE_URL !== 'your_supabase_project_url_here' && 
        !!process.env.NEXT_PUBLIC_SUPABASE_URL;

      let generatedInvoiceNum = '';

      if (isConfigured && pharmacy) {
        const shortId = Math.random().toString(36).substring(2, 6).toUpperCase();
        const yearMonth = period.includes('Junio') ? '202606' : period.includes('Julio') ? '202607' : '202608';
        generatedInvoiceNum = `BLT-${yearMonth}-${shortId}`;

        let dueDate = '2026-07-10';
        if (period.includes('Julio')) dueDate = '2026-08-10';
        if (period.includes('Agosto')) dueDate = '2026-09-10';

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
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Error al presentar la declaración jurada.');
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
                    <option value="Junio 2026">Junio 2026</option>
                    <option value="Julio 2026">Julio 2026</option>
                    <option value="Agosto 2026">Agosto 2026</option>
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
                            <th className="py-2.5 px-3">Empleado</th>
                            <th className="py-2.5 px-3">Categoría CCT</th>
                            <th className="py-2.5 px-3 text-center">Antigüedad</th>
                            <th className="py-2.5 px-3 text-right">Sueldo Bruto</th>
                            <th className="py-2.5 px-3 text-right font-black">Aporte (3.5%)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60">
                          {calculations.map(({ employee, calc }) => (
                            <tr key={employee.id} className="hover:bg-muted/5 transition-colors">
                              <td className="py-2 px-3 font-semibold">
                                {employee.fullName}
                                <span className="block text-[9px] text-muted-foreground font-mono">{employee.cuil}</span>
                              </td>
                              <td className="py-2 px-3 font-medium text-slate-600 max-w-[150px] truncate">
                                {employee.category}
                              </td>
                              <td className="py-2 px-3 text-center font-bold text-slate-700">
                                {calc.years} {calc.years === 1 ? 'año' : 'años'}
                              </td>
                              <td className="py-2 px-3 text-right font-mono text-slate-600">
                                ${calc.grossSalary.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="py-2 px-3 text-right font-mono font-extrabold text-primary">
                                ${calc.totalAporte.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                            </tr>
                          ))}
                          <tr className="bg-slate-50/50 border-t border-border font-bold">
                            <td colSpan={3} className="py-2.5 px-3 text-right text-[10px] text-muted-foreground uppercase">Total Masa Salarial:</td>
                            <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                              ${totalSalaries.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
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
                disabled={submitting || employees.length === 0}
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
