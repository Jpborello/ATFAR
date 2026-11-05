'use client';

import React from 'react';
import { Upload, X } from 'lucide-react';

interface UpdateReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeName: string;
  employeeCuil: string;
  onFileChange: (file: File | null) => void;
  onSubmit: (e: React.FormEvent) => void;
  uploading: boolean;
}

export default function UpdateReceiptModal({
  isOpen,
  onClose,
  employeeName,
  employeeCuil,
  onFileChange,
  onSubmit,
  uploading,
}: UpdateReceiptModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-card border border-border rounded-3xl max-w-md w-full p-6 shadow-premium-lg relative animate-scaleIn space-y-5">
        <button 
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="space-y-1">
          <h3 className="text-lg font-extrabold text-[#0f172a] tracking-tight flex items-center gap-2">
            <Upload className="w-5 h-5 text-secondary" />
            <span>Actualizar Recibo de Sueldo</span>
          </h3>
          <p className="text-xs text-slate-500 font-semibold">
            Empleado: <strong className="text-slate-800">{employeeName}</strong> ({employeeCuil})
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-5">
          <div className="p-4 bg-slate-50 border border-border rounded-2xl space-y-2">
            <span className="text-xs font-bold text-slate-700 block">Adjuntar nuevo recibo (PDF o Foto):</span>
            <input 
              type="file" 
              accept=".pdf,image/*"
              required
              onChange={(e) => onFileChange(e.target.files?.[0] || null)}
              className="w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-secondary/15 file:text-secondary hover:file:bg-secondary/20 cursor-pointer"
            />
            <span className="text-[11px] text-slate-500 font-medium block leading-snug">
              El recibo anterior será reemplazado. Tendrá una vigencia de 6 meses para la validación automática de legajos.
            </span>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-border text-slate-700 text-xs font-bold uppercase tracking-wider hover:bg-slate-50 transition-all cursor-pointer bg-white"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={uploading}
              className="px-5 py-2 rounded-xl bg-secondary text-secondary-foreground text-xs font-bold uppercase tracking-wider hover:bg-secondary/95 transition-all shadow-md cursor-pointer disabled:opacity-50"
            >
              {uploading ? 'Subiendo...' : 'Guardar Recibo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

