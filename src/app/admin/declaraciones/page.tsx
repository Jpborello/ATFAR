'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import {
  ShieldCheck,
  FileText,
  AlertCircle,
  AlertTriangle,
  Loader2,
  Search,
  X,
  Inbox,
} from 'lucide-react';

interface PendingDeclaration {
  id: number;
  dbId: string;
  pharmacy: string;
  cuit: string;
  period: string;
  date: string;
  amount: number;
  transCode: string;
  receiptUrl: string;
  ddjjUrl: string;
}

export default function AdminDeclaracionesPendientesPage() {
  const [items, setItems] = useState<PendingDeclaration[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const [selected, setSelected] = useState<PendingDeclaration | null>(null);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [auditLoading, setAuditLoading] = useState(false);

  const loadPending = useCallback(async () => {
    setLoading(true);
    try {
      const isConfigured =
        process.env.NEXT_PUBLIC_SUPABASE_URL !== 'your_supabase_project_url_here' &&
        !!process.env.NEXT_PUBLIC_SUPABASE_URL;

      if (!isConfigured) {
        setItems([]);
        return;
      }

      const { data, error } = await supabase
        .from('payments')
        .select(`
          id,
          amount,
          period,
          transaction_code,
          receipt_url,
          ddjj_url,
          created_at,
          pharmacies ( name, cuit )
        `)
        .eq('status', 'en_revision')
        .order('created_at', { ascending: true })
        .limit(200);

      if (error) throw error;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mapped: PendingDeclaration[] = (data || []).map((p: any, idx: number) => ({
        id: idx + 1,
        dbId: p.id,
        pharmacy: p.pharmacies?.name || 'Farmacia Desconocida',
        cuit: p.pharmacies?.cuit || '---',
        period: p.period || '---',
        date: new Date(p.created_at).toLocaleDateString('es-AR'),
        amount: p.amount || 0,
        transCode: p.transaction_code || '---',
        receiptUrl: p.receipt_url || '',
        ddjjUrl: p.ddjj_url || '',
      }));

      setItems(mapped);
    } catch (err) {
      console.error('Error loading pending declarations:', err);
      toast.error('No pudimos cargar las declaraciones pendientes.', {
        description: 'Revisá tu conexión y volvé a intentarlo.',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadPending();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadPending]);

  const openAudit = (item: PendingDeclaration) => {
    setSelected(item);
    setIsAuditModalOpen(true);
  };

  const handleApprove = async (item: PendingDeclaration) => {
    setAuditLoading(true);
    try {
      const { error } = await supabase
        .from('payments')
        .update({ status: 'pagado' })
        .eq('id', item.dbId);

      if (error) throw error;

      // Auto-generar la boleta 'impago' del período siguiente (mismo comportamiento
      // que la aprobación desde /admin, para que sea consistente sin importar
      // desde qué pantalla se audite el pago).
      try {
        const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        const parts = item.period.split(' ');
        if (parts.length === 2) {
          const monthIndex = months.indexOf(parts[0]);
          if (monthIndex !== -1) {
            let nextPeriod = '';
            let dueMonth = monthIndex + 2;
            let dueYear = parseInt(parts[1]);

            if (monthIndex === 11) {
              nextPeriod = `${months[0]} ${parseInt(parts[1]) + 1}`;
            } else {
              nextPeriod = `${months[monthIndex + 1]} ${parts[1]}`;
            }

            if (dueMonth > 12) {
              dueMonth = dueMonth - 12;
              dueYear = dueYear + 1;
            }
            const nextDueDate = `${dueYear}-${dueMonth.toString().padStart(2, '0')}-10`;

            const { data: pharm } = await supabase
              .from('pharmacies')
              .select('id')
              .eq('cuit', item.cuit)
              .single();

            if (pharm) {
              const { data: existingNextPayment } = await supabase
                .from('payments')
                .select('id')
                .eq('pharmacy_id', pharm.id)
                .eq('period', nextPeriod)
                .maybeSingle();

              if (!existingNextPayment) {
                const shortId = Math.random().toString(36).substring(2, 6).toUpperCase();
                const yearMonthCode = nextPeriod.includes('Junio') ? '202606' : nextPeriod.includes('Julio') ? '202607' : '202608';
                await supabase
                  .from('payments')
                  .insert({
                    pharmacy_id: pharm.id,
                    invoice_number: `BLT-${yearMonthCode}-${shortId}`,
                    period: nextPeriod,
                    amount: item.amount,
                    status: 'impago',
                    due_date: nextDueDate,
                  });
              }
            }
          }
        }
      } catch (genErr) {
        console.error('Error generating next payment:', genErr);
      }

      setItems((prev) => prev.filter((i) => i.dbId !== item.dbId));
      toast.success(`Pago de ${item.pharmacy} aprobado y validado.`);
    } catch (err) {
      console.error(err);
      toast.error('Error al aprobar el pago.');
    } finally {
      setAuditLoading(false);
      setIsAuditModalOpen(false);
      setSelected(null);
    }
  };

  const handleReject = async (item: PendingDeclaration) => {
    setAuditLoading(true);
    try {
      const { error } = await supabase
        .from('payments')
        .update({ status: 'impago' })
        .eq('id', item.dbId);

      if (error) throw error;

      if (item.cuit && item.cuit !== '---') {
        await supabase.from('pharmacies').update({ has_debt: true }).eq('cuit', item.cuit);
      }

      setItems((prev) => prev.filter((i) => i.dbId !== item.dbId));
      toast.success(`Pago de ${item.pharmacy} rechazado.`);
    } catch (err) {
      console.error(err);
      toast.error('Error al rechazar el pago.');
    } finally {
      setAuditLoading(false);
      setIsAuditModalOpen(false);
      setSelected(null);
    }
  };

  const filteredItems = items.filter((item) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return item.pharmacy.toLowerCase().includes(q) || item.cuit.toLowerCase().includes(q);
  });

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Cargando declaraciones pendientes...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
            Declaraciones Pendientes de Revisión
          </h1>
          <p className="text-sm text-muted-foreground">
            Todas las presentaciones en revisión de todas las farmacias, ordenadas por antigüedad (las más viejas primero).
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-amber-500/10 text-amber-600 text-xs font-black shadow-sm">
          <AlertTriangle className="w-4 h-4" />
          <span>{items.length} pendientes</span>
        </span>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar por farmacia o CUIT..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm transition-all"
        />
      </div>

      {/* List */}
      <div className="bg-card border border-border rounded-3xl shadow-premium glass overflow-hidden">
        {filteredItems.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <Inbox className="w-10 h-10 text-secondary mx-auto" />
            <p className="text-sm font-bold text-foreground">
              {items.length === 0 ? 'No hay declaraciones pendientes de revisión.' : 'Ninguna coincide con tu búsqueda.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {filteredItems.map((item) => (
              <button
                key={item.dbId}
                onClick={() => openAudit(item)}
                className="w-full text-left py-4 px-5 sm:px-8 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/30 transition-colors cursor-pointer"
              >
                <div className="space-y-0.5">
                  <span className="font-extrabold text-[#0f172a] text-sm block">{item.pharmacy}</span>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground font-semibold">
                    <span>CUIT: {item.cuit}</span>
                    <span>Período: {item.period}</span>
                    <span>Presentada: {item.date}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4 justify-between sm:justify-end">
                  <span className="text-sm font-black text-foreground">${item.amount.toLocaleString('es-AR')}</span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-500/10 text-amber-600 rounded-lg text-[9px] font-black uppercase">
                    <AlertTriangle className="w-3 h-3" />
                    <span>Auditar</span>
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Audit Modal (mismo patrón que /admin) */}
      {isAuditModalOpen && selected && (
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
                  <span className="text-[#0f172a] font-extrabold">{selected.pharmacy}</span>
                </div>
                <div className="flex justify-between">
                  <span>CUIT Comercial:</span>
                  <span className="text-[#0f172a] font-bold">{selected.cuit}</span>
                </div>
                <div className="flex justify-between">
                  <span>Período Declarado:</span>
                  <span className="text-[#0f172a] font-bold">{selected.period}</span>
                </div>
                <div className="flex justify-between border-t border-border/80 pt-2 font-black">
                  <span>Monto Declarado:</span>
                  <span className="text-primary text-sm">${selected.amount.toLocaleString('es-AR')}</span>
                </div>
              </div>

              <div className="space-y-2.5">
                <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider block">Datos del Depósito</span>
                <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-4 text-xs font-semibold text-slate-700 space-y-2.5">
                  <div className="flex justify-between border-b border-emerald-500/10 pb-1.5">
                    <span>Nro. Operación:</span>
                    <span className="font-mono font-bold text-emerald-950">{selected.transCode}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span>Comprobante de Pago:</span>
                    {selected.receiptUrl ? (
                      <a
                        href={selected.receiptUrl}
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
                    {selected.ddjjUrl ? (
                      <a
                        href={selected.ddjjUrl}
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
                  onClick={() => handleReject(selected)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-red-200 text-red-600 text-xs font-bold uppercase tracking-wider hover:bg-red-50 transition-all cursor-pointer bg-white disabled:opacity-50"
                >
                  {auditLoading ? 'Procesando...' : 'Rechazar Pago'}
                </button>
                <button
                  type="button"
                  disabled={auditLoading}
                  onClick={() => handleApprove(selected)}
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
