'use client';

import { useState, useEffect } from 'react';
import {
  Gift,
  FileText,
  Trash2,
  Search,
  Calendar,
  Phone,
  Download,
  Loader2,
  ExternalLink,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { confirmDialog } from '@/components/shared/ConfirmDialog';

interface SorteoEntry {
  id: string;
  full_name: string;
  phone: string;
  receipt_url: string;
  created_at: string;
}

export default function AdminSorteoPage() {
  const [entries, setEntries] = useState<SorteoEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchEntries() {
      try {
        const { data, error } = await supabase
          .from('sorteo_dia_madre_entries')
          .select('*')
          .order('created_at', { ascending: true });

        if (error) throw error;
        setEntries(data || []);
      } catch (err) {
        console.error('Error loading sorteo entries:', err);
        toast.error('No pudimos cargar las participaciones.', {
          description: 'Revisá tu conexión y volvé a intentarlo.',
        });
      } finally {
        setLoading(false);
      }
    }

    fetchEntries();
  }, []);

  const handleDelete = async (id: string, receiptUrl: string) => {
    const confirmed = await confirmDialog({
      title: 'Eliminar participación',
      message: '¿Seguro que deseas eliminar esta participación del sorteo?',
      confirmLabel: 'Eliminar',
      danger: true,
    });
    if (!confirmed) return;

    setDeletingId(id);
    try {
      const { error: dbError } = await supabase
        .from('sorteo_dia_madre_entries')
        .delete()
        .eq('id', id);

      if (dbError) throw dbError;

      try {
        const urlParts = receiptUrl.split('/receipts/');
        if (urlParts.length > 1) {
          const filePath = decodeURIComponent(urlParts[1]);
          await supabase.storage.from('receipts').remove([filePath]);
        }
      } catch (storageErr) {
        console.error('Failed to delete receipt file from storage:', storageErr);
      }

      setEntries(prev => prev.filter(entry => entry.id !== id));
      toast.success('Participación eliminada.');
    } catch (err) {
      console.error('Error deleting entry:', err);
      toast.error('Ocurrió un error al eliminar el registro.');
    } finally {
      setDeletingId(null);
    }
  };

  const filteredEntries = entries.filter(entry =>
    entry.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    entry.phone.includes(searchQuery)
  );

  const handleSortearGanadora = () => {
    if (filteredEntries.length === 0) {
      toast.warning('No hay participaciones cargadas todavía.');
      return;
    }
    const winner = filteredEntries[Math.floor(Math.random() * filteredEntries.length)];
    toast.success(`🎉 Ganadora: ${winner.full_name} (${winner.phone})`, {
      duration: 10000,
    });
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
            Sorteo Día de la Madre
          </h1>
          <p className="text-xs font-semibold text-muted-foreground">
            Participaciones cargadas desde el formulario público del portal.
          </p>
        </div>

        <div className="flex items-center gap-4">
          {/* Total Badge */}
          <div className="bg-card border border-border rounded-2xl px-5 py-3 shadow-premium flex items-center gap-3.5 glass">
            <div className="p-2 bg-pink-500/5 text-pink-600 border border-pink-500/10 rounded-xl">
              <Users className="w-5 h-5 text-pink-500" />
            </div>
            <div>
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest block">Total Participantes</span>
              <span className="text-xl font-black text-primary">{entries.length}</span>
            </div>
          </div>

          <button
            onClick={handleSortearGanadora}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-pink-500 text-white text-xs font-bold uppercase tracking-wider hover:bg-pink-600 transition-all shadow-premium"
          >
            <Gift className="w-4 h-4" />
            <span>Sortear Ganadora</span>
          </button>
        </div>
      </div>

      {/* Search Filter Bar */}
      <div className="flex items-center gap-4 bg-card border border-border p-4 rounded-2xl shadow-premium glass">
        <div className="relative flex-grow">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre o teléfono..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-pink-500/50 text-xs transition-all"
          />
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="h-[400px] w-full flex flex-col items-center justify-center text-xs font-bold text-muted-foreground gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="uppercase tracking-widest">Cargando participaciones...</span>
        </div>
      ) : filteredEntries.length === 0 ? (
        <div className="h-[250px] w-full flex flex-col items-center justify-center text-center border border-dashed border-border rounded-3xl bg-card/25 p-8 glass">
          <Gift className="w-10 h-10 text-muted-foreground/60 mb-3" />
          <h3 className="text-sm font-bold text-foreground mb-1">No se encontraron participantes</h3>
          <p className="text-xs text-muted-foreground max-w-sm">
            {searchQuery ? 'Probá ajustando los términos de búsqueda.' : 'Las participaciones cargadas desde /sorteo aparecerán en esta sección automáticamente.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5">
          {filteredEntries.map((entry) => (
            <div
              key={entry.id}
              className="bg-card border border-border rounded-3xl p-6 shadow-premium hover:shadow-premium-lg transition-all flex flex-col md:flex-row justify-between gap-6 glass"
            >
              {/* Profile Details */}
              <div className="space-y-4 flex-1">
                <div className="flex items-start justify-between md:justify-start gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-pink-500/5 text-pink-600 border border-pink-500/10 flex items-center justify-center font-black text-md flex-shrink-0">
                    {entry.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-sm font-extrabold text-foreground">{entry.full_name}</h2>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-semibold mt-0.5">
                      <Calendar className="w-3.5 h-3.5 text-secondary" />
                      Participó: {new Date(entry.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                <a
                  href={`tel:${entry.phone}`}
                  className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors font-medium text-xs w-fit"
                >
                  <Phone className="w-4 h-4 text-secondary flex-shrink-0" />
                  <span>{entry.phone}</span>
                </a>
              </div>

              {/* Actions Box */}
              <div className="flex md:flex-col justify-end md:justify-center items-center gap-2.5 flex-shrink-0 border-t md:border-t-0 md:border-l border-border pt-4 md:pt-0 md:pl-6">
                <a
                  href={entry.receipt_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 md:flex-initial w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider hover:bg-primary/95 transition-all shadow-premium"
                >
                  <FileText className="w-4 h-4" />
                  <span>Ver Recibo</span>
                  <ExternalLink className="w-3 h-3 opacity-80" />
                </a>

                <a
                  href={entry.receipt_url}
                  download={`${entry.full_name.replace(/\s+/g, '_')}_Recibo.pdf`}
                  className="inline-flex items-center justify-center p-2.5 rounded-xl border border-border text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all bg-card"
                  title="Descargar archivo"
                >
                  <Download className="w-4.5 h-4.5 text-secondary" />
                </a>

                <button
                  onClick={() => handleDelete(entry.id, entry.receipt_url)}
                  disabled={deletingId === entry.id}
                  className="inline-flex items-center justify-center p-2.5 rounded-xl border border-red-500/10 text-red-500 hover:bg-red-50/50 transition-all bg-card"
                  title="Eliminar participación"
                >
                  {deletingId === entry.id ? (
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
