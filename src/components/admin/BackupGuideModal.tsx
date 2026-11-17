'use client';

import React from 'react';
import {
  ShieldCheck,
  HardDriveDownload,
  WifiOff,
  FileSpreadsheet,
  X,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  FolderCheck,
  HelpCircle,
} from 'lucide-react';

interface BackupGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  step: number;
  onNext: () => void;
  onPrev: () => void;
  onFinish: () => void;
}

export default function BackupGuideModal({
  isOpen,
  onClose,
  step,
  onNext,
  onPrev,
  onFinish,
}: BackupGuideModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl relative space-y-6 animate-scaleIn">
        {/* Cabecera del Modal */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-black text-emerald-800 uppercase tracking-widest bg-emerald-50 border border-emerald-200/80 px-3 py-1 rounded-xl">
              Paso {step} de 4
            </span>
            <span className="text-xs text-slate-500 font-bold">Guía de Uso Rápido</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            title="Cerrar guía"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido según el Paso */}
        <div className="space-y-4">
          {step === 1 && (
            <div className="space-y-3">
              <div className="w-14 h-14 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-2xl flex items-center justify-center mb-2 shadow-xs">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                ¿Para qué sirve esta pantalla?
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
                Esta sección es tu <strong className="text-slate-900">caja fuerte de datos</strong>. Te permite guardar una copia completa de todas las farmacias, los empleados y los aportes en tu propia computadora.
              </p>
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 space-y-1.5 text-xs text-slate-700">
                <p className="font-bold text-slate-900 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Seguridad Total:
                </p>
                <p className="text-slate-600">
                  Si alguna vez se corta internet o hay algún inconveniente en la nube, la información de ATFAR no se pierde porque tenés una copia física exacta guardada en tu equipo.
                </p>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <div className="w-14 h-14 bg-emerald-600 text-white rounded-2xl flex items-center justify-center mb-2 shadow-md">
                <HardDriveDownload className="w-7 h-7" />
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                El botón verde: Respaldo en 1 Clic
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
                Para hacer una copia nueva, solo tenés que tocar el botón verde grande que dice <strong className="text-emerald-800">&quot;Sincronizar y Respaldar Ahora&quot;</strong>.
              </p>
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 space-y-2 text-xs text-emerald-950 font-medium">
                <p className="flex items-center gap-2 font-bold text-emerald-900">
                  <FolderCheck className="w-4 h-4 text-emerald-700" />
                  El sistema hace todo solo:
                </p>
                <ul className="space-y-1 list-disc list-inside text-emerald-900/90 text-[11px]">
                  <li>Crea una carpeta llamada <code className="bg-white px-1.5 py-0.5 rounded font-mono font-bold">Backups_ATFAR</code> en tu Windows.</li>
                  <li>Guarda ahí el archivo con la base completa y planillas para Excel.</li>
                  <li>Además te descarga una copia directamente en tu navegador.</li>
                </ul>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <div className="w-14 h-14 bg-amber-50 border border-amber-200 text-amber-700 rounded-2xl flex items-center justify-center mb-2 shadow-xs">
                <WifiOff className="w-7 h-7" />
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                ¿Se cortó internet? Usá el Modo Local
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
                Si un día no hay señal o se cae la conexión en la oficina, tocá el botón amarillo arriba a la derecha: <strong className="text-amber-800">&quot;Modo Local (Offline)&quot;</strong>.
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2 text-xs text-amber-950 font-medium">
                <p className="font-bold text-amber-900">
                  ¡Podés seguir atendiendo normalmente!
                </p>
                <p className="text-amber-900/90 leading-relaxed text-[11px]">
                  Buscás cualquier farmacia por CUIT o nombre, mirás cuántos empleados tiene declarados, qué meses pagó y cuáles debe, sin necesidad de tener internet.
                </p>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-3">
              <div className="w-14 h-14 bg-blue-50 border border-blue-200 text-blue-700 rounded-2xl flex items-center justify-center mb-2 shadow-xs">
                <FileSpreadsheet className="w-7 h-7" />
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Abrir la información en Microsoft Excel
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
                Haciendo clic en la pestaña <strong className="text-slate-900">&quot;Descargar Archivos para Excel&quot;</strong> vas a encontrar botones individuales para bajarte las planillas:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
                  <span className="font-bold text-slate-900 block">📊 Farmacias (.CSV)</span>
                  <span className="text-[11px] text-slate-500">Listado con CUIT, domicilios y deudas.</span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
                  <span className="font-bold text-slate-900 block">👥 Empleados (.CSV)</span>
                  <span className="text-[11px] text-slate-500">Nómina, categorías y afiliados.</span>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 font-semibold italic text-center pt-1">
                Los archivos vienen preparados para hacer doble clic y que se abran en tu Excel de siempre.
              </p>
            </div>
          )}
        </div>

        {/* Indicadores de Pasos (Puntitos) */}
        <div className="flex gap-2 justify-center py-1">
          {[1, 2, 3, 4].map((i) => (
            <span
              key={i}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === step ? 'w-8 bg-emerald-600' : 'w-2 bg-slate-200'
              }`}
            />
          ))}
        </div>

        {/* Botones de Navegación del Modal */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          {step > 1 ? (
            <button
              type="button"
              onClick={onPrev}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Anterior</span>
            </button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <button
              type="button"
              onClick={onNext}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase tracking-wider transition-all shadow-sm cursor-pointer"
            >
              <span>Siguiente</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onFinish}
              className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold uppercase tracking-wider transition-all shadow-md cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>¡Entendido! Comenzar</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

