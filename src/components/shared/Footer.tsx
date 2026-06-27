'use client';

import Link from 'next/link';
import { Phone, Mail, MapPin, Clock, ShieldCheck, Heart, Globe, ArrowUpRight } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer id="contacto" className="bg-slate-950 text-slate-400 border-t border-slate-900 pt-16 pb-8 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          {/* Column 1: Sindicato Info & Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <img 
                src="/images/logo.jpg" 
                alt="Logo ATFAR" 
                className="h-9 w-auto object-contain rounded-md bg-white p-0.5 border border-slate-800"
              />
              <span className="text-md font-extrabold tracking-wider text-white uppercase block leading-none">
                ATFAR
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed font-medium">
              Asociación Trabajadores de Farmacia Rosario. Desde 1927 representando, defendiendo y acompañando a los trabajadores en la actividad farmacéutica.
            </p>
            <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-500 font-semibold">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <span>Personería Gremial N° 379</span>
            </div>
          </div>

          {/* Column 2: Navigation Links */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-white mb-4">Enlaces Útiles</h4>
            <ul className="space-y-2.5 text-xs font-semibold">
              <li>
                <Link href="/" className="hover:text-white transition-colors block">Inicio</Link>
              </li>
              <li>
                <Link href="/institucional" className="hover:text-white transition-colors block">Quiénes Somos</Link>
              </li>
              <li>
                <Link href="/escalas" className="hover:text-white transition-colors block">Escalas Salariales</Link>
              </li>
              <li>
                <Link href="/noticias" className="hover:text-white transition-colors block">Novedades y Gremio</Link>
              </li>
              <li>
                <a 
                  href="https://fatfa.org.ar" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="hover:text-white transition-colors flex items-center gap-1"
                >
                  <span>FATFA Nacional</span>
                  <ArrowUpRight className="w-3 h-3 text-slate-600" />
                </a>
              </li>
              <li>
                <a 
                  href="https://www.ospf.org.ar" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="hover:text-white transition-colors flex items-center gap-1"
                >
                  <span>Obra Social OSPF</span>
                  <ArrowUpRight className="w-3 h-3 text-slate-600" />
                </a>
              </li>
            </ul>
          </div>

          {/* Column 3: Contact details */}
          <div className="space-y-3.5 text-xs font-semibold">
            <h4 className="text-xs font-bold uppercase tracking-widest text-white mb-4">Contacto Directo</h4>
            <div className="flex items-start gap-2.5">
              <Phone className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
              <div>
                <a href="tel:03414247814" className="hover:text-white block text-slate-300">0341 424-7814</a>
                <span className="text-[10px] text-slate-600 block">Lunes a Viernes</span>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <Mail className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
              <a href="mailto:contacto@atfar.org.ar" className="hover:text-white truncate block text-slate-300">
                contacto@atfar.org.ar
              </a>
            </div>
            <div className="flex items-start gap-2.5">
              <MapPin className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
              <div>
                <span className="block text-slate-300">Corrientes 1572</span>
                <span className="text-[10px] block text-slate-600">S2000 Rosario, Santa Fe</span>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <Clock className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
              <span className="text-[11px] text-slate-500 font-medium">Atención: 08:00 a 16:00 hs</span>
            </div>
          </div>

          {/* Column 4: Map Preview */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-widest text-white mb-4">Sede Central</h4>
            <div className="w-full h-36 rounded-lg overflow-hidden border border-slate-900 bg-slate-900 relative group">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3348.0494396009804!2d-60.6559384235286!3d-32.94970497184285!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x95b7ab3dcd481079%3A0xcf9530460c38865c!2sCorrientes%201572%2C%20S2000AHD%20Rosario%2C%20Santa%20Fe!5e0!3m2!1ses!2sar!4v1700000000000!5m2!1ses!2sar"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen={false}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Sede ATFAR Rosario"
                className="absolute inset-0 grayscale contrast-125 opacity-70 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-300"
              />
            </div>
          </div>
        </div>

        {/* Lower block */}
        <div className="border-t border-slate-900 pt-8 mt-12 flex flex-col md:flex-row items-center justify-between gap-4 text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
          <p>© {currentYear} ATFAR Rosario. Todos los derechos reservados.</p>
          <div className="flex items-center gap-1.5 normal-case font-normal text-slate-500">
            <span>Desarrollado con</span>
            <Heart className="w-3.5 h-3.5 text-red-600 fill-current animate-pulse" />
            <span>para la comunidad de trabajadores de farmacia</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
