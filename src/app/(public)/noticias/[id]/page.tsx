/* eslint-disable @next/next/no-img-element */
'use client';

import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import { Calendar, User, ArrowLeft, Share2, Printer, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface NewsDetail {
  title: string;
  category: string;
  date: string;
  author: string;
  image: string;
  paragraphs: string[];
}

export default function NoticiaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [loading, setLoading] = useState(true);
  const [article, setArticle] = useState<NewsDetail | null>(null);

  useEffect(() => {
    async function loadArticle() {
      try {
        const isConfigured = 
          process.env.NEXT_PUBLIC_SUPABASE_URL !== 'your_supabase_project_url_here' && 
          !!process.env.NEXT_PUBLIC_SUPABASE_URL;

        // Mock details lookup
        const articles: { [key: string]: NewsDetail } = {
          'acuerdo-junio-2026': {
            title: 'Acuerdo Salarial Junio 2026: Nuevos Valores',
            category: 'Gremiales',
            date: '24 Jun 2026',
            author: 'Comisión Directiva',
            image: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&q=80&w=1200',
            paragraphs: [
              'En el día de ayer, la Comisión Directiva de la Asociación de Trabajadores de Farmacia de Rosario (ATFAR) refrendó de manera exitosa el nuevo acuerdo de recomposición salarial correspondiente al mes de Junio de 2026.',
              'El acuerdo establece un incremento del 12% con respecto al básico de convenio vigente en el mes anterior, acumulativo sobre los rubros remunerativos y adicionales establecidos por el Convenio Colectivo de Trabajo 659/13.',
              'Este incremento tiene como objetivo prioritario recomponer el poder adquisitivo de los trabajadores en la actividad farmacéutica frente al panorama económico regional. El acuerdo abarca a las categorías de cajeros, vendedores, auxiliares administrativos y directores farmacéuticos de Rosario y Gran Rosario.',
              'Los nuevos valores ya se encuentran reflejados de forma transparente en el calculador de escalas dinámicas de este portal web, y los empleadores de farmacia están obligados a liquidar los haberes conforme a esta nueva paritaria en el próximo período.',
            ]
          },
          'turismo-temporada': {
            title: 'Temporada de Invierno 2026 en el Camping Gremial',
            category: 'Beneficios',
            date: '18 Jun 2026',
            author: 'Secretaría de Deportes',
            image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&q=80&w=1200',
            paragraphs: [
              'La Secretaría de Acción Social y Deportes informa a todos los afiliados que se encuentra abierta la inscripción de reservas para la Temporada de Invierno 2026 en nuestros predios turísticos y campings asociados.',
              'Contamos con tarifas sindicales preferenciales y paquetes especiales para grupos familiares en hoteles de Mar del Plata, Córdoba y Bariloche, coordinados a través de la Federación Nacional FATFA.',
              'Las reservas se realizan a través de la oficina de turismo en la sede de Corrientes 1572 de lunes a viernes en el horario de 08:00 a 15:00 hs, o bien los afiliados pueden enviar sus consultas y reservar su lugar directamente desde la bandeja de autogestión de su portal privado.',
            ]
          },
          'capacitacion-farmacia': {
            title: 'Curso de Buenas Prácticas de Dispensación',
            category: 'Capacitación',
            date: '10 Jun 2026',
            author: 'Área Formación',
            image: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&q=80&w=1200',
            paragraphs: [
              'El Área de Capacitación Profesional abre la preinscripción para el nuevo ciclo de conferencias sobre "Buenas Prácticas de Dispensación y Control de Recetas Gremiales", dirigido a auxiliares y vendedores de farmacia en Rosario.',
              'El curso se dictará bajo una modalidad semipresencial, combinando clases virtuales asincrónicas con talleres presenciales de práctica en la sede central del sindicato.',
              'El trayecto formativo cuenta con certificación oficial y otorga puntaje valorable para promociones internas y la bolsa de empleo sindical. Los afiliados activos y su grupo familiar directo cuentan con una bonificación del 100% sobre la matrícula.',
            ]
          }
        };

        const staticArticle = articles[id];
        if (staticArticle) {
          setArticle(staticArticle);
          setLoading(false);
          return;
        }

        if (!isConfigured) {
          setArticle(articles['acuerdo-junio-2026']);
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('announcements')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;

        if (data) {
          setArticle({
            title: data.title,
            category: data.category,
            date: new Date(data.created_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' }),
            author: 'Gremio ATFAR',
            image: data.image_url || 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&q=80&w=1200',
            paragraphs: data.content.split('\n\n').filter(Boolean)
          });
        }
      } catch (err) {
        console.error("Error loading article:", err);
      } finally {
        setLoading(false);
      }
    }

    loadArticle();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4 text-xs font-semibold">
        <span>Comunicado no encontrado.</span>
        <Link href="/noticias" className="text-primary hover:underline">Volver a noticias</Link>
      </div>
    );
  }

  return (
    <div className="bg-background text-foreground min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Back Link */}
        <div>
          <Link 
            href="/noticias"
            className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver a Noticias</span>
          </Link>
        </div>

        {/* Article Meta */}
        <div className="space-y-4">
          <span className="inline-flex items-center px-3 py-1 rounded-lg bg-primary/5 text-primary text-[10px] font-bold uppercase tracking-wider border border-primary/10">
            {article.category}
          </span>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-foreground tracking-tight leading-tight">
            {article.title}
          </h1>
          
          <div className="flex items-center justify-between border-y border-border/60 py-3.5 text-xs text-muted-foreground font-semibold">
            <div className="flex items-center gap-6">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-secondary" />
                {article.date}
              </span>
              <span className="flex items-center gap-1.5">
                <User className="w-4 h-4 text-secondary" />
                Por {article.author}
              </span>
            </div>
            
            <div className="flex items-center gap-3">
              <button 
                onClick={() => alert('Compartir link del artículo')}
                className="p-1.5 rounded-lg border border-border hover:bg-muted transition-all"
                title="Compartir"
              >
                <Share2 className="w-4 h-4" />
              </button>
              <button 
                onClick={() => window.print()}
                className="p-1.5 rounded-lg border border-border hover:bg-muted transition-all"
                title="Imprimir"
              >
                <Printer className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Featured Image */}
        <div className="aspect-video w-full rounded-3xl overflow-hidden border border-border bg-muted shadow-md">
          <img
            src={article.image}
            alt={article.title}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Content Paragraphs */}
        <div className="prose max-w-none space-y-6 text-sm sm:text-base text-muted-foreground leading-relaxed font-medium">
          {article.paragraphs.map((p, idx) => (
            <p key={idx}>{p}</p>
          ))}
        </div>

        {/* Footer Action Card */}
        <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-premium glass flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1">
            <h4 className="font-bold text-foreground text-sm">¿Sos afiliado de ATFAR Rosario?</h4>
            <p className="text-xs text-muted-foreground">Accedé a tu portal para consultar todas tus gestiones y beneficios.</p>
          </div>
          <Link
            href="/login"
            className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider hover:bg-primary/95 transition-all shadow-premium"
          >
            Ingresar al Portal
          </Link>
        </div>

      </div>
    </div>
  );
}
