'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Briefcase, 
  FileText, 
  Search, 
  Calendar, 
  Phone, 
  Mail, 
  Download, 
  Loader2,
  ExternalLink,
  ArrowLeft
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

interface JobApplication {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  message: string;
  cv_url: string;
  created_at: string;
  position?: string;
}

export default function FarmaciaPostulantesPage() {
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPosition, setFilterPosition] = useState<string>('all');

  useEffect(() => {
    async function fetchApplications() {
      try {
        const { data, error } = await supabase
          .from('job_applications')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setApplications(data || []);
      } catch (err) {
        console.error('Error loading applications:', err);
        toast.error('No pudimos cargar los postulantes.', {
          description: 'Revisá tu conexión y volvé a intentarlo.',
        });
      } finally {
        setLoading(false);
      }
    }

    fetchApplications();
  }, []);

  const filteredApplications = applications.filter(app => {
    const matchesSearch = 
      app.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.phone.includes(searchQuery) ||
      (app.message && app.message.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (app.position && app.position.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesPosition = filterPosition === 'all' || app.position === filterPosition;
    return matchesSearch && matchesPosition;
  });

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc] text-[#1e293b] font-sans">
      {/* Top Header */}
      <header className="bg-card border-b border-border/80 py-4 px-6 flex items-center justify-between shadow-premium">
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
            <span className="text-[9px] text-muted-foreground block font-bold">Portal de Farmacias / Bolsa de Empleo</span>
          </div>
        </div>
      </header>

      {/* Main container */}
      <main className="flex-grow max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        {/* Banner */}
        <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-premium glass flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-primary/5 text-primary border border-primary/10 rounded-2xl">
              <Briefcase className="w-8 h-8 text-secondary" />
            </div>
            <div className="space-y-1">
              <h1 className="text-xl sm:text-2xl font-black text-[#0f172a]">Búsqueda de Postulantes</h1>
              <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                Consultá los perfiles y currículums activos cargados por los afiliados y postulantes de la zona.
              </p>
            </div>
          </div>
          <div className="bg-primary/5 border border-primary/10 text-primary rounded-2xl px-5 py-3 flex-shrink-0 flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">Postulantes Disponibles:</span>
            <span className="text-xl font-black text-secondary">{applications.length}</span>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-card border border-border p-4 rounded-2xl shadow-premium glass">
          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <div className="relative flex-grow">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nombre, correo, teléfono o presentación..."
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-secondary/50 text-xs transition-all"
              />
            </div>
            <div className="w-full sm:w-64">
              <select
                value={filterPosition}
                onChange={(e) => setFilterPosition(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-secondary/50 text-xs font-bold transition-all text-foreground"
              >
                <option value="all">Todos los puestos / categorías</option>
                <option value="Cadetes">Cadetes</option>
                <option value="Aprendiz Ayudante">Aprendiz Ayudante</option>
                <option value="Personal Auxiliar Interno y Externo">Personal Auxiliar Interno y Externo</option>
                <option value="Personal con Asignación Específica">Personal con Asignación Específica</option>
                <option value="Ayudante en Gestión de Farmacia">Ayudante en Gestión de Farmacia</option>
                <option value="Personal en Gestión de Farmacia">Personal en Gestión de Farmacia</option>
                <option value="Farmacéutico">Farmacéutico</option>
                <option value="Otros / Administrativo">Otros / Administrativo</option>
              </select>
            </div>
          </div>
        </div>

        {/* Main List */}
        {loading ? (
          <div className="h-[300px] w-full flex flex-col items-center justify-center text-xs font-bold text-muted-foreground gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="uppercase tracking-widest">Cargando perfiles de candidatos...</span>
          </div>
        ) : filteredApplications.length === 0 ? (
          <div className="h-[200px] w-full flex flex-col items-center justify-center text-center border border-dashed border-border rounded-3xl bg-card/25 p-8 glass">
            <Briefcase className="w-8 h-8 text-muted-foreground/50 mb-3" />
            <h3 className="text-xs font-bold text-foreground mb-1">No se encontraron perfiles</h3>
            <p className="text-[10px] text-muted-foreground max-w-sm">
              {searchQuery ? 'Probá con otros términos de búsqueda.' : 'No hay candidatos registrados en la bolsa actualmente.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5">
            {filteredApplications.map((app) => (
              <div 
                key={app.id} 
                className="bg-card border border-border rounded-3xl p-6 shadow-premium hover:shadow-premium-lg transition-all flex flex-col md:flex-row justify-between gap-6 glass"
              >
                {/* Candidate details */}
                <div className="space-y-4 flex-1">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-primary/5 text-primary border border-primary/10 flex items-center justify-center font-black text-sm flex-shrink-0">
                      {app.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-xs font-extrabold text-foreground">{app.full_name}</h2>
                        {app.position && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[8px] font-black uppercase bg-primary/10 text-primary border border-primary/20">
                            {app.position}
                          </span>
                        )}
                      </div>
                      <span className="text-[9px] text-muted-foreground flex items-center gap-1 font-semibold mt-0.5">
                        <Calendar className="w-3.5 h-3.5 text-secondary" />
                        Registrado: {new Date(app.created_at).toLocaleDateString('es-AR')}
                      </span>
                    </div>
                  </div>

                  {/* Contacts */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <a 
                      href={`mailto:${app.email}`} 
                      className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors font-medium"
                    >
                      <Mail className="w-4 h-4 text-secondary flex-shrink-0" />
                      <span>{app.email}</span>
                    </a>
                    <a 
                      href={`tel:${app.phone}`} 
                      className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors font-medium"
                    >
                      <Phone className="w-4 h-4 text-secondary flex-shrink-0" />
                      <span>{app.phone}</span>
                    </a>
                  </div>

                  {/* Presentation Message */}
                  {app.message && (
                    <div className="bg-muted/30 border border-border/60 rounded-2xl p-4 text-xs text-muted-foreground italic leading-relaxed">
                      &ldquo;{app.message}&rdquo;
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex md:flex-col justify-end md:justify-center items-center gap-2 flex-shrink-0 border-t md:border-t-0 md:border-l border-border pt-4 md:pt-0 md:pl-6">
                  <a 
                    href={app.cv_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 md:flex-initial w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider hover:bg-primary/95 transition-all shadow-premium"
                  >
                    <FileText className="w-4 h-4" />
                    <span>Ver CV</span>
                    <ExternalLink className="w-3 h-3 opacity-80" />
                  </a>

                  <a 
                    href={app.cv_url}
                    download={`${app.full_name.replace(/\s+/g, '_')}_CV.pdf`}
                    className="flex-1 md:flex-initial w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-border text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all bg-card"
                  >
                    <Download className="w-4 h-4 text-secondary" />
                    <span>Descargar</span>
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
