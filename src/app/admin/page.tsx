'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { 
  Building2, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  TrendingUp, 
  Clock, 
  ArrowUpRight,
  ArrowRight,
  ShieldCheck,
  DollarSign,
  X,
  FileText,
  AlertCircle,
  Check
} from 'lucide-react';

interface Activity {
  id: number;
  dbId: string;
  pharmacy: string;
  action: string;
  date: string;
  status: string;
  amount: number;
  cuit: string;
  period: string;
  transCode: string;
  fileName: string;
  receiptUrl: string;
  ddjjUrl: string;
  ddjjFileName: string;
}

export default function AdminDashboardPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [monthlyRevenue, setMonthlyRevenue] = useState(0);
  const [activePharmaciesCount, setActivePharmaciesCount] = useState(0);
  const [debtPharmaciesCount, setDebtPharmaciesCount] = useState(0);
  const [pendingDeclarationsCount, setPendingDeclarationsCount] = useState(0);
  const [totalPharmacies, setTotalPharmacies] = useState(0);

  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [auditLoading, setAuditLoading] = useState(false);

  useEffect(() => {
    async function loadStats() {
      try {
        const isConfigured = 
          process.env.NEXT_PUBLIC_SUPABASE_URL !== 'your_supabase_project_url_here' && 
          !!process.env.NEXT_PUBLIC_SUPABASE_URL;

        if (!isConfigured) return;

        // Fetch all pharmacies count
        const { count: totalCount } = await supabase
          .from('pharmacies')
          .select('*', { count: 'exact', head: true });

        // Fetch registered pharmacies
        const { data: regData } = await supabase
          .from('pharmacies')
          .select('registered, has_debt')
          .eq('registered', true);

        // Fetch pending payments
        const { data: pendingPayments } = await supabase
          .from('payments')
          .select('id')
          .eq('status', 'pending');

        // Fetch paid payments
        const { data: paidPayments } = await supabase
          .from('payments')
          .select('amount')
          .eq('status', 'paid');

        // Fetch recent payments activity
        const { data: recentPayments } = await supabase
          .from('payments')
          .select(`
            id,
            amount,
            status,
            period,
            transaction_code,
            receipt_url,
            ddjj_url,
            created_at,
            pharmacies (
              name,
              cuit
            )
          `)
          .order('created_at', { ascending: false })
          .limit(4);

        setTotalPharmacies(totalCount || 0);
        
        if (regData) {
          const active = regData.filter(p => !p.has_debt).length;
          const debt = regData.filter(p => p.has_debt).length;
          setActivePharmaciesCount(active);
          setDebtPharmaciesCount(debt);
        }

        setPendingDeclarationsCount(pendingPayments?.length || 0);

        if (paidPayments) {
          const totalRev = paidPayments.reduce((acc, curr) => acc + (curr.amount || 0), 0);
          setMonthlyRevenue(totalRev);
        }

        if (recentPayments) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const mapped: Activity[] = recentPayments.map((p: any, idx: number) => ({
            id: idx + 1,
            dbId: p.id,
            pharmacy: p.pharmacies?.name || 'Farmacia Desconocida',
            action: p.status === 'paid' 
              ? 'Declaración mensual validada por administración'
              : (p.status === 'pending' ? `Declaración mensual presentada (${p.period || 'Período'})` : 'Pago rechazado / con deuda'),
            date: new Date(p.created_at).toLocaleDateString('es-AR'),
            status: p.status,
            amount: p.amount || 0,
            cuit: p.pharmacies?.cuit || '---',
            period: p.period || '---',
            transCode: p.transaction_code || '---',
            fileName: p.receipt_url ? p.receipt_url.split('/').pop() || 'comprobante.pdf' : '---',
            receiptUrl: p.receipt_url || '',
            ddjjUrl: p.ddjj_url || '',
            ddjjFileName: p.ddjj_url ? p.ddjj_url.split('/').pop() || 'ddjj.pdf' : '---'
          }));
          setActivities(mapped);
        }
      } catch (err) {
        console.error("Error loading admin stats:", err);
      }
    }
    loadStats();
  }, []);

  const handleOpenAudit = (activity: Activity) => {
    if (activity.status === 'pending') {
      setSelectedActivity(activity);
      setIsAuditModalOpen(true);
    }
  };

  const handleApprovePayment = async (activityId: number) => {
    setAuditLoading(true);
    try {
      const act = activities.find(a => a.id === activityId);
      if (act && act.dbId) {
        const { error } = await supabase
          .from('payments')
          .update({ status: 'paid' })
          .eq('id', act.dbId);

        if (error) throw error;
        
        // Recargar el estado local
        setActivities(prev => prev.map(a => a.id === activityId ? { ...a, status: 'paid', action: 'Declaración mensual validada por administración' } : a));
        setMonthlyRevenue(prev => prev + act.amount);
        setActivePharmaciesCount(prev => prev + 1);
        setPendingDeclarationsCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error(err);
      alert('Error al aprobar el pago.');
    } finally {
      setAuditLoading(false);
      setIsAuditModalOpen(false);
    }
  };

  const handleRejectPayment = async (activityId: number) => {
    setAuditLoading(true);
    try {
      const act = activities.find(a => a.id === activityId);
      if (act && act.dbId) {
        const { error } = await supabase
          .from('payments')
          .update({ status: 'unpaid' })
          .eq('id', act.dbId);

        if (error) throw error;

        if (act.cuit) {
          await supabase
            .from('pharmacies')
            .update({ has_debt: true })
            .eq('cuit', act.cuit);
        }

        setActivities(prev => prev.map(a => a.id === activityId ? { ...a, status: 'unpaid', action: 'Pago rechazado por administración' } : a));
        setDebtPharmaciesCount(prev => prev + 1);
        setPendingDeclarationsCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error(err);
      alert('Error al rechazar el pago.');
    } finally {
      setAuditLoading(false);
      setIsAuditModalOpen(false);
    }
  };

  const cards = [
    { 
      label: 'Farmacias Registradas', 
      value: totalPharmacies.toString(), 
      detail: 'Padrón total comercial', 
      color: 'text-primary bg-primary/5 border-primary/10',
      icon: Building2 
    },
    { 
      label: 'Farmacias Activas', 
      value: activePharmaciesCount.toString(), 
      detail: 'Declaraciones presentadas al día', 
      color: 'text-emerald-600 bg-emerald-500/5 border-emerald-500/10',
      icon: CheckCircle2 
    },
    { 
      label: 'Farmacias con Deuda', 
      value: debtPharmaciesCount.toString(), 
      detail: 'Aportes pendientes de pago', 
      color: 'text-red-600 bg-red-500/5 border-red-500/10',
      icon: XCircle 
    },
    { 
      label: 'Declaraciones Pendientes', 
      value: pendingDeclarationsCount.toString(), 
      detail: 'Esperando validación de nómina', 
      color: 'text-amber-600 bg-amber-500/5 border-amber-500/10',
      icon: AlertTriangle 
    },
  ];

  const chartData = [
    { month: 'Ene', amount: 3800000, height: 'h-32' },
    { month: 'Feb', amount: 4100000, height: 'h-36' },
    { month: 'Mar', amount: 4400000, height: 'h-40' },
    { month: 'Abr', amount: 4200000, height: 'h-38' },
    { month: 'May', amount: 4600000, height: 'h-44' },
    { month: 'Jun', amount: monthlyRevenue, height: 'h-48' }, // Tied to monthlyRevenue state
  ];

  return (
    <div className="space-y-8">
      {/* Top Welcome Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
            Resumen General
          </h1>
          <p className="text-xs font-semibold text-muted-foreground">
            Monitoreo en tiempo real de aportes y registros comerciales de farmacia.
          </p>
        </div>
        
        {/* Recaudación Mensual Card inside header */}
        <div className="bg-card border border-border rounded-2xl px-5 py-3 shadow-premium flex items-center gap-3.5 glass">
          <div className="p-2 bg-primary/5 text-primary border border-primary/10 rounded-xl">
            <DollarSign className="w-5 h-5 text-secondary" />
          </div>
          <div>
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest block">Recaudación Mensual (Jun)</span>
            <span className="text-xl font-black text-primary">${monthlyRevenue.toLocaleString('es-AR')}</span>
          </div>
        </div>
      </div>

      {/* Grid of indicators */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {cards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div 
              key={idx}
              className="bg-card border border-border rounded-3xl p-5 shadow-premium hover:shadow-premium-lg transition-all flex items-center justify-between gap-4 glass"
            >
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                  {card.label}
                </span>
                <span className="text-3xl font-black text-foreground block">
                  {card.value}
                </span>
                <span className="text-[10px] text-muted-foreground font-medium block">
                  {card.detail}
                </span>
              </div>
              <div className={`p-3.5 rounded-xl border ${card.color}`}>
                <Icon className="w-5 h-5" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Graphs & Recents Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Chart Column */}
        <div className="lg:col-span-7 bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-premium glass space-y-6">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div>
              <h2 className="text-base font-bold text-foreground">Tendencias de Recaudación</h2>
              <p className="text-[10px] text-muted-foreground">Evolución de aportes de farmacias en el último semestre</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-emerald-500 font-bold bg-emerald-500/10 px-2.5 py-1 rounded-lg">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>+18.4% anual</span>
            </div>
          </div>

          {/* Bar Chart Representation */}
          <div className="flex items-end justify-between h-64 pt-6 px-4">
            {chartData.map((data, idx) => (
              <div key={idx} className="flex flex-col items-center gap-3 w-12 group cursor-pointer">
                {/* Tooltip on hover */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-primary text-primary-foreground text-[10px] font-bold py-1 px-2 rounded absolute mb-20 translate-y-[-24px] shadow-premium">
                  ${(data.amount / 1000000).toFixed(1)}M
                </div>
                
                {/* Column */}
                <div className={`w-8 rounded-t-lg bg-primary/20 group-hover:bg-primary transition-all duration-300 ${data.height}`} />
                <span className="text-xs font-semibold text-muted-foreground">{data.month}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity Table Column */}
        <div className="lg:col-span-5 bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-premium glass space-y-6">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div>
              <h2 className="text-base font-bold text-foreground">Declaraciones y Pagos</h2>
              <p className="text-[10px] text-muted-foreground">Últimos movimientos registrados en el portal</p>
            </div>
            <Link 
              href="/admin/farmacias" 
              className="text-xs font-bold text-primary hover:underline flex items-center gap-0.5 group"
            >
              <span>Ver todas</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          <div className="divide-y divide-border/60">
            {activities.map((activity) => (
              <div 
                key={activity.id} 
                onClick={() => handleOpenAudit(activity)}
                className={`py-4 first:pt-0 last:pb-0 flex items-start justify-between gap-4 ${
                  activity.status === 'pending' ? 'cursor-pointer hover:bg-muted/30 px-2 -mx-2 rounded-xl transition-all' : ''
                }`}
                title={activity.status === 'pending' ? 'Hacer clic para auditar comprobante' : undefined}
              >
                <div className="space-y-1">
                  <span className="text-xs font-bold text-foreground block">{activity.pharmacy}</span>
                  <span className="text-[10px] text-muted-foreground block font-medium">{activity.action}</span>
                  <span className="text-[9px] text-muted-foreground font-semibold flex items-center gap-1">
                    <Clock className="w-3 h-3 text-secondary" />
                    {activity.date}
                  </span>
                </div>
                
                <div className="text-right space-y-1 flex-shrink-0">
                  <span className="text-xs font-bold text-foreground block">${activity.amount.toLocaleString('es-AR')}</span>
                  <span className={`inline-block text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${
                    activity.status === 'paid' 
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                      : activity.status === 'pending'
                      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 animate-pulse'
                      : 'bg-red-500/10 text-red-600 dark:text-red-400'
                  }`}>
                    {activity.status === 'paid' ? 'Pagado' : activity.status === 'pending' ? 'Pendiente' : 'Deuda'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Audit Modal */}
      {isAuditModalOpen && selectedActivity && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-premium-lg relative animate-scaleIn">
            <button
              onClick={() => setIsAuditModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-extrabold text-[#0f172a] tracking-tight mb-4 flex items-center gap-2 border-b border-border pb-3">
              <ShieldCheck className="w-5.5 h-5.5 text-secondary" />
              <span>Auditoría de Transferencia</span>
            </h3>

            <div className="space-y-4">
              <div className="bg-muted/40 rounded-2xl p-4 border border-border space-y-2 text-xs font-semibold text-slate-700">
                <div className="flex justify-between">
                  <span>Farmacia:</span>
                  <span className="text-[#0f172a] font-extrabold">{selectedActivity.pharmacy}</span>
                </div>
                <div className="flex justify-between">
                  <span>CUIT Comercial:</span>
                  <span className="text-[#0f172a] font-bold">{selectedActivity.cuit}</span>
                </div>
                <div className="flex justify-between">
                  <span>Período Declarado:</span>
                  <span className="text-[#0f172a] font-bold">{selectedActivity.period}</span>
                </div>
                <div className="flex justify-between border-t border-border/80 pt-2 font-black">
                  <span>Monto Declarado:</span>
                  <span className="text-primary text-sm">${selectedActivity.amount.toLocaleString('es-AR')}</span>
                </div>
              </div>

              <div className="space-y-2.5">
                <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider block">Datos del Depósito</span>
                <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-4 text-xs font-semibold text-slate-700 space-y-2.5">
                  <div className="flex justify-between border-b border-emerald-500/10 pb-1.5">
                    <span>Nro. Operación:</span>
                    <span className="font-mono font-bold text-emerald-950">{selectedActivity.transCode}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span>Comprobante de Pago:</span>
                    {selectedActivity.receiptUrl ? (
                      <a
                        href={selectedActivity.receiptUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-800 underline font-bold"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Ver Archivo</span>
                      </a>
                    ) : (
                      <span className="text-muted-foreground text-[10px] italic">No cargado</span>
                    )}
                  </div>

                  <div className="flex justify-between items-center">
                    <span>Declaración Jurada:</span>
                    {selectedActivity.ddjjUrl ? (
                      <a
                        href={selectedActivity.ddjjUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-800 underline font-bold"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Ver DDJJ</span>
                      </a>
                    ) : (
                      <span className="text-muted-foreground text-[10px] italic font-medium">No cargada</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-amber-500/5 border border-amber-500/10 rounded-2xl p-3 flex items-start gap-2.5">
                <AlertCircle className="w-4.5 h-4.5 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-[10px] text-amber-850 font-bold leading-relaxed">
                  Por favor, verifique en el homebanking del gremio que la transferencia con este número de operación esté acreditada antes de aprobar.
                </p>
              </div>

              <div className="pt-4 border-t border-border flex items-center justify-end gap-3">
                <button
                  type="button"
                  disabled={auditLoading}
                  onClick={() => handleRejectPayment(selectedActivity.id)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-red-200 text-red-600 text-xs font-bold uppercase tracking-wider hover:bg-red-50 transition-all cursor-pointer bg-white disabled:opacity-50"
                >
                  {auditLoading ? 'Procesando...' : 'Rechazar Pago'}
                </button>
                <button
                  type="button"
                  disabled={auditLoading}
                  onClick={() => handleApprovePayment(selectedActivity.id)}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold uppercase tracking-wider hover:bg-emerald-700 transition-all shadow-md cursor-pointer disabled:opacity-50"
                >
                  {auditLoading ? 'Procesando...' : 'Aprobar Pago'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
