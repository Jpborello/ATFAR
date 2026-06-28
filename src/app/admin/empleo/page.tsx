'use client';

import { useState, useEffect } from 'react';
import { 
  Briefcase, 
  FileText, 
  Trash2, 
  Search, 
  Calendar, 
  Phone, 
  Mail, 
  Download, 
  Loader2,
  ExternalLink,
  UserCheck
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface JobApplication {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  message: string;
  cv_url: string;
  created_at: string;
}

export default function AdminEmpleoPage() {
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
      } finally {
        setLoading(false);
      }
    }

    fetchApplications();
  }, []);

  const handleDelete = async (id: string, cvUrl: string) => {
    if (!confirm('¿Seguro que deseas eliminar esta postulación de la bolsa de trabajo?')) {
      return;
    }

    setDeletingId(id);
    try {
      // 1. Delete from database
      const { error: dbError } = await supabase
        .from('job_applications')
        .delete()
        .eq('id', id);

      if (dbError) throw dbError;

      // 2. Try to delete from storage if possible
      try {
        // Extract filePath from public URL
        // Example URL: https://.../storage/v1/object/public/cvs/public/171231-abc.pdf
        const urlParts = cvUrl.split('/cvs/');
        if (urlParts.length > 1) {
          const filePath = decodeURIComponent(urlParts[1]);
          await supabase.storage.from('cvs').remove([filePath]);
        }
      } catch (storageErr) {
        console.error('Failed to delete CV file from storage:', storageErr);
      }

      setApplications(prev => prev.filter(app => app.id !== id));
    } catch (err) {
      console.error('Error deleting application:', err);
      alert('Ocurrió un error al eliminar el registro.');
    } finally {
      setDeletingId(null);
    }
  };

  const filteredApplications = applications.filter(app => 
    app.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    app.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    app.phone.includes(searchQuery) ||
    (app.message && app.message.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
            Bolsa de Empleo
          </h1>
          <p className="text-xs font-semibold text-muted-foreground">
            Bandeja de postulantes y currículums cargados desde la sección pública del portal.
          </p>
        </div>
        
        {/* Total Badge */}
        <div className="bg-card border border-border rounded-2xl px-5 py-3 shadow-premium flex items-center gap-3.5 glass">
          <div className="p-2 bg-primary/5 text-primary border border-primary/10 rounded-xl">
            <UserCheck className="w-5 h-5 text-secondary" />
          </div>
          <div>
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest block">Total Postulantes</span>
            <span className="text-xl font-black text-primary">{applications.length}</span>
          </div>
        </div>
      </div>

      {/* Search Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-card border border-border p-4 rounded-2xl shadow-premium glass">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre, correo, teléfono o mensaje..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-secondary/50 text-xs transition-all"
          />
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="h-[400px] w-full flex flex-col items-center justify-center text-xs font-bold text-muted-foreground gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="uppercase tracking-widest">Cargando postulaciones...</span>
        </div>
      ) : filteredApplications.length === 0 ? (
        <div className="h-[250px] w-full flex flex-col items-center justify-center text-center border border-dashed border-border rounded-3xl bg-card/25 p-8 glass">
          <Briefcase className="w-10 h-10 text-muted-foreground/60 mb-3" />
          <h3 className="text-sm font-bold text-foreground mb-1">No se encontraron postulantes</h3>
          <p className="text-xs text-muted-foreground max-w-sm">
            {searchQuery ? 'Probá ajustando los términos de búsqueda.' : 'Los currículums cargados aparecerán en esta sección automáticamente.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5">
          {filteredApplications.map((app) => (
            <div 
              key={app.id} 
              className="bg-card border border-border rounded-3xl p-6 shadow-premium hover:shadow-premium-lg transition-all flex flex-col md:flex-row justify-between gap-6 glass"
            >
              {/* Profile Details */}
              <div className="space-y-4 flex-1">
                <div className="flex items-start justify-between md:justify-start gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-primary/5 text-primary border border-primary/10 flex items-center justify-center font-black text-md flex-shrink-0">
                    {app.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-sm font-extrabold text-foreground">{app.full_name}</h2>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-semibold mt-0.5">
                      <Calendar className="w-3.5 h-3.5 text-secondary" />
                      Postulado: {new Date(app.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                {/* Contact grid */}
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

              {/* Actions Box */}
              <div className="flex md:flex-col justify-end md:justify-center items-center gap-2.5 flex-shrink-0 border-t md:border-t-0 md:border-l border-border pt-4 md:pt-0 md:pl-6">
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
                  className="inline-flex items-center justify-center p-2.5 rounded-xl border border-border text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all bg-card"
                  title="Descargar archivo"
                >
                  <Download className="w-4.5 h-4.5 text-secondary" />
                </a>

                <button
                  onClick={() => handleDelete(app.id, app.cv_url)}
                  disabled={deletingId === app.id}
                  className="inline-flex items-center justify-center p-2.5 rounded-xl border border-red-500/10 text-red-500 hover:bg-red-50/50 transition-all bg-card"
                  title="Eliminar postulación"
                >
                  {deletingId === app.id ? (
                    <Loader2 className="w-4.5 h-4.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-4.5 h-4.5" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
