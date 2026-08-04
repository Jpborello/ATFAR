/* eslint-disable @next/next/no-img-element */
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Calendar, User, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface NewsItem {
  id: string;
  title: string;
  category: 'Gremiales' | 'Beneficios' | 'Capacitación' | 'Institucional';
  date: string;
  author: string;
  summary: string;
  image: string;
}

export default function NoticiasPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [news, setNews] = useState<NewsItem[]>([
    {
      id: 'acuerdo-junio-2026',
      title: 'Acuerdo Salarial Junio 2026: Nuevos Valores',
      category: 'Gremiales',
      date: '24 Jun 2026',
      author: 'Comisión Directiva',
      summary: 'Se firmó la actualización salarial de la actividad farmacéutica correspondiente a este período. Conocé los porcentajes de incremento acordados a nivel nacional y provincial.',
      image: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&q=80&w=600',
    },
    {
      id: 'turismo-temporada',
      title: 'Temporada de Invierno 2026 en el Camping Gremial',
      category: 'Beneficios',
      date: '18 Jun 2026',
      author: 'Secretaría de Deportes',
      summary: 'Ya están abiertas las reservas y pases para los afiliados y sus familias en los predios recreativos del gremio. Disfrutá de la temporada invernal en nuestras sedes.',
      image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&q=80&w=600',
    },
    {
      id: 'capacitacion-farmacia',
      title: 'Curso de Buenas Prácticas de Dispensación',
      category: 'Capacitación',
      date: '10 Jun 2026',
      author: 'Área Formación',
      summary: 'Comienza el ciclo de formación profesional a distancia para empleados de farmacia de Rosario. Inscripciones abiertas y bonificaciones para afiliados de ATFAR.',
      image: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&q=80&w=600',
    },
    {
      id: 'kit-escolar-entrega',
      title: 'Finalización de Entrega de Útiles Escolares 2026',
      category: 'Beneficios',
      date: '02 Jun 2026',
      author: 'Acción Social',
      summary: 'Informamos a los afiliados que el período regular de entrega de mochilas y kits escolares para el ciclo lectivo culmina el próximo mes. Completá la solicitud online.',
      image: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&q=80&w=600',
    },
  ]);

  useEffect(() => {
    async function loadNews() {
      try {
        const isConfigured = 
          process.env.NEXT_PUBLIC_SUPABASE_URL !== 'your_supabase_project_url_here' && 
          !!process.env.NEXT_PUBLIC_SUPABASE_URL;

        if (!isConfigured) return;

        const { data, error } = await supabase
          .from('announcements')
          .select('*')
          .eq('visibility', 'public')
          .order('created_at', { ascending: false });

        if (error) throw error;

        if (data && data.length > 0) {
          setNews(data.map((item: { id: string; title: string; category: string; created_at: string; summary: string; image_url?: string }) => ({
            id: item.id,
            title: item.title,
            category: (item.category || 'Gremiales') as NewsItem['category'],
            date: new Date(item.created_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' }),
            author: 'Gremio ATFAR',
            summary: item.summary,
            image: item.image_url || 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&q=80&w=600'
          })));
        }
      } catch (err) {
        console.error("Error loading news:", err);
      }
    }

    loadNews();
  }, []);

  const categories = ['all', 'Gremiales', 'Beneficios', 'Capacitación', 'Institucional'];

  const filteredNews = selectedCategory === 'all'
    ? news
    : news.filter(item => item.category === selectedCategory);

  return (
    <div className="bg-background text-foreground min-h-screen py-12 px-4 sm:px-6 lg:px-8 relative">
      {/* Background decoration */}
      <div className="absolute top-[10%] left-[10%] w-[350px] h-[350px] rounded-full bg-primary/5 blur-[100px] pointer-events-none" />

      <div className="max-w-7xl mx-auto space-y-12 relative">
        {/* Header */}
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <span className="text-[10px] font-bold text-secondary uppercase tracking-widest block">Novedades y Anuncios</span>
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
            Noticias Oficiales
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed font-medium">
            Mantenete al tanto de los comunicados gremiales, convenios colectivos, convocatorias a capacitaciones y actividades del sindicato de farmacia de Rosario.
          </p>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap items-center justify-center gap-2 border-b border-border/60 pb-6">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border ${
                selectedCategory === cat
                  ? 'bg-primary text-primary-foreground border-primary shadow-premium'
                  : 'bg-card text-muted-foreground border-border hover:text-foreground'
              }`}
            >
              {cat === 'all' ? 'Ver Todas' : cat}
            </button>
          ))}
        </div>

        {/* News Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredNews.map((item) => (
            <article 
              key={item.id}
              className="bg-card border border-border rounded-3xl overflow-hidden shadow-premium hover:shadow-premium-lg transition-all group flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="h-52 overflow-hidden relative bg-muted">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500"
                    loading="lazy"
                  />
                  <span className="absolute top-4 left-4 bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg shadow-sm border border-primary-foreground/10">
                    {item.category}
                  </span>
                </div>
                
                <div className="p-6 space-y-3">
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-semibold">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-secondary" />
                      {item.date}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-secondary" />
                      {item.author}
                    </span>
                  </div>
                  
                  <h3 className="font-extrabold text-lg text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed font-medium">
                    {item.summary}
                  </p>
                </div>
              </div>

              <div className="p-6 pt-0">
                <Link 
                  href={`/noticias/${item.id}`} 
                  className="inline-flex items-center text-xs font-bold text-primary group-hover:text-secondary group"
                >
                  <span>Leer comunicado completo</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>
            </article>
          ))}
        </div>

      </div>
    </div>
  );
}
