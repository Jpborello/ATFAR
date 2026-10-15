'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, CheckCircle2, XCircle, Clock, AlertTriangle, Minus, Loader2, X, FileText, Hand } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { formatDateAR } from '@/lib/dateUtils';

// Primer período que se declaró en el sistema (Julio 2026). Los meses
// anteriores no existen para el almanaque.
const SYSTEM_START = { year: 2026, month: 6 }; // month 0-indexado
const YEARS_SHOWN = 6; // 2026 a 2031

const MONTHS_ES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

type MonthState = 'pagado' | 'informado' | 'debe' | 'a_pagar' | 'sin_ddjj' | 'en_curso' | 'futuro' | 'antes';

interface CalendarPayment {
  id: string;
  period: string;
  amount: number;
  status: string;
  invoice_number: string | null;
  due_date: string | null;
  pay_date: string | null;
  receipt_url: string | null;
  ddjj_url: string | null;
}

interface MonthMark {
  id: string;
  period: string; // YYYY-MM-DD (primer día del mes)
  paid: boolean;
  note: string | null;
  marked_by_name: string | null;
  marked_at: string;
}

interface MonthInfo {
  year: number;
  month: number;
  key: string; // YYYY-MM
  state: MonthState;
  payment: CalendarPayment | null;
  mark: MonthMark | null;
}

const STATE_STYLE: Record<MonthState, { label: string; card: string; badge: string }> = {
  pagado: { label: 'PAGADO', card: 'bg-emerald-50 border-emerald-300 hover:border-emerald-500', badge: 'bg-emerald-600 text-white' },
  informado: { label: 'PAGO INFORMADO', card: 'bg-sky-50 border-sky-300 hover:border-sky-500', badge: 'bg-sky-600 text-white' },
  debe: { label: 'DEBE', card: 'bg-red-50 border-red-300 hover:border-red-500', badge: 'bg-red-600 text-white' },
  a_pagar: { label: 'A PAGAR', card: 'bg-amber-50 border-amber-300 hover:border-amber-500', badge: 'bg-amber-500 text-white' },
  sin_ddjj: { label: 'SIN DDJJ', card: 'bg-slate-50 border-dashed border-slate-300 hover:border-slate-500', badge: 'bg-slate-500 text-white' },
  en_curso: { label: 'MES EN CURSO', card: 'bg-white border-slate-200 hover:border-slate-400', badge: 'bg-slate-200 text-slate-700' },
  futuro: { label: '', card: 'bg-white border-slate-100 hover:border-slate-300', badge: '' },
  antes: { label: 'Antes del sistema', card: 'bg-slate-50/50 border-slate-100', badge: '' },
};

const STATE_EXPLANATION: Record<MonthState, string> = {
  pagado: 'Este mes está pagado.',
  informado: 'La farmacia informó el pago y subió el comprobante. Falta que ATFAR lo revise.',
  debe: 'Este mes NO está pagado y ya venció.',
  a_pagar: 'La farmacia presentó la DDJJ. La boleta todavía no venció.',
  sin_ddjj: 'La farmacia no presentó la DDJJ de este mes en el sistema.',
  en_curso: 'Es el mes actual: la DDJJ se presenta el mes que viene.',
  futuro: 'Mes futuro.',
  antes: 'El sistema empezó a funcionar en Julio 2026.',
};

function StateIcon({ state, className }: { state: MonthState; className?: string }) {
  if (state === 'pagado') return <CheckCircle2 className={className} />;
  if (state === 'debe') return <XCircle className={className} />;
  if (state === 'informado' || state === 'a_pagar') return <Clock className={className} />;
  if (state === 'sin_ddjj') return <AlertTriangle className={className} />;
  return <Minus className={className} />;
}

const monthKey = (year: number, month: number) => `${year}-${String(month + 1).padStart(2, '0')}`;

/** "Septiembre 2026" -> "2026-09" */
function periodLabelToKey(label: string): string | null {
  const [name, yearStr] = label.trim().split(' ');
  const month = MONTHS_ES.findIndex((m) => m.toLowerCase() === (name || '').toLowerCase());
  const year = parseInt(yearStr, 10);
  if (month === -1 || isNaN(year)) return null;
  return monthKey(year, month);
}

const money = (n: number) => `$${n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function PaymentCalendar({ pharmacyId, onChanged }: { pharmacyId: string; onChanged?: () => void }) {
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<CalendarPayment[]>([]);
  const [marks, setMarks] = useState<MonthMark[]>([]);
  const now = new Date();
  const currentKey = monthKey(now.getFullYear(), now.getMonth());
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const [year, setYear] = useState(Math.max(SYSTEM_START.year, Math.min(now.getFullYear(), SYSTEM_START.year + YEARS_SHOWN - 1)));
  const [selected, setSelected] = useState<MonthInfo | null>(null);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const [{ data: pays, error: payErr }, { data: mk, error: mkErr }] = await Promise.all([
      supabase
        .from('payments')
        .select('id, period, amount, status, invoice_number, due_date, pay_date, receipt_url, ddjj_url')
        .eq('pharmacy_id', pharmacyId),
      supabase
        .from('pharmacy_month_marks')
        .select('id, period, paid, note, marked_by_name, marked_at')
        .eq('pharmacy_id', pharmacyId),
    ]);
    if (payErr || mkErr) {
      toast.error('No pudimos cargar el almanaque de pagos.');
    }
    setPayments((pays || []).map((p) => ({ ...p, amount: Number(p.amount) || 0 })));
    setMarks(mk || []);
    setLoading(false);
  }, [pharmacyId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      load();
    }, 0);
    return () => clearTimeout(timer);
  }, [load]);

  const paymentByKey = useMemo(() => {
    const map = new Map<string, CalendarPayment>();
    payments.forEach((p) => {
      const key = periodLabelToKey(p.period);
      if (key) map.set(key, p);
    });
    return map;
  }, [payments]);

  const markByKey = useMemo(() => {
    const map = new Map<string, MonthMark>();
    marks.forEach((m) => map.set(m.period.slice(0, 7), m));
    return map;
  }, [marks]);

  const buildMonth = useCallback((y: number, m: number): MonthInfo => {
    const key = monthKey(y, m);
    const payment = paymentByKey.get(key) || null;
    const mark = markByKey.get(key) || null;
    const startKey = monthKey(SYSTEM_START.year, SYSTEM_START.month);

    let state: MonthState;
    if (key < startKey && !payment) state = 'antes';
    else if (payment) {
      // La boleta manda: es lo que usa el cálculo de deuda.
      if (payment.status === 'pagado') state = 'pagado';
      else if (payment.status === 'en_revision') state = 'informado';
      else state = payment.due_date && payment.due_date < todayStr ? 'debe' : 'a_pagar';
    } else if (mark) {
      state = mark.paid ? 'pagado' : 'debe';
    } else if (key < currentKey) state = 'sin_ddjj';
    else if (key === currentKey) state = 'en_curso';
    else state = 'futuro';

    return { year: y, month: m, key, state, payment, mark };
  }, [paymentByKey, markByKey, currentKey, todayStr]);

  const yearMonths = useMemo(() => Array.from({ length: 12 }, (_, m) => buildMonth(year, m)), [buildMonth, year]);

  const yearHasDebt = (y: number) =>
    Array.from({ length: 12 }, (_, m) => buildMonth(y, m)).some((mi) => mi.state === 'debe' || mi.state === 'sin_ddjj');

  const counts = useMemo(() => {
    const c = { pagado: 0, debe: 0, sin_ddjj: 0, pendiente: 0 };
    yearMonths.forEach((mi) => {
      if (mi.state === 'pagado') c.pagado++;
      else if (mi.state === 'debe') c.debe++;
      else if (mi.state === 'sin_ddjj') c.sin_ddjj++;
      else if (mi.state === 'informado' || mi.state === 'a_pagar') c.pendiente++;
    });
    return c;
  }, [yearMonths]);

  const openMonth = (mi: MonthInfo) => {
    if (mi.state === 'antes') return;
    setSelected(mi);
    setNote(mi.mark?.note || '');
  };

  const setPaid = async (mi: MonthInfo, paid: boolean) => {
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      let adminName: string | null = null;
      if (session?.user) {
        const { data: prof } = await supabase.from('profiles').select('full_name').eq('id', session.user.id).maybeSingle();
        adminName = prof?.full_name || session.user.email || null;
      }

      // Si el mes tiene boleta, se actualiza la boleta: así el estado "Con deuda"
      // de la farmacia se recalcula solo y coincide con el almanaque.
      if (mi.payment) {
        const { error } = await supabase
          .from('payments')
          .update(paid ? { status: 'pagado', pay_date: mi.payment.pay_date || todayStr } : { status: 'impago' })
          .eq('id', mi.payment.id);
        if (error) throw error;
      }

      // La marca guarda quién, cuándo y la nota, para la auditoría.
      const { error: markErr } = await supabase
        .from('pharmacy_month_marks')
        .upsert(
          {
            pharmacy_id: pharmacyId,
            period: `${mi.key}-01`,
            paid,
            note: note.trim() || null,
            marked_by: session?.user?.id || null,
            marked_by_name: adminName,
            marked_at: new Date().toISOString(),
          },
          { onConflict: 'pharmacy_id,period' }
        );
      if (markErr) throw markErr;

      toast.success(`${MONTHS_ES[mi.month]} ${mi.year} marcado como ${paid ? 'PAGADO' : 'NO PAGADO'}.`);
      setSelected(null);
      await load();
      onChanged?.();
    } catch (err) {
      console.error('Error marking month:', err);
      toast.error('No se pudo guardar. Probá de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const years = Array.from({ length: YEARS_SHOWN }, (_, i) => SYSTEM_START.year + i);

  return (
    <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-premium glass space-y-6">
      <div className="border-b border-border pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-secondary" />
            Almanaque de Pagos
          </h2>
          <p className="text-sm text-muted-foreground font-medium mt-1">
            Tocá un mes para ver el detalle o marcarlo como pagado.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {years.map((y) => (
            <button
              key={y}
              type="button"
              onClick={() => setYear(y)}
              className={`relative px-4 py-2 rounded-xl text-base font-black border transition-all cursor-pointer ${
                y === year ? 'bg-primary text-primary-foreground border-primary shadow-sm' : 'bg-white text-slate-700 border-border hover:bg-slate-50'
              }`}
            >
              {y}
              {!loading && yearHasDebt(y) && (
                <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-500 border-2 border-white" title="Este año tiene meses sin pagar" />
              )}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="py-12 flex items-center justify-center">
          <Loader2 className="w-7 h-7 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Resumen del año en palabras */}
          <div className="flex flex-wrap gap-3 text-sm font-bold">
            <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200">{counts.pagado} pagado{counts.pagado === 1 ? '' : 's'}</span>
            <span className="px-3 py-1.5 rounded-xl bg-red-50 text-red-800 border border-red-200">{counts.debe} adeudado{counts.debe === 1 ? '' : 's'}</span>
            <span className="px-3 py-1.5 rounded-xl bg-slate-50 text-slate-700 border border-slate-200">{counts.sin_ddjj} sin DDJJ</span>
            {counts.pendiente > 0 && (
              <span className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-200">{counts.pendiente} pendiente{counts.pendiente === 1 ? '' : 's'} de revisión o vencimiento</span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {yearMonths.map((mi) => {
              const style = STATE_STYLE[mi.state];
              const clickable = mi.state !== 'antes';
              return (
                <button
                  key={mi.key}
                  type="button"
                  disabled={!clickable}
                  onClick={() => openMonth(mi)}
                  className={`text-left p-4 rounded-2xl border-2 transition-all min-h-[112px] flex flex-col justify-between gap-2 ${style.card} ${clickable ? 'cursor-pointer' : 'cursor-default opacity-60'} ${mi.key === currentKey ? 'ring-2 ring-primary/40' : ''}`}
                >
                  <span className="text-base font-black text-slate-800">{MONTHS_ES[mi.month]}</span>
                  {style.label ? (
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black w-max ${style.badge || 'text-slate-500'}`}>
                      <StateIcon state={mi.state} className="w-4 h-4" />
                      {style.label}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-300 font-bold">—</span>
                  )}
                  {mi.payment ? (
                    <span className="text-sm font-bold text-slate-600 font-mono">{money(mi.payment.amount)}</span>
                  ) : mi.mark ? (
                    <span className="text-xs font-bold text-slate-500 inline-flex items-center gap-1">
                      <Hand className="w-3.5 h-3.5" /> Marcado a mano
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          {/* Referencias */}
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-slate-600 pt-2 border-t border-border/60">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-600" /> Pagado</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-sky-600" /> Pago informado (falta revisar)</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-500" /> A pagar (no venció)</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-600" /> Debe</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-slate-500" /> Sin DDJJ presentada</span>
          </div>
        </>
      )}

      {/* Ventana del mes */}
      {selected && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-premium-lg relative animate-scaleIn space-y-5">
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
              aria-label="Cerrar"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="space-y-2">
              <h3 className="text-2xl font-extrabold text-[#0f172a]">{MONTHS_ES[selected.month]} {selected.year}</h3>
              {STATE_STYLE[selected.state].label && (
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-black ${STATE_STYLE[selected.state].badge}`}>
                  <StateIcon state={selected.state} className="w-5 h-5" />
                  {STATE_STYLE[selected.state].label}
                </span>
              )}
              <p className="text-base text-slate-700 font-medium">{STATE_EXPLANATION[selected.state]}</p>
            </div>

            {selected.payment && (
              <div className="rounded-2xl border border-border bg-slate-50 p-4 space-y-1.5 text-sm">
                <div className="flex justify-between"><span className="text-slate-500 font-semibold">Boleta</span><span className="font-bold">{selected.payment.invoice_number || '—'}</span></div>
                <div className="flex justify-between"><span className="text-slate-500 font-semibold">Importe</span><span className="font-bold font-mono">{money(selected.payment.amount)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500 font-semibold">Vencimiento</span><span className="font-bold">{formatDateAR(selected.payment.due_date)}</span></div>
                {selected.payment.pay_date && (
                  <div className="flex justify-between"><span className="text-slate-500 font-semibold">Fecha de pago</span><span className="font-bold">{formatDateAR(selected.payment.pay_date)}</span></div>
                )}
                {(selected.payment.receipt_url || selected.payment.ddjj_url) && (
                  <div className="flex gap-4 pt-1">
                    {selected.payment.receipt_url && (
                      <a href={selected.payment.receipt_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary font-bold underline">
                        <FileText className="w-4 h-4" /> Ver comprobante
                      </a>
                    )}
                    {selected.payment.ddjj_url && (
                      <a href={selected.payment.ddjj_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary font-bold underline">
                        <FileText className="w-4 h-4" /> Ver DDJJ adjunta
                      </a>
                    )}
                  </div>
                )}
              </div>
            )}

            {selected.mark && (
              <p className="text-sm text-slate-600 bg-slate-50 border border-border rounded-xl p-3">
                <Hand className="w-4 h-4 inline mr-1 -mt-0.5" />
                Marcado como <strong>{selected.mark.paid ? 'PAGADO' : 'NO PAGADO'}</strong>
                {selected.mark.marked_by_name ? <> por <strong>{selected.mark.marked_by_name}</strong></> : null}
                {' '}el {formatDateAR(selected.mark.marked_at)}.
              </p>
            )}

            <div className="space-y-1.5">
              <label htmlFor="month-note" className="text-sm font-bold text-slate-700 block">Nota (opcional)</label>
              <textarea
                id="month-note"
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ej: pagó en efectivo en la sede"
                className="w-full rounded-xl border border-border px-4 py-3 bg-white text-base focus:outline-none focus:ring-2 focus:ring-primary/20 text-[#0f172a] resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                disabled={saving || selected.state === 'pagado'}
                onClick={() => setPaid(selected, true)}
                className="px-5 py-4 rounded-2xl bg-emerald-600 text-white text-base font-black hover:bg-emerald-700 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                Marcar como PAGADO
              </button>
              <button
                type="button"
                disabled={saving || (selected.state !== 'pagado' && selected.state !== 'informado')}
                onClick={() => setPaid(selected, false)}
                className="px-5 py-4 rounded-2xl bg-white border-2 border-red-300 text-red-700 text-base font-black hover:bg-red-50 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
              >
                <XCircle className="w-5 h-5" />
                Marcar como NO pagado
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
