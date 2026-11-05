'use client';

import React from 'react';
import { Building2, MapPin, Users, FileText } from 'lucide-react';

interface TutorialGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  step: number;
  onNext: () => void;
  onPrev: () => void;
  onFinish: () => void;
}

export default function TutorialGuideModal({
  isOpen,
  onClose,
  step,
  onNext,
  onPrev,
  onFinish,
}: TutorialGuideModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[100] flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-card border border-border/80 rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-premium-lg relative animate-scaleIn space-y-6">
        {/* Header info */}
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black text-primary uppercase tracking-widest bg-primary/5 px-2.5 py-1 rounded-lg border border-primary/10">
            Paso {step} de 4
          </span>
          <button 
            type="button"
            onClick={onClose}
            className="text-xs text-muted-foreground hover:text-foreground font-bold cursor-pointer"
          >
            Omitir guía
          </button>
        </div>

        {/* Step content */}
        <div className="space-y-4 text-foreground">
          {step === 1 && (
            <div className="space-y-3">
              <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-2">
                <Building2 className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-extrabold text-foreground tracking-tight">¡Bienvenido al Portal de Farmacias de ATFAR!</h3>
              <p className="text-xs text-muted-foreground leading-relaxed font-semibold">
                Esta guía te asistirá en los primeros pasos necesarios para habilitar tu cuenta y comenzar a utilizar el sistema de liquidaciones de aportes obligatorios.
              </p>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-600 mb-2">
                <MapPin className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-extrabold text-foreground tracking-tight">Paso 1: Mi Farmacia y Ubicación</h3>
              <p className="text-xs text-muted-foreground leading-relaxed font-semibold">
                Antes que nada, verificá los datos de tu sucursal en el mapa de ATFAR. Hacé clic en &quot;Ver / Editar Perfil&quot; en el panel principal para completar tu razón social, CUIT y datos de contacto actualizados.
              </p>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-600 mb-2">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-extrabold text-foreground tracking-tight">Paso 2: Nómina de Empleados</h3>
              <p className="text-xs text-muted-foreground leading-relaxed font-semibold">
                Cargá a tus empleados en la nómina activa ingresando su Nombre, CUIL, Categoría Profesional del CCT 659/13 y Fecha de Ingreso.
              </p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Mantener esta lista al día es obligatorio y sirve para calcular de forma transparente el básico de las declaraciones mensuales.
              </p>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-3">
              <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-600 mb-2">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-extrabold text-foreground tracking-tight">Paso 3: Declaraciones y Reportar Pago</h3>
              <p className="text-xs text-muted-foreground leading-relaxed font-semibold">
                Todos los meses debés generar tu Declaración Jurada, descargar la boleta de pago y realizar el depósito o transferencia bancaria.
              </p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Una vez realizado el pago, recordá subir el comprobante de transferencia desde la sección de &quot;Declaraciones y Pagos&quot; para que el sindicato concilie y apruebe tu estado de cuenta.
              </p>
            </div>
          )}
        </div>

        {/* Step indicators */}
        <div className="flex gap-1.5 justify-center py-2">
          {[1, 2, 3, 4].map((s) => (
            <div 
              key={s} 
              className={`h-1.5 rounded-full transition-all duration-300 ${
                s === step ? 'w-8 bg-primary' : 'w-2 bg-slate-200'
              }`}
            />
          ))}
        </div>

        {/* Navigation buttons */}
        <div className="pt-4 border-t border-border flex justify-between items-center">
          <button
            type="button"
            disabled={step === 1}
            onClick={onPrev}
            className="px-4 py-2 rounded-xl border border-border text-xs font-bold text-slate-700 disabled:opacity-30 disabled:pointer-events-none hover:bg-slate-50 cursor-pointer bg-white transition-all"
          >
            Anterior
          </button>

          {step < 4 ? (
            <button
              type="button"
              onClick={onNext}
              className="px-5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold cursor-pointer hover:bg-primary/95 transition-all shadow-premium"
            >
              Siguiente
            </button>
          ) : (
            <button
              type="button"
              onClick={onFinish}
              className="px-6 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold cursor-pointer hover:bg-emerald-700 transition-all shadow-premium"
            >
              ¡Comenzar!
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

