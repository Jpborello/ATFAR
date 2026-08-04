/* eslint-disable @next/next/no-img-element */
'use client';

import { useState, useEffect } from 'react';
import { 
  FileText, 
  Calculator, 
  Search, 
  Info,
  Calendar,
  Clock,
  Briefcase,
  Percent,
  Printer
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface ScaleRow {
  category: string;
  basic: number;
  noRem: number;
  description: string;
}

interface AdditionalRow {
  concept: string;
  basic: number;
  noRem: number;
  description: string;
}

// Paritaria Mayo 2026 data
const DEFAULT_PARITARIA_MAYO = {
  may: [
    { category: 'Cadetes', basic: 1293737.56, noRem: 43675.21, description: 'Personal menor o mayor dedicado a tareas de mensajería y cadetería general.' },
    { category: 'Aprendiz Ayudante', basic: 1293737.56, noRem: 43675.21, description: 'Personal ingresante bajo supervisión directa.' },
    { category: 'Personal Auxiliar Interno y Externo', basic: 1366186.84, noRem: 46121.02, description: 'Personal de depósito, empaque y control de mercadería.' },
    { category: 'Personal con Asignación Específica', basic: 1452737.87, noRem: 49042.89, description: 'Cajeros, liquidadores, facturistas y vendedores.' },
    { category: 'Ayudante en Gestión de Farmacia', basic: 1452737.87, noRem: 49042.89, description: 'Personal de asistencia en mostrador y gestión.' },
    { category: 'Personal en Gestión de Farmacia', basic: 1777306.78, noRem: 60000.00, description: 'Auxiliares de farmacia calificados con responsabilidades.' },
    { category: 'Farmacéutico', basic: 1962632.78, noRem: 66256.41, description: 'Profesional a cargo del despacho y dirección técnica.' }
  ],
  june: [
    { category: 'Cadetes', basic: 1293737.56, noRem: 87350.43 + 14558.40, description: 'Personal menor o mayor dedicado a tareas de mensajería y cadetería general.' },
    { category: 'Aprendiz Ayudante', basic: 1293737.56, noRem: 87350.43 + 14558.40, description: 'Personal ingresante bajo supervisión directa.' },
    { category: 'Personal Auxiliar Interno y Externo', basic: 1366186.84, noRem: 92242.05 + 15373.67, description: 'Personal de depósito, empaque y control de mercadería.' },
    { category: 'Personal con Asignación Específica', basic: 1452737.87, noRem: 98085.79 + 16347.63, description: 'Cajeros, liquidadores, facturistas y vendedores.' },
    { category: 'Ayudante en Gestión de Farmacia', basic: 1452737.87, noRem: 98085.79 + 16347.63, description: 'Personal de asistencia en mostrador y gestión.' },
    { category: 'Personal en Gestión de Farmacia', basic: 1777306.78, noRem: 120000.00 + 20000.00, description: 'Auxiliares de farmacia calificados con responsabilidades.' },
    { category: 'Farmacéutico', basic: 1962632.78, noRem: 132512.82 + 22085.47, description: 'Profesional a cargo del despacho y dirección técnica.' }
  ],
  july: [
    { category: 'Cadetes', basic: 1381087.99, noRem: 0, description: 'Personal menor o mayor dedicado a tareas de mensajería y cadetería general.' },
    { category: 'Aprendiz Ayudante', basic: 1381087.99, noRem: 0, description: 'Personal ingresante bajo supervisión directa.' },
    { category: 'Personal Auxiliar Interno y Externo', basic: 1458428.89, noRem: 0, description: 'Personal de depósito, empaque y control de mercadería.' },
    { category: 'Personal con Asignación Específica', basic: 1550823.66, noRem: 0, description: 'Cajeros, liquidadores, facturistas y vendedores.' },
    { category: 'Ayudante en Gestión de Farmacia', basic: 1550823.66, noRem: 0, description: 'Personal de asistencia en mostrador y gestión.' },
    { category: 'Personal en Gestión de Farmacia', basic: 1897306.78, noRem: 0, description: 'Auxiliares de farmacia calificados con responsabilidades.' },
    { category: 'Farmacéutico', basic: 2095145.60, noRem: 0, description: 'Profesional a cargo del despacho y dirección técnica.' }
  ]
};

const DEFAULT_PARITARIA_MAYO_ADICIONALES = {
  may: [
    { concept: 'Bloqueo de Título del Farmacéutico Director Técnico - Art. 7 inc. a', basic: 1517179.99, noRem: 51218.39, description: 'Compensación por bloqueo de firma del director técnico.' },
    { concept: 'Título de Farmacéutico (80% del importe del Bloqueo) - Art. 7 inc. b', basic: 1213743.92, noRem: 40974.71, description: 'Adicional por título a profesionales farmacéuticos auxiliares.' },
    { concept: 'Título de Farmacéutico (60% del importe del Bloqueo) - Art. 7 inc. c', basic: 910307.94, noRem: 30731.03, description: 'Adicional por título para auxiliares o idóneos.' }
  ],
  june: [
    { concept: 'Bloqueo de Título del Farmacéutico Director Técnico - Art. 7 inc. a', basic: 1517179.99, noRem: 102436.78 + 19045.13, description: 'Compensación por bloqueo de firma del director técnico.' },
    { concept: 'Título de Farmacéutico (80% del importe del Bloqueo) - Art. 7 inc. b', basic: 1213743.92, noRem: 81949.43 + 15236.10, description: 'Adicional por título a profesionales farmacéuticos auxiliares.' },
    { concept: 'Título de Farmacéutico (60% del importe del Bloqueo) - Art. 7 inc. c', basic: 910307.94, noRem: 61462.07 + 11427.08, description: 'Adicional por título para auxiliares o idóneos.' }
  ],
  july: [
    { concept: 'Bloqueo de Título del Farmacéutico Director Técnico - Art. 7 inc. a', basic: 1619616.69, noRem: 0, description: 'Compensación por bloqueo de firma del director técnico.' },
    { concept: 'Título de Farmacéutico (80% del importe del Bloqueo) - Art. 7 inc. b', basic: 1295693.35, noRem: 0, description: 'Adicional por título a profesionales farmacéuticos auxiliares.' },
    { concept: 'Título de Farmacéutico (60% del importe del Bloqueo) - Art. 7 inc. c', basic: 971770.01, noRem: 0, description: 'Adicional por título para auxiliares o idóneos.' }
  ]
};

const DEFAULT_PARITARIA_FEBRERO = {
  feb: [
    { category: 'Cadetes', basic: 1169991.12, noRem: 43675.21, description: 'Personal menor o mayor dedicado a tareas de mensajería y cadetería general.' },
    { category: 'Aprendiz Ayudante', basic: 1169991.12, noRem: 43675.21, description: 'Personal ingresante bajo supervisión directa.' },
    { category: 'Personal Auxiliar Interno y Externo', basic: 1235510.61, noRem: 46121.03, description: 'Personal de depósito, empaque y control de mercadería.' },
    { category: 'Personal con Asignación Específica', basic: 1313783.01, noRem: 49042.90, description: 'Cajeros, liquidadores, facturistas y vendedores.' },
    { category: 'Ayudante en Gestión de Farmacia', basic: 1313783.01, noRem: 49042.90, description: 'Personal de asistencia en mostrador y gestión.' },
    { category: 'Personal en Gestión de Farmacia', basic: 1607306.76, noRem: 60000.00, description: 'Auxiliares de farmacia calificados con responsabilidades.' },
    { category: 'Farmacéutico', basic: 1774906.29, noRem: 66256.41, description: 'Profesional a cargo del despacho y dirección técnica.' }
  ],
  mar: [
    { category: 'Cadetes', basic: 1169991.12, noRem: 87350.43, description: 'Personal menor o mayor dedicado a tareas de mensajería y cadetería general.' },
    { category: 'Aprendiz Ayudante', basic: 1169991.12, noRem: 87350.43, description: 'Personal ingresante bajo supervisión directa.' },
    { category: 'Personal Auxiliar Interno y Externo', basic: 1235510.61, noRem: 92242.05, description: 'Personal de depósito, empaque y control de mercadería.' },
    { category: 'Personal con Asignación Específica', basic: 1313783.01, noRem: 98085.79, description: 'Cajeros, liquidadores, facturistas y vendedores.' },
    { category: 'Ayudante en Gestión de Farmacia', basic: 1313783.01, noRem: 98085.79, description: 'Personal de asistencia en mostrador y gestión.' },
    { category: 'Personal en Gestión de Farmacia', basic: 1607306.76, noRem: 120000.00, description: 'Auxiliares de farmacia calificados con responsabilidades.' },
    { category: 'Farmacéutico', basic: 1774906.29, noRem: 132512.82, description: 'Profesional a cargo del despacho y dirección técnica.' }
  ],
  apr: [
    { category: 'Cadetes', basic: 1169991.12, noRem: 109188.04, description: 'Personal menor o mayor dedicado a tareas de mensajería y cadetería general.' },
    { category: 'Aprendiz Ayudante', basic: 1169991.12, noRem: 109188.04, description: 'Personal ingresante bajo supervisión directa.' },
    { category: 'Personal Auxiliar Interno y Externo', basic: 1235510.61, noRem: 115302.56, description: 'Personal de depósito, empaque y control de mercadería.' },
    { category: 'Personal con Asignación Específica', basic: 1313783.01, noRem: 122607.24, description: 'Cajeros, liquidadores, facturistas y vendedores.' },
    { category: 'Ayudante en Gestión de Farmacia', basic: 1313783.01, noRem: 122607.24, description: 'Personal de asistencia en mostrador y gestión.' },
    { category: 'Personal en Gestión de Farmacia', basic: 1607306.76, noRem: 150000.00, description: 'Auxiliares de farmacia calificados con responsabilidades.' },
    { category: 'Farmacéutico', basic: 1774906.29, noRem: 165641.03, description: 'Profesional a cargo del despacho y dirección técnica.' }
  ],
  may: [
    { category: 'Cadetes', basic: 1279179.16, noRem: 0, description: 'Personal menor o mayor dedicado a tareas de mensajería y cadetería general.' },
    { category: 'Aprendiz Ayudante', basic: 1279179.16, noRem: 0, description: 'Personal ingresante bajo supervisión directa.' },
    { category: 'Personal Auxiliar Interno y Externo', basic: 1350813.17, noRem: 0, description: 'Personal de depósito, empaque y control de mercadería.' },
    { category: 'Personal con Asignación Específica', basic: 1436390.25, noRem: 0, description: 'Cajeros, liquidadores, facturistas y vendedores.' },
    { category: 'Ayudante en Gestión de Farmacia', basic: 1436390.25, noRem: 0, description: 'Personal de asistencia en mostrador y gestión.' },
    { category: 'Personal en Gestión de Farmacia', basic: 1757306.76, noRem: 0, description: 'Auxiliares de farmacia calificados con responsabilidades.' },
    { category: 'Farmacéutico', basic: 1.94054732, noRem: 0, description: 'Profesional a cargo del despacho y dirección técnica.' }
  ]
};

const DEFAULT_PARITARIA_FEBRERO_ADICIONALES = {
  feb: [
    { concept: 'Bloqueo de Título del Farmacéutico Director Técnico - Art. 7 inc. a', basic: 1372061.14, noRem: 51218.39, description: 'Compensación por bloqueo de firma del director técnico.' },
    { concept: 'Título de Farmacéutico (80% del importe del Bloqueo) - Art. 7 inc. b', basic: 1097648.91, noRem: 40974.71, description: 'Adicional por título a profesionales farmacéuticos auxiliares.' },
    { concept: 'Título de Farmacéutico (60% del importe del Bloqueo) - Art. 7 inc. c', basic: 823236.68, noRem: 30731.04, description: 'Adicional por título para auxiliares o idóneos.' }
  ],
  mar: [
    { concept: 'Bloqueo de Título del Farmacéutico Director Técnico - Art. 7 inc. a', basic: 1372061.14, noRem: 102436.78, description: 'Compensación por bloqueo de firma del director técnico.' },
    { concept: 'Título de Farmacéutico (80% del importe del Bloqueo) - Art. 7 inc. b', basic: 1097648.91, noRem: 81949.43, description: 'Adicional por título a profesionales farmacéuticos auxiliares.' },
    { concept: 'Título de Farmacéutico (60% del importe del Bloqueo) - Art. 7 inc. c', basic: 823236.68, noRem: 61462.07, description: 'Adicional por título para auxiliares o idóneos.' }
  ],
  apr: [
    { concept: 'Bloqueo de Título del Farmacéutico Director Técnico - Art. 7 inc. a', basic: 1372061.14, noRem: 128045.98, description: 'Compensación por bloqueo de firma del director técnico.' },
    { concept: 'Título de Farmacéutico (80% del importe del Bloqueo) - Art. 7 inc. b', basic: 1097648.91, noRem: 102436.78, description: 'Adicional por título a profesionales farmacéuticos auxiliares.' },
    { concept: 'Título de Farmacéutico (60% del importe del Bloqueo) - Art. 7 inc. c', basic: 823236.68, noRem: 76827.59, description: 'Adicional por título para auxiliares o idóneos.' }
  ],
  may: [
    { concept: 'Bloqueo de Título del Farmacéutico Director Técnico - Art. 7 inc. a', basic: 1500107.12, noRem: 0, description: 'Compensación por bloqueo de firma del director técnico.' },
    { concept: 'Título de Farmacéutico (80% del importe del Bloqueo) - Art. 7 inc. b', basic: 1200085.69, noRem: 0, description: 'Adicional por título a profesionales farmacéuticos auxiliares.' },
    { concept: 'Título de Farmacéutico (60% del importe del Bloqueo) - Art. 7 inc. c', basic: 900064.27, noRem: 0, description: 'Adicional por título para auxiliares o idóneos.' }
  ]
};

export default function PublicEscalasPage() {
  const [activeTab, setActiveTab] = useState<'scales' | 'calculator'>('scales');
  const [searchQuery, setSearchQuery] = useState('');
  const [agreement, setAgreement] = useState<'may2026' | 'feb2026'>('may2026');
  const [period, setPeriod] = useState<string>('july');
  const [seniority, setSeniority] = useState<number>(0);

  const handleAgreementSelect = (val: 'may2026' | 'feb2026') => {
    setAgreement(val);
    setPeriod(val === 'may2026' ? 'july' : 'may');
  };

  // Tab 2: Calculator States
  const [calcSalary, setCalcSalary] = useState<number>(1381087.99); // Default basic for July (Cadete)
  const [vacationDays, setVacationDays] = useState<number>(14);
  const [daysWorked, setDaysWorked] = useState<number>(30);
  const [partTimeHours, setPartTimeHours] = useState<number>(4);

  const [paritariaMayo, setParitariaMayo] = useState(DEFAULT_PARITARIA_MAYO);
  const [paritariaMayoAdicionales, setParitariaMayoAdicionales] = useState(DEFAULT_PARITARIA_MAYO_ADICIONALES);
  const [paritariaFebrero, setParitariaFebrero] = useState(DEFAULT_PARITARIA_FEBRERO);
  const [paritariaFebreroAdicionales, setParitariaFebreroAdicionales] = useState(DEFAULT_PARITARIA_FEBRERO_ADICIONALES);
  const [historicalDocs, setHistoricalDocs] = useState<{ id: string; title?: string; name?: string; period: string; file_url: string }[]>([]);

  useEffect(() => {
    async function loadScales() {
      try {
        const isConfigured = 
          process.env.NEXT_PUBLIC_SUPABASE_URL !== 'your_supabase_project_url_here' && 
          !!process.env.NEXT_PUBLIC_SUPABASE_URL;

        if (!isConfigured) return;

        // Load historical docs
        const { data: docsData, error: docsError } = await supabase
          .from('salary_scales_docs')
          .select('*')
          .order('created_at', { ascending: false });

        if (!docsError && docsData) {
          setHistoricalDocs(docsData);
        }

        const { data, error } = await supabase
          .from('salary_scales')
          .select('*');

        if (error) throw error;

        if (data && data.length > 0) {
          const categories = data.filter(s => !s.is_additional);
          const additionals = data.filter(s => s.is_additional);

          const newMayo = {
            may: categories.filter(s => s.agreement === 'may2026' && s.period === 'may').map(s => ({ category: s.category, basic: Number(s.basic), noRem: Number(s.no_rem), description: s.description })),
            june: categories.filter(s => s.agreement === 'may2026' && s.period === 'june').map(s => ({ category: s.category, basic: Number(s.basic), noRem: Number(s.no_rem), description: s.description })),
            july: categories.filter(s => s.agreement === 'may2026' && s.period === 'july').map(s => ({ category: s.category, basic: Number(s.basic), noRem: Number(s.no_rem), description: s.description })),
          };

          const newMayoAdicionales = {
            may: additionals.filter(s => s.agreement === 'may2026' && s.period === 'may').map(s => ({ concept: s.category, basic: Number(s.basic), noRem: Number(s.no_rem), description: s.description })),
            june: additionals.filter(s => s.agreement === 'may2026' && s.period === 'june').map(s => ({ concept: s.category, basic: Number(s.basic), noRem: Number(s.no_rem), description: s.description })),
            july: additionals.filter(s => s.agreement === 'may2026' && s.period === 'july').map(s => ({ concept: s.category, basic: Number(s.basic), noRem: Number(s.no_rem), description: s.description })),
          };

          const newFebrero = {
            feb: categories.filter(s => s.agreement === 'feb2026' && s.period === 'feb').map(s => ({ category: s.category, basic: Number(s.basic), noRem: Number(s.no_rem), description: s.description })),
            mar: categories.filter(s => s.agreement === 'feb2026' && s.period === 'march').map(s => ({ category: s.category, basic: Number(s.basic), noRem: Number(s.no_rem), description: s.description })),
            apr: categories.filter(s => s.agreement === 'feb2026' && s.period === 'april').map(s => ({ category: s.category, basic: Number(s.basic), noRem: Number(s.no_rem), description: s.description })),
            may: categories.filter(s => s.agreement === 'feb2026' && s.period === 'may').map(s => ({ category: s.category, basic: Number(s.basic), noRem: Number(s.no_rem), description: s.description })),
          };

          const newFebreroAdicionales = {
            feb: additionals.filter(s => s.agreement === 'feb2026' && s.period === 'feb').map(s => ({ concept: s.category, basic: Number(s.basic), noRem: Number(s.no_rem), description: s.description })),
            mar: additionals.filter(s => s.agreement === 'feb2026' && s.period === 'march').map(s => ({ concept: s.category, basic: Number(s.basic), noRem: Number(s.no_rem), description: s.description })),
            apr: additionals.filter(s => s.agreement === 'feb2026' && s.period === 'april').map(s => ({ concept: s.category, basic: Number(s.basic), noRem: Number(s.no_rem), description: s.description })),
            may: additionals.filter(s => s.agreement === 'feb2026' && s.period === 'may').map(s => ({ concept: s.category, basic: Number(s.basic), noRem: Number(s.no_rem), description: s.description })),
          };

          if (newMayo.may.length > 0) setParitariaMayo(newMayo as typeof paritariaMayo);
          if (newMayoAdicionales.may.length > 0) setParitariaMayoAdicionales(newMayoAdicionales as typeof paritariaMayoAdicionales);
          if (newFebrero.feb.length > 0) setParitariaFebrero(newFebrero as typeof paritariaFebrero);
          if (newFebreroAdicionales.feb.length > 0) setParitariaFebreroAdicionales(newFebreroAdicionales as typeof paritariaFebreroAdicionales);
        }
      } catch (err) {
        console.error("Error loading scales from Supabase:", err);
      }
    }
    loadScales();
  }, []);

  const getActiveGrid = (): ScaleRow[] => {
    if (agreement === 'may2026') {
      const list = paritariaMayo[period as keyof typeof paritariaMayo];
      return list || paritariaMayo.july;
    } else {
      const list = paritariaFebrero[period as keyof typeof paritariaFebrero];
      return list || paritariaFebrero.may;
    }
  };

  const getActiveAdicionales = (): AdditionalRow[] => {
    if (agreement === 'may2026') {
      const list = paritariaMayoAdicionales[period as keyof typeof paritariaMayoAdicionales];
      return list || paritariaMayoAdicionales.july;
    } else {
      const list = paritariaFebreroAdicionales[period as keyof typeof paritariaFebreroAdicionales];
      return list || paritariaFebreroAdicionales.may;
    }
  };

  const activeGridData = getActiveGrid();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const activeAdicionalesData = getActiveAdicionales();

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

            {/* Document sheet */}
            <div 
              id="printable-document" 
              className="bg-white text-black p-4 sm:p-10 border border-slate-300 shadow-xl rounded-2xl mx-auto max-w-5xl font-sans print-full-width relative space-y-6"
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
                  /* Hide non-printable elements */
                  header, nav, footer, .no-print, [role="navigation"] {
                    display: none !important;
                  }
                  /* Force page container to occupy full width/height */
                  .print-full-width {
                    width: 100% !important;
                    max-width: 100% !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    border: none !important;
                    box-shadow: none !important;
                    background: transparent !important;
                  }
                  /* Ensure page breaks don't split the content awkwardly */
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
                ANEXO I PARITARIA CCT 659/13 MAYO DE 2026.
              </div>

              {/* Table 1: Categorias */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-black text-center text-[10px] sm:text-xs">
                  <thead>
                    <tr className="font-bold text-black text-[9px] sm:text-[10px]">
                      <th className="border border-black bg-[#cbe3b6] p-2 text-center w-[22%]" rowSpan={2}>
                        <div className="font-black leading-tight">C.C.T. 659/13</div>
                        <div className="mt-1 font-black leading-tight">CATEGORIAS</div>
                      </th>
                      <th className="border border-black bg-[#fff2cc] p-2 text-center w-[13%] font-black leading-tight">
                        <div>BASICOS</div>
                        <div>DEL MES DE</div>
                        <div>MAYO.2026</div>
                      </th>
                      <th className="border border-black bg-[#cbe3b6] p-2 text-center w-[13%] font-black leading-tight">
                        <div>SUMA NO</div>
                        <div>REMUNERATIVA</div>
                        <div>MAYO. 2026.</div>
                      </th>
                      <th className="border border-black bg-[#fff2cc] p-2 text-center w-[13%] font-black leading-tight">
                        <div>BASICOS</div>
                        <div>DEL MES DE</div>
                        <div>JUNIO.2026</div>
                      </th>
                      <th className="border border-black bg-[#cbe3b6] p-2 text-center w-[13%] font-black leading-tight">
                        <div>SUMA NO</div>
                        <div>REMUNERATIVA</div>
                        <div>JUNIO. 2026.</div>
                      </th>
                      <th className="border border-black bg-[#cbe3b6] p-2 text-center w-[13%] font-black leading-tight">
                        <div>SUMA NO</div>
                        <div>REMUNERATIVA</div>
                        <div>JUNIO. 2026.</div>
                      </th>
                      <th className="border border-black bg-[#fff2cc] p-2 text-center w-[13%] font-black leading-tight">
                        <div>BASICOS</div>
                        <div>DEL MES DE</div>
                        <div>JULIO.2026</div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* CADETES */}
                    <tr className="text-black text-[10px]">
                      <td className="border border-black bg-[#cbe3b6] p-2 text-left font-bold">
                        CADETES
                      </td>
                      <td className="border border-black bg-[#fff2cc] p-2 font-semibold text-right">
                        <div className="flex justify-between w-full px-1"><span>$</span><span>1.293.737,56</span></div>
                      </td>
                      <td className="border border-black bg-[#cbe3b6] p-2 font-semibold text-right">
                        <div className="flex justify-between w-full px-1"><span>$</span><span>43.675,21</span></div>
                      </td>
                      <td className="border border-black bg-[#fff2cc] p-2 font-semibold text-right">
                        <div className="flex justify-between w-full px-1"><span>$</span><span>1.293.737,56</span></div>
                      </td>
                      <td className="border border-black bg-[#cbe3b6] p-2 font-semibold text-right">
                        <div className="flex justify-between w-full px-1"><span>$</span><span>87.350,43</span></div>
                      </td>
                      <td className="border border-black bg-[#cbe3b6] p-2 font-semibold text-right">
                        <div className="flex justify-between w-full px-1"><span>$</span><span>14.558,40</span></div>
                      </td>
                      <td className="border border-black bg-[#fff2cc] p-2 font-semibold text-right">
                        <div className="flex justify-between w-full px-1"><span>$</span><span>1.381.087,99</span></div>
                      </td>
                    </tr>
                    {/* APRENDIZ AYUDANTE */}
                    <tr className="text-black text-[10px]">
                      <td className="border border-black bg-[#cbe3b6] p-2 text-left font-bold">
                        APRENDIZ AYUDANTE
                      </td>
                      <td className="border border-black bg-[#fff2cc] p-2 font-semibold text-right">
                        <div className="flex justify-between w-full px-1"><span>$</span><span>1.293.737,56</span></div>
                      </td>
                      <td className="border border-black bg-[#cbe3b6] p-2 font-semibold text-right">
                        <div className="flex justify-between w-full px-1"><span>$</span><span>43.675,21</span></div>
                      </td>
                      <td className="border border-black bg-[#fff2cc] p-2 font-semibold text-right">
                        <div className="flex justify-between w-full px-1"><span>$</span><span>1.293.737,56</span></div>
                      </td>
                      <td className="border border-black bg-[#cbe3b6] p-2 font-semibold text-right">
                        <div className="flex justify-between w-full px-1"><span>$</span><span>87.350,43</span></div>
                      </td>
                      <td className="border border-black bg-[#cbe3b6] p-2 font-semibold text-right">
                        <div className="flex justify-between w-full px-1"><span>$</span><span>14.558,40</span></div>
                      </td>
                      <td className="border border-black bg-[#fff2cc] p-2 font-semibold text-right">
                        <div className="flex justify-between w-full px-1"><span>$</span><span>1.381.087,99</span></div>
                      </td>
                    </tr>
                    {/* PERSONAL AUXILIAR INTERNO Y EXTERNO */}
                    <tr className="text-black text-[10px]">
                      <td className="border border-black bg-[#cbe3b6] p-2 text-left font-bold">
                        PERSONAL AUXILIAR INTERNO Y EXTERNO
                      </td>
                      <td className="border border-black bg-[#fff2cc] p-2 font-semibold text-right">
                        <div className="flex justify-between w-full px-1"><span>$</span><span>1.366.186,84</span></div>
                      </td>
                      <td className="border border-black bg-[#cbe3b6] p-2 font-semibold text-right">
                        <div className="flex justify-between w-full px-1"><span>$</span><span>46.121,02</span></div>
                      </td>
                      <td className="border border-black bg-[#fff2cc] p-2 font-semibold text-right">
                        <div className="flex justify-between w-full px-1"><span>$</span><span>1.366.186,84</span></div>
                      </td>
                      <td className="border border-black bg-[#cbe3b6] p-2 font-semibold text-right">
                        <div className="flex justify-between w-full px-1"><span>$</span><span>92.242,05</span></div>
                      </td>
                      <td className="border border-black bg-[#cbe3b6] p-2 font-semibold text-right">
                        <div className="flex justify-between w-full px-1"><span>$</span><span>15.373,67</span></div>
                      </td>
                      <td className="border border-black bg-[#fff2cc] p-2 font-semibold text-right">
                        <div className="flex justify-between w-full px-1"><span>$</span><span>1.458.428,89</span></div>
                      </td>
                    </tr>
                    {/* PERSONAL CON ASIGNACION ESPECIFICA */}
                    <tr className="text-black text-[10px]">
                      <td className="border border-black bg-[#cbe3b6] p-2 text-left font-bold">
                        PERSONAL CON ASIGNACION ESPECIFICA
                      </td>
                      <td className="border border-black bg-[#fff2cc] p-2 font-semibold text-right">
                        <div className="flex justify-between w-full px-1"><span>$</span><span>1.452.737,87</span></div>
                      </td>
                      <td className="border border-black bg-[#cbe3b6] p-2 font-semibold text-right">
                        <div className="flex justify-between w-full px-1"><span>$</span><span>49.042,89</span></div>
                      </td>
                      <td className="border border-black bg-[#fff2cc] p-2 font-semibold text-right">
                        <div className="flex justify-between w-full px-1"><span>$</span><span>1.452.737,87</span></div>
                      </td>
                      <td className="border border-black bg-[#cbe3b6] p-2 font-semibold text-right">
                        <div className="flex justify-between w-full px-1"><span>$</span><span>98.085,79</span></div>
                      </td>
                      <td className="border border-black bg-[#cbe3b6] p-2 font-semibold text-right">
                        <div className="flex justify-between w-full px-1"><span>$</span><span>16.347,63</span></div>
                      </td>
                      <td className="border border-black bg-[#fff2cc] p-2 font-semibold text-right">
                        <div className="flex justify-between w-full px-1"><span>$</span><span>1.550.823,66</span></div>
                      </td>
                    </tr>
                    {/* AYUDANTE EN GESTION DE FARMACIA */}
                    <tr className="text-black text-[10px]">
                      <td className="border border-black bg-[#cbe3b6] p-2 text-left font-bold">
                        AYUDANTE EN GESTION DE FARMACIA
                      </td>
                      <td className="border border-black bg-[#fff2cc] p-2 font-semibold text-right">
                        <div className="flex justify-between w-full px-1"><span>$</span><span>1.452.737,87</span></div>
                      </td>
                      <td className="border border-black bg-[#cbe3b6] p-2 font-semibold text-right">
                        <div className="flex justify-between w-full px-1"><span>$</span><span>49.042,89</span></div>
                      </td>
                      <td className="border border-black bg-[#fff2cc] p-2 font-semibold text-right">
                        <div className="flex justify-between w-full px-1"><span>$</span><span>1.452.737,87</span></div>
                      </td>
                      <td className="border border-black bg-[#cbe3b6] p-2 font-semibold text-right">
                        <div className="flex justify-between w-full px-1"><span>$</span><span>98.085,79</span></div>
                      </td>
                      <td className="border border-black bg-[#cbe3b6] p-2 font-semibold text-right">
                        <div className="flex justify-between w-full px-1"><span>$</span><span>16.347,63</span></div>
                      </td>
                      <td className="border border-black bg-[#fff2cc] p-2 font-semibold text-right">
                        <div className="flex justify-between w-full px-1"><span>$</span><span>1.550.823,66</span></div>
                      </td>
                    </tr>
                    {/* PERSONAL EN GESTION DE FARMACIA */}
                    <tr className="text-black text-[10px]">
                      <td className="border border-black bg-[#cbe3b6] p-2 text-left font-bold">
                        PERSONAL EN GESTION DE FARMACIA
                      </td>
                      <td className="border border-black bg-[#fff2cc] p-2 font-semibold text-right">
                        <div className="flex justify-between w-full px-1"><span>$</span><span>1.777.306,78</span></div>
                      </td>
                      <td className="border border-black bg-[#cbe3b6] p-2 font-semibold text-right">
                        <div className="flex justify-between w-full px-1"><span>$</span><span>60.000,00</span></div>
                      </td>
                      <td className="border border-black bg-[#fff2cc] p-2 font-semibold text-right">
                        <div className="flex justify-between w-full px-1"><span>$</span><span>1.777.306,78</span></div>
                      </td>
                      <td className="border border-black bg-[#cbe3b6] p-2 font-semibold text-right">
                        <div className="flex justify-between w-full px-1"><span>$</span><span>120.000,00</span></div>
                      </td>
                      <td className="border border-black bg-[#cbe3b6] p-2 font-semibold text-right">
                        <div className="flex justify-between w-full px-1"><span>$</span><span>20.000,00</span></div>
                      </td>
                      <td className="border border-black bg-[#fff2cc] p-2 font-semibold text-right">
                        <div className="flex justify-between w-full px-1"><span>$</span><span>1.897.306,78</span></div>
                      </td>
                    </tr>
                    {/* FARMACEUTICO */}
                    <tr className="text-black text-[10px]">
                      <td className="border border-black bg-[#cbe3b6] p-2 text-left font-bold">
                        FARMACEUTICO
                      </td>
                      <td className="border border-black bg-[#fff2cc] p-2 font-semibold text-right">
                        <div className="flex justify-between w-full px-1"><span>$</span><span>1.962.632,78</span></div>
                      </td>
                      <td className="border border-black bg-[#cbe3b6] p-2 font-semibold text-right">
                        <div className="flex justify-between w-full px-1"><span>$</span><span>66.256,41</span></div>
                      </td>
                      <td className="border border-black bg-[#fff2cc] p-2 font-semibold text-right">
                        <div className="flex justify-between w-full px-1"><span>$</span><span>1.962.632,78</span></div>
                      </td>
                      <td className="border border-black bg-[#cbe3b6] p-2 font-semibold text-right">
                        <div className="flex justify-between w-full px-1"><span>$</span><span>132.512,82</span></div>
                      </td>
                      <td className="border border-black bg-[#cbe3b6] p-2 font-semibold text-right">
                        <div className="flex justify-between w-full px-1"><span>$</span><span>22.085,47</span></div>
                      </td>
                      <td className="border border-black bg-[#fff2cc] p-2 font-semibold text-right">
                        <div className="flex justify-between w-full px-1"><span>$</span><span>2.095.145,60</span></div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Table 2: Adicionales / Bloqueos */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-black text-center text-[10px] sm:text-xs">
                  <thead>
                    <tr className="font-bold text-black text-[9px] sm:text-[10px]">
                      <th className="border border-black bg-[#cbe3b6] p-2 text-left w-[22%] font-black leading-tight">
                        <div>Importe determinado para el</div>
                        <div className="font-black">BLOQUEO DE TITULO, AUXILIAR Y</div>
                        <div className="font-black">TITULO DE FARMACEUTICO</div>
                      </th>
                      <th className="border border-black bg-[#fff2cc] p-2 text-center w-[15.6%] font-black leading-tight">
                        <div>BLOQUEO DE TITULO</div>
                        <div>AUX y TITULO FARM.</div>
                        <div>MAYO.2026</div>
                      </th>
                      <th className="border border-black bg-[#cbe3b6] p-2 text-center w-[15.6%] font-black leading-tight">
                        <div>SUMA NO</div>
                        <div>REMUNERATIVA</div>
                        <div>MAYO. 2026.</div>
                      </th>
                      <th className="border border-black bg-[#cbe3b6] p-2 text-center w-[15.6%] font-black leading-tight">
                        <div>SUMA NO</div>
                        <div>REMUNERATIVA</div>
                        <div>JUNIO. 2026.</div>
                      </th>
                      <th className="border border-black bg-[#cbe3b6] p-2 text-center w-[15.6%] font-black leading-tight">
                        <div>SUMA NO</div>
                        <div>REMUNERATIVA</div>
                        <div>JUNIO. 2026.</div>
                      </th>
                      <th className="border border-black bg-[#fff2cc] p-2 text-center w-[15.6%] font-black leading-tight">
                        <div>BLOQUEO DE TITULO</div>
                        <div>AUX y TITULO FARM.</div>
                        <div>JULIO.2026</div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Articulo 7 inciso a */}
                    <tr className="text-black text-[10px]">
                      <td className="border border-black bg-[#cbe3b6] p-2 text-left font-bold">
                        Bloqueo de Titulo del Farmaceutico Director Tecnico - Articulo 7 inciso a).
                      </td>
                      <td className="border border-black bg-[#fff2cc] p-2 font-semibold text-right">
                        <div className="flex justify-between w-full px-1"><span>$</span><span>1.517.179,91</span></div>
                      </td>
                      <td className="border border-black bg-[#cbe3b6] p-2 font-semibold text-right">
                        <div className="flex justify-between w-full px-1"><span>$</span><span>51.218,39</span></div>
                      </td>
                      <td className="border border-black bg-[#cbe3b6] p-2 font-semibold text-right">
                        <div className="flex justify-between w-full px-1"><span>$</span><span>102.436,78</span></div>
                      </td>
                      <td className="border border-black bg-[#cbe3b6] p-2 font-semibold text-right">
                        <div className="flex justify-between w-full px-1"><span>$</span><span>19.045,13</span></div>
                      </td>
                      <td className="border border-black bg-[#fff2cc] p-2 font-semibold text-right">
                        <div className="flex justify-between w-full px-1"><span>$</span><span>1.619.616,69</span></div>
                      </td>
                    </tr>
                    {/* Articulo 7 inciso b */}
                    <tr className="text-black text-[10px]">
                      <td className="border border-black bg-[#cbe3b6] p-2 text-left font-bold">
                        Titulo de Farmaceutico (80% del importe del Bloqueo) - Articulo 7 inciso b).
                      </td>
                      <td className="border border-black bg-[#fff2cc] p-2 font-semibold text-right">
                        <div className="flex justify-between w-full px-1"><span>$</span><span>1.213.743,92</span></div>
                      </td>
                      <td className="border border-black bg-[#cbe3b6] p-2 font-semibold text-right">
                        <div className="flex justify-between w-full px-1"><span>$</span><span>40.974,71</span></div>
                      </td>
                      <td className="border border-black bg-[#cbe3b6] p-2 font-semibold text-right">
                        <div className="flex justify-between w-full px-1"><span>$</span><span>81.949,43</span></div>
                      </td>
                      <td className="border border-black bg-[#cbe3b6] p-2 font-semibold text-right">
                        <div className="flex justify-between w-full px-1"><span>$</span><span>15.236,10</span></div>
                      </td>
                      <td className="border border-black bg-[#fff2cc] p-2 font-semibold text-right">
                        <div className="flex justify-between w-full px-1"><span>$</span><span>1.295.693,35</span></div>
                      </td>
                    </tr>
                    {/* Articulo 7 inciso c */}
                    <tr className="text-black text-[10px]">
                      <td className="border border-black bg-[#cbe3b6] p-2 text-left font-bold">
                        Titulo de Farmaceutico (60% del importe del Bloqueo) - Articulo 7 inciso c).
                      </td>
                      <td className="border border-black bg-[#fff2cc] p-2 font-semibold text-right">
                        <div className="flex justify-between w-full px-1"><span>$</span><span>910.307,94</span></div>
                      </td>
                      <td className="border border-black bg-[#cbe3b6] p-2 font-semibold text-right">
                        <div className="flex justify-between w-full px-1"><span>$</span><span>30.731,03</span></div>
                      </td>
                      <td className="border border-black bg-[#cbe3b6] p-2 font-semibold text-right">
                        <div className="flex justify-between w-full px-1"><span>$</span><span>61.462,07</span></div>
                      </td>
                      <td className="border border-black bg-[#cbe3b6] p-2 font-semibold text-right">
                        <div className="flex justify-between w-full px-1"><span>$</span><span>11.427,08</span></div>
                      </td>
                      <td className="border border-black bg-[#fff2cc] p-2 font-semibold text-right">
                        <div className="flex justify-between w-full px-1"><span>$</span><span>971.770,01</span></div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Footnote zoom block */}
              <div className="flex flex-col sm:flex-row items-stretch justify-between gap-6 pt-4">
                <div className="border border-black bg-[#cbe3b6] p-3.5 text-[9px] sm:text-[10px] leading-relaxed text-black max-w-xl rounded">
                  <p className="mb-2 font-semibold">
                    El presente Acuerdo se realizó en forma virtual mediante plataforma ZOOM del 28 de mayo de 2026, del mismo participaron en varios procesos de la negociacion, los siguientes representantes:
                  </p>
                  <p className="underline mb-1 font-bold">
                    Por COFA, Roberto Jorge Zgaib, Jorge Bordon y Eduardo Jaime Molina.
                  </p>
                  <p className="underline font-bold">
                    Por FATFA, Sergio Haddad, Jose Lopez y Miguel Castro.
                  </p>
                </div>
                <div className="flex items-center justify-center sm:justify-end flex-grow">
                  <img 
                    src="/images/logo.jpg" 
                    alt="Logo ATFAR" 
                    className="h-16 w-auto object-contain bg-white p-1 rounded-xl border border-black shadow-sm"
                  />
                </div>
              </div>
            </div>

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
                    Cargar básico según período seleccionado:
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
                    {activeGridData.map((row) => {
                      const total = row.basic + row.noRem;
                      return (
                        <option key={row.category} value={total}>
                          {row.category} (${total.toLocaleString('es-AR', { maximumFractionDigits: 0 })})
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
