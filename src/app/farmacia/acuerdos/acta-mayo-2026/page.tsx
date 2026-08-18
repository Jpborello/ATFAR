'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Download, 
  Loader2, 
  ShieldCheck, 
  Info,
  ChevronRight,
  BookOpen
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function ActaAcuerdoMayoPage() {
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<string>('intro');

  useEffect(() => {
    const checkAccess = async () => {
      const isConfigured = 
        process.env.NEXT_PUBLIC_SUPABASE_URL !== 'your_supabase_project_url_here' && 
        !!process.env.NEXT_PUBLIC_SUPABASE_URL;

      if (!isConfigured) {
        setLoading(false);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        window.location.href = '/login';
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (profile?.role !== 'pharmacy_owner' && profile?.role !== 'admin') {
        window.location.href = '/login';
        return;
      }

      setLoading(false);
    };

    checkAccess();
  }, []);

  const sections = [
    { id: 'intro', label: 'Introducción' },
    { id: 'primera', label: 'Cláusula Primera (Sueldos)' },
    { id: 'segunda', label: 'Cláusula Segunda (Vigencia)' },
    { id: 'tercera', label: 'Cláusula Tercera (Zona Fría)' },
    { id: 'cuarta', label: 'Cláusula Cuarta (Compensación)' },
    { id: 'quinta', label: 'Cláusula Quinta (Cuota Sindical)' },
    { id: 'sexta', label: 'Cláusula Sexta (Anexo I)' },
    { id: 'septima', label: 'Cláusula Séptima (Reunión Julio)' },
    { id: 'octava', label: 'Cláusula Octava (Interpretación)' }
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Cargando Documento Protegido...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc] text-[#1e293b] font-sans">
      {/* Top Header */}
      <header className="bg-card border-b border-border/80 py-4 px-6 flex items-center justify-between shadow-premium sticky top-0 z-50 glass">
        <div className="flex items-center gap-3">
          <Link 
            href="/farmacia"
            className="p-2 rounded-xl border border-border text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all bg-white"
            title="Volver al Portal"
          >
            <ArrowLeft className="w-4.5 h-4.5" />
          </Link>
          <div>
            <span className="text-xs font-black uppercase tracking-wider text-primary block leading-none">ATFAR</span>
            <span className="text-[9px] text-muted-foreground block font-bold">Portal de Farmacias / Circulares Privadas</span>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-600 px-3.5 py-1.5 rounded-full text-[10px] font-bold shadow-sm">
          <ShieldCheck className="w-4 h-4" />
          <span>Acceso Responsable Farmacia</span>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-grow max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col lg:flex-row gap-8">
        
        {/* Navigation Sidebar (Left) */}
        <aside className="lg:w-80 flex-shrink-0 space-y-6">
          <div className="bg-card border border-border rounded-3xl p-5 shadow-premium glass sticky top-24">
            <h3 className="text-xs font-black text-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
              <BookOpen className="w-4.5 h-4.5 text-secondary" />
              Índice del Acta
            </h3>
            <nav className="space-y-1">
              {sections.map((sec) => (
                <button
                  key={sec.id}
                  onClick={() => {
                    setActiveSection(sec.id);
                    document.getElementById(sec.id)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                    activeSection === sec.id 
                      ? 'bg-primary text-white shadow-premium' 
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
                  }`}
                >
                  <span>{sec.label}</span>
                  <ChevronRight className="w-3.5 h-3.5 opacity-80" />
                </button>
              ))}
            </nav>
            
            {/* PDF Downloader button inside sidebar */}
            <div className="pt-5 mt-5 border-t border-border/80">
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  // Sin archivo homologado subido: usamos el diálogo de impresión
                  // del navegador ("Guardar como PDF") sobre el contenido del acta.
                  window.print();
                }}
                className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl bg-slate-800 text-white text-xs font-black uppercase tracking-wider hover:bg-slate-700 transition-all shadow-premium"
              >
                <Download className="w-4.5 h-4.5" />
                <span>Descargar PDF</span>
              </a>
            </div>
          </div>
        </aside>

        {/* Document Content View (Right) */}
        <main className="flex-grow space-y-6 max-w-4xl">
          <div className="bg-white border border-border rounded-3xl p-6 sm:p-10 shadow-premium relative overflow-hidden">
            {/* Official Letterhead Background */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full pointer-events-none" />

            <div className="space-y-8">
              {/* Document Header */}
              <div className="text-center pb-8 border-b border-border/80 space-y-3">
                <span className="text-[10px] font-bold text-secondary uppercase tracking-widest block">Documento Oficial Paritario</span>
                <h1 className="text-2xl font-black text-[#0f172a] sm:text-3xl tracking-tight">
                  ACTA ACUERDO MAYO 2026
                </h1>
                <p className="text-xs font-bold text-primary uppercase tracking-wide">
                  Comisión Paritaria del CCT 659/13
                </p>
              </div>

              {/* INTRO */}
              <section id="intro" className="space-y-4 pt-4">
                <h2 className="text-xs font-black text-secondary uppercase tracking-widest border-b border-border pb-1">
                  Introducción y Partes Firmantes
                </h2>
                <div className="text-xs leading-relaxed text-slate-600 font-medium space-y-4 text-justify">
                  <p>
                    Entre la <strong>FEDERACIÓN ARGENTINA DE TRABAJADORES DE FARMACIA (F.A.T.F.A.)</strong> con personería gremial N°181, con domicilio en Constitución 2066 de la Ciudad Autónoma de Buenos Aires, representada en este acto por su Secretario General, Sergio Fabián HADDAD DNI N°14.623.496, Secretario General Adjunto, José LOPEZ DNI N°17.137.767 y Tesorero, Miguel Angel CASTRO DNI N°12.445.376, todos miembros Paritarios Titulares, oportunamente informados al Ministerio de Trabajo, Empleo y Seguridad Social de la Nación, en representación de los Trabajadores; y la <strong>CONFEDERACIÓN FARMACEUTICA ARGENTINA (CO.FA)</strong>, con domicilio en la calle Julio Argentino Roca N°751, piso 2, de la Ciudad Autónoma de Buenos Aires, representada por sus miembros Paritarios Titulares, Jorge BORDON DNI N°17.123.292, Eduardo Jaime MOLINA DNI N°13.160.649 y Roberto Jorge ZGAIB DNI N°21.108.671, en representación de los Empleadores.
                  </p>
                  <p>
                    <strong>ESQUEMA DE COOPERACION:</strong> La negociación se desarrolla conforme a las capacidades representativas de las partes, en el ámbito personal y territorial del Convenio Colectivo de Trabajo 659/13 y sus precedentes, el que es expresamente ratificado y prorrogado por ambas partes en todas sus cláusulas normativas y obligacionales, manteniendo su plena vigencia. Que además de lo descripto, y según lo acordado en el artículo 5 del citado C.C.T. 659/13, con la finalidad de mantener la Paz Social y con la intención de conservar la armonía alcanzada en las actuales relaciones entre la Federación Argentina de Trabajadores de Farmacias y los Empleadores representantes del Sector de la dispensación de medicamentos y anexos, LAS PARTES, han alcanzado el siguiente acuerdo de recomposición salarial en un marco de conciencia y seriedad, analizando cada una de las pautas recientemente expresadas.
                  </p>
                </div>
              </section>

              {/* PRIMERA */}
              <section id="primera" className="space-y-3 pt-2">
                <h2 className="text-xs font-black text-secondary uppercase tracking-widest border-b border-border pb-1">
                  Cláusula Primera - Recomposición y Sumas No Remunerativas
                </h2>
                <div className="text-xs leading-relaxed text-slate-600 font-medium text-justify">
                  <p>
                    <strong>PRIMERA:</strong> Establecer una recomposición salarial para todos los trabajadores/as de farmacias establecidos en el C.C.T. 659/13, mediante sumas de carácter no remunerativo durante los meses de Mayo y Junio de 2026, y se acordaron nuevos básicos para el mes de mayo y para el mes de julio de 2026, según se detalla en el &ldquo;Anexo I&rdquo; que forma parte integral de la presente acuerdo. Ello comprende a todas las categorías incluidas en el convenio colectivo de trabajo, respetando la diferencia porcentual entre las mismas según lo determinado por el art. 14° del citado C.C.T.
                  </p>
                </div>
              </section>

              {/* SEGUNDA */}
              <section id="segunda" className="space-y-3 pt-2">
                <h2 className="text-xs font-black text-secondary uppercase tracking-widest border-b border-border pb-1">
                  Cláusula Segunda - Vigencia e Ingreso por TAD
                </h2>
                <div className="text-xs leading-relaxed text-slate-600 font-medium text-justify">
                  <p>
                    <strong>SEGUNDA:</strong> La presente Acta Acuerdo, entrará en vigencia desde el momento del consentimiento de LAS PARTES, independientemente de su homologación, o con el correspondiente número de expediente que le otorgue la Secretaría de Trabajo Empleo y Seguridad Social de la Nación, al momento de su ingreso al citado organismo vía TAD, con el objetivo de no perjudicar los derechos de los trabajadores, las partes establecen expresamente que el pago de la recomposición salarial establecida sea de cumplimiento inmediato, toda vez que se trata de los ingresos destinados a la subsistencia con naturaleza alimentaria y protección constitucional.
                  </p>
                </div>
              </section>

              {/* TERCERA */}
              <section id="tercera" className="space-y-3 pt-2">
                <h2 className="text-xs font-black text-secondary uppercase tracking-widest border-b border-border pb-1">
                  Cláusula Tercera - Adicional por Zona Fría (Art. 21)
                </h2>
                <div className="text-xs leading-relaxed text-slate-600 font-medium space-y-3 text-justify">
                  <p>
                    <strong>TERCERA:</strong> Luego de un pormenorizado análisis, las partes disponen que durante los períodos detallados en el &ldquo;Anexo I&rdquo;, el adicional que perciben los trabajadores por servicios en zona fría establecido en el art. 21 del convenio colectivo, tendrá carácter <strong>no remunerativo</strong>. Dicha decisión fue arribada luego de un extenso estudio, debate de opiniones y análisis pormenorizado al respecto, es por ello, que ambas PARTES han reconsiderado el concepto a abonar del adicional antes mencionado, para el periodo que abarca el presente Acta Acuerdo, bajo la condición antes descripta.
                  </p>
                  <p>
                    Esta modificación temporal al citado adicional, surge de la consideración que se encuentra debidamente justificada en la presente cláusula, en virtud de la necesidad de tratar de compensar el incremento del costo de vida en determinadas áreas geográficas. Esta alternativa transitoria, facilitaría el cumplimiento de las obligaciones mensuales de cada oficina de farmacia, sin incurrir en cargas económicas desproporcionadas que afecten la viabilidad operativa de las entidades empleadoras, que como todos conocemos, no son formadoras de precio y no cuentan con precios diferenciados por la zona en que desarrollan sus actividades.
                  </p>
                  <p>
                    Es por ello, que dicha modificación del carácter del adicional a &ldquo;no remunerativo&rdquo; otorgaría a las oficinas de farmacias la posibilidad para mejorar la gestión de sus costos laborales de manera eficiente y también le permite al trabajador/a por el tiempo que abarca este acuerdo, obtener una remuneración de bolsillo sustancialmente mayor. Consideramos que este enfoque permitiría mantener un equilibrio entre la necesidad de compensar adecuadamente a los trabajadores en zonas desfavorables y la sostenibilidad financiera de los empleadores de las oficinas de farmacias de dicha zona. Se deja establecido que, sin perjuicio del carácter no remunerativo establecido para los servicios en zona fría, el adicional deberá ser tenido en cuenta para el cálculo de SAC, también con carácter no remunerativo, liquidándose en el recibo de haberes en un ítem separado bajo el concepto <strong>&ldquo;SAC No Rem art. 21 CCT 659/13&rdquo;</strong>. El presente adicional también se computará asimismo para el cálculo de vacaciones y horas suplementarias.
                  </p>
                </div>
              </section>

              {/* CUARTA */}
              <section id="cuarta" className="space-y-3 pt-2">
                <h2 className="text-xs font-black text-secondary uppercase tracking-widest border-b border-border pb-1">
                  Cláusula Cuarta - Compensación Extraordinaria ($20.000)
                </h2>
                <div className="text-xs leading-relaxed text-slate-600 font-medium text-justify">
                  <p>
                    <strong>CUARTA:</strong> Las partes ratifican la plena vigencia de la cláusula cuarta del acuerdo del año 2014/2015 (expediente N° 1.661.010/15, homologado por Resolución N° 395/15 MTEySS), en donde se acordó continuar con la <strong>compensación extraordinaria mensual que estará a cargo del Empleador y será de pesos veinte mil $ 20.000-</strong> por cada Trabajador que integre la nómina del personal activo de cada farmacia, y para los Empleadores que se encuentren dentro de la denominada <u>&ldquo;servicios en zonas frías&rdquo;</u>, según el ámbito de actuación determinado en el Artículo 21 del C.C.T. 659/13 (es decir, únicamente, para las provincias de Río Negro, Neuquén, Chubut, Santa Cruz, Tierra del Fuego e Islas del Atlántico Sur) se acuerda el mismo importe por la referida compensación por cada Trabajador que integre la nómina del personal.
                  </p>
                  <p className="mt-3">
                    Dicho importe deberá ser abonado por el empleador a partir del mes de Mayo de 2026, y será cancelado mensualmente por cualquiera de los medios de pagos electrónicos con que cuenta F.A.T.F.A., accediendo a estas por medio de la página web <a href="https://www.fatfa.org.ar" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">www.fatfa.org.ar</a>. Dicha compensación extraordinaria será destinada al Desarrollo de la Acción Social de la Federación Argentina de Trabajadores de Farmacia F.A.T.F.A y principalmente al mantenimiento del nivel Médico Prestacional de la Obra Social del Personal de Farmacia para afrontar la grave situación sanitaria y financiera.
                  </p>
                </div>
              </section>

              {/* QUINTA */}
              <section id="quinta" className="space-y-3 pt-2">
                <h2 className="text-xs font-black text-secondary uppercase tracking-widest border-b border-border pb-1">
                  Cláusula Quinta - Aportes y Cuota Sindical
                </h2>
                <div className="text-xs leading-relaxed text-slate-600 font-medium text-justify">
                  <p>
                    <strong>QUINTA:</strong> Sobre todas las sumas no remunerativas establecidas en el presente acuerdo que se abonen a los trabajadores, los empleadores deberán devengar sobre las mismas el mismo porcentaje que tiene establecido cada sindicato en su ámbito de aplicación para el pago de su cuota sindical, e integrarlo a dicha entidad conforme lo dispuesto en el art. 50 inciso a) del CCT 659/13.
                  </p>
                </div>
              </section>

              {/* SEXTA */}
              <section id="sexta" className="space-y-3 pt-2">
                <h2 className="text-xs font-black text-secondary uppercase tracking-widest border-b border-border pb-1">
                  Cláusula Sexta - Anexo I (Nuevos Básicos)
                </h2>
                <div className="text-xs leading-relaxed text-slate-600 font-medium text-justify">
                  <p>
                    <strong>SEXTA:</strong> Complementa la presente acta acuerdo el &ldquo;Anexo I&rdquo;, que refleja los nuevos valores de los salarios básicos convencionales para todas las categorías a partir del mes de mayo y julio de 2026, como así también las sumas no remunerativas correspondientes a los meses de mayo y junio de 2026.
                  </p>
                </div>
              </section>

              {/* SEPTIMA */}
              <section id="septima" className="space-y-3 pt-2">
                <h2 className="text-xs font-black text-secondary uppercase tracking-widest border-b border-border pb-1">
                  Cláusula Séptima - Revisión Paritaria en Julio
                </h2>
                <div className="text-xs leading-relaxed text-slate-600 font-medium text-justify">
                  <p>
                    <strong>SÉPTIMA:</strong> Dentro del marco del artículo 5 del presente convenio colectivo de trabajo, y de la situación actual del país, LAS PARTES se comprometen a reunirse en el mes de Julio de 2026 para analizar la situación salarial de los trabajadores del sector, el contexto económico-inflacionario de nuestro país y tratar una nueva recomposición salarial para el período que LAS PARTES así lo determinen, según lo establece el artículo 53 del C.C.T. 659/13.
                  </p>
                </div>
              </section>

              {/* OCTAVA */}
              <section id="octava" className="space-y-3 pt-2">
                <h2 className="text-xs font-black text-secondary uppercase tracking-widest border-b border-border pb-1">
                  Cláusula Octava - Comisión Paritaria de Interpretación
                </h2>
                <div className="text-xs leading-relaxed text-slate-600 font-medium text-justify space-y-3">
                  <p>
                    <strong>OCTAVA:</strong> Toda interpretación del presente acuerdo deberá ser sometido a la Comisión Paritaria de Interpretación según el artículo 51 del Convenio Colectivo de Trabajo 659/13, y/o su posterior modificatorio. La aplicación de la presente Acta Acuerdo tiene plena vigencia a partir del mes de mayo de 2026 con el expreso consentimiento de LAS PARTES e independientemente de su homologación, y con su correspondiente número de expediente que le otorgue la Secretaría de Trabajo Empleo y Seguridad Social de la Nación, al momento de su ingreso al citado organismo, vía TAD.
                  </p>
                  <p className="pt-4 text-center font-bold text-slate-800">
                    En prueba de conformidad, se suscriben DOS (2) ejemplares de un mismo tenor y a un solo efecto, en la Ciudad de Buenos Aires, a los 28 días del mes de mayo de 2026.
                  </p>
                </div>
              </section>
            </div>
          </div>
          
          {/* Info footer */}
          <div className="bg-muted/40 border border-border rounded-2xl p-5 flex items-start gap-3">
            <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground font-semibold leading-relaxed">
              Este documento es estrictamente para uso de los empleadores y responsables de las farmacias adheridas a ATFAR Rosario. Su distribución externa no autorizada está prohibida.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
