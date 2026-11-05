'use client';

import React from 'react';
import { Pencil, X, DollarSign, Loader2 } from 'lucide-react';
import { cctCategories, PHARMACIST_CATEGORY } from '@/lib/dateUtils';

interface EditEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  name: string;
  setName: (v: string) => void;
  cuil: string;
  setCuil: (v: string) => void;
  entryDate: string;
  setEntryDate: (v: string) => void;
  category: string;
  setCategory: (v: string) => void;
  pharmacistLicense: string;
  setPharmacistLicense: (v: string) => void;
  isAffiliate: boolean;
  setIsAffiliate: (v: boolean) => void;
  weeklyHours: number;
  setWeeklyHours: (v: number) => void;
  onJobReserve: boolean;
  setOnJobReserve: (v: boolean) => void;
  jobReserveSince: string;
  setJobReserveSince: (v: string) => void;
  salaryType: 'automatico' | 'manual';
  setSalaryType: (v: 'automatico' | 'manual') => void;
  customSalary: string;
  setCustomSalary: (v: string) => void;
  customNoRem: string;
  setCustomNoRem: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  saving?: boolean;
}

export default function EditEmployeeModal({
  isOpen,
  onClose,
  name,
  setName,
  cuil,
  setCuil,
  entryDate,
  setEntryDate,
  category,
  setCategory,
  pharmacistLicense,
  setPharmacistLicense,
  isAffiliate,
  setIsAffiliate,
  weeklyHours,
  setWeeklyHours,
  onJobReserve,
  setOnJobReserve,
  jobReserveSince,
  setJobReserveSince,
  salaryType,
  setSalaryType,
  customSalary,
  setCustomSalary,
  customNoRem,
  setCustomNoRem,
  onSubmit,
  saving = false,
}: EditEmployeeModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto py-6 sm:py-10 animate-fadeIn">
      <div className="bg-card border border-border rounded-3xl max-w-xl w-full shadow-premium-lg relative animate-scaleIn flex flex-col max-h-[92vh] my-auto">
        {/* Sticky Header */}
        <div className="p-5 sm:p-6 pb-4 border-b border-border/80 flex items-center justify-between flex-shrink-0">
          <div>
            <h3 className="text-xl font-extrabold text-[#0f172a] tracking-tight flex items-center gap-2.5">
              <Pencil className="w-5.5 h-5.5 text-primary flex-shrink-0" />
              <span>Editar Empleado y Régimen de Sueldo</span>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Ajustá los datos laborales o fijá un sueldo bruto personalizado para casos extraordinarios.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col flex-1 overflow-hidden">
          {/* Scrollable Form Body */}
          <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1 text-slate-800">
            <div>
              <label className="text-sm font-bold text-slate-800 block mb-1.5">Nombre y Apellido *</label>
              <input 
                type="text" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                className="w-full rounded-xl border border-border px-4 py-2.5 bg-background text-base sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 text-[#0f172a]"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-bold text-slate-800 block mb-1.5">CUIL *</label>
                <input 
                  type="text" 
                  value={cuil} 
                  onChange={(e) => setCuil(e.target.value)} 
                  className="w-full rounded-xl border border-border px-4 py-2.5 bg-background text-base sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 text-[#0f172a]"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-bold text-slate-800 block mb-1.5">Fecha de Ingreso *</label>
                <input 
                  type="date" 
                  value={entryDate} 
                  onChange={(e) => setEntryDate(e.target.value)} 
                  className="w-full rounded-xl border border-border px-4 py-2.5 bg-background text-base sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 text-[#0f172a]"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-bold text-slate-800 block mb-1.5">Categoría Profesional CCT *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl border border-border px-4 py-2.5 bg-background text-base sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 text-[#0f172a]"
              >
                {cctCategories.map((cat, idx) => (
                  <option key={idx} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {category === PHARMACIST_CATEGORY && (
              <div className="p-4 bg-indigo-500/5 border border-indigo-500/25 rounded-2xl space-y-2">
                <label className="text-sm font-bold text-slate-800 block">N° de Matrícula Profesional *</label>
                <input
                  type="text"
                  value={pharmacistLicense}
                  onChange={(e) => setPharmacistLicense(e.target.value)}
                  placeholder="Ej: 4521"
                  className="w-full rounded-xl border border-border px-4 py-2.5 bg-white text-base sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-[#0f172a]"
                  required
                />
              </div>
            )}

            <div className={`flex items-start gap-3 p-4 rounded-2xl border ${isAffiliate ? 'bg-slate-50 border-border/80' : 'bg-amber-50 border-amber-300'}`}>
              <input
                type="checkbox"
                id="edit-emp-not-affiliate"
                checked={!isAffiliate}
                onChange={(e) => setIsAffiliate(!e.target.checked)}
                className="w-5 h-5 accent-amber-600 cursor-pointer rounded mt-0.5"
              />
              <label htmlFor="edit-emp-not-affiliate" className="cursor-pointer select-none space-y-0.5">
                <span className="text-sm font-bold text-slate-800 block">NO es afiliado a ATFAR</span>
                <span className="text-xs text-slate-500 font-medium block leading-snug">
                  {isAffiliate
                    ? 'Sin marcar: se lo considera afiliado y se liquida la cuota sindical del 2% (remunerativo + no remunerativo).'
                    : 'Marcado: no se le retiene cuota sindical sobre el sueldo remunerativo. Tributa el 2% sobre las sumas no remunerativas (Cláusula 5ª Acta Acuerdo).'}
                </span>
              </label>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-sm font-bold text-slate-800">Horas Semanales</label>
                <div className="flex items-center gap-1.5">
                  <input 
                    type="number"
                    min="1"
                    max="45"
                    step="0.5"
                    value={weeklyHours}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setWeeklyHours(isNaN(val) ? 0 : Math.min(45, Math.max(0, val)));
                    }}
                    className="w-16 px-2 py-0.5 text-center font-extrabold text-primary bg-primary/5 rounded border border-primary/20 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <span className="text-xs font-bold text-slate-500">hs</span>
                </div>
              </div>
              <input 
                type="range" 
                min="1" 
                max="45" 
                step="0.5"
                value={weeklyHours} 
                onChange={(e) => setWeeklyHours(parseFloat(e.target.value))} 
                className="w-full accent-primary h-2.5 bg-slate-200 rounded-lg cursor-pointer"
              />
              <span className="text-xs text-slate-500 font-semibold mt-1 block">Rango: 1 hs a 45 hs (jornada completa CCT 659/13). Media jornada: 22.5 hs.</span>
            </div>

            {/* Reserva de puesto (art. 211 LCT) / licencia sin goce */}
            <div className="border border-sky-500/25 rounded-2xl p-4 sm:p-5 bg-sky-500/5 space-y-3">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="edit-emp-job-reserve"
                  checked={onJobReserve}
                  onChange={(e) => setOnJobReserve(e.target.checked)}
                  className="w-5 h-5 accent-sky-600 cursor-pointer rounded mt-0.5"
                />
                <label htmlFor="edit-emp-job-reserve" className="cursor-pointer select-none space-y-0.5">
                  <span className="text-sm font-bold text-slate-800 block">Reserva de puesto / licencia sin goce de sueldo</span>
                  <span className="text-xs text-slate-600 font-medium block leading-snug">
                    Ej.: licencia por enfermedad que superó los meses pagos (art. 211 LCT). Sigue en nómina, pero no cobra sueldo: el aporte del período es $0 y no se le pide recibo.
                  </span>
                </label>
              </div>
              {onJobReserve && (
                <div className="pl-8 animate-fadeIn pt-1">
                  <label className="text-xs font-bold text-slate-700 block mb-1">En reserva desde</label>
                  <input
                    type="date"
                    value={jobReserveSince}
                    onChange={(e) => setJobReserveSince(e.target.value)}
                    className="w-full sm:w-56 rounded-xl border border-border px-4 py-2.5 bg-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500/20 text-[#0f172a]"
                    required={onJobReserve}
                  />
                  <span className="text-xs text-slate-500 font-medium block mt-1">Cuando vuelva a trabajar, destildá esta opción.</span>
                </div>
              )}
            </div>

            {/* Régimen de Sueldo (Automático vs Manual) */}
            <div className={`border border-border/90 rounded-2xl p-4 sm:p-5 bg-slate-50/80 space-y-3.5 ${onJobReserve ? 'opacity-50' : ''}`}>
              <div className="flex items-center justify-between">
                <label className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-primary" />
                  <span>Régimen de Sueldo para Aportes</span>
                </label>
                <span className={`text-xs font-black uppercase px-2.5 py-0.5 rounded-full ${
                  salaryType === 'manual'
                    ? 'bg-amber-500/15 text-amber-800 border border-amber-500/30' 
                    : 'bg-emerald-500/10 text-emerald-700 border border-emerald-500/20'
                }`}>
                  {salaryType === 'manual' ? 'Sueldo Fijo Manual' : 'Automático CCT'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setSalaryType('automatico');
                    setCustomSalary('');
                  }}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    salaryType === 'automatico'
                      ? 'border-primary bg-primary/5 ring-1 ring-primary'
                      : 'border-border bg-white hover:bg-slate-50'
                  }`}
                >
                  <span className="text-xs font-bold text-slate-800 block mb-0.5">✓ Automático CCT</span>
                  <span className="text-[11px] text-slate-500 block leading-tight">Escala oficial + antigüedad</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSalaryType('manual')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    salaryType === 'manual'
                      ? 'border-amber-600 bg-amber-500/10 ring-1 ring-amber-600'
                      : 'border-border bg-white hover:bg-slate-50'
                  }`}
                >
                  <span className="text-xs font-bold text-amber-900 block mb-0.5">✏️ Fijar Manualmente</span>
                  <span className="text-[11px] text-slate-500 block leading-tight">Casos extraordinarios</span>
                </button>
              </div>

              {salaryType === 'manual' && (
                <div className="pt-2 border-t border-border/60 space-y-3 animate-fadeIn">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        Conceptos Remunerativos ($ ARS) *
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">$</span>
                        <input
                          type="number"
                          min="1"
                          step="0.01"
                          value={customSalary}
                          onChange={(e) => setCustomSalary(e.target.value)}
                          placeholder="Ej: 1450000.00"
                          className="w-full rounded-xl border border-border pl-8 pr-4 py-2.5 bg-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 text-[#0f172a]"
                          required={salaryType === 'manual'}
                        />
                      </div>
                      <span className="text-xs text-slate-500 font-medium block mt-1">Sueldo bruto base sujeto a aportes.</span>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        Conceptos No Remunerativos ($ ARS)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">$</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={customNoRem}
                          onChange={(e) => setCustomNoRem(e.target.value)}
                          placeholder="Ej: 0.00"
                          className="w-full rounded-xl border border-border pl-8 pr-4 py-2.5 bg-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 text-[#0f172a]"
                        />
                      </div>
                      <span className="text-xs text-slate-500 font-medium block mt-1">Sumas no remunerativas. Si no percibe, dejá 0.</span>
                    </div>
                  </div>

                  <p className="text-xs text-amber-800 font-semibold bg-amber-500/10 p-3 rounded-xl border border-amber-500/20 leading-relaxed">
                    <strong>Aviso para contadores:</strong> El sistema liquidará los aportes basándose exactamente en estas dos bases (Remunerativo y No Remunerativo) y <u>no los modificará</u> con aumentos de escala ni antigüedad.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Sticky Footer */}
          <div className="p-4 sm:p-5 border-t border-border bg-slate-50/80 rounded-b-3xl flex items-center justify-end gap-3 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-border text-slate-700 text-sm font-bold hover:bg-slate-100 transition-all cursor-pointer bg-white"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/95 transition-all shadow-premium cursor-pointer disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <span>Guardar Cambios</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
