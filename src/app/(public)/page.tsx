/* eslint-disable @next/next/no-img-element */
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ArrowRight, 
  FileText, 
  Users, 
  ShieldCheck, 
  Calendar, 
  HeartHandshake, 
  GraduationCap, 
  Award,
  Sparkles,
  ChevronRight,
  TrendingUp,
  ChevronLeft
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function HomePage() {
  const [currentSlide, setCurrentSlide] = useState(0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [activeScaleSlide, setActiveScaleSlide] = useState<any | null>(null);

  useEffect(() => {
    async function fetchActiveScale() {
      try {
        const isConfigured = 
          process.env.NEXT_PUBLIC_SUPABASE_URL !== 'your_supabase_project_url_here' && 
          !!process.env.NEXT_PUBLIC_SUPABASE_URL;

        if (!isConfigured) return;

        const { data, error } = await supabase
          .from('salary_scales_docs')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(1);

        if (error) {
          console.warn("Could not load active salary scale doc:", error.message);
          return;
        }

        if (data && data.length > 0) {
          const doc = data[0];
          const isImage = /\.(jpg|jpeg|png|webp|gif)$/i.test(doc.file_url);
          setActiveScaleSlide({
            image: isImage ? doc.file_url : '/images/hero_tablet.jpg',
            title: `Escalas Salariales`,
            description: `Se encuentra disponible el nuevo acuerdo de escala salarial paritaria CCT para el período ${doc.period}. Hacé click para ver o descargar el documento oficial.`,
            btnPrimary: 'Ver Escalas Salariales',
            btnPrimaryHref: '/escalas',
            btnSecondary: 'Descargar Documento',
            btnSecondaryHref: doc.file_url,
          });
        }
      } catch (err) {
        console.error("Error loading active scale slide:", err);
      }
    }
    fetchActiveScale();
  }, []);

  const defaultSlides = [
    {
      image: '/images/hero_shake.jpg',
      title: 'Bolsa de Trabajo',
      description: 'Estrechamos lazos profesionales. Vinculamos postulantes capacitados con las farmacias más importantes de la región de Rosario.',
      btnPrimary: 'Ingresar al Sistema',
      btnPrimaryHref: '/login',
      btnSecondary: 'Cargar mi CV',
      btnSecondaryHref: '/bolsa',
    },
    {
      image: '/images/hero_pose.jpg',
      title: 'Asociación Trabajadores de Farmacias Rosario',
      description: 'Casi un siglo defendiendo la dignidad, los derechos salariales y el bienestar de todo el personal de farmacia de la provincia.',
      btnPrimary: 'Ingresar al Sistema',
      btnPrimaryHref: '/login',
      btnSecondary: 'Conocer la Federación',
      btnSecondaryHref: '/institucional',
    },
    {
      image: '/images/hero_tablet.jpg',
      title: 'Cargá tu CV',
      description: 'Subí tu currículum de manera digital para formar parte del padrón oficial y ser considerado en búsquedas laborales activas.',
      btnPrimary: 'Cargar mi CV',
      btnPrimaryHref: '/bolsa',
      btnSecondary: 'Ver Escalas Salariales',
      btnSecondaryHref: '/escalas',
    },
  ];

  const slides = activeScaleSlide ? [activeScaleSlide, ...defaultSlides] : defaultSlides;

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const handlePrevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const handleNextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const services = [
    {
      title: 'Declaraciones Juradas',
      description: 'Acceso online para que los empleadores declaren su nómina de personal de manera ágil.',
      icon: FileText,
      linkText: 'Presentar DDJJ online',
      href: '/farmacia/declaraciones',
    },
    {
      title: 'Bolsa de Empleo',
      description: 'Carga de currículums y perfiles profesionales para farmacias adheridas de la región.',
      icon: Users,
      linkText: 'Cargar Curriculum Vitae',
      href: '/bolsa',
    },
    {
      title: 'Control de Aportes',
      description: 'Monitoreo de aportes previsionales y salarios mínimos garantizados por convenio.',
      icon: ShieldCheck,
      linkText: 'Consultar Aportes CCT',
      href: '/login',
    },
  ];

  const benefits = [
    {
      title: 'Kit de Útiles Escolares',
      description: 'Entrega anual gratuita de mochilas y útiles escolares para los hijos de los afiliados.',
      icon: GraduationCap,
      href: '/utiles',
    },
    {
      title: 'Turismo Social',
      description: 'Acceso a hoteles y centros recreativos con tarifas corporativas en todo el país.',
      icon: Award,
      href: 'https://fatfa.org.ar/turismo-social/',
      external: true,
    },
    {
      title: 'Obra Social OSPF',
      description: 'Cobertura médica y farmacéutica de excelencia para el afiliado y su grupo familiar.',
      icon: HeartHandshake,
      href: 'https://www.ospf.org.ar/',
      external: true,
    },
  ];

  const [news, setNews] = useState([
    {
      id: 'acuerdo-junio-2026',
      title: 'Acuerdo Salarial Junio 2026: Nuevos Valores',
      category: 'Gremiales',
      date: '24 Jun 2026',
      author: 'Comisión Directiva',
      image: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&q=80&w=600',
    },
    {
      id: 'turismo-temporada',
      title: 'Temporada de Invierno 2026 en el Camping Gremial',
      category: 'Beneficios',
      date: '18 Jun 2026',
      author: 'Secretaría de Deportes',
      image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&q=80&w=600',
    },
    {
      id: 'capacitacion-farmacia',
      title: 'Curso de Buenas Prácticas de Dispensación',
      category: 'Capacitación',
      date: '10 Jun 2026',
      author: 'Área Formación',
      image: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&q=80&w=600',
    },
  ]);

  useEffect(() => {
    async function fetchNews() {
      try {
        const isConfigured = 
          process.env.NEXT_PUBLIC_SUPABASE_URL !== 'your_supabase_project_url_here' && 
          !!process.env.NEXT_PUBLIC_SUPABASE_URL;

        if (!isConfigured) return;

        const { data, error } = await supabase
          .from('announcements')
          .select('*')
          .eq('visibility', 'public')
          .order('created_at', { ascending: false })
          .limit(3);

        if (error) throw error;

        if (data && data.length > 0) {
          setNews(data.map((item: { id: string; title: string; category: string; created_at: string; image_url?: string }) => ({
            id: item.id,
            title: item.title,
            category: item.category,
            date: new Date(item.created_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' }),
            author: 'Gremio ATFAR',
            image: item.image_url || 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&q=80&w=600'
          })));
        }
      } catch {
        // Error loading news ignored
      }
    }

    fetchNews();
  }, []);

  const featuredScales = [
    { category: 'Farmacéutico (Director Técnico)', basic: '$2.095.145,60' },
    { category: 'Auxiliar de Farmacia', basic: '$1.897.306,78' },
    { category: 'Cajero de Farmacia', basic: '$1.550.823,66' },
    { category: 'Personal de Salón (Vendedor)', basic: '$1.381.087,99' },
  ];

  return (
    <div className="bg-background text-foreground min-h-screen space-y-20 pb-16 relative">
      {/* Hero Carousel Section */}
      <section className="relative w-full pt-16">
        <div className="relative h-[480px] sm:h-[540px] lg:h-[600px] overflow-hidden bg-slate-950">
          {/* Slides */}
          {slides.map((slide, index) => {
            const isActive = index === currentSlide;
            return (
              <div
                key={index}
                className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                  isActive ? 'opacity-100 z-10' : 'opacity-0 z-0'
                }`}
              >
                {/* Background image */}
                <img
                  src={slide.image}
                  alt={slide.title}
                  className="absolute inset-0 w-full h-full object-cover opacity-80"
                />
                {/* Visual dark overlay */}
                <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-900/65 to-transparent" />
                
                {/* Slide Text Content Container */}
                <div className="absolute inset-0 flex items-center">
                  <div className="max-w-7xl mx-auto w-full px-6 sm:px-8 md:px-12 lg:px-8 text-white">
                    <div className="max-w-2xl flex flex-col space-y-6">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/20 text-white text-[10px] font-bold tracking-wider uppercase border border-primary/30 self-start shadow-sm backdrop-blur-sm">
                        <Sparkles className="w-3.5 h-3.5 text-primary" />
                        <span>ATFAR Gremial</span>
                      </div>
                      
                      <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tight leading-tight">
                        {slide.title}
                      </h1>
                      
                      <p className="text-xs sm:text-sm text-slate-200/90 leading-relaxed font-semibold max-w-xl">
                        {slide.description}
                      </p>

                      <div className="flex flex-col sm:flex-row items-center gap-3.5 pt-2">
                        <Link
                          href={slide.btnPrimaryHref}
                          className="w-full sm:w-auto inline-flex items-center justify-center px-5 py-3 rounded-xl bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider hover:bg-primary/95 transition-all shadow-md border border-primary"
                        >
                          {slide.btnPrimary}
                          <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                        </Link>
                        <Link
                          href={slide.btnSecondaryHref}
                          className="w-full sm:w-auto inline-flex items-center justify-center px-5 py-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-white text-xs font-bold uppercase tracking-wider transition-all shadow-md backdrop-blur-sm"
                        >
                          {slide.btnSecondary}
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Left / Right Arrow Controls */}
          <button
            onClick={handlePrevSlide}
            className="absolute left-6 top-1/2 -translate-y-1/2 z-20 p-2.5 rounded-xl border border-white/10 text-white bg-slate-900/35 hover:bg-slate-900/50 hover:scale-105 transition-all backdrop-blur-sm cursor-pointer"
            title="Slide Anterior"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={handleNextSlide}
            className="absolute right-6 top-1/2 -translate-y-1/2 z-20 p-2.5 rounded-xl border border-white/10 text-white bg-slate-900/35 hover:bg-slate-900/50 hover:scale-105 transition-all backdrop-blur-sm cursor-pointer"
            title="Próximo Slide"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Dot Indicators */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-2">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentSlide(idx)}
                className="h-2 rounded-full transition-all duration-300 cursor-pointer"
                style={{
                  width: idx === currentSlide ? '24px' : '8px',
                  backgroundColor: idx === currentSlide ? '#ffffff' : 'rgba(255,255,255,0.4)'
                }}
                title={`Ir a slide ${idx + 1}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="bg-slate-50 border-b border-border py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          {/* Left Column */}
          <div className="lg:col-span-5 space-y-4">
            <span className="text-xs font-black text-primary uppercase tracking-widest block font-sans">Servicios del Sindicato</span>
            <h2 className="text-3xl font-extrabold tracking-tight text-[#0f172a]">
              Plataforma digital para la gestión sindical
            </h2>
            <p className="text-base text-slate-600 leading-relaxed font-semibold max-w-md">
              Digitalizamos los procesos gremiales para garantizar mayor transparencia y control para empleadores y afiliados.
            </p>
          </div>

          {/* Right Column: Vertical list separated by subtle divisor lines */}
          <div className="lg:col-span-7 divide-y divide-border border-t border-border">
            {services.map((service, idx) => {
              const Icon = service.icon;
              return (
                <div 
                  key={idx} 
                  className="py-6 flex items-start gap-5 group transition-all hover:bg-white px-4 rounded-xl border border-transparent hover:border-border hover:shadow-premium"
                >
                  {/* Icon Container with subtle hover visual indicator */}
                  <div className="p-3 rounded-lg bg-card text-slate-500 group-hover:text-primary group-hover:bg-primary/5 transition-all border border-border flex-shrink-0">
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="space-y-2 w-full">
                    <h3 className="font-bold text-base text-[#0f172a] group-hover:text-primary transition-colors">
                      {service.title}
                    </h3>
                    <p className="text-sm text-slate-600 leading-relaxed font-semibold">
                      {service.description}
                    </p>
                    <div className="pt-1">
                      <Link 
                        href={(service as { href?: string; linkText?: string }).href || '#'} 
                        className="inline-flex items-center text-sm font-extrabold text-primary hover:text-secondary group/btn"
                      >
                        <span>{(service as { href?: string; linkText?: string }).linkText || 'Ingresar al sistema'}</span>
                        <ArrowRight className="w-3.5 h-3.5 ml-1.5 group-hover/btn:translate-x-0.5 transition-transform" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="bg-white border-y border-border py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="text-center space-y-3">
            <span className="text-[10px] font-bold text-primary uppercase tracking-widest block">Acciones Sociales</span>
            <h2 className="text-3xl font-extrabold tracking-tight text-[#0f172a]">
              Beneficios para Afiliados
            </h2>
            <p className="text-sm text-[#64748b] max-w-xl mx-auto leading-relaxed font-medium">
              Acompañamos a las familias de farmacia en cada etapa, brindando herramientas de capacitación, turismo y bienestar.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border border-t border-border pt-4">
            {benefits.map((benefit, idx) => {
              const Icon = benefit.icon;
              return (
                <div 
                  key={idx} 
                  className="px-6 py-8 md:py-4 flex flex-col justify-between space-y-6 hover:bg-slate-50/40 transition-colors rounded-xl md:rounded-none first:pl-0 last:pr-0"
                >
                  <div className="space-y-4">
                    <div className="p-2.5 bg-slate-50 text-slate-500 rounded-lg inline-block border border-border">
                      <Icon className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-base text-[#0f172a]">{benefit.title}</h3>
                    <p className="text-sm text-slate-600 leading-relaxed font-semibold">
                      {benefit.description}
                    </p>
                  </div>
                  
                  <div className="pt-2">
                    {benefit.external ? (
                      <a
                        href={benefit.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-sm font-extrabold text-primary hover:text-secondary group"
                      >
                        <span>Saber más</span>
                        <ChevronRight className="w-4 h-4 ml-0.5 group-hover:translate-x-0.5 transition-transform" />
                      </a>
                    ) : (
                      <Link
                        href={benefit.href}
                        className="inline-flex items-center text-sm font-extrabold text-primary hover:text-secondary group"
                      >
                        <span>Gestionar online</span>
                        <ChevronRight className="w-4 h-4 ml-0.5 group-hover:translate-x-0.5 transition-transform" />
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Featured Scales Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          <div className="lg:col-span-5 space-y-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/5 text-emerald-600 text-[10px] font-bold uppercase border border-emerald-500/10">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Escalas Vigentes Junio 2026</span>
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight text-[#0f172a]">
              Básicos de Convenio
            </h2>
            <p className="text-sm text-[#64748b] leading-relaxed font-medium">
              Conocé las bases salariales mensuales acordadas por las paritarias gremiales de farmacia en la región.
            </p>
            <div className="pt-2">
              <Link
                href="/escalas"
                className="inline-flex items-center justify-center px-5 py-3 rounded-xl bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider hover:bg-primary/95 transition-all shadow-premium"
              >
                <span>Acceder a Tabla Completa</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Link>
            </div>
          </div>

          <div className="lg:col-span-7 divide-y divide-border border-t border-border">
            {featuredScales.map((scale, idx) => (
              <div 
                key={idx} 
                className="py-4 flex items-center justify-between gap-4 px-2 hover:bg-slate-50/50 rounded-lg transition-colors"
              >
                <span className="text-sm font-semibold text-[#0f172a]">{scale.category}</span>
                <span className="text-xs font-bold text-primary bg-primary/5 px-3 py-1.5 rounded-lg border border-primary/10 font-sans">
                  {scale.basic}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Downloads & Documentation Section */}
      <section className="bg-white border-y border-border py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          <div className="lg:col-span-5 space-y-4">
            <span className="text-[10px] font-bold text-primary uppercase tracking-widest block font-sans">Documentación Oficial</span>
            <h2 className="text-3xl font-extrabold tracking-tight text-[#0f172a]">
              Descargas y Formularios
            </h2>
            <p className="text-sm text-[#64748b] leading-relaxed font-medium max-w-md">
              Accedé a las copias oficiales del Convenio Colectivo de Trabajo, instructivos de trámites y formularios gremiales aprobados.
            </p>
          </div>

          <div className="lg:col-span-7 divide-y divide-border border-t border-border">
            {[
              { title: 'Convenio Colectivo de Trabajo CCT 659/13 (Texto Completo)', size: '2.4 MB', file: 'CCT_659_13_Farmacia.pdf' },
              { title: 'Escala Salarial Homologada - Vigente Junio 2026', size: '420 KB', file: 'Escala_Salarial_Junio_2026.pdf' },
              { title: 'Formulario de Solicitud de Afiliación Sindical', size: '850 KB', file: 'Formulario_Afiliacion_ATFAR.pdf' },
              { title: 'Guía de Trámites de Inscripción de Nuevas Farmacias', size: '1.1 MB', file: 'Guia_Inscripcion_Farmacia.pdf' },
            ].map((doc, idx) => (
              <div 
                key={idx} 
                className="py-4.5 flex items-center justify-between gap-4 px-2 hover:bg-slate-50/50 rounded-lg transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-red-50 text-red-500 border border-red-100 flex-shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-[#0f172a] block">{doc.title}</span>
                    <span className="text-[10px] text-[#64748b] font-medium uppercase font-sans">Archivo PDF • {doc.size}</span>
                  </div>
                </div>
                <a 
                  href={`/exel/PLANILLA_LIQUIDACION_VALOR_HORAS.xls`}
                  download={doc.file}
                  className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-slate-50 border border-border text-xs font-bold text-[#0f172a] hover:bg-primary hover:text-white hover:border-primary transition-all cursor-pointer shadow-sm"
                >
                  Descargar
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* Institutional History Summary */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-6">
        <span className="text-[10px] font-bold text-primary uppercase tracking-widest block">Nuestra Historia</span>
        <h2 className="text-3xl font-extrabold text-[#0f172a] tracking-tight">
          Casi un siglo defendiendo al personal de farmacia
        </h2>
        <p className="text-sm text-[#64748b] leading-relaxed font-medium">
          Fundada en 1927, la Asociación de Trabajadores de Farmacia de Rosario nació con la firme convicción de organizar a los empleados para garantizar su dignidad laboral, la regulación de jornadas de trabajo y el establecimiento de escalas salariales justas en toda la provincia.
        </p>
        <div className="pt-2">
          <Link
            href="/institucional"
            className="inline-flex items-center text-xs font-bold text-primary hover:text-secondary group"
          >
            <span>Ver Historia Completa e Integrantes de Comisión</span>
            <ChevronRight className="w-4 h-4 ml-0.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </section>

      {/* Latest News Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-border pb-6">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-primary uppercase tracking-widest block">Comunicados Oficiales</span>
            <h2 className="text-3xl font-extrabold text-[#0f172a] tracking-tight">Últimas Noticias</h2>
          </div>
          <Link 
            href="/noticias" 
            className="text-xs font-bold text-primary hover:text-secondary inline-flex items-center group"
          >
            <span>Ver todas las novedades</span>
            <ArrowRight className="w-4 h-4 ml-1.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
          {news.map((item) => (
            <article 
              key={item.id}
              className="space-y-4 group"
            >
              <div className="h-48 overflow-hidden relative rounded-xl border border-border bg-slate-50">
                <img
                  src={item.image}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
                  loading="lazy"
                />
                <span className="absolute top-4 left-4 bg-primary text-white text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md shadow-sm">
                  {item.category}
                </span>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-3 text-[10px] text-[#64748b] font-semibold">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    {item.date}
                  </span>
                  <span>•</span>
                  <span>Por {item.author}</span>
                </div>
                
                <h3 className="font-bold text-base text-[#0f172a] line-clamp-2 leading-snug group-hover:text-primary transition-colors">
                  {item.title}
                </h3>
                
                <div className="pt-1">
                  <Link 
                    href={`/noticias/${item.id}`} 
                    className="inline-flex items-center text-xs font-bold text-primary hover:text-secondary group/link"
                  >
                    <span>Leer artículo</span>
                    <ChevronRight className="w-3.5 h-3.5 ml-0.5 group-hover/link:translate-x-0.5 transition-transform" />
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
