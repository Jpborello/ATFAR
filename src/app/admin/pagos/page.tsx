'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { periodLabelToKey } from '@/lib/dateUtils';
import {
  SITUATION_STYLE,
  SITUATION_TEXT,
  approvalText,
  formatDateAR,
  formatMoney,
  paymentMethodLabel,
  paymentSituation,
  todayISO,
  type PaymentSituation,
} from '@/lib/paymentInfo';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  CalendarClock,
  Download,
  Loader2,
  Search,
  RefreshCw,
  MessageCircle,
  ArrowRight,
  ListChecks,
  Store,
  Info,
} from 'lucide-react';

interface Row {
  id: string;
  pharmacyId: string;
  pharmacyName: string;
  cuit: string;
  whatsapp: string;
  invoice: string;
  period: string;
  periodKey: string;
  amount: number;
  dueDate: string | null;
  payDate: string | null;
  situation: PaymentSituation;
  method: string | null;
  approval: string | null;
  transactionCode: string | null;
  receiptUrl: string | null;
}

type Filter = 'todas' | PaymentSituation;
type View = 'boletas' | 'deudores';

const PAGE_SIZE = 60;

const CARD_ICON: Record<PaymentSituation, typeof CheckCircle2> = {
  pagado: CheckCircle2,
  revisar: Clock,
  vencida: AlertCircle,
  por_pagar: CalendarClock,
};

/** Arma un link de WhatsApp a partir del número cargado por la farmacia. */
function whatsappLink(raw: string, message: string): string | null {
  let digits = (raw || '').replace(/\D/g, '');
  if (digits.length < 10) return null;
  if (digits.startsWith('0')) digits = digits.slice(1);
  if (!digits.startsWith('54')) digits = `549${digits}`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

function csvCell(v: string | number | null | undefined): string {
  const s = v === null || v === undefined ? '' : String(v);
  return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export default function AdminControlPagosPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('todas');
  const [view, setView] = useState<View>('boletas');
  const [search, setSearch] = useState('');
  const [period, setPeriod] = useState('todos');
  const [visible, setVisible] = useState(PAGE_SIZE);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*, pharmacies(id, name, cuit, whatsapp, phone_alt)')
        .order('created_at', { ascending: false })
        .range(0, 4999);
      if (error) throw error;

      const today = todayISO();
      const mapped: Row[] = (data || []).map((p) => {
        const ph = (p.pharmacies || {}) as { id?: string; name?: string; cuit?: string; whatsapp?: string; phone_alt?: string };
        return {
          id: p.id,
          pharmacyId: p.pharmacy_id,
          pharmacyName: ph.name || 'Farmacia sin nombre',
          cuit: ph.cuit || '',
          whatsapp: ph.whatsapp || ph.phone_alt || '',
          invoice: p.invoice_number || '',
          period: p.period || '',
          periodKey: periodLabelToKey(p.period || '') || '0000-00',
          amount: Number(p.amount || 0),
          dueDate: p.due_date || null,
          payDate: p.pay_date || null,
          situation: paymentSituation(p, today),
          method: paymentMethodLabel(p),
          approval: approvalText(p),
          transactionCode: p.transaction_code || null,
          receiptUrl: p.receipt_url || null,
        };
      });
      mapped.sort((a, b) => b.periodKey.localeCompare(a.periodKey) || a.pharmacyName.localeCompare(b.pharmacyName, 'es'));
      setRows(mapped);
    } catch (err) {
      console.error('Error cargando pagos:', err);
      toast.error('No se pudieron cargar los pagos. Probá de nuevo en un momento.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Diferido para no setear estado de forma sincrónica dentro del efecto.
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, [load]);

  // Lista de meses disponibles, del más nuevo al más viejo.
  const periods = useMemo(() => {
    const map = new Map<string, string>();
    rows.forEach((r) => map.set(r.periodKey, r.period));
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [rows]);

  // Filas que coinciden con la búsqueda y el mes (sin el filtro de estado):
  // los cuadros de arriba muestran los totales de esta selección.
  const baseRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const qDigits = q.replace(/\D/g, '');
    return rows.filter((r) => {
      if (period !== 'todos' && r.periodKey !== period) return false;
      if (!q) return true;
      return (
        r.pharmacyName.toLowerCase().includes(q) ||
        r.invoice.toLowerCase().includes(q) ||
        (qDigits.length >= 3 && r.cuit.replace(/\D/g, '').includes(qDigits))
      );
    });
  }, [rows, search, period]);

  const totals = useMemo(() => {
    const t: Record<PaymentSituation, { count: number; amount: number }> = {
      pagado: { count: 0, amount: 0 },
      revisar: { count: 0, amount: 0 },
      vencida: { count: 0, amount: 0 },
      por_pagar: { count: 0, amount: 0 },
    };
    baseRows.forEach((r) => {
      t[r.situation].count++;
      t[r.situation].amount += r.amount;
    });
    return t;
  }, [baseRows]);

  const filtered = useMemo(
    () => (filter === 'todas' ? baseRows : baseRows.filter((r) => r.situation === filter)),
    [baseRows, filter]
  );

  // Farmacias con boletas vencidas sin pagar, de la que más debe a la que menos.
  const debtors = useMemo(() => {
    const map = new Map<string, { id: string; name: string; cuit: string; whatsapp: string; months: string[]; total: number; oldestDue: string }>();
    baseRows
      .filter((r) => r.situation === 'vencida')
      .forEach((r) => {
        const d = map.get(r.pharmacyId) || { id: r.pharmacyId, name: r.pharmacyName, cuit: r.cuit, whatsapp: r.whatsapp, months: [], total: 0, oldestDue: r.dueDate || '' };
        d.months.push(r.period);
        d.total += r.amount;
        if (r.dueDate && (!d.oldestDue || r.dueDate < d.oldestDue)) d.oldestDue = r.dueDate;
        map.set(r.pharmacyId, d);
      });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [baseRows]);

  const chooseFilter = (f: Filter) => {
    setFilter((prev) => (prev === f ? 'todas' : f));
    setView('boletas');
    setVisible(PAGE_SIZE);
  };

  const downloadExcel = () => {
    const header = ['Farmacia', 'CUIT', 'Boleta', 'Mes', 'Monto', 'Vence', 'Estado', 'Fecha de pago', 'Forma de pago', 'Nro. de operación', 'Aprobado por'];
    const lines = filtered.map((r) =>
      [
        r.pharmacyName,
        r.cuit,
        r.invoice,
        r.period,
        r.amount.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        formatDateAR(r.dueDate),
        SITUATION_TEXT[r.situation].label,
        r.payDate ? formatDateAR(r.payDate) : '',
        r.method || '',
        r.transactionCode || '',
        r.approval || '',
      ].map(csvCell).join(';')
    );
    // BOM + punto y coma: así Excel en español lo abre con acentos y columnas bien.
    const blob = new Blob(['﻿' + [header.join(';'), ...lines].join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ATFAR_control_de_pagos_${todayISO()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Listo, se descargó la planilla.');
  };

  const filterLabel = filter === 'todas' ? 'Todas las boletas' : SITUATION_TEXT[filter].label;

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">Control de Pagos</h1>
          <p className="text-base text-muted-foreground mt-1">
            Todas las boletas de todas las farmacias, en un solo lugar.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-3 rounded-xl border-2 border-border bg-card text-base font-bold text-foreground hover:bg-muted cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
          <button
            onClick={downloadExcel}
            disabled={loading || filtered.length === 0}
            className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-primary text-primary-foreground text-base font-bold hover:bg-primary/90 cursor-pointer disabled:opacity-50"
          >
            <Download className="w-5 h-5" />
            Descargar Excel
          </button>
        </div>
      </div>

      {/* Ayuda */}
      <div className="flex gap-3 bg-sky-50 border border-sky-200 rounded-2xl p-4 text-sky-900">
        <Info className="w-6 h-6 flex-shrink-0 mt-0.5" />
        <p className="text-base leading-relaxed">
          <strong>¿Cómo se usa?</strong> Tocá uno de los cuadros de colores para ver solo esas boletas
          (tocalo de nuevo para ver todas). Podés buscar una farmacia por nombre o CUIT, y elegir un mes.
        </p>
      </div>

      {/* Búsqueda y mes */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <label className="sm:col-span-2 block">
          <span className="block text-sm font-bold text-foreground mb-1">Buscar farmacia</span>
          <span className="relative block">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setVisible(PAGE_SIZE); }}
              placeholder="Nombre, CUIT o número de boleta"
              className="w-full pl-11 pr-4 py-3 rounded-xl border-2 border-border bg-card text-base focus:outline-none focus:border-primary"
            />
          </span>
        </label>
        <label className="block">
          <span className="block text-sm font-bold text-foreground mb-1">Mes</span>
          <select
            value={period}
            onChange={(e) => { setPeriod(e.target.value); setVisible(PAGE_SIZE); }}
            className="w-full px-4 py-3 rounded-xl border-2 border-border bg-card text-base focus:outline-none focus:border-primary cursor-pointer"
          >
            <option value="todos">Todos los meses</option>
            {periods.map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </label>
      </div>

      {/* Cuadros de resumen (también filtran) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {(['pagado', 'revisar', 'vencida', 'por_pagar'] as PaymentSituation[]).map((s) => {
          const Icon = CARD_ICON[s];
          const active = filter === s;
          return (
            <button
              key={s}
              onClick={() => chooseFilter(s)}
              className={`text-left rounded-2xl border-2 p-4 transition-all cursor-pointer ${SITUATION_STYLE[s]} ${
                active ? 'ring-4 ring-offset-2 ring-primary/40 scale-[1.02]' : 'hover:scale-[1.01]'
              }`}
            >
              <span className="flex items-center gap-2 text-base font-extrabold">
                <Icon className="w-6 h-6" />
                {SITUATION_TEXT[s].label}
              </span>
              <span className="block text-3xl font-black mt-2">{loading ? '…' : totals[s].count}</span>
              <span className="block text-base font-bold">{loading ? '' : formatMoney(totals[s].amount)}</span>
              <span className="block text-sm mt-1 opacity-90">{SITUATION_TEXT[s].help}</span>
            </button>
          );
        })}
      </div>

      {totals.revisar.count > 0 && (
        <Link
          href="/admin/declaraciones"
          className="flex items-center justify-between gap-3 bg-amber-100 border-2 border-amber-300 text-amber-900 rounded-2xl p-4 text-base font-bold hover:bg-amber-200 transition-colors"
        >
          <span>
            Hay {totals.revisar.count} {totals.revisar.count === 1 ? 'pago informado' : 'pagos informados'} esperando que ATFAR los revise.
          </span>
          <span className="inline-flex items-center gap-1 whitespace-nowrap">
            Revisar ahora <ArrowRight className="w-5 h-5" />
          </span>
        </Link>
      )}

      {/* Elegir vista */}
      <div className="flex bg-muted p-1.5 rounded-2xl max-w-xl">
        <button
          onClick={() => setView('boletas')}
          className={`flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-xl text-base font-bold cursor-pointer transition-all ${
            view === 'boletas' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground'
          }`}
        >
          <ListChecks className="w-5 h-5" /> Ver boletas
        </button>
        <button
          onClick={() => setView('deudores')}
          className={`flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-xl text-base font-bold cursor-pointer transition-all ${
            view === 'deudores' ? 'bg-card text-red-700 shadow-sm' : 'text-muted-foreground'
          }`}
        >
          <Store className="w-5 h-5" /> Farmacias que deben ({debtors.length})
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-3 py-16 text-lg text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin" /> Cargando pagos…
        </div>
      ) : view === 'deudores' ? (
        <div className="bg-card border border-border rounded-3xl p-4 sm:p-6 space-y-4">
          <p className="text-base text-muted-foreground">
            Farmacias con boletas vencidas y sin pagar, de la que más debe a la que menos.
          </p>
          {debtors.length === 0 ? (
            <p className="text-center py-10 text-lg font-bold text-emerald-700">
              ¡Ninguna farmacia tiene boletas vencidas! 🎉
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {debtors.map((d) => {
                const wa = whatsappLink(
                  d.whatsapp,
                  `Hola, te escribimos de ATFAR. Te recordamos que figuran sin pagar los aportes de: ${d.months.join(', ')} (total ${formatMoney(d.total)}). Si ya pagaste, por favor cargá el comprobante en el portal. ¡Gracias!`
                );
                return (
                  <li key={d.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-lg font-extrabold text-foreground">{d.name}</p>
                      {d.cuit && <p className="text-sm text-muted-foreground">CUIT {d.cuit}</p>}
                      <p className="text-base">
                        Debe <strong>{d.months.length} {d.months.length === 1 ? 'mes' : 'meses'}</strong>: {d.months.join(', ')}
                      </p>
                      <p className="text-sm text-muted-foreground">La más vieja venció el {formatDateAR(d.oldestDue)}</p>
                    </div>
                    <div className="flex flex-col sm:flex-row md:flex-col lg:flex-row items-stretch sm:items-center gap-2 md:min-w-[260px] md:items-end">
                      <span className="text-2xl font-black text-red-700 text-right">{formatMoney(d.total)}</span>
                      <div className="flex gap-2">
                        {wa && (
                          <a
                            href={wa}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-600 text-white text-base font-bold hover:bg-emerald-700"
                          >
                            <MessageCircle className="w-5 h-5" /> WhatsApp
                          </a>
                        )}
                        <Link
                          href={`/admin/farmacias/${d.id}?tab=pagos`}
                          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-border text-base font-bold hover:bg-muted"
                        >
                          Ver farmacia
                        </Link>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-3xl p-4 sm:p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-extrabold text-foreground">
              {filterLabel}: {filtered.length} {filtered.length === 1 ? 'boleta' : 'boletas'}
            </h2>
            {filter !== 'todas' && (
              <button onClick={() => setFilter('todas')} className="text-base font-bold text-primary underline cursor-pointer">
                Ver todas
              </button>
            )}
          </div>

          {filtered.length === 0 ? (
            <p className="text-center py-10 text-lg text-muted-foreground">No hay boletas para mostrar con esta búsqueda.</p>
          ) : (
            <ul className="space-y-3">
              {filtered.slice(0, visible).map((r) => (
                <li key={r.id} className="border-2 border-border rounded-2xl p-4 grid grid-cols-1 md:grid-cols-12 gap-3 md:items-center">
                  <div className="md:col-span-4 space-y-0.5">
                    <Link href={`/admin/farmacias/${r.pharmacyId}?tab=pagos`} className="text-lg font-extrabold text-foreground hover:text-primary hover:underline">
                      {r.pharmacyName}
                    </Link>
                    <p className="text-base font-semibold">{r.period}</p>
                    <p className="text-sm text-muted-foreground">Boleta {r.invoice}</p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-xl font-black text-foreground">{formatMoney(r.amount)}</p>
                    <p className="text-sm text-muted-foreground">Vence {formatDateAR(r.dueDate)}</p>
                  </div>
                  <div className="md:col-span-2">
                    <span className={`inline-block px-3 py-1.5 rounded-full border-2 text-sm font-extrabold ${SITUATION_STYLE[r.situation]}`}>
                      {SITUATION_TEXT[r.situation].label}
                    </span>
                  </div>
                  <div className="md:col-span-4 text-base space-y-0.5">
                    {r.method ? (
                      <>
                        <p>
                          <span className="text-muted-foreground">{r.situation === 'pagado' ? 'Pagó' : 'Informó pago'}:</span>{' '}
                          <strong>{r.method}</strong>
                        </p>
                        {r.payDate && <p><span className="text-muted-foreground">Fecha:</span> {formatDateAR(r.payDate)}</p>}
                        {r.approval && <p className="text-sm"><span className="text-muted-foreground">Aprobó:</span> {r.approval}</p>}
                        {r.receiptUrl && (
                          <a href={r.receiptUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-primary underline">
                            Ver comprobante
                          </a>
                        )}
                      </>
                    ) : (
                      <p className="text-muted-foreground">Todavía no hay pago.</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}

          {filtered.length > visible && (
            <button
              onClick={() => setVisible((v) => v + PAGE_SIZE)}
              className="w-full py-4 rounded-2xl border-2 border-dashed border-border text-base font-bold text-foreground hover:bg-muted cursor-pointer"
            >
              Mostrar más ({filtered.length - visible} restantes)
            </button>
          )}
        </div>
      )}
    </div>
  );
}
