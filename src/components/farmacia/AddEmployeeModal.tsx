'use client';

import React from 'react';
import { Briefcase, X, Sparkles, DollarSign } from 'lucide-react';
import { cctCategories, PHARMACIST_CATEGORY } from '@/lib/dateUtils';

interface AddEmployeeModalProps {
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
  salaryType: 'automatico' | 'manual';
  setSalaryType: (v: 'automatico' | 'manual') => void;
  customSalary: string;
  setCustomSalary: (v: string) => void;
  customNoRem: string;
  setCustomNoRem: (v: string) => void;
  onReceiptFileChange: (f: File | null) => void;
  onSubmit: (e: React.FormEvent) => void;
  uploadingReceipt: boolean;
}

export default function AddEmployeeModal({
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
  salaryType,
  setSalaryType,
  customSalary,
  setCustomSalary,
  customNoRem,
  setCustomNoRem,
  onReceiptFileChange,
  onSubmit,
  uploadingReceipt,
}: AddEmployeeModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto py-6 sm:py-10 animate-fadeIn">
      <div className="bg-card border border-border rounded-3xl max-w-xl w-full shadow-premium-lg relative animate-scaleIn flex flex-col max-h-[92vh] my-auto">
        {/* Sticky Header */}
        <div className="p-5 sm:p-6 pb-4 border-b border-border/80 flex items-center justify-between flex-shrink-0">
          <h3 className="text-xl font-extrabold text-[#0f172a] tracking-tight flex items-center gap-2.5">
            <Briefcase className="w-6 h-6 text-primary flex-shrink-0" />
            <span>Registrar Empleado en Nómina</span>
          </h3>
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
                placeholder="Ej: Juan Pérez"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-bold text-slate-800 block mb-1.5">CUIL del Empleado *</label>
                <input 
                  type="text" 
                  value={cuil} 
                  onChange={(e) => setCuil(e.target.value)} 
                  placeholder="Ej: 20-12345678-9"
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

            <div className="flex items-start gap-3 p-4 bg-secondary/5 border border-secondary/20 rounded-2xl">
              <Sparkles className="w-5 h-5 text-secondary flex-shrink-0 mt-0.5" />
              <p className="text-xs text-slate-700 leading-relaxed font-semibold">
                <span className="font-black text-secondary">Escalafón CCT 659/13 (Art. 15):</span> la antigüedad se liquida
                automáticamente según la fecha de ingreso (7% al primer año, +2% anual hasta 45%/50%).
                Para la categoría Farmacéutico, se requiere indicar la matrícula profesional habilitante.
              </p>
            </div>

            <div className={`flex items-start gap-3 p-4 rounded-2xl border ${isAffiliate ? 'bg-slate-50 border-border/80' : 'bg-amber-50 border-amber-300'}`}>
              <input
                type="checkbox"
                id="new-emp-not-affiliate"
                checked={!isAffiliate}
                onChange={(e) => setIsAffiliate(!e.target.checked)}
                className="w-5 h-5 accent-amber-600 cursor-pointer rounded mt-0.5"
              />
              <label htmlFor="new-emp-not-affiliate" className="cursor-pointer select-none space-y-0.5">
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
                <label className="text-sm font-bold text-slate-800">Horas Semanales Declaradas</label>
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

            {/* Régimen de Sueldo */}
            <div className="border border-border/90 rounded-2xl p-4 sm:p-5 bg-slate-50/80 space-y-3.5">
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

            <div className="p-4 bg-slate-50 border border-border/80 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-slate-800">
                  Recibo de Sueldo (PDF o Imagen)
                </label>
                <span className="text-[11px] font-bold text-slate-500 bg-slate-200/70 px-2 py-0.5 rounded-md">
                  Opcional en el alta inicial
                </span>
              </div>
              <input 
                type="file" 
                accept=".pdf,image/*"
                onChange={(e) => onReceiptFileChange(e.target.files?.[0] || null)}
                className="w-full text-sm text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-secondary/15 file:text-secondary hover:file:bg-secondary/20 cursor-pointer"
              />
              <span className="text-xs text-slate-500 font-medium block">
                Subí el <strong>último recibo de sueldo</strong> que tengas del empleado.
                Vale por 6 meses: cuando se venza, el sistema te avisa para subir uno nuevo.
              </span>
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
              disabled={uploadingReceipt}
              className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/95 transition-all shadow-premium cursor-pointer disabled:opacity-50 flex items-center gap-2"
            >
              {uploadingReceipt ? 'Guardando...' : 'Registrar Empleado'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

