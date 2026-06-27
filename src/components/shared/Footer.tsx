'use client';

import Link from 'next/link';
import { Phone, Mail, MapPin, Clock, ShieldCheck, Heart } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer id="contacto" className="bg-primary text-primary-foreground border-t border-border pt-16 pb-8 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          {/* Sindicato Info */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-secondary">ATFAR</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Asociación Trabajadores de Farmacia Rosario. Desde 1927 representando, defendiendo y acompañando a los trabajadores en la actividad farmacéutica.
            </p>
            <div className="flex items-center gap-2 pt-2 text-xs text-muted-foreground">
              <ShieldCheck className="w-4 h-4 text-secondary" />
              <span>Personería Gremial N° 379</span>
            </div>
          </div>

          {/* Quick Enlaces */}
          <div>
            <h4 className="text-md font-semibold mb-4 text-foreground">Enlaces Útiles</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/" className="hover:text-secondary transition-colors">Inicio</Link>
              </li>
              <li>
                <Link href="/escalas" className="hover:text-secondary transition-colors">Escalas Salariales</Link>
              </li>
              <li>
                <Link href="/bolsa" className="hover:text-secondary transition-colors">Bolsa de Trabajo (CV)</Link>
              </li>
              <li>
                <Link href="/utiles" className="hover:text-secondary transition-colors">Útiles Escolares</Link>
              </li>
              <li>
                <a href="https://fatfa.org.ar" target="_blank" rel="noopener noreferrer" className="hover:text-secondary transition-colors">
                  FATFA Nacional
                </a>
              </li>
              <li>
                <a href="https://www.ospf.org.ar" target="_blank" rel="noopener noreferrer" className="hover:text-secondary transition-colors">
                  Obra Social OSPF
                </a>
              </li>
            </ul>
          </div>

          {/* Contact Details */}
          <div className="space-y-3">
            <h4 className="text-md font-semibold mb-4 text-foreground">Contacto</h4>
            <div className="flex items-start gap-2.5 text-sm text-muted-foreground">
              <Phone className="w-4.5 h-4.5 text-secondary flex-shrink-0 mt-0.5" />
              <div>
                <a href="tel:03414247814" className="hover:text-secondary block">0341 424-7814</a>
                <span className="text-xs text-muted-foreground/75 block">Lunes a Viernes</span>
              </div>
            </div>
            <div className="flex items-start gap-2.5 text-sm text-muted-foreground">
              <Mail className="w-4.5 h-4.5 text-secondary flex-shrink-0 mt-0.5" />
              <a href="mailto:contacto@atfar.org.ar" className="hover:text-secondary truncate block">
                contacto@atfar.org.ar
              </a>
            </div>
            <div className="flex items-start gap-2.5 text-sm text-muted-foreground">
              <MapPin className="w-4.5 h-4.5 text-secondary flex-shrink-0 mt-0.5" />
              <div>
                <span className="block">Corrientes 1572</span>
                <span className="text-xs block text-muted-foreground/75">S2000 Rosario, Santa Fe</span>
              </div>
            </div>
            <div className="flex items-start gap-2.5 text-sm text-muted-foreground">
              <Clock className="w-4.5 h-4.5 text-secondary flex-shrink-0 mt-0.5" />
              <span className="text-xs">Atención al público: 08:00 a 16:00 hs</span>
            </div>
          </div>

          {/* Ubicacion Map Iframe */}
          <div className="w-full h-48 rounded-xl overflow-hidden border border-border bg-muted shadow-inner relative group">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3348.0494396009804!2d-60.6559384235286!3d-32.94970497184285!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x95b7ab3dcd481079%3A0xcf9530460c38865c!2sCorrientes%201572%2C%20S2000AHD%20Rosario%2C%20Santa%20Fe!5e0!3m2!1ses!2sar!4v1700000000000!5m2!1ses!2sar"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen={false}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Sede ATFAR Rosario"
              className="absolute inset-0 grayscale contrast-125 opacity-80 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-300"
            />
          </div>
        </div>

        {/* Lower Footer */}
        <div className="border-t border-border/40 pt-8 mt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>© {currentYear} ATFAR Rosario. Todos los derechos reservados.</p>
          <div className="flex items-center gap-1.5">
            <span>Desarrollado con</span>
            <Heart className="w-3.5 h-3.5 text-red-500 fill-current animate-pulse" />
            <span>para los trabajadores de farmacia</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
