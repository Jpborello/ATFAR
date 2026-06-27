'use client';

import { useState } from 'react';
import { 
  FileText, 
  Calculator, 
  Search, 
  Sparkles, 
  ArrowRight, 
  TrendingUp, 
  Info,
  Calendar,
  Clock,
  Briefcase
} from 'lucide-react';

interface ScaleRow {
  category: string;
  basicMay2026: number;
  basicJune2026: number;
  description: string;
}

export default function PublicEscalasPage() {
  const [activeTab, setActiveTab] = useState<'scales' | 'calculator'>('scales');
  
  // Tab 1: Scales States
  const [searchQuery, setSearchQuery] = useState('');
  const [period, setPeriod] = useState<'june' | 'may'>('june');
  const [seniority, setSeniority] = useState<number>(0);

  // Tab 2: Calculator States (Excel replication)
  const [calcSalary, setCalcSalary] = useState<number>(640000); // Default basic salary
  const [vacationDays, setVacationDays] = useState<number>(17); // Excel cell D18
  const [daysWorked, setDaysWorked] = useState<number>(13); // Excel cell D20
  const [partTimeHours, setPartTimeHours] = useState<number>(8); // Excel cell D22
  
  const scalesData: ScaleRow[] = [
    { category: 'Farmacéutico (Director Técnico)', basicMay2026: 730000, basicJune2026: 820000, description: 'Profesional farmacéutico a cargo de la dirección técnica y la dispensa de medicamentos.' },
    { category: 'Auxiliar de Farmacia', basicMay2026: 590000, basicJune2026: 640000, description: 'Personal capacitado para colaborar con el farmacéutico en tareas específicas y de asistencia.' },
    { category: 'Cajero de Farmacia', basicMay2026: 540000, basicJune2026: 590000, description: 'Personal de salón encargado de la facturación, cajas registradoras y cobranza en el local.' },
    { category: 'Personal de Salón (Vendedor)', basicMay2026: 535000, basicJune2026: 585000, description: 'Atención al público en mostrador, asesoramiento en perfumería y góndolas generales.' },
    { category: 'Personal Administrativo', basicMay2026: 520000, basicJune2026: 570000, description: 'Tareas administrativas, facturación de obras sociales y control interno de stock.' },
    { category: 'Cadete / Auxiliar de Portería', basicMay2026: 470000, basicJune2026: 520000, description: 'Tareas de mensajería, distribución domiciliaria, limpieza y mantenimiento general.' },
  ];

  const filteredScales = scalesData.filter((row) =>
    row.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const calculateTotal = (basic: number) => {
    const seniorityBonus = basic * (seniority * 0.01); // 1% per year
    const presentismo = basic * 0.10; // 10% presentismo
    return basic + seniorityBonus + presentismo;
  };

  // Excel Payroll Formulas
  const valNormalDay = calcSalary / 30; // B6
  const valVacationDay = calcSalary / 25; // B8
  const valHour = calcSalary / 200; // B10
  const valHour50 = valHour * 1.5; // B12
  const valHour100 = valHour * 2; // B14
  const valAguinaldo = calcSalary * 0.5; // B16
  const valVacationsTotal = valVacationDay * vacationDays; // B18
  const valDaysWorkedTotal = valNormalDay * daysWorked; // B20
  const valPartTimeTotal = valHour * partTimeHours * 30; // B22

  return (
    <div className="bg-background text-foreground min-h-screen py-12 px-4 sm:px-6 lg:px-8 relative">
      {/* Background decoration */}
      <div className="absolute top-[10%] right-[10%] w-[350px] h-[350px] rounded-full bg-primary/5 blur-[100px] pointer-events-none" />

      <div className="max-w-7xl mx-auto space-y-10 relative">
        {/* Header */}
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <span className="text-[10px] font-bold text-primary uppercase tracking-widest block">Herramientas y Paritarias</span>
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
            {activeTab === 'scales' ? 'Escalas Salariales de Convenio' : 'Liquidador de Sueldos y Horas'}
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed font-medium">
            {activeTab === 'scales' 
              ? 'Consultá las grillas básicas actualizadas del CCT 659/13 de trabajadores de farmacia de Rosario.' 
              : 'Simulador dinámico para el cálculo de valores por día, hora extra (50% / 100%), aguinaldos y vacaciones proporcionales.'
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
              Liquidador de Día y Horas
            </button>
          </div>
        </div>

        {/* Tab 1: Scales List */}
        {activeTab === 'scales' && (
          <div className="space-y-8 animate-fadeIn">
            {/* Filters and Controls */}
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
                
                {/* Period Selector */}
                <div className="flex bg-muted p-1 rounded-xl w-full sm:w-auto">
                  <button
                    onClick={() => setPeriod('june')}
                    className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      period === 'june' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
                    }`}
                  >
                    Junio 2026
                  </button>
                  <button
                    onClick={() => setPeriod('may')}
                    className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      period === 'may' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
                    }`}
                  >
                    Mayo 2026
                  </button>
                </div>
              </div>

              {/* Interactive Seniority Calculator Trigger */}
              <div className="flex items-center gap-4 w-full md:w-auto border-t md:border-t-0 border-border pt-3 md:pt-0">
                <div className="space-y-0.5">
                  <label htmlFor="seniority-select" className="text-[10px] font-bold text-muted-foreground uppercase block">
                    Calcular Antigüedad:
                  </label>
                  <span className="text-xs text-foreground font-semibold">{seniority} Años</span>
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

            {/* Dynamic Table Card */}
            <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-premium glass">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-border bg-muted/30 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      <th className="py-4 px-6">Categoría Profesional</th>
                      <th className="py-4 px-4 text-right">Básico Mayo 2026</th>
                      <th className="py-4 px-4 text-right">Básico Junio 2026</th>
                      <th className="py-4 px-4 text-center">Incremento (%)</th>
                      <th className="py-4 px-6 text-right">Sueldo Estimado (con Antigüedad)</th>
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
                        const diff = row.basicJune2026 - row.basicMay2026;
                        const percentIncrease = ((diff / row.basicMay2026) * 100).toFixed(1);
                        const activeBasic = period === 'june' ? row.basicJune2026 : row.basicMay2026;
                        const calculatedTotal = calculateTotal(activeBasic);

                        return (
                          <tr key={row.category} className="hover:bg-muted/10 transition-colors">
                            <td className="py-4 px-6">
                              <span className="font-semibold text-[#0f172a] block">{row.category}</span>
                              <span className="text-xs text-muted-foreground/80 line-clamp-1 font-medium">{row.description}</span>
                            </td>
                            <td className="py-4 px-4 text-right text-muted-foreground font-medium">
                              ${row.basicMay2026.toLocaleString('es-AR')}
                            </td>
                            <td className="py-4 px-4 text-right font-black text-[#0f172a]">
                              ${row.basicJune2026.toLocaleString('es-AR')}
                            </td>
                            <td className="py-4 px-4 text-center">
                              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 text-xs font-bold font-sans">
                                <TrendingUp className="w-3 h-3" />
                                <span>+{percentIncrease}%</span>
                              </span>
                            </td>
                            <td className="py-4 px-6 text-right font-black text-primary">
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

            {/* Calculation Guidelines Banner */}
            <div className="bg-muted/40 border border-border rounded-2xl p-5 flex items-start gap-3">
              <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div className="space-y-1 text-xs text-muted-foreground font-medium leading-relaxed">
                <h4 className="font-bold text-[#0f172a]">Información sobre Adicionales de Convenio:</h4>
                <p>El sueldo estimado incluye: 1) Sueldo básico del período seleccionado; 2) Adicional por antigüedad del 1% anual acumulativo sobre el básico por año de servicio; 3) Asignación por presentismo del 10% fijado por Convenio Colectivo de Trabajo.</p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Hourly and Daily Calculator */}
        {activeTab === 'calculator' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fadeIn">
            {/* Input Parameters Box */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-premium glass space-y-6">
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-[#0f172a] flex items-center gap-2">
                    <span className="w-1.5 h-4 bg-primary rounded-full" />
                    Parámetros de Liquidación
                  </h3>
                  <p className="text-xs text-muted-foreground font-medium">
                    Ingresá el sueldo básico a liquidar y ajustá los parámetros para realizar el desglose exacto de conceptos.
                  </p>
                </div>

                {/* Quick select loader preset */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase block">
                    Cargar sueldo de una categoría:
                  </label>
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        setCalcSalary(Number(e.target.value));
                      }
                    }}
                    className="w-full px-3 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 text-xs transition-all"
                  >
                    <option value="">Seleccionar categoría...</option>
                    {scalesData.map((row) => (
                      <option key={row.category} value={row.basicJune2026}>
                        {row.category} (${row.basicJune2026.toLocaleString('es-AR')})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Salary Input B4 */}
                <div className="space-y-2">
                  <label htmlFor="calcSalary" className="text-xs font-semibold text-foreground flex justify-between">
                    <span>Salario Básico Mensual (8 hs) *</span>
                    <span className="text-xs text-primary font-black">${calcSalary.toLocaleString('es-AR')}</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">$</span>
                    <input
                      type="number"
                      id="calcSalary"
                      value={calcSalary}
                      onChange={(e) => setCalcSalary(Number(e.target.value))}
                      className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 text-xs transition-all font-semibold"
                      placeholder="Ej. 640000"
                    />
                  </div>
                </div>

                {/* Vacation Days D18 */}
                <div className="space-y-2 pt-4 border-t border-border/60">
                  <div className="flex items-center justify-between">
                    <label htmlFor="vacationDays" className="text-xs font-semibold text-foreground flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      Días de Vacaciones:
                    </label>
                    <span className="text-xs text-[#0f172a] font-bold">{vacationDays} Días</span>
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
                  <span className="text-[10px] text-muted-foreground font-medium block">
                    Fórmula Planilla: (Sueldo / 25) * {vacationDays} días.
                  </span>
                </div>

                {/* Days Worked D20 */}
                <div className="space-y-2 pt-4 border-t border-border/60">
                  <div className="flex items-center justify-between">
                    <label htmlFor="daysWorked" className="text-xs font-semibold text-foreground flex items-center gap-1">
                      <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                      Días Trabajados en el mes:
                    </label>
                    <span className="text-xs text-[#0f172a] font-bold">{daysWorked} Días</span>
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
                  <span className="text-[10px] text-muted-foreground font-medium block">
                    Fórmula Planilla: (Sueldo / 30) * {daysWorked} días.
                  </span>
                </div>

                {/* Part Time Hours D22 */}
                <div className="space-y-2 pt-4 border-t border-border/60">
                  <div className="flex items-center justify-between">
                    <label htmlFor="partTimeHours" className="text-xs font-semibold text-foreground flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      Horas Diarias (Jornada Parcial):
                    </label>
                    <span className="text-xs text-[#0f172a] font-bold">{partTimeHours} hs</span>
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
                  <span className="text-[10px] text-muted-foreground font-medium block">
                    Fórmula Planilla: Valor Hora * {partTimeHours} hs * 30 días.
                  </span>
                </div>
              </div>
            </div>

            {/* Calculations Output Dashboard */}
            <div className="lg:col-span-7 space-y-6">
              <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-premium glass space-y-6">
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-[#0f172a]">Resultados Calculados</h3>
                  <p className="text-xs text-muted-foreground font-medium">
                    Variables de liquidación obtenidas en tiempo real según la reglamentación gremial vigente.
                  </p>
                </div>

                {/* 3 Main KPIs */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 bg-slate-50 border border-border rounded-2xl space-y-1 text-center">
                    <span className="text-[9px] font-bold text-muted-foreground uppercase block">Día Normal (Divisor 30)</span>
                    <span className="text-lg font-black text-[#0f172a]">${Math.round(valNormalDay).toLocaleString('es-AR')}</span>
                  </div>
                  <div className="p-4 bg-slate-50 border border-border rounded-2xl space-y-1 text-center">
                    <span className="text-[9px] font-bold text-muted-foreground uppercase block">Día Vacación (Divisor 25)</span>
                    <span className="text-lg font-black text-[#0f172a]">${Math.round(valVacationDay).toLocaleString('es-AR')}</span>
                  </div>
                  <div className="p-4 bg-slate-50 border border-border rounded-2xl space-y-1 text-center">
                    <span className="text-[9px] font-bold text-muted-foreground uppercase block">Hora Normal (Divisor 200)</span>
                    <span className="text-lg font-black text-primary">${Math.round(valHour).toLocaleString('es-AR')}</span>
                  </div>
                </div>

                {/* Overtime section */}
                <div className="space-y-3 pt-2">
                  <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Recargos y Horas Extras</h4>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 border border-border rounded-2xl flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-[#0f172a] block">Hora Extra al 50%</span>
                        <span className="text-[9px] text-muted-foreground">Lunes a Sábados hasta las 13 hs</span>
                      </div>
                      <span className="text-md font-black text-primary">${Math.round(valHour50).toLocaleString('es-AR')}</span>
                    </div>

                    <div className="p-4 bg-slate-50 border border-border rounded-2xl flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-[#0f172a] block">Hora Extra al 100%</span>
                        <span className="text-[9px] text-muted-foreground">Sábados tarde, Domingos y Feriados</span>
                      </div>
                      <span className="text-md font-black text-secondary">${Math.round(valHour100).toLocaleString('es-AR')}</span>
                    </div>
                  </div>
                </div>

                {/* Detailed Provisions Breakdown */}
                <div className="space-y-3 pt-4 border-t border-border/80">
                  <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Montos Proporcionales de Liquidación</h4>
                  
                  <div className="divide-y divide-border/60 border-y border-border">
                    {/* Aguinaldo */}
                    <div className="py-3.5 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-[#0f172a] block">Sueldo Anual Complementario (SAC / Medio Aguinaldo)</span>
                        <span className="text-[10px] text-muted-foreground">Proporcional 50% del salario básico</span>
                      </div>
                      <span className="text-sm font-black text-[#0f172a]">${Math.round(valAguinaldo).toLocaleString('es-AR')}</span>
                    </div>

                    {/* Vacaciones */}
                    <div className="py-3.5 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-[#0f172a] block">Monto de Vacaciones Calculadas</span>
                        <span className="text-[10px] text-muted-foreground">Valor día vacación (${Math.round(valVacationDay)}) × {vacationDays} días</span>
                      </div>
                      <span className="text-sm font-black text-primary">${Math.round(valVacationsTotal).toLocaleString('es-AR')}</span>
                    </div>

                    {/* Días Trabajados */}
                    <div className="py-3.5 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-[#0f172a] block">Monto de Días Trabajados Liquidado</span>
                        <span className="text-[10px] text-muted-foreground">Valor día normal (${Math.round(valNormalDay)}) × {daysWorked} días</span>
                      </div>
                      <span className="text-sm font-black text-[#0f172a]">${Math.round(valDaysWorkedTotal).toLocaleString('es-AR')}</span>
                    </div>

                    {/* Jornada Parcial */}
                    <div className="py-3.5 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-[#0f172a] block">Monto Mensual por Jornada Reducida</span>
                        <span className="text-[10px] text-muted-foreground">Valor hora base (${Math.round(valHour)}) × {partTimeHours} hs × 30 días</span>
                      </div>
                      <span className="text-sm font-black text-primary">${Math.round(valPartTimeTotal).toLocaleString('es-AR')}</span>
                    </div>
                  </div>
                </div>

                {/* Disclaimer banner */}
                <div className="bg-slate-50 border border-border rounded-xl p-4 flex items-start gap-2.5">
                  <Info className="w-4.5 h-4.5 text-primary flex-shrink-0 mt-0.5" />
                  <p className="text-[10px] text-muted-foreground leading-relaxed font-medium">
                    Los valores indicados son simulaciones referenciales basadas estrictamente en la plantilla oficial de cálculo de ATFAR Rosario. No contempla descuentos previsionales (obra social, sindicato, aportes jubilatorios) ni otros adicionales variables particulares.
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
