/* eslint-disable @next/next/no-img-element */
'use client';

import { useState, useEffect, useMemo, Fragment } from 'react';
import {
  FileText,
  Calculator,
  Info,
  Calendar,
  Clock,
  Briefcase,
  Printer,
  Loader2
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cctCategories } from '@/lib/dateUtils';

interface RawScale {
  id: string;
  category: string;
  basic: number;
  no_rem: number;
  agreement: string;
  period: string;
  is_additional: boolean;
  description: string | null;
  created_at: string;
}

interface ScaleDoc {
  id: string;
  title?: string;
  period: string;
  file_url: string;
  agreement?: string | null;
  signing_note?: string | null;
}

// Orden canónico de los períodos (claves como se guardan en salary_scales.period)
const PERIOD_ORDER = ['jan', 'feb', 'march', 'april', 'may', 'june', 'july', 'aug', 'sep', 'oct', 'nov', 'dec'];
const MONTH_ES: Record<string, string> = {
  jan: 'Enero', feb: 'Febrero', march: 'Marzo', april: 'Abril', may: 'Mayo', june: 'Junio',
  july: 'Julio', aug: 'Agosto', sep: 'Septiembre', oct: 'Octubre', nov: 'Noviembre', dec: 'Diciembre',
};

function formatAgreementTitle(agreement: string | null): string {
  if (!agreement) return '';
  const match = agreement.match(/^([a-z]+)(\d{4})$/i);
  if (!match) return agreement.toUpperCase();
  const monthEs = MONTH_ES[match[1].toLowerCase()] || match[1];
  return `${monthEs.toUpperCase()} DE ${match[2]}`;
}

function formatMoney(value: number | undefined | null): string {
  return Number(value || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function PublicEscalasPage() {
  const [activeTab, setActiveTab] = useState<'scales' | 'calculator'>('scales');

  // Calculator Tab 2 States
  const [calcSalary, setCalcSalary] = useState<number>(0);
  const [vacationDays, setVacationDays] = useState<number>(14);
  const [daysWorked, setDaysWorked] = useState<number>(30);
  const [partTimeHours, setPartTimeHours] = useState<number>(4);

  const [allScales, setAllScales] = useState<RawScale[]>([]);
  const [historicalDocs, setHistoricalDocs] = useState<ScaleDoc[]>([]);
  const [loadingScales, setLoadingScales] = useState(true);

  useEffect(() => {
    async function loadScales() {
      try {
        const isConfigured =
          process.env.NEXT_PUBLIC_SUPABASE_URL !== 'your_supabase_project_url_here' &&
          !!process.env.NEXT_PUBLIC_SUPABASE_URL;

        if (!isConfigured) return;

        const [{ data: docsData, error: docsError }, { data: scalesData, error: scalesError }] = await Promise.all([
          supabase.from('salary_scales_docs').select('*').order('created_at', { ascending: false }),
          supabase.from('salary_scales').select('*').order('created_at', { ascending: false }),
        ]);

        if (!docsError && docsData) setHistoricalDocs(docsData);
        if (!scalesError && scalesData) setAllScales(scalesData as unknown as RawScale[]);
      } catch (err) {
        console.error('Error loading scales from Supabase:', err);
      } finally {
        setLoadingScales(false);
      }
    }
    loadScales();
  }, []);

  // La paritaria vigente es siempre la que tiene el registro cargado más reciente
  // en la base — así se actualiza sola con cada paritaria nueva que se suba,
  // sin tocar código.
  const latestAgreement = useMemo(() => {
    if (allScales.length === 0) return null;
    return allScales[0].agreement;
  }, [allScales]);

  const agreementYear = useMemo(() => latestAgreement?.match(/\d{4}/)?.[0] || '', [latestAgreement]);

  const agreementRows = useMemo(
    () => allScales.filter((s) => s.agreement === latestAgreement),
    [allScales, latestAgreement]
  );

  const regularRows = useMemo(() => agreementRows.filter((s) => !s.is_additional), [agreementRows]);
  const additionalRows = useMemo(() => agreementRows.filter((s) => s.is_additional), [agreementRows]);

  const periods = useMemo(() => {
    const set = new Set(agreementRows.map((s) => s.period));
    return PERIOD_ORDER.filter((p) => set.has(p));
  }, [agreementRows]);

  const categoryOrder = useMemo(() => {
    const ordered = cctCategories.filter((c) => regularRows.some((r) => r.category === c));
    regularRows.forEach((r) => {
      if (!ordered.includes(r.category)) ordered.push(r.category);
    });
    return ordered;
  }, [regularRows]);

  const additionalConceptOrder = useMemo(() => {
    // Orden natural del Art. 7 (a, b, c); lo que no matchee queda al final,
    // en el orden en que aparezca, para no perder conceptos futuros.
    const seen: string[] = [];
    additionalRows.forEach((r) => {
      if (!seen.includes(r.category)) seen.push(r.category);
    });
    return [...seen].sort((a, b) => {
      const incLetter = (s: string) => s.match(/inc\.\s*([a-z])\b/i)?.[1]?.toLowerCase() || null;
      const la = incLetter(a);
      const lb = incLetter(b);
      if (la && lb) return la.localeCompare(lb);
      if (la) return -1;
      if (lb) return 1;
      return 0;
    });
  }, [additionalRows]);

  const activeDoc = useMemo(
    () => historicalDocs.find((d) => d.agreement && d.agreement === latestAgreement) || null,
    [historicalDocs, latestAgreement]
  );

  const findCell = (rows: RawScale[], key: string, period: string) => {
    const row = rows.find((r) => r.category === key && r.period === period);
    return row ? { basic: Number(row.basic), noRem: Number(row.no_rem) } : null;
  };

  // Precarga el básico del último período vigente en la calculadora
  useEffect(() => {
    if (periods.length === 0 || categoryOrder.length === 0) return;
    const timer = setTimeout(() => {
      const lastPeriod = periods[periods.length - 1];
      const cadetes = findCell(regularRows, categoryOrder[0], lastPeriod);
      if (cadetes) setCalcSalary(cadetes.basic);
    }, 0);
    return () => clearTimeout(timer);
  }, [periods, categoryOrder, regularRows]);

  // Calculator outputs
  const valNormalDay = calcSalary / 30;
  const valVacationDay = calcSalary / 25;
  const valHour = calcSalary / 200;
  const valHour50 = valHour * 1.5;
  const valHour100 = valHour * 2;
  const valAguinaldo = calcSalary * 0.5;
  const valVacationsTotal = valVacationDay * vacationDays;
  const valDaysWorkedTotal = valNormalDay * daysWorked;
  const valPartTimeTotal = valHour * partTimeHours * 30;

  const lastPeriod = periods[periods.length - 1];

  return (
    <div className="bg-background text-foreground min-h-screen py-12 px-4 sm:px-6 lg:px-8 relative">
      {/* Background decoration */}
      <div className="absolute top-[10%] right-[10%] w-[350px] h-[350px] rounded-full bg-primary/5 blur-[100px] pointer-events-none" />

      <div className="max-w-7xl mx-auto space-y-10 relative">
        {/* Header */}
        <div className="text-center space-y-4 max-w-2xl mx-auto no-print">
          <span className="text-[10px] font-bold text-primary uppercase tracking-widest block">Paritarias y Grillas Salariales</span>
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
            {activeTab === 'scales' ? 'Grillas Salariales de Convenio' : 'Simulador de Horas y Haberes'}
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed font-medium">
            {activeTab === 'scales'
              ? 'Consultá los montos básicos y sumas no remunerativas vigentes e históricas del CCT 659/13 de trabajadores de farmacia de Rosario.'
              : 'Herramienta interactiva para calcular proporcionales de días, vacaciones, SAC e importes de horas extraordinarias.'
            }
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex justify-center no-print">
          <div className="flex bg-slate-100 p-1 rounded-xl border border-border">
            <button
              onClick={() => setActiveTab('scales')}
              className={`px-5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'scales'
                  ? 'bg-white text-primary shadow-premium border border-border/40'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <FileText className="w-4 h-4" />
              Escalas Salariales
            </button>
            <button
              onClick={() => setActiveTab('calculator')}
              className={`px-5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'calculator'
                  ? 'bg-white text-primary shadow-premium border border-border/40'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Calculator className="w-4 h-4" />
              Liquidador de Sueldos y Horas
            </button>
          </div>
        </div>

        {/* Tab 1: Scales List */}
        {activeTab === 'scales' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Action Bar */}
            <div className="flex justify-end gap-3 no-print">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/95 transition-all shadow-premium cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                Imprimir Planilla / Guardar PDF
              </button>
            </div>

            {loadingScales ? (
              <div className="flex flex-col items-center justify-center gap-2 py-20">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Cargando escala vigente...</span>
              </div>
            ) : !latestAgreement || periods.length === 0 ? (
              <div className="border border-dashed border-border bg-card p-10 rounded-3xl text-center text-xs text-muted-foreground font-semibold shadow-premium glass">
                Todavía no hay ninguna escala salarial cargada en el sistema.
              </div>
            ) : (
              <div
                id="printable-document"
                className="bg-white text-black p-4 sm:p-10 border border-slate-300 shadow-xl rounded-2xl mx-auto max-w-6xl font-sans print-full-width relative space-y-6"
              >
                {/* Printable stylesheet to override layout only during print */}
                <style dangerouslySetInnerHTML={{ __html: `
                  @media print {
                    body {
                      background: white !important;
                      color: black !important;
                      margin: 0 !important;
                      padding: 0 !important;
                    }
                    header, nav, footer, .no-print, [role="navigation"] {
                      display: none !important;
                    }
                    .print-full-width {
                      width: 100% !important;
                      max-width: 100% !important;
                      margin: 0 !important;
                      padding: 0 !important;
                      border: none !important;
                      box-shadow: none !important;
                      background: transparent !important;
                    }
                    #printable-document {
                      page-break-inside: avoid;
                      box-shadow: none !important;
                      border: none !important;
                      padding: 0 !important;
                    }
                  }
                `}} />

                {/* Title Header */}
                <div className="border border-black bg-[#cbe3b6] text-center py-3 px-4 font-bold text-[11px] sm:text-xs text-black uppercase tracking-wider rounded">
                  ANEXO I PARITARIA CCT 659/13 {formatAgreementTitle(latestAgreement)}.
                </div>

                {/* Table 1: Categorías */}
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-black text-center text-[10px] sm:text-xs">
                    <thead>
                      <tr className="font-bold text-black text-[9px] sm:text-[10px]">
                        <th className="border border-black bg-[#cbe3b6] p-2 text-center" rowSpan={2}>
                          <div className="font-black leading-tight">C.C.T. 659/13</div>
                          <div className="mt-1 font-black leading-tight">CATEGORIAS</div>
                        </th>
                        {periods.map((p) => (
                          <th key={p} colSpan={2} className="border border-black bg-[#fff2cc] p-2 text-center font-black leading-tight">
                            <div>DEL MES DE</div>
                            <div>{MONTH_ES[p]?.toUpperCase()}.{agreementYear}</div>
                          </th>
                        ))}
                      </tr>
                      <tr className="font-bold text-black text-[8px] sm:text-[9px]">
                        {periods.map((p) => (
                          <Fragment key={p}>
                            <th className="border border-black bg-[#fff2cc] p-1.5 text-center font-black">BÁSICO</th>
                            <th className="border border-black bg-[#cbe3b6] p-1.5 text-center font-black">SUMA NO REM.</th>
                          </Fragment>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {categoryOrder.map((cat) => (
                        <tr key={cat} className="text-black text-[10px]">
                          <td className="border border-black bg-[#cbe3b6] p-2 text-left font-bold uppercase">
                            {cat}
                          </td>
                          {periods.map((p) => {
                            const cell = findCell(regularRows, cat, p);
                            return (
                              <Fragment key={p}>
                                <td className="border border-black bg-[#fff2cc] p-2 font-semibold text-right">
                                  <div className="flex justify-between w-full px-1"><span>$</span><span>{cell ? formatMoney(cell.basic) : '—'}</span></div>
                                </td>
                                <td className="border border-black bg-[#cbe3b6] p-2 font-semibold text-right">
                                  <div className="flex justify-between w-full px-1"><span>$</span><span>{cell ? formatMoney(cell.noRem) : '—'}</span></div>
                                </td>
                              </Fragment>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Table 2: Adicionales / Bloqueos */}
                {additionalConceptOrder.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-black text-center text-[10px] sm:text-xs">
                      <thead>
                        <tr className="font-bold text-black text-[9px] sm:text-[10px]">
                          <th className="border border-black bg-[#cbe3b6] p-2 text-left font-black leading-tight">
                            <div>Importe determinado para el</div>
                            <div className="font-black">BLOQUEO DE TITULO, AUXILIAR Y</div>
                            <div className="font-black">TITULO DE FARMACEUTICO</div>
                          </th>
                          {periods.map((p) => (
                            <th key={p} colSpan={2} className="border border-black bg-[#fff2cc] p-2 text-center font-black leading-tight">
                              {MONTH_ES[p]?.toUpperCase()}
                            </th>
                          ))}
                        </tr>
                        <tr className="font-bold text-black text-[8px] sm:text-[9px]">
                          <th className="border border-black bg-[#cbe3b6] p-1.5" />
                          {periods.map((p) => (
                            <Fragment key={p}>
                              <th className="border border-black bg-[#fff2cc] p-1.5 text-center font-black">BLOQUEO</th>
                              <th className="border border-black bg-[#cbe3b6] p-1.5 text-center font-black">SUMA NO REM.</th>
                            </Fragment>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {additionalConceptOrder.map((concept) => (
                          <tr key={concept} className="text-black text-[10px]">
                            <td className="border border-black bg-[#cbe3b6] p-2 text-left font-bold">
                              {concept}
                            </td>
                            {periods.map((p) => {
                              const cell = findCell(additionalRows, concept, p);
                              return (
                                <Fragment key={p}>
                                  <td className="border border-black bg-[#fff2cc] p-2 font-semibold text-right">
                                    <div className="flex justify-between w-full px-1"><span>$</span><span>{cell ? formatMoney(cell.basic) : '—'}</span></div>
                                  </td>
                                  <td className="border border-black bg-[#cbe3b6] p-2 font-semibold text-right">
                                    <div className="flex justify-between w-full px-1"><span>$</span><span>{cell ? formatMoney(cell.noRem) : '—'}</span></div>
                                  </td>
                                </Fragment>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Footnote zoom block */}
                <div className="flex flex-col sm:flex-row items-stretch justify-between gap-6 pt-4">
                  {activeDoc?.signing_note && (
                    <div className="border border-black bg-[#cbe3b6] p-3.5 text-[9px] sm:text-[10px] leading-relaxed text-black max-w-xl rounded whitespace-pre-line">
                      {activeDoc.signing_note}
                    </div>
                  )}
                  <div className="flex items-center justify-center sm:justify-end flex-grow">
                    <img
                      src="/images/logo.jpg"
                      alt="Logo ATFAR"
                      className="h-16 w-auto object-contain bg-white p-1 rounded-xl border border-black shadow-sm"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Historical Archive Grid */}
            <div className="space-y-4 pt-6 no-print">
              <h3 className="text-sm font-black text-foreground uppercase tracking-widest flex items-center gap-2">
                <FileText className="w-4.5 h-4.5 text-secondary" />
                Historial de Acuerdos y Escalas Salariales
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {historicalDocs.length === 0 ? (
                  <div className="col-span-full border border-dashed border-border bg-card p-8 rounded-3xl text-center text-xs text-muted-foreground font-semibold shadow-premium glass">
                    No hay registros en el historial de escalas salariales todavía.
                  </div>
                ) : (
                  historicalDocs.map((doc) => (
                    <a
                      key={doc.id}
                      href={doc.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-card border border-border rounded-2xl p-5 flex items-center justify-between hover:border-primary/50 hover:shadow-premium transition-all group glass"
                    >
                      <div className="space-y-1">
                        <span className="text-xs font-bold text-foreground block group-hover:text-primary transition-colors">
                          {doc.title}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-medium block">
                          Período: {doc.period}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-primary bg-primary/5 px-3 py-2 rounded-xl group-hover:bg-primary group-hover:text-white transition-all whitespace-nowrap">
                        Descargar
                      </span>
                    </a>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Hourly and Daily Calculator */}
        {activeTab === 'calculator' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fadeIn">
            {/* Input parameters */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-premium glass space-y-6">
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-[#0f172a] flex items-center gap-2">
                    <span className="w-1.5 h-4 bg-primary rounded-full" />
                    Parámetros de Liquidación
                  </h3>
                  <p className="text-xs text-muted-foreground font-semibold">
                    Cargá un básico de convenio o modificá manualmente el salario bruto para obtener la liquidación analítica.
                  </p>
                </div>

                {/* Preset Category Loader */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase block">
                    Cargar básico según la categoría ({lastPeriod ? MONTH_ES[lastPeriod] : 'último período'} vigente):
                  </label>
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        setCalcSalary(Number(e.target.value));
                      }
                    }}
                    className="w-full px-3 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 text-xs transition-all font-semibold"
                  >
                    <option value="">Seleccionar básico...</option>
                    {categoryOrder.map((cat) => {
                      const cell = lastPeriod ? findCell(regularRows, cat, lastPeriod) : null;
                      if (!cell) return null;
                      const total = cell.basic + cell.noRem;
                      return (
                        <option key={cat} value={total}>
                          {cat} (${total.toLocaleString('es-AR', { maximumFractionDigits: 0 })})
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Manual Salary Input */}
                <div className="space-y-2">
                  <label htmlFor="calcSalary" className="text-xs font-bold text-foreground flex justify-between">
                    <span>Sueldo Bruto Base de Liquidación *</span>
                    <span className="text-xs text-primary font-black">${calcSalary.toLocaleString('es-AR')}</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">$</span>
                    <input
                      type="number"
                      id="calcSalary"
                      value={calcSalary}
                      onChange={(e) => setCalcSalary(Number(e.target.value))}
                      className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 text-xs transition-all font-bold"
                      placeholder="Ej. 1381087"
                    />
                  </div>
                </div>

                {/* Vacation Days */}
                <div className="space-y-2 pt-4 border-t border-border/60">
                  <div className="flex items-center justify-between">
                    <label htmlFor="vacationDays" className="text-xs font-bold text-foreground flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      Días de Vacaciones a Liquidar:
                    </label>
                    <span className="text-xs text-[#0f172a] font-black">{vacationDays} Días</span>
                  </div>
                  <input
                    type="range"
                    id="vacationDays"
                    min="14"
                    max="35"
                    value={vacationDays}
                    onChange={(e) => setVacationDays(Number(e.target.value))}
                    className="w-full accent-primary cursor-pointer"
                  />
                </div>

                {/* Days Worked */}
                <div className="space-y-2 pt-4 border-t border-border/60">
                  <div className="flex items-center justify-between">
                    <label htmlFor="daysWorked" className="text-xs font-bold text-foreground flex items-center gap-1">
                      <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                      Días Trabajados en el mes:
                    </label>
                    <span className="text-xs text-[#0f172a] font-black">{daysWorked} Días</span>
                  </div>
                  <input
                    type="range"
                    id="daysWorked"
                    min="1"
                    max="30"
                    value={daysWorked}
                    onChange={(e) => setDaysWorked(Number(e.target.value))}
                    className="w-full accent-primary cursor-pointer"
                  />
                </div>

                {/* Part Time Hours */}
                <div className="space-y-2 pt-4 border-t border-border/60">
                  <div className="flex items-center justify-between">
                    <label htmlFor="partTimeHours" className="text-xs font-bold text-foreground flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      Horas Diarias (Jornada Parcial):
                    </label>
                    <span className="text-xs text-[#0f172a] font-black">{partTimeHours} hs</span>
                  </div>
                  <input
                    type="range"
                    id="partTimeHours"
                    min="1"
                    max="8"
                    value={partTimeHours}
                    onChange={(e) => setPartTimeHours(Number(e.target.value))}
                    className="w-full accent-primary cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Calculations Dashboard Output */}
            <div className="lg:col-span-7 space-y-6">
              <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-premium glass space-y-6">
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-[#0f172a]">Variables y Fórmulas de Planilla</h3>
                  <p className="text-xs text-muted-foreground font-semibold">
                    Desglose analítico conforme al Convenio Colectivo de Trabajo Rosario.
                  </p>
                </div>

                {/* 3 Main KPIs */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 bg-slate-50 border border-border rounded-2xl space-y-1 text-center">
                    <span className="text-[9px] font-bold text-muted-foreground uppercase block">Día Normal (Base 30)</span>
                    <span className="text-lg font-black text-[#0f172a]">${Math.round(valNormalDay).toLocaleString('es-AR')}</span>
                  </div>
                  <div className="p-4 bg-slate-50 border border-border rounded-2xl space-y-1 text-center">
                    <span className="text-[9px] font-bold text-muted-foreground uppercase block">Día Vacación (Base 25)</span>
                    <span className="text-lg font-black text-[#0f172a]">${Math.round(valVacationDay).toLocaleString('es-AR')}</span>
                  </div>
                  <div className="p-4 bg-slate-50 border border-border rounded-2xl space-y-1 text-center">
                    <span className="text-[9px] font-bold text-muted-foreground uppercase block">Hora Normal (Base 200)</span>
                    <span className="text-lg font-black text-primary">${Math.round(valHour).toLocaleString('es-AR')}</span>
                  </div>
                </div>

                {/* Overtime */}
                <div className="space-y-3 pt-2">
                  <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Horas Extras y Recargos</h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 border border-border rounded-2xl flex items-center justify-between">
                      <div>
                        <span className="text-xs font-extrabold text-[#0f172a] block">Hora Extra 50%</span>
                        <span className="text-[9px] text-muted-foreground font-semibold">Lunes a Sábados hasta las 13:00 hs</span>
                      </div>
                      <span className="text-md font-black text-primary">${Math.round(valHour50).toLocaleString('es-AR')}</span>
                    </div>

                    <div className="p-4 bg-slate-50 border border-border rounded-2xl flex items-center justify-between">
                      <div>
                        <span className="text-xs font-extrabold text-[#0f172a] block">Hora Extra 100%</span>
                        <span className="text-[9px] text-muted-foreground font-semibold">Sábados tarde, Domingos y Feriados</span>
                      </div>
                      <span className="text-md font-black text-secondary">${Math.round(valHour100).toLocaleString('es-AR')}</span>
                    </div>
                  </div>
                </div>

                {/* Detailed Provisions Breakdown */}
                <div className="space-y-3 pt-4 border-t border-border/80">
                  <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Liquidaciones Proporcionales</h4>

                  <div className="divide-y divide-border/60 border-y border-border">
                    {/* SAC */}
                    <div className="py-3.5 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-extrabold text-[#0f172a] block">SAC (Sueldo Anual Complementario / Medio Aguinaldo)</span>
                        <span className="text-[10px] text-muted-foreground font-medium">SAC del mes de base liquidado</span>
                      </div>
                      <span className="text-sm font-black text-[#0f172a]">${Math.round(valAguinaldo).toLocaleString('es-AR')}</span>
                    </div>

                    {/* Vacaciones */}
                    <div className="py-3.5 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-extrabold text-[#0f172a] block">Monto Vacaciones</span>
                        <span className="text-[10px] text-muted-foreground font-medium">Valor día vacación (${Math.round(valVacationDay)}) × {vacationDays} días</span>
                      </div>
                      <span className="text-sm font-black text-primary">${Math.round(valVacationsTotal).toLocaleString('es-AR')}</span>
                    </div>

                    {/* Días Trabajados */}
                    <div className="py-3.5 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-extrabold text-[#0f172a] block">Proporcional por Días Trabajados</span>
                        <span className="text-[10px] text-muted-foreground font-medium">Valor día normal (${Math.round(valNormalDay)}) × {daysWorked} días</span>
                      </div>
                      <span className="text-sm font-black text-[#0f172a]">${Math.round(valDaysWorkedTotal).toLocaleString('es-AR')}</span>
                    </div>

                    {/* Jornada Parcial */}
                    <div className="py-3.5 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-extrabold text-[#0f172a] block">Jornada Parcial Mensual</span>
                        <span className="text-[10px] text-muted-foreground font-medium">Valor hora base (${Math.round(valHour)}) × {partTimeHours} hs × 30 días</span>
                      </div>
                      <span className="text-sm font-black text-primary">${Math.round(valPartTimeTotal).toLocaleString('es-AR')}</span>
                    </div>
                  </div>
                </div>

                {/* Disclaimer banner */}
                <div className="bg-slate-50 border border-border rounded-xl p-4 flex items-start gap-2.5">
                  <Info className="w-4.5 h-4.5 text-primary flex-shrink-0 mt-0.5" />
                  <p className="text-[10px] text-muted-foreground leading-relaxed font-semibold">
                    Simulación referencial de cálculo. No representa liquidación final ni deducciones previsionales obligatorias de ley.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
