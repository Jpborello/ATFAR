'use client';

import { useState, useEffect } from 'react';
import { 
  FileSpreadsheet, 
  FileText, 
  PieChart, 
  Download,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function AdminReportesPage() {
  const [reportPeriod, setReportPeriod] = useState('2026');
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [registeredPharmacies, setRegisteredPharmacies] = useState(0);
  const [activeEmployees, setActiveEmployees] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadReportStats() {
      try {
        const isConfigured = 
          process.env.NEXT_PUBLIC_SUPABASE_URL !== 'your_supabase_project_url_here' && 
          !!process.env.NEXT_PUBLIC_SUPABASE_URL;

        if (!isConfigured) return;

        // 1. Total revenue
        const { data: paid } = await supabase
          .from('payments')
          .select('amount')
          .eq('status', 'pagado');
        
        if (paid) {
          const sum = paid.reduce((acc, curr) => acc + (curr.amount || 0), 0);
          setTotalRevenue(sum);
        }

        // 2. Count registered pharmacies
        const { count: regCount } = await supabase
          .from('pharmacies')
          .select('*', { count: 'exact', head: true })
          .eq('registered', true);
        
        setRegisteredPharmacies(regCount || 0);

        // 3. Count employees
        const { count: empCount } = await supabase
          .from('employees')
          .select('*', { count: 'exact', head: true });
        
        setActiveEmployees(empCount || 0);

        // 4. Count pending payments
        const { count: pendCount } = await supabase
          .from('payments')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'en_revision');
        
        setPendingCount(pendCount || 0);
      } catch (err) {
        console.error("Error loading report stats:", err);
      } finally {
        setLoading(false);
      }
    }
    loadReportStats();
  }, []);

  const revenueBreakdown = [
    { source: 'Aportes Gremiales Obligatorios (CCT 659/13)', amount: totalRevenue * 0.54, percent: 54, color: 'bg-primary' },
    { source: 'Aportes Obra Social (OSPF)', amount: totalRevenue * 0.31, percent: 31, color: 'bg-secondary' },
    { source: 'Otros Seguros y Convenios', amount: totalRevenue * 0.15, percent: 15, color: 'bg-teal-500' },
  ];

  const handleExport = (format: 'pdf' | 'excel') => {
    alert(`Simulando exportación de Reportes Financieros ${reportPeriod} en formato: ${format.toUpperCase()}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
            Reportes e Informes Financieros
          </h1>
          <p className="text-sm text-muted-foreground">
            Auditoría de recaudación de aportes, cuotas de afiliación y exportación de planillas de control.
          </p>
        </div>

        {/* Period selection */}
        <div className="flex bg-muted/65 p-1 rounded-xl w-full sm:w-auto self-end">
          <button
            onClick={() => setReportPeriod('2026')}
            className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              reportPeriod === '2026' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
            }`}
          >
            Año 2026
          </button>
          <button
            onClick={() => setReportPeriod('2025')}
            className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              reportPeriod === '2025' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
            }`}
          >
            Año 2025
          </button>
        </div>
      </div>

      {/* Grid of annual stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-card border border-border rounded-3xl p-5 shadow-premium glass space-y-1.5">
          <span className="text-[10px] font-bold text-muted-foreground uppercase block">Recaudación Acumulada</span>
          <span className="text-2xl font-black text-primary">${totalRevenue.toLocaleString('es-AR')}</span>
          <span className="text-[10px] text-muted-foreground font-semibold flex items-center gap-0.5">
            <span>Aportes gremiales cobrados</span>
          </span>
        </div>
        
        <div className="bg-card border border-border rounded-3xl p-5 shadow-premium glass space-y-1.5">
          <span className="text-[10px] font-bold text-muted-foreground uppercase block">Aportantes Registrados</span>
          <span className="text-2xl font-black text-foreground">{registeredPharmacies} locales</span>
          <span className="text-[10px] text-muted-foreground font-semibold">Declaraciones activas al mes</span>
        </div>

        <div className="bg-card border border-border rounded-3xl p-5 shadow-premium glass space-y-1.5">
          <span className="text-[10px] font-bold text-muted-foreground uppercase block">Trabajadores Activos</span>
          <span className="text-2xl font-black text-foreground">{activeEmployees} personas</span>
          <span className="text-[10px] text-muted-foreground font-semibold">Nóminas del convenio CCT</span>
        </div>

        <div className="bg-card border border-border rounded-3xl p-5 shadow-premium glass space-y-1.5">
          <span className="text-[10px] font-bold text-muted-foreground uppercase block">Auditoría del Período</span>
          {pendingCount > 0 ? (
            <>
              <span className="text-2xl font-black text-amber-500">Conciliando</span>
              <span className="text-[10px] text-amber-500 font-semibold">{pendingCount} pendientes de validación</span>
            </>
          ) : (
            <>
              <span className="text-2xl font-black text-emerald-600">Al Día</span>
              <span className="text-[10px] text-muted-foreground font-semibold">Cuentas conciliadas</span>
            </>
          )}
        </div>
      </div>

      {/* Analytics Charts & Export Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Visual Breakdown bar chart */}
        <div className="lg:col-span-7 bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-premium glass space-y-6">
          <div className="flex items-center gap-2 border-b border-border pb-4">
            <PieChart className="w-5 h-5 text-secondary" />
            <h2 className="text-base font-bold text-foreground">Distribución de Ingresos</h2>
          </div>

          <div className="space-y-6 pt-2">
            {revenueBreakdown.map((item, idx) => (
              <div key={idx} className="space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-foreground max-w-xs sm:max-w-md truncate">{item.source}</span>
                  <span className="text-primary">${item.amount.toLocaleString('es-AR')} ({item.percent}%)</span>
                </div>
                {/* Horizontal custom bar chart */}
                <div className="w-full bg-muted/60 h-2.5 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${item.color}`} style={{ width: `${item.percent}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Export Tools */}
        <div className="lg:col-span-5 bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-premium glass space-y-6">
          <div className="border-b border-border pb-4">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Download className="w-5 h-5 text-secondary" />
              Exportación de Reportes
            </h2>
          </div>

          <div className="space-y-4">
            <p className="text-xs text-muted-foreground leading-relaxed font-medium">
              Elegí un formato para exportar el informe consolidado contable del período {reportPeriod}. El documento consolidará las declaraciones del personal y cobros.
            </p>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => handleExport('excel')}
                className="inline-flex items-center justify-center gap-2 p-4 border border-border rounded-2xl bg-background/50 hover:bg-muted/15 transition-all text-xs font-bold text-foreground group shadow-premium"
              >
                <FileSpreadsheet className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                <div className="text-left">
                  <span className="block text-foreground leading-none">Excel (.xlsx)</span>
                  <span className="text-[9px] text-muted-foreground font-medium">Planilla de datos</span>
                </div>
              </button>
              <button
                onClick={() => handleExport('pdf')}
                className="inline-flex items-center justify-center gap-2 p-4 border border-border rounded-2xl bg-background/50 hover:bg-muted/15 transition-all text-xs font-bold text-foreground group shadow-premium"
              >
                <FileText className="w-5 h-5 text-red-500 flex-shrink-0" />
                <div className="text-left">
                  <span className="block text-foreground leading-none">PDF (.pdf)</span>
                  <span className="text-[9px] text-muted-foreground font-medium">Informe de firma</span>
                </div>
              </button>
            </div>
            
            <div className="bg-muted/40 p-4 rounded-xl border border-border flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-secondary flex-shrink-0 mt-0.5" />
              <p className="text-[10px] text-muted-foreground font-medium leading-relaxed">
                Los datos del informe se obtienen directamente del registro mensual de las farmacias de Rosario afiliadas a la federación.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
