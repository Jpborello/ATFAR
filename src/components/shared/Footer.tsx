/* eslint-disable @next/next/no-img-element */
'use client';

import Link from 'next/link';
import { Phone, Mail, MapPin, Clock, ShieldCheck, ArrowUpRight } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer id="contacto" className="bg-emerald-50/70 backdrop-blur-xl text-slate-700 border-t border-emerald-500/20 pt-16 pb-8 transition-colors relative overflow-hidden">
      {/* Subtle green ambient glow background */}
      <div className="absolute -top-24 -left-20 w-80 h-80 bg-emerald-300/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          {/* Column 1: Sindicato Info & Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <img 
                src="/images/logo.jpg" 
                alt="Logo ATFAR" 
                className="h-14 w-auto object-contain rounded-xl bg-white p-1.5 border border-emerald-200 shadow-md"
              />
              <div>
                <span className="text-md font-extrabold tracking-wider text-emerald-950 uppercase block leading-none">
                  ATFAR
                </span>
                <span className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider block mt-1">
                  Rosario
                </span>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed font-semibold">
              Asociación Trabajadores de Farmacia Rosario. Desde 1927 representando, defendiendo y acompañando a los trabajadores en la actividad farmacéutica.
            </p>
            <div className="flex items-center gap-2 pt-1 text-[11px] text-emerald-800 font-extrabold">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Personería Gremial N° 379</span>
            </div>
          </div>

          {/* Column 2: Navigation Links */}
          <div>
            <h4 className="text-xs font-extrabold uppercase tracking-widest text-emerald-950 mb-4">Enlaces Útiles</h4>
            <ul className="space-y-2.5 text-xs font-semibold">
              <li>
                <Link href="/" className="hover:text-emerald-700 text-slate-700 transition-colors block">Inicio</Link>
              </li>
              <li>
                <Link href="/institucional" className="hover:text-emerald-700 text-slate-700 transition-colors block">Quiénes Somos</Link>
              </li>
              <li>
                <Link href="/escalas" className="hover:text-emerald-700 text-slate-700 transition-colors block">Escalas Salariales</Link>
              </li>
              <li>
                <Link href="/noticias" className="hover:text-emerald-700 text-slate-700 transition-colors block">Novedades y Gremio</Link>
              </li>
              <li>
                <a 
                  href="https://fatfa.org.ar" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="hover:text-emerald-700 text-slate-700 transition-colors flex items-center gap-1"
                >
                  <span>FATFA Nacional</span>
                  <ArrowUpRight className="w-3 h-3 text-slate-400" />
                </a>
              </li>
              <li>
                <a 
                  href="https://www.ospf.org.ar" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="hover:text-emerald-700 text-slate-700 transition-colors flex items-center gap-1"
                >
                  <span>Obra Social OSPF</span>
                  <ArrowUpRight className="w-3 h-3 text-slate-400" />
                </a>
              </li>
            </ul>
          </div>

          {/* Column 3: Contact details */}
          <div className="space-y-3.5 text-xs font-semibold">
            <h4 className="text-xs font-extrabold uppercase tracking-widest text-emerald-950 mb-4">Contacto Directo</h4>
            <div className="flex items-start gap-2.5">
              <Phone className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <a href="tel:03414247814" className="hover:text-emerald-700 block text-slate-800">0341 424-7814</a>
                <span className="text-[10px] text-slate-500 block">Lunes a Viernes</span>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <Mail className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <a href="mailto:contacto@atfar.org.ar" className="hover:text-emerald-700 truncate block text-slate-800">
                contacto@atfar.org.ar
              </a>
            </div>
            <div className="flex items-start gap-2.5">
              <MapPin className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <span className="block text-slate-800">Corrientes 1572</span>
                <span className="text-[10px] block text-slate-500">S2000 Rosario, Santa Fe</span>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <Clock className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span className="text-[11px] text-slate-500 font-bold">Atención: 08:00 a 16:00 hs</span>
            </div>
          </div>

          {/* Column 4: Map Preview */}
          <div className="space-y-4">
            <h4 className="text-xs font-extrabold uppercase tracking-widest text-emerald-950 mb-4">Sede Central</h4>
            <div className="w-full h-36 rounded-2xl overflow-hidden border border-emerald-200/80 bg-emerald-100/50 relative group shadow-sm">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3348.0494396009804!2d-60.6559384235286!3d-32.94970497184285!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x95b7ab3dcd481079%3A0xcf9530460c38865c!2sCorrientes%201572%2C%20S2000AHD%20Rosario%2C%20Santa%20Fe!5e0!3m2!1ses!2sar!4v1700000000000!5m2!1ses!2sar"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen={false}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Sede ATFAR Rosario"
                className="absolute inset-0 opacity-80 group-hover:opacity-100 transition-all duration-300"
              />
            </div>
          </div>
        </div>

        {/* Lower block */}
        <div className="border-t border-emerald-200/80 pt-8 mt-12 flex flex-col md:flex-row items-center justify-between gap-4 text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">
          <p>© {currentYear} ATFAR Rosario. Todos los derechos reservados.</p>
          <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3 normal-case font-semibold text-slate-500 text-right">
            <span>
              Soporte técnico del portal — <span className="font-extrabold text-emerald-950">neo core sys</span>
            </span>
            <span className="hidden sm:inline text-emerald-300">|</span>
            <a href="mailto:neocoresystem@gmail.com" className="hover:text-emerald-700 transition-colors font-bold">
              neocoresystem@gmail.com
            </a>
            <span className="hidden sm:inline text-emerald-300">|</span>
            <a href="tel:+543417981212" className="hover:text-emerald-700 transition-colors font-bold">
              Tel: +54 341 798-1212
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
