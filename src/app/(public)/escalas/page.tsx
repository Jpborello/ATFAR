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
  Percent
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

  const handleAgreementChange = (newAgreement: 'may2026' | 'feb2026') => {
    setAgreement(newAgreement);
    if (newAgreement === 'may2026') {
      setPeriod('july');
    } else {
      setPeriod('may');
    }
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

  useEffect(() => {
    async function loadScales() {
      try {
        const isConfigured = 
          process.env.NEXT_PUBLIC_SUPABASE_URL !== 'your_supabase_project_url_here' && 
          !!process.env.NEXT_PUBLIC_SUPABASE_URL;

        if (!isConfigured) return;

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

          if (newMayo.may.length > 0) setParitariaMayo(newMayo as any);
          if (newMayoAdicionales.may.length > 0) setParitariaMayoAdicionales(newMayoAdicionales as any);
          if (newFebrero.feb.length > 0) setParitariaFebrero(newFebrero as any);
          if (newFebreroAdicionales.feb.length > 0) setParitariaFebreroAdicionales(newFebreroAdicionales as any);
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

  const calculateInteractiveTotal = (base: number) => {
    const seniorityBonus = base * (seniority * 0.01);
    const presentismo = base * 0.10;
    return base + seniorityBonus + presentismo;
  };

  const activeGridData = getActiveGrid();
  const activeAdicionalesData = getActiveAdicionales();

  const filteredScales = activeGridData.filter((row) =>
    row.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
        <div className="text-center space-y-4 max-w-2xl mx-auto">
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
        <div className="flex justify-center">
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
          <div className="space-y-8 animate-fadeIn">
            {/* Paritaria Agreement Switcher */}
            <div className="flex flex-col sm:flex-row items-center justify-between border border-border bg-card p-6 rounded-3xl shadow-premium glass gap-4">
              <div className="space-y-1 text-center sm:text-left">
                <span className="text-[10px] font-bold text-secondary uppercase tracking-wider block">Acuerdo de Negociación Paritaria</span>
                <span className="text-sm font-extrabold text-foreground">Seleccioná el acuerdo paritario a consultar:</span>
              </div>
              <div className="flex bg-slate-100 p-1 rounded-2xl border border-border/60">
                <button
                  onClick={() => handleAgreementChange('may2026')}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                    agreement === 'may2026' 
                      ? 'bg-primary text-white shadow-premium' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Acuerdo Mayo 2026 (Vigente)
                  {agreement === 'may2026' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
                </button>
                <button
                  onClick={() => handleAgreementChange('feb2026')}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    agreement === 'feb2026' 
                      ? 'bg-primary text-white shadow-premium' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Acuerdo Febrero 2026
                </button>
              </div>
            </div>

            {/* Filters and Period Selectors */}
            <div className="bg-card border border-border rounded-2xl p-5 shadow-premium glass flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                {/* Search */}
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Buscar por categoría CCT..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 text-xs transition-all"
                  />
                </div>
                
                {/* Period Selector Tabs (Mayo - Junio - Julio or Febrero - Marzo - Abril - Mayo) */}
                <div className="flex bg-muted p-1 rounded-xl w-full sm:w-auto border border-border overflow-x-auto">
                  {agreement === 'may2026' ? (
                    <>
                      <button
                        onClick={() => setPeriod('may')}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                          period === 'may' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
                        }`}
                      >
                        Mayo 2026
                      </button>
                      <button
                        onClick={() => setPeriod('june')}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                          period === 'june' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
                        }`}
                      >
                        Junio 2026
                      </button>
                      <button
                        onClick={() => setPeriod('july')}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                          period === 'july' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
                        }`}
                      >
                        Julio 2026
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => setPeriod('feb')}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                          period === 'feb' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
                        }`}
                      >
                        Febrero 2026
                      </button>
                      <button
                        onClick={() => setPeriod('mar')}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                          period === 'mar' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
                        }`}
                      >
                        Marzo 2026
                      </button>
                      <button
                        onClick={() => setPeriod('apr')}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                          period === 'apr' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
                        }`}
                      >
                        Abril 2026
                      </button>
                      <button
                        onClick={() => setPeriod('may')}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                          period === 'may' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
                        }`}
                      >
                        Mayo 2026
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Interactive Seniority Slider */}
              <div className="flex items-center gap-4 w-full md:w-auto border-t md:border-t-0 border-border pt-3 md:pt-0">
                <div className="space-y-0.5">
                  <label htmlFor="seniority-select" className="text-[10px] font-bold text-muted-foreground uppercase block">
                    Calcular Antigüedad:
                  </label>
                  <span className="text-xs text-foreground font-black">{seniority} Años (+{seniority}%)</span>
                </div>
                <input
                  type="range"
                  id="seniority-select"
                  min="0"
                  max="40"
                  value={seniority}
                  onChange={(e) => setSeniority(Number(e.target.value))}
                  className="w-full sm:w-44 accent-primary cursor-pointer"
                />
              </div>
            </div>

            {/* Main Table: Categories */}
            <div className="space-y-2">
              <h3 className="text-sm font-black text-foreground uppercase tracking-widest flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-secondary" />
                Categorías Profesionales CCT 659/13 ({period === 'july' ? 'Julio 2026' : period === 'june' ? 'Junio 2026' : period === 'may' ? 'Mayo 2026' : period === 'apr' ? 'Abril 2026' : period === 'mar' ? 'Marzo 2026' : period === 'feb' ? 'Febrero 2026' : 'Período'})
              </h3>
              <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-premium glass">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="border-b border-border bg-muted/30 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                        <th className="py-4 px-6">Categoría Profesional</th>
                        <th className="py-4 px-4 text-right">Sueldo Básico</th>
                        <th className="py-4 px-4 text-right">Suma No Rem.</th>
                        <th className="py-4 px-4 text-right">Monto Paritario</th>
                        <th className="py-4 px-6 text-right bg-primary/5 text-primary">Est. de Bolsillo (con Adicionales)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60 text-sm">
                      {filteredScales.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-xs text-muted-foreground font-semibold">
                            Ninguna categoría coincide con el filtro de búsqueda.
                          </td>
                        </tr>
                      ) : (
                        filteredScales.map((row) => {
                          const basic = row.basic;
                          const noRem = row.noRem;
                          const total = basic + noRem;
                          const calculatedTotal = calculateInteractiveTotal(total);

                          return (
                            <tr key={row.category} className="hover:bg-muted/10 transition-colors">
                              <td className="py-4 px-6">
                                <span className="font-extrabold text-[#0f172a] block">{row.category}</span>
                                <span className="text-xs text-muted-foreground/80 line-clamp-1 font-medium">{row.description}</span>
                              </td>
                              <td className="py-4 px-4 text-right font-semibold text-slate-700">
                                ${basic.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="py-4 px-4 text-right text-amber-600 font-bold">
                                {noRem > 0 
                                  ? `$${noRem.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                  : '-'
                                }
                              </td>
                              <td className="py-4 px-4 text-right font-black text-[#0f172a]">
                                ${total.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="py-4 px-6 text-right font-black text-primary bg-primary/5">
                                ${Math.round(calculatedTotal).toLocaleString('es-AR')}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Secondary Table: Blockades & Titles */}
            <div className="space-y-2 pt-4">
              <h3 className="text-sm font-black text-foreground uppercase tracking-widest flex items-center gap-2">
                <Percent className="w-4 h-4 text-secondary" />
                Bloqueo de Título y Adicionales Art. 7
              </h3>
              <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-premium glass">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="border-b border-border bg-muted/30 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                        <th className="py-4 px-6">Concepto / Adicional Art. 7</th>
                        <th className="py-4 px-4 text-right">Sueldo Básico</th>
                        <th className="py-4 px-4 text-right">Suma No Rem.</th>
                        <th className="py-4 px-6 text-right bg-secondary/5 text-secondary">Monto Adicional Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60 text-sm">
                      {activeAdicionalesData.map((row) => {
                        const basic = row.basic;
                        const noRem = row.noRem;
                        const total = basic + noRem;

                        return (
                          <tr key={row.concept} className="hover:bg-muted/10 transition-colors">
                            <td className="py-4 px-6">
                              <span className="font-extrabold text-[#0f172a] block">{row.concept}</span>
                              <span className="text-xs text-muted-foreground/80 line-clamp-1 font-medium">{row.description}</span>
                            </td>
                            <td className="py-4 px-4 text-right font-semibold text-slate-700">
                              ${basic.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="py-4 px-4 text-right text-amber-600 font-bold">
                              {noRem > 0 
                                ? `$${noRem.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                : '-'
                              }
                            </td>
                            <td className="py-4 px-6 text-right font-black text-secondary bg-secondary/5">
                              ${total.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Calculation Info Banner */}
            <div className="bg-muted/40 border border-border rounded-2xl p-5 flex items-start gap-3">
              <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div className="space-y-1 text-xs text-muted-foreground font-semibold leading-relaxed">
                <h4 className="font-extrabold text-[#0f172a]">Notas sobre la Liquidación Vigente:</h4>
                <ul className="list-disc pl-4 space-y-1 font-medium text-slate-600">
                  <li>**Evolución del Básico**: Las sumas no remunerativas se abonan de forma transitoria para compensar la inflación y luego se incorporan al salario básico definitivo del mes subsiguiente (por ejemplo, el básico de Julio consolida las sumas previas).</li>
                  <li>**Cómputo de Adicionales**: El sueldo estimado suma el total de la grilla (Básico + Sumas no rem.) y aplica un **10% de Presentismo** obligatorio y un **1% por año de servicio** (antigüedad acumulativa).</li>
                </ul>
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
