'use client';

import { X, Trophy, Bike, Gift, Phone, Sparkles, CheckCircle2, HeartHandshake } from 'lucide-react';

export interface GanadoraSorteo {
  puesto: number;
  premio: string;
  nombre: string;
  telefonoProtegido: string;
  destacado?: boolean;
}

export const GANADORAS_OFICIALES: GanadoraSorteo[] = [
  {
    puesto: 1,
    premio: 'Bicicleta',
    nombre: 'Mónica Montero',
    telefonoProtegido: '341 •••• 6940',
    destacado: true,
  },
  {
    puesto: 2,
    premio: 'Premio a coordinar',
    nombre: 'Debora Micaela Horvath',
    telefonoProtegido: '341 •••• 5904',
  },
  {
    puesto: 3,
    premio: 'Premio a coordinar',
    nombre: 'Mariela Belletich',
    telefonoProtegido: '341 •••• 5532',
  },
  {
    puesto: 4,
    premio: 'Premio a coordinar',
    nombre: 'Brenda Antonella Ledesma',
    telefonoProtegido: '3462 •••• 8041',
  },
  {
    puesto: 5,
    premio: 'Premio a coordinar',
    nombre: 'Vanina Andrea Gallardo',
    telefonoProtegido: '341 •••• 8289',
  },
  {
    puesto: 6,
    premio: 'Premio a coordinar',
    nombre: 'Alicia Menconi',
    telefonoProtegido: '3462 •••• 5165',
  },
  {
    puesto: 7,
    premio: 'Premio a coordinar',
    nombre: 'Barbara Belén Castillo',
    telefonoProtegido: '3462 •••• 7230',
  },
  {
    puesto: 8,
    premio: 'Premio a coordinar',
    nombre: 'Nanci Colman',
    telefonoProtegido: '341 •••• 5890',
  },
];

interface GanadorasSorteoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function GanadorasSorteoModal({ isOpen, onClose }: GanadorasSorteoModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-card border border-border rounded-3xl shadow-2xl overflow-hidden my-6 animate-fadeIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Botón de cierre */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2.5 rounded-full bg-slate-900/60 hover:bg-slate-900 text-white backdrop-blur-md transition-all shadow-md"
          title="Cerrar ventana"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Cabecera institucional festiva */}
        <div className="relative bg-gradient-to-br from-emerald-800 via-[#0d5c3e] to-teal-900 text-white p-6 sm:p-8 text-center overflow-hidden">
          {/* Destellos de fondo */}
          <div className="absolute -top-12 -left-12 w-40 h-40 bg-emerald-400/20 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-amber-400/20 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 space-y-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/15 border border-white/20 text-white text-[11px] font-bold uppercase tracking-wider shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Sorteo Día de la Madre • ATFAR</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-serif text-white">
              ¡Felicitaciones a las Ganadoras!
            </h2>

            <p className="text-xs sm:text-sm text-emerald-100/90 max-w-lg mx-auto leading-relaxed">
              Gracias a todas las compañeras de farmacia que participaron con su afiliación.
              Compartimos la nómina oficial del sorteo.
            </p>
          </div>
        </div>

        {/* Contenido del listado */}
        <div className="p-5 sm:p-7 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* 1º Premio Destacado */}
          <div className="relative rounded-2xl bg-gradient-to-r from-emerald-950 via-[#064e3b] to-emerald-950 border-2 border-amber-400 p-4 sm:p-5 shadow-lg text-white">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
              <div className="flex items-center gap-3.5">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 flex items-center justify-center shadow-md flex-shrink-0 border-2 border-amber-300">
                  <Trophy className="w-7 h-7 text-slate-950" />
                </div>
                <div>
                  <div className="flex items-center gap-2 justify-center sm:justify-start">
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-[10px] uppercase tracking-wider shadow-sm">
                      1º Premio
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs font-extrabold text-amber-300">
                      <Bike className="w-4 h-4" /> Bicicleta
                    </span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-white mt-1 tracking-wide font-serif drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] [text-shadow:_0_0_2px_#000000,_0_2px_4px_rgba(0,0,0,0.9)]">
                    Mónica Montero
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/40 border border-white/20 shadow-xs text-xs font-mono font-bold text-amber-200">
                <Phone className="w-3.5 h-3.5 text-amber-400" />
                <span>341 •••• 6940</span>
              </div>
            </div>
          </div>

          {/* Premios 2º al 8º */}
          <div>
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Premios 2º al 8º
              </span>
              <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                Premios sorpresa para afiliadas
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {GANADORAS_OFICIALES.slice(1).map((g) => (
                <div
                  key={g.puesto}
                  className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-border hover:border-emerald-500/40 transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-700/10 text-emerald-700 dark:text-emerald-400 dark:bg-emerald-500/20 font-black text-xs flex items-center justify-center flex-shrink-0">
                      {g.puesto}º
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs sm:text-sm font-bold text-[#0f172a] dark:text-white truncate">
                        {g.nombre}
                      </h4>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Gift className="w-3 h-3 text-amber-500" /> Premio a comunicar
                      </span>
                    </div>
                  </div>

                  <div className="text-[11px] font-mono font-semibold text-muted-foreground whitespace-nowrap pl-1">
                    {g.telefonoProtegido}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Mensaje de contacto destacado */}
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-3 text-emerald-900 dark:text-emerald-200">
            <HeartHandshake className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs sm:text-sm">
              <p className="font-bold">
                Pronto se estarán comunicando con ustedes
              </p>
              <p className="text-xs text-emerald-800/80 dark:text-emerald-300/80 leading-relaxed">
                Desde la comisión directiva del sindicato nos pondremos en contacto telefónico con cada una de las ganadoras para coordinar el retiro y la entrega de los premios. ¡Muchas gracias por participar!
              </p>
            </div>
          </div>
        </div>

        {/* Pie con botón de cierre */}
        <div className="bg-slate-50 dark:bg-slate-900/60 border-t border-border px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Sorteo oficial realizado entre afiliadas</span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-secondary transition-all shadow-sm"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

