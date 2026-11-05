'use client';

import React from 'react';
import { Pencil, Upload, Trash2, FileText, DollarSign } from 'lucide-react';
import { calculateSeniority, getCurrentCategory, getReceiptStatus, formatDateAR, PHARMACIST_CATEGORY } from '@/lib/dateUtils';
import { Employee } from '@/types';

interface EmployeeTableProps {
  employees: Employee[];
  onEdit: (emp: Employee) => void;
  onOpenReceiptModal: (emp: Employee) => void;
  onDelete: (id: string) => void;
}

export default function EmployeeTable({
  employees,
  onEdit,
  onOpenReceiptModal,
  onDelete,
}: EmployeeTableProps) {
  if (employees.length === 0) {
    return (
      <div className="text-center py-10 border border-dashed border-border rounded-2xl p-6 text-slate-500 font-semibold text-xs">
        No tenés empleados registrados en la nómina. Agregá al primer empleado para comenzar.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs border-collapse">
        <thead>
          <tr className="border-b border-border text-slate-500 font-bold uppercase tracking-wider bg-slate-50">
            <th className="py-3 px-4">Nombre y Apellido</th>
            <th className="py-3 px-4">CUIL</th>
            <th className="py-3 px-4">Categoría Profesional / Régimen</th>
            <th className="py-3 px-4 text-center">Afiliado (2%)</th>
            <th className="py-3 px-4 text-center">Recibo Sueldo (6m)</th>
            <th className="py-3 px-4 text-center">Ingreso</th>
            <th className="py-3 px-4 text-center">Antigüedad</th>
            <th className="py-3 px-4 text-center">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60 font-semibold text-slate-700">
          {employees.map((emp) => {
            const catInfo = getCurrentCategory(emp.category, emp.entryDate || emp.entry_date);
            const receiptStatus = emp.jobReserveSince || emp.job_reserve_since
              ? { valid: true, label: 'No requerido', color: 'emerald' }
              : getReceiptStatus(emp.receiptDate || emp.receipt_date);
            const entryDate = emp.entryDate || emp.entry_date;
            const customSalary = emp.customSalary ?? emp.custom_salary;
            const customNoRem = emp.customNoRem ?? emp.custom_no_rem;
            const isAffiliate = emp.isAffiliate ?? emp.is_affiliate;
            const pharmacistLicense = emp.pharmacistLicense ?? emp.pharmacist_license;
            const receiptUrl = emp.receiptUrl || emp.receipt_url;
            const jobReserveSince = emp.jobReserveSince || emp.job_reserve_since;
            const weeklyHours = emp.weeklyHours ?? emp.weekly_hours ?? 45;

            return (
              <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                <td className="py-3.5 px-4 font-bold text-[#0f172a]">{emp.fullName || emp.full_name}</td>
                <td className="py-3.5 px-4 font-mono text-slate-500">{emp.cuil}</td>
                <td className="py-3.5 px-4 text-slate-500">
                  <div className="flex flex-col">
                    <span className="font-bold text-[#0f172a]">{catInfo.category}</span>
                    {weeklyHours < 45 && (
                      <span className="inline-flex items-center gap-1 mt-1 text-[9px] text-indigo-700 font-extrabold uppercase tracking-wider bg-indigo-500/10 border border-indigo-500/25 px-2 py-0.5 rounded w-max" title={`Jornada parcial de ${weeklyHours} hs semanales (CCT 659/13 base: 45 hs)`}>
                        Jornada: {weeklyHours} hs/sem
                      </span>
                    )}
                    {jobReserveSince && (
                      <span className="inline-flex items-center gap-1 mt-1 text-[9px] text-sky-700 font-extrabold uppercase tracking-wider bg-sky-500/10 border border-sky-500/25 px-2 py-0.5 rounded w-max" title="No cobra sueldo: no genera aporte en la DDJJ ni requiere recibo">
                        Reserva de puesto desde {formatDateAR(jobReserveSince)}
                      </span>
                    )}
                    {customSalary && customSalary > 0 ? (
                      <div className="flex flex-col gap-0.5 mt-1">
                        <span className="inline-flex items-center gap-1 text-[9px] text-amber-800 font-extrabold uppercase tracking-wider bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded w-max" title="Base Remunerativa pactada">
                          <DollarSign className="w-3 h-3 text-amber-700" />
                          <span>Rem: ${customSalary.toLocaleString('es-AR')}</span>
                        </span>
                        {customNoRem !== null && customNoRem !== undefined && (
                          <span className="text-[8px] text-amber-900/80 font-bold tracking-wider bg-amber-500/10 px-1.5 py-0.5 rounded w-max border border-amber-500/20" title="Concepto No Remunerativo pactado">
                            No Rem: ${customNoRem.toLocaleString('es-AR')}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-[9px] text-slate-400 font-semibold">CCT Automático</span>
                        {catInfo.promoted && (
                          <span className="text-[9px] text-emerald-600 font-black uppercase tracking-wider bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                            Promovido (+{catInfo.steps} cat.)
                          </span>
                        )}
                      </div>
                    )}
                    {catInfo.category === PHARMACIST_CATEGORY && (
                      pharmacistLicense ? (
                        <span className="text-[9px] text-indigo-700 font-black uppercase tracking-wider bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20 w-max mt-1">
                          Matrícula N° {pharmacistLicense}
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onEdit(emp)}
                          className="mt-1.5 p-2 bg-red-50 border border-red-200 rounded-lg max-w-xs text-left cursor-pointer hover:bg-red-100 transition-colors"
                        >
                          <span className="text-[9px] text-red-700 font-black uppercase tracking-wider block">Falta N° de matrícula</span>
                          <span className="text-[9px] text-red-700/80 font-semibold leading-snug block">
                            La categoría Farmacéutico requiere la matrícula profesional. Hacé clic para cargarla.
                          </span>
                        </button>
                      )
                    )}
                  </div>
                </td>
                <td className="py-3.5 px-4 text-center">
                  {isAffiliate ? (
                    <span className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-emerald-500/10 text-emerald-700 rounded text-[10px] font-black uppercase border border-emerald-500/25" title="Afiliado: cuota sindical del 2% sobre Remunerativo + No Remunerativo">
                      Sí (2% Total)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-amber-500/15 text-amber-800 rounded text-[10px] font-black uppercase border border-amber-500/30" title="No Afiliado: $0 en remunerativo; cuota del 2% sobre conceptos No Remunerativos">
                      No (2% No Rem)
                    </span>
                  )}
                </td>
                <td className="py-3.5 px-4 text-center">
                  <div className="flex flex-col items-center gap-1">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase border ${
                      receiptStatus.valid 
                        ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' 
                        : 'bg-red-500/10 text-red-600 border-red-500/20'
                    }`}>
                      {receiptStatus.label}
                    </span>
                    {receiptUrl && (
                      <a
                        href={receiptUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-primary underline hover:opacity-80 inline-flex items-center gap-0.5 font-bold"
                      >
                        <FileText className="w-3 h-3" />
                        <span>Ver PDF</span>
                      </a>
                    )}
                  </div>
                </td>
                <td className="py-3.5 px-4 text-center text-slate-500">{entryDate}</td>
                <td className="py-3.5 px-4 text-center text-slate-500 font-bold">{calculateSeniority(entryDate)}</td>
                <td className="py-3.5 px-4 text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onEdit(emp)}
                      className="p-1.5 rounded-lg border border-border hover:bg-primary/10 text-slate-600 hover:text-primary hover:border-primary/30 transition-colors bg-white cursor-pointer shadow-sm"
                      title="Editar empleado o fijar sueldo personalizado"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenReceiptModal(emp)}
                      className="p-1.5 rounded-lg border border-border hover:bg-secondary/10 text-slate-600 hover:text-secondary hover:border-secondary/30 transition-colors bg-white cursor-pointer shadow-sm"
                      title="Cargar / Actualizar Recibo de Sueldo (Requerido cada 6 meses)"
                    >
                      <Upload className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(emp.id)}
                      className="p-1.5 rounded-lg border border-border hover:bg-red-50 text-slate-400 hover:text-red-500 hover:border-red-200 transition-colors bg-white cursor-pointer shadow-sm"
                      title="Dar de Baja"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

