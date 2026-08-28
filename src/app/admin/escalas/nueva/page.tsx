'use client';

import { useState, useEffect, useMemo, Fragment } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { confirmDialog } from '@/components/shared/ConfirmDialog';
import {
  ArrowLeft,
  Info,
  Upload,
  CheckCircle2,
  Loader2,
  ExternalLink,
  AlertTriangle,
} from 'lucide-react';

// ----------------------------------------------------------------------
// Datos fijos del convenio: las 7 categorías básicas + las 3 categorías
// del "Bloqueo de Título" siempre son las mismas, con la misma
// descripción. No se piden a la persona que carga la paritaria — se
// completan solas, así solo hay que escribir los montos en pesos.
// ----------------------------------------------------------------------
const REGULAR_CATEGORIES: { name: string; description: string }[] = [
  { name: 'Cadetes', description: 'Personal menor o mayor dedicado a tareas de mensajería y cadetería general.' },
  { name: 'Aprendiz Ayudante', description: 'Personal ingresante bajo supervisión directa.' },
  { name: 'Personal Auxiliar Interno y Externo', description: 'Personal de depósito, empaque y control de mercadería.' },
  { name: 'Personal con Asignación Específica', description: 'Cajeros, liquidadores, facturistas y vendedores.' },
  { name: 'Ayudante en Gestión de Farmacia', description: 'Personal de asistencia en mostrador y gestión.' },
  { name: 'Personal en Gestión de Farmacia', description: 'Auxiliares de farmacia calificados con responsabilidades.' },
  { name: 'Farmacéutico', description: 'Profesional a cargo del despacho y dirección técnica.' },
];

const ADDITIONAL_CATEGORIES: { name: string; description: string }[] = [
  { name: 'Bloqueo de Título del Farmacéutico Director Técnico - Art. 7 inc. a', description: 'Compensación por bloqueo de firma del director técnico.' },
  { name: 'Título de Farmacéutico (80% del importe del Bloqueo) - Art. 7 inc. b', description: 'Adicional por título a profesionales farmacéuticos auxiliares.' },
  { name: 'Título de Farmacéutico (60% del importe del Bloqueo) - Art. 7 inc. c', description: 'Adicional por título para auxiliares o idóneos.' },
];

const MONTHS: { key: string; label: string }[] = [
  { key: 'jan', label: 'Enero' }, { key: 'feb', label: 'Febrero' }, { key: 'march', label: 'Marzo' },
  { key: 'april', label: 'Abril' }, { key: 'may', label: 'Mayo' }, { key: 'june', label: 'Junio' },
  { key: 'july', label: 'Julio' }, { key: 'aug', label: 'Agosto' }, { key: 'sep', label: 'Septiembre' },
  { key: 'oct', label: 'Octubre' }, { key: 'nov', label: 'Noviembre' }, { key: 'dec', label: 'Diciembre' },
];
const MONTH_KEYS = MONTHS.map((m) => m.key);

type GridValues = Record<string, Record<string, { basic: string; noRem: string }>>; // categoria -> periodo -> valores

export default function NuevaParitariaPage() {
  const router = useRouter();

  // Paso 1: datos generales
  const [signMonth, setSignMonth] = useState('aug');
  const [signYear, setSignYear] = useState(String(new Date().getFullYear()));
  const [fromPeriod, setFromPeriod] = useState('aug');
  const [toPeriod, setToPeriod] = useState('nov');

  const agreementKey = `${signMonth}${signYear}`;
  const agreementLabel = `${MONTHS.find((m) => m.key === signMonth)?.label || ''} ${signYear}`;

  const periods = useMemo(() => {
    const fromIdx = MONTH_KEYS.indexOf(fromPeriod);
    const toIdx = MONTH_KEYS.indexOf(toPeriod);
    if (fromIdx === -1 || toIdx === -1 || toIdx < fromIdx) return [];
    return MONTH_KEYS.slice(fromIdx, toIdx + 1);
  }, [fromPeriod, toPeriod]);

  // Paso 2: grilla de montos
  const [regularGrid, setRegularGrid] = useState<GridValues>({});
  const [additionalGrid, setAdditionalGrid] = useState<GridValues>({});
  const [prefilled, setPrefilled] = useState(false);
  const [loadingPrefill, setLoadingPrefill] = useState(true);

  // Paso 3: documento y firma
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [signingNote, setSigningNote] = useState('');
  const [existingAgreements, setExistingAgreements] = useState<string[]>([]);

  const [saving, setSaving] = useState(false);
  const [savedOk, setSavedOk] = useState(false);

  const emptyCell = () => ({ basic: '', noRem: '' });

  const buildEmptyGrid = (rows: { name: string }[]): GridValues => {
    const grid: GridValues = {};
    rows.forEach((r) => {
      grid[r.name] = {};
      periods.forEach((p) => {
        grid[r.name][p] = emptyCell();
      });
    });
    return grid;
  };

  // Al cambiar el rango de períodos, reconstruye la grilla (conservando lo ya tipeado si existía)
  useEffect(() => {
    const timer = setTimeout(() => {
      setRegularGrid((prev) => {
        const next = buildEmptyGrid(REGULAR_CATEGORIES);
        REGULAR_CATEGORIES.forEach((r) => {
          periods.forEach((p) => {
            if (prev[r.name]?.[p]) next[r.name][p] = prev[r.name][p];
          });
        });
        return next;
      });
      setAdditionalGrid((prev) => {
        const next = buildEmptyGrid(ADDITIONAL_CATEGORIES);
        ADDITIONAL_CATEGORIES.forEach((r) => {
          periods.forEach((p) => {
            if (prev[r.name]?.[p]) next[r.name][p] = prev[r.name][p];
          });
        });
        return next;
      });
    }, 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periods.join(',')]);

  // Precarga con los últimos valores cargados en el sistema, como punto de partida
  useEffect(() => {
    async function loadLastKnownValues() {
      try {
        const isConfigured =
          process.env.NEXT_PUBLIC_SUPABASE_URL !== 'your_supabase_project_url_here' &&
          !!process.env.NEXT_PUBLIC_SUPABASE_URL;

        if (!isConfigured) {
          setLoadingPrefill(false);
          return;
        }

        const { data, error } = await supabase
          .from('salary_scales')
          .select('category, basic, no_rem, agreement, period, is_additional, created_at')
          .order('created_at', { ascending: false });

        if (error) throw error;
        if (!data || data.length === 0) {
          setLoadingPrefill(false);
          return;
        }

        setExistingAgreements(Array.from(new Set(data.map((d) => d.agreement))));

        // Para cada categoría, el valor más reciente que exista (de cualquier período/acuerdo)
        const lastByCategory: Record<string, { basic: number; noRem: number }> = {};
        data.forEach((row) => {
          if (!lastByCategory[row.category]) {
            lastByCategory[row.category] = { basic: Number(row.basic), noRem: Number(row.no_rem) };
          }
        });

        const fillFrom = (rows: { name: string }[]) => {
          const grid: GridValues = {};
          rows.forEach((r) => {
            grid[r.name] = {};
            periods.forEach((p) => {
              const last = lastByCategory[r.name];
              grid[r.name][p] = last
                ? { basic: String(last.basic), noRem: String(last.noRem) }
                : emptyCell();
            });
          });
          return grid;
        };

        setRegularGrid(fillFrom(REGULAR_CATEGORIES));
        setAdditionalGrid(fillFrom(ADDITIONAL_CATEGORIES));
        setPrefilled(true);
      } catch (err) {
        console.error('Error precargando valores de referencia:', err);
      } finally {
        setLoadingPrefill(false);
      }
    }
    loadLastKnownValues();
    // Solo al entrar a la página — el usuario puede cambiar el rango de
    // períodos después sin perder lo que ya tipeó (lo maneja el otro effect).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateCell = (
    grid: GridValues,
    setGrid: (g: GridValues) => void,
    category: string,
    period: string,
    field: 'basic' | 'noRem',
    value: string
  ) => {
    setGrid({
      ...grid,
      [category]: {
        ...grid[category],
        [period]: { ...grid[category]?.[period], [field]: value },
      },
    });
  };

  const validate = (): string | null => {
    if (!signYear || signYear.length !== 4) return 'Completá el año en que se firmó el acuerdo (4 dígitos).';
    if (periods.length === 0) return 'El período "hasta" tiene que ser igual o posterior al período "desde".';
    if (existingAgreements.includes(agreementKey)) {
      return `Ya existe una paritaria cargada como "${agreementLabel}". Si querés corregirla, hacelo desde "Básicos y No Remunerativos" en la pantalla anterior, no la vuelvas a crear acá.`;
    }
    for (const cat of REGULAR_CATEGORIES) {
      for (const p of periods) {
        const cell = regularGrid[cat.name]?.[p];
        if (!cell || cell.basic === '' || cell.noRem === '') {
          return `Falta completar "${cat.name}" en ${MONTHS.find((m) => m.key === p)?.label}.`;
        }
        if (isNaN(Number(cell.basic)) || isNaN(Number(cell.noRem))) {
          return `El valor de "${cat.name}" en ${MONTHS.find((m) => m.key === p)?.label} no es un número válido.`;
        }
      }
    }
    if (!pdfFile) return 'Falta adjuntar el PDF del acta paritaria.';
    return null;
  };

  const handlePublish = async () => {
    const validationError = validate();
    if (validationError) {
      toast.warning(validationError);
      return;
    }

    const confirmed = await confirmDialog({
      title: 'Publicar Paritaria',
      message: `¿Confirmás publicar la Paritaria de ${agreementLabel}? A partir de ahora va a ser la que vean todas las farmacias en la web y con la que se calculen los aportes de las declaraciones juradas de ${periods.map((p) => MONTHS.find((m) => m.key === p)?.label).join(', ')}.`,
      confirmLabel: 'Sí, Publicar',
    });
    if (!confirmed) return;

    setSaving(true);
    try {
      const isConfigured =
        process.env.NEXT_PUBLIC_SUPABASE_URL !== 'your_supabase_project_url_here' &&
        !!process.env.NEXT_PUBLIC_SUPABASE_URL;

      if (!isConfigured) {
        toast.warning('El sistema no está conectado a la base de datos en este momento.');
        return;
      }

      // 1. Armar las filas de la escala salarial
      const rows: {
        category: string; basic: number; no_rem: number; agreement: string;
        period: string; is_additional: boolean; description: string;
      }[] = [];

      REGULAR_CATEGORIES.forEach((cat) => {
        periods.forEach((p) => {
          const cell = regularGrid[cat.name][p];
          rows.push({
            category: cat.name, basic: Number(cell.basic), no_rem: Number(cell.noRem),
            agreement: agreementKey, period: p, is_additional: false, description: cat.description,
          });
        });
      });
      ADDITIONAL_CATEGORIES.forEach((cat) => {
        periods.forEach((p) => {
          const cell = additionalGrid[cat.name]?.[p] || emptyCell();
          rows.push({
            category: cat.name, basic: Number(cell.basic || 0), no_rem: Number(cell.noRem || 0),
            agreement: agreementKey, period: p, is_additional: true, description: cat.description,
          });
        });
      });

      const { error: scalesError } = await supabase.from('salary_scales').insert(rows);
      if (scalesError) throw new Error(`No se pudieron guardar los montos: ${scalesError.message}`);

      // 2. Subir el PDF
      let fileUrl = '';
      if (pdfFile) {
        const fileExt = pdfFile.name.split('.').pop();
        const fileName = `scales-${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
        const filePath = `scales/${fileName}`;

        const { error: uploadError } = await supabase.storage.from('receipts').upload(filePath, pdfFile);
        if (uploadError) throw new Error(`Los montos se guardaron, pero no se pudo subir el PDF: ${uploadError.message}`);

        const { data: { publicUrl } } = supabase.storage.from('receipts').getPublicUrl(filePath);
        fileUrl = publicUrl;
      }

      // 3. Desactivar el documento activo anterior y publicar el nuevo
      await supabase.from('salary_scales_docs').update({ is_active: false }).eq('is_active', true);

      const { error: docError } = await supabase.from('salary_scales_docs').insert({
        title: `Anexo I - Paritaria CCT 659/13 ${agreementLabel}`,
        period: agreementLabel,
        file_url: fileUrl,
        is_active: true,
        agreement: agreementKey,
        signing_note: signingNote || null,
      });
      if (docError) throw new Error(`Los montos y el PDF se guardaron, pero no se pudo registrar el documento: ${docError.message}`);

      setSavedOk(true);
      toast.success('¡Paritaria publicada! Ya está visible en la web.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Ocurrió un error al publicar la paritaria.';
      toast.error(msg, { duration: 8000 });
    } finally {
      setSaving(false);
    }
  };

  if (savedOk) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center space-y-6">
        <div className="inline-flex p-4 bg-emerald-500/10 text-emerald-600 rounded-full">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-extrabold text-foreground">¡Paritaria de {agreementLabel} publicada!</h1>
          <p className="text-sm text-muted-foreground">
            Ya está visible para todas las farmacias en la página pública, y las declaraciones juradas de{' '}
            {periods.map((p) => MONTHS.find((m) => m.key === p)?.label).join(', ')} ya se calculan con estos valores.
          </p>
        </div>
        <div className="flex items-center justify-center gap-3">
          <a
            href="/escalas"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/95 transition-all shadow-premium cursor-pointer"
          >
            <ExternalLink className="w-4 h-4" />
            Ver cómo quedó en la web
          </a>
          <button
            onClick={() => router.push('/admin/escalas')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border text-foreground text-xs font-bold hover:bg-muted/40 transition-all cursor-pointer bg-white"
          >
            Volver a Escalas
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16 max-w-5xl mx-auto">
      <div className="space-y-3">
        <Link
          href="/admin/escalas"
          className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-primary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver a Escalas</span>
        </Link>
        <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Cargar una Paritaria Nueva</h1>
        <p className="text-sm text-muted-foreground max-w-3xl leading-relaxed">
          Esta pantalla es para cuando llega un <strong>acuerdo paritario nuevo</strong> (un aumento de sueldos firmado
          entre el sindicato y las cámaras). Completá los datos y los montos tal cual figuran en el PDF del acuerdo, y
          al publicar, la página de <strong>Escalas Salariales</strong> de la web y el cálculo de aportes de las
          farmacias se actualizan solos — no hace falta tocar nada más.
        </p>
      </div>

      {/* PASO 1 */}
      <section className="bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-lg glass space-y-5">
        <div className="flex items-center gap-3 border-b border-border pb-4">
          <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-black text-sm flex-shrink-0">1</span>
          <div>
            <h2 className="text-lg font-bold text-foreground">Datos Generales del Acuerdo</h2>
            <p className="text-xs text-muted-foreground">Esto lo sacás de la primera página o del pie del PDF del acuerdo.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground block">¿En qué mes se firmó el acuerdo?</label>
            <select
              value={signMonth}
              onChange={(e) => setSignMonth(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              {MONTHS.map((m) => (
                <option key={m.key} value={m.key}>{m.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground block">¿De qué año?</label>
            <input
              type="text"
              value={signYear}
              onChange={(e) => setSignYear(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="2026"
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        <div className="flex items-start gap-2.5 p-3.5 bg-primary/5 border border-primary/20 rounded-2xl">
          <Info className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-slate-700 leading-relaxed font-semibold">
            Este acuerdo va a quedar identificado en el sistema como <strong className="text-primary">&quot;{agreementLabel}&quot;</strong>.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2 border-t border-border/60">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground block">¿A partir de qué mes de sueldo rige?</label>
            <select
              value={fromPeriod}
              onChange={(e) => setFromPeriod(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              {MONTHS.map((m) => (
                <option key={m.key} value={m.key}>{m.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground block">¿Hasta qué mes de sueldo cubre?</label>
            <select
              value={toPeriod}
              onChange={(e) => setToPeriod(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              {MONTHS.map((m) => (
                <option key={m.key} value={m.key}>{m.label}</option>
              ))}
            </select>
          </div>
        </div>
        {periods.length === 0 && (
          <p className="text-[11px] text-red-600 font-bold flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            El mes &quot;hasta&quot; tiene que ser igual o posterior al mes &quot;desde&quot;.
          </p>
        )}
        {existingAgreements.includes(agreementKey) && (
          <p className="text-[11px] text-amber-600 font-bold flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            Ya existe una paritaria cargada como &quot;{agreementLabel}&quot;. Para corregirla, andá a &quot;Básicos y No
            Remunerativos&quot; en la pantalla anterior en vez de cargarla de nuevo acá.
          </p>
        )}
      </section>

      {/* PASO 2 */}
      {periods.length > 0 && (
        <section className="bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-lg glass space-y-5">
          <div className="flex items-center gap-3 border-b border-border pb-4">
            <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-black text-sm flex-shrink-0">2</span>
            <div>
              <h2 className="text-lg font-bold text-foreground">Montos por Categoría</h2>
              <p className="text-xs text-muted-foreground">Copiá el &quot;Básico&quot; y la &quot;Suma No Remunerativa&quot; de cada categoría, tal cual figuran en el PDF, mes por mes.</p>
            </div>
          </div>

          {loadingPrefill ? (
            <div className="flex items-center justify-center gap-2 py-10 text-xs font-bold text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Cargando valores de referencia...
            </div>
          ) : (
            <>
              {prefilled && (
                <div className="flex items-start gap-2.5 p-3.5 bg-amber-500/5 border border-amber-500/20 rounded-2xl">
                  <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-[11px] text-slate-700 leading-relaxed font-semibold">
                    Precargamos estos casilleros con los <strong>últimos valores cargados</strong> como punto de partida.
                    <strong> Revisá cada uno y corregí los que hayan cambiado</strong> según el PDF nuevo — el sistema no
                    sabe solo qué cambió, solo te ahorra tipear de cero.
                  </p>
                </div>
              )}

              <div className="overflow-x-auto -mx-2 px-2">
                <table className="w-full border-collapse text-xs min-w-[600px]">
                  <thead>
                    <tr>
                      <th className="text-left p-2 border-b-2 border-border text-[10px] font-black uppercase text-muted-foreground sticky left-0 bg-card">Categoría</th>
                      {periods.map((p) => (
                        <th key={p} colSpan={2} className="p-2 border-b-2 border-border text-[10px] font-black uppercase text-muted-foreground text-center">
                          {MONTHS.find((m) => m.key === p)?.label}
                        </th>
                      ))}
                    </tr>
                    <tr>
                      <th className="sticky left-0 bg-card" />
                      {periods.map((p) => (
                        <Fragment key={p}>
                          <th className="p-1.5 text-[9px] font-bold text-muted-foreground text-center">Básico $</th>
                          <th className="p-1.5 text-[9px] font-bold text-muted-foreground text-center">No Remun. $</th>
                        </Fragment>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {REGULAR_CATEGORIES.map((cat) => (
                      <tr key={cat.name} className="border-b border-border/60">
                        <td className="py-2 pr-3 font-bold text-foreground sticky left-0 bg-card whitespace-nowrap">{cat.name}</td>
                        {periods.map((p) => (
                          <Fragment key={p}>
                            <td className="p-1">
                              <input
                                type="number"
                                step="0.01"
                                value={regularGrid[cat.name]?.[p]?.basic ?? ''}
                                onChange={(e) => updateCell(regularGrid, setRegularGrid, cat.name, p, 'basic', e.target.value)}
                                className="w-24 px-2 py-1.5 rounded-lg border border-border bg-background text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20"
                              />
                            </td>
                            <td className="p-1">
                              <input
                                type="number"
                                step="0.01"
                                value={regularGrid[cat.name]?.[p]?.noRem ?? ''}
                                onChange={(e) => updateCell(regularGrid, setRegularGrid, cat.name, p, 'noRem', e.target.value)}
                                className="w-24 px-2 py-1.5 rounded-lg border border-border bg-background text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20"
                              />
                            </td>
                          </Fragment>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="pt-4 border-t border-border/60 space-y-2">
                <h3 className="text-xs font-black text-foreground uppercase tracking-wider">Bloqueo de Título (opcional)</h3>
                <p className="text-[10px] text-muted-foreground font-semibold">
                  Solo aplica a farmacéuticos con título bloqueado. Si el PDF no trae esta sección, dejalo en blanco.
                </p>
                <div className="overflow-x-auto -mx-2 px-2">
                  <table className="w-full border-collapse text-xs min-w-[600px]">
                    <tbody>
                      {ADDITIONAL_CATEGORIES.map((cat) => (
                        <tr key={cat.name} className="border-b border-border/60">
                          <td className="py-2 pr-3 font-bold text-foreground sticky left-0 bg-card whitespace-nowrap max-w-[220px]">{cat.name}</td>
                          {periods.map((p) => (
                            <Fragment key={p}>
                              <td className="p-1">
                                <input
                                  type="number"
                                  step="0.01"
                                  value={additionalGrid[cat.name]?.[p]?.basic ?? ''}
                                  onChange={(e) => updateCell(additionalGrid, setAdditionalGrid, cat.name, p, 'basic', e.target.value)}
                                  className="w-24 px-2 py-1.5 rounded-lg border border-border bg-background text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20"
                                />
                              </td>
                              <td className="p-1">
                                <input
                                  type="number"
                                  step="0.01"
                                  value={additionalGrid[cat.name]?.[p]?.noRem ?? ''}
                                  onChange={(e) => updateCell(additionalGrid, setAdditionalGrid, cat.name, p, 'noRem', e.target.value)}
                                  className="w-24 px-2 py-1.5 rounded-lg border border-border bg-background text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20"
                                />
                              </td>
                            </Fragment>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </section>
      )}

      {/* PASO 3 */}
      {periods.length > 0 && (
        <section className="bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-lg glass space-y-5">
          <div className="flex items-center gap-3 border-b border-border pb-4">
            <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-black text-sm flex-shrink-0">3</span>
            <div>
              <h2 className="text-lg font-bold text-foreground">Documento y Firma</h2>
              <p className="text-xs text-muted-foreground">El PDF que van a poder descargar las farmacias, y el texto de quién firmó (opcional).</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground block">Archivo del Acuerdo (PDF) *</label>
            <input
              type="file"
              accept="application/pdf,image/*"
              onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
              className="hidden"
              id="new-paritaria-pdf"
            />
            <label
              htmlFor="new-paritaria-pdf"
              className="border border-dashed border-border rounded-xl p-4 text-center cursor-pointer hover:bg-muted/10 transition-all block bg-background"
            >
              <Upload className="w-5 h-5 text-primary mx-auto mb-1" />
              <span className="text-xs font-semibold text-muted-foreground block">
                {pdfFile ? `Seleccionado: ${pdfFile.name}` : 'Click para elegir el PDF del acuerdo'}
              </span>
            </label>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground block">Nota de Firma (opcional)</label>
            <p className="text-[10px] text-muted-foreground font-semibold -mt-1 mb-1">
              El párrafo del PDF donde dice cuándo y quiénes firmaron. Se muestra tal cual en la web, debajo de la tabla.
            </p>
            <textarea
              rows={3}
              value={signingNote}
              onChange={(e) => setSigningNote(e.target.value)}
              placeholder={'Ej: El presente Acuerdo se realizó en forma virtual mediante plataforma ZOOM del 27 de agosto de 2026...\nPor COFA, ...\nPor FATFA, ...'}
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-xs transition-all resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </section>
      )}

      {/* PUBLICAR */}
      {periods.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 sticky bottom-4 bg-background/80 backdrop-blur p-3 rounded-2xl">
          <p className="text-[11px] text-muted-foreground font-semibold flex-grow text-center sm:text-left">
            Esto no borra ni pisa ninguna paritaria anterior — solo agrega esta como la más nueva.
          </p>
          <button
            onClick={handlePublish}
            disabled={saving}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-primary text-primary-foreground font-black text-sm hover:bg-primary/95 transition-all shadow-premium disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Publicando...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Guardar y Publicar Paritaria
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
