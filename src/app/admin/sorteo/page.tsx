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
  Trophy,
  Copy,
  Check,
  RefreshCw,
  X,
  Sparkles,
  UserCheck,
  History,
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

// Sorteo oficial realizado el 03/11/2026 (con Javier Damplo en puesto 8 para re-sorteo)
const INITIAL_PREVIOUS_DRAW: SorteoEntry[] = [
  {
    id: '2ff2188c-e3fd-478a-9a14-882c8f04b345',
    full_name: 'Mónica Montero',
    phone: '3413126940',
    receipt_url: 'https://wdmtyxzafrxuibqqxbbv.supabase.co/storage/v1/object/public/receipts/sorteo-dia-madre/1792164857657-vdymn6mw12g.pdf',
    created_at: '2026-10-16T15:34:19.560227+00:00',
  },
  {
    id: '918a6e65-0346-4b8a-bf40-31d6dba40ddc',
    full_name: 'Debora Micaela horvath',
    phone: '3413835904',
    receipt_url: 'https://wdmtyxzafrxuibqqxbbv.supabase.co/storage/v1/object/public/receipts/sorteo-dia-madre/1792535065814-6n436n0sgrg.jpg',
    created_at: '2026-10-20T22:24:30.165784+00:00',
  },
  {
    id: '373e2ad0-6c07-4cc6-aeba-326459d80f88',
    full_name: 'Mariela Belletich',
    phone: '+543413185532',
    receipt_url: 'https://wdmtyxzafrxuibqqxbbv.supabase.co/storage/v1/object/public/receipts/sorteo-dia-madre/1792085061289-zn5mwfw4f2n.pdf',
    created_at: '2026-10-15T17:24:24.442+00:00',
  },
  {
    id: 'd09944d9-2a58-4baa-807a-bf924edd9a31',
    full_name: 'Brenda Antonella Ledesma',
    phone: '3462568041',
    receipt_url: 'https://wdmtyxzafrxuibqqxbbv.supabase.co/storage/v1/object/public/receipts/sorteo-dia-madre/1792170077688-jfo53qa3vkn.PDF',
    created_at: '2026-10-16T17:01:19.382522+00:00',
  },
  {
    id: '5629cf6a-e64b-48bc-99f4-c8cee62431c9',
    full_name: 'Vanina Andrea gallardo',
    phone: '3412818289',
    receipt_url: 'https://wdmtyxzafrxuibqqxbbv.supabase.co/storage/v1/object/public/receipts/sorteo-dia-madre/1792185779199-m04oc6ayadj.png',
    created_at: '2026-10-16T21:23:01.64407+00:00',
  },
  {
    id: '59f75ee7-386d-403b-982b-57f593fadd55',
    full_name: 'Alicia Menconi',
    phone: '3462565165',
    receipt_url: 'https://wdmtyxzafrxuibqqxbbv.supabase.co/storage/v1/object/public/receipts/sorteo-dia-madre/1792242028769-djdwtvno3xr.jpg',
    created_at: '2026-10-17T13:00:36.227658+00:00',
  },
  {
    id: '56344a93-0c50-446f-bcbc-39ba4378b2e9',
    full_name: 'Barbara Belén Castillo',
    phone: '3462597230',
    receipt_url: 'https://wdmtyxzafrxuibqqxbbv.supabase.co/storage/v1/object/public/receipts/sorteo-dia-madre/1793277604327-a3ppf8dgd48.jpg',
    created_at: '2026-10-29T12:40:12.039034+00:00',
  },
  {
    id: '5a6e3440-c34e-4346-8a12-f1b23fd1c163',
    full_name: 'JAVIER DAMPLO',
    phone: '3413267269',
    receipt_url: 'https://wdmtyxzafrxuibqqxbbv.supabase.co/storage/v1/object/public/receipts/sorteo-dia-madre/1792088096094-8o7uibfjq5i.jpg',
    created_at: '2026-10-15T18:14:58.96259+00:00',
  },
];

// Helpers puros/externos para barajado y selección al azar
function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

export default function AdminSorteoPage() {
  const [entries, setEntries] = useState<SorteoEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Estados del Sorteo de Ganadoras (con persistencia en localStorage)
  const [winners, setWinners] = useState<SorteoEntry[] | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('atfar_sorteo_dia_madre_winners');
        if (saved) return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return INITIAL_PREVIOUS_DRAW;
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (winners && winners.length > 0) {
        localStorage.setItem('atfar_sorteo_dia_madre_winners', JSON.stringify(winners));
      } else if (winners === null) {
        localStorage.removeItem('atfar_sorteo_dia_madre_winners');
      }
    }
  }, [winners]);

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
      // Si la persona eliminada estaba entre las ganadoras, la quitamos también
      if (winners) {
        setWinners(prev => (prev ? prev.filter(w => w.id !== id) : null));
      }
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

  // Sorteo de 8 ganadoras simultáneas
  const handleSortear8 = (count = 8) => {
    if (entries.length === 0) {
      toast.warning('No hay participaciones cargadas todavía.');
      return;
    }

    setIsDrawing(true);

    const totalToPick = Math.min(count, entries.length);
    const shuffled = shuffleArray(entries);
    const selectedWinners = shuffled.slice(0, totalToPick);

    setTimeout(() => {
      setWinners(selectedWinners);
      setIsModalOpen(true);
      setIsDrawing(false);

      if (entries.length < count) {
        toast.warning(`Había solo ${entries.length} participantes, se sortearon todas las disponibles.`);
      } else {
        toast.success(`🎉 ¡Sorteo realizado con éxito! Se seleccionaron las ${totalToPick} ganadoras.`);
      }
    }, 400);
  };

  // Reemplazar / Re-sortear una ganadora individual (suplente si el recibo no cumple o no corresponde)
  const handleReplaceWinner = (winnerIndex: number) => {
    if (!winners) return;

    const currentWinnerIds = new Set(winners.map(w => w.id));
    const availableCandidates = entries.filter(e => !currentWinnerIds.has(e.id));

    if (availableCandidates.length === 0) {
      toast.error('No hay más participantes disponibles para suplentes.');
      return;
    }

    // Excluir varones registrados por error en el sorteo del Día de la Madre
    const MEN_NAMES = ['javier damplo', 'mauricio dominguez', 'martin malvicino'];
    const femaleOnlyCandidates = availableCandidates.filter(
      c => !MEN_NAMES.some(m => c.full_name.toLowerCase().includes(m))
    );
    const candidatePool = femaleOnlyCandidates.length > 0 ? femaleOnlyCandidates : availableCandidates;

    const replacement = getRandomElement(candidatePool);
    const updated = [...winners];
    const previousWinner = updated[winnerIndex];
    updated[winnerIndex] = replacement;

    setWinners(updated);
    toast.info(`Puesto #${winnerIndex + 1} re-sorteado:`, {
      description: `${replacement.full_name} reemplaza a ${previousWinner.full_name}`,
    });
  };

  const handleRestorePreviousDraw = () => {
    setWinners(INITIAL_PREVIOUS_DRAW);
    setIsModalOpen(true);
    toast.success('Sorteo del 03/11/2026 restaurado con los 8 puestos.');
  };

  // Copiar lista de ganadoras para WhatsApp o redes
  const handleCopyWinners = () => {
    if (!winners || winners.length === 0) return;

    const now = new Date();
    const formattedDate = now.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

    const lines = [
      '🎁 ATFAR - GANADORAS DEL SORTEO DÍA DE LA MADRE 🎁',
      `Fecha: ${formattedDate}`,
      '------------------------------------------------',
      ...winners.map((w, idx) => `${idx + 1}º Premio: ${w.full_name.trim()} (Tel: ${w.phone.trim()})`),
      '------------------------------------------------',
      '¡Felicitaciones a todas las ganadoras! ✨',
    ];

    navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    toast.success('Lista copiada al portapapeles con formato.');
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl flex items-center gap-2.5">
            <Gift className="w-7 h-7 text-pink-500" />
            <span>Sorteo Día de la Madre</span>
          </h1>
          <p className="text-xs font-semibold text-muted-foreground mt-0.5">
            Participaciones cargadas desde el formulario público del portal.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Total Badge */}
          <div className="bg-card border border-border rounded-2xl px-4 py-2.5 shadow-premium flex items-center gap-3 glass">
            <div className="p-2 bg-pink-500/10 text-pink-600 border border-pink-500/15 rounded-xl">
              <Users className="w-4 h-4 text-pink-500" />
            </div>
            <div>
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest block">Participantes</span>
              <span className="text-lg font-black text-primary leading-tight">{entries.length}</span>
            </div>
          </div>

          {/* Botón ver ganadoras si ya se sortearon */}
          {winners && winners.length > 0 && !isModalOpen && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-card border-2 border-pink-500/40 text-pink-600 hover:bg-pink-500/10 text-xs font-bold uppercase tracking-wider transition-all shadow-premium cursor-pointer"
            >
              <Trophy className="w-4 h-4 text-amber-500" />
              <span>Ver Ganadoras Guardadas ({winners.length})</span>
            </button>
          )}

          {/* Botón Restaurar Sorteo del 03/11/2026 */}
          <button
            onClick={handleRestorePreviousDraw}
            className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-card border border-border text-foreground hover:bg-muted text-xs font-bold uppercase tracking-wider transition-all shadow-sm cursor-pointer"
            title="Cargar el sorteo original del 03/11/2026 para re-sortear el puesto #8"
          >
            <History className="w-4 h-4 text-pink-500" />
            <span>Restaurar Sorteo 03/11</span>
          </button>

          {/* Botón Principal: Sortear 8 Ganadoras */}
          <button
            onClick={() => handleSortear8(8)}
            disabled={isDrawing || entries.length === 0}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-600 text-white text-xs font-black uppercase tracking-wider hover:from-pink-600 hover:to-rose-700 active:scale-95 transition-all shadow-premium disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
          >
            {isDrawing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Sorteando...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                <span>Sortear 8 Ganadoras</span>
              </>
            )}
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
            placeholder="Buscar participante por nombre o teléfono..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-pink-500/50 text-xs transition-all"
          />
        </div>
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="text-xs font-bold text-muted-foreground hover:text-foreground px-3 py-2 rounded-lg border border-border"
          >
            Limpiar
          </button>
        )}
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
        <div className="grid grid-cols-1 gap-4">
          {filteredEntries.map((entry, index) => (
            <div
              key={entry.id}
              className="bg-card border border-border rounded-2xl p-5 shadow-premium hover:shadow-premium-lg transition-all flex flex-col md:flex-row justify-between gap-5 glass"
            >
              {/* Profile Details */}
              <div className="space-y-3 flex-1">
                <div className="flex items-start gap-3.5">
                  <div className="h-11 w-11 rounded-2xl bg-pink-500/10 text-pink-600 border border-pink-500/15 flex items-center justify-center font-black text-sm flex-shrink-0">
                    {entry.full_name ? entry.full_name.charAt(0).toUpperCase() : '#'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-extrabold text-foreground">{entry.full_name}</h2>
                      <span className="text-[10px] font-bold text-muted-foreground/70 bg-muted px-2 py-0.5 rounded-full">
                        #{index + 1}
                      </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-semibold mt-0.5">
                      <Calendar className="w-3.5 h-3.5 text-secondary" />
                      Inscripta: {new Date(entry.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
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
              <div className="flex md:flex-col justify-end md:justify-center items-center gap-2.5 flex-shrink-0 border-t md:border-t-0 md:border-l border-border pt-4 md:pt-0 md:pl-5">
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

                <div className="flex items-center gap-2">
                  <a
                    href={entry.receipt_url}
                    download={`${entry.full_name.replace(/\s+/g, '_')}_Recibo.pdf`}
                    className="inline-flex items-center justify-center p-2.5 rounded-xl border border-border text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all bg-card"
                    title="Descargar archivo"
                  >
                    <Download className="w-4 h-4 text-secondary" />
                  </a>

                  <button
                    onClick={() => handleDelete(entry.id, entry.receipt_url)}
                    disabled={deletingId === entry.id}
                    className="inline-flex items-center justify-center p-2.5 rounded-xl border border-red-500/20 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all bg-card"
                    title="Eliminar participación"
                  >
                    {deletingId === entry.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL DE RESULTADOS: 8 GANADORAS */}
      {isModalOpen && winners && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-card border border-border rounded-3xl shadow-2xl overflow-hidden glass">
            {/* Modal Header */}
            <div className="p-6 bg-gradient-to-r from-pink-500/15 via-rose-500/10 to-amber-500/15 border-b border-border flex items-start justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="p-3 bg-gradient-to-br from-pink-500 to-rose-600 text-white rounded-2xl shadow-lg flex items-center justify-center">
                  <Trophy className="w-7 h-7 text-amber-300" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                      ¡Ganadoras del Sorteo!
                    </h2>
                    <span className="bg-pink-500/20 text-pink-600 dark:text-pink-400 text-xs font-extrabold px-2.5 py-0.5 rounded-full border border-pink-500/30">
                      {winners.length} Ganadoras
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground font-medium mt-0.5">
                    Seleccionadas al azar sin repetición entre las {entries.length} participantes registradas.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
                title="Cerrar ventana"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Lista de Ganadoras */}
            <div className="p-6 overflow-y-auto space-y-3 flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {winners.map((winner, index) => {
                  const isTop3 = index < 3;
                  const badgeColor =
                    index === 0
                      ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/40'
                      : index === 1
                      ? 'bg-slate-400/20 text-slate-700 dark:text-slate-300 border-slate-400/40'
                      : index === 2
                      ? 'bg-orange-500/20 text-orange-600 dark:text-orange-400 border-orange-500/40'
                      : 'bg-pink-500/15 text-pink-600 dark:text-pink-400 border-pink-500/30';

                  return (
                    <div
                      key={winner.id}
                      className={`relative bg-background border rounded-2xl p-4 transition-all flex flex-col justify-between gap-3 shadow-sm hover:shadow-md ${
                        isTop3 ? 'border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-transparent' : 'border-border'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span
                            className={`flex items-center justify-center w-8 h-8 rounded-xl font-black text-xs border ${badgeColor}`}
                          >
                            #{index + 1}
                          </span>
                          <div>
                            <h3 className="text-sm font-extrabold text-foreground leading-tight">
                              {winner.full_name}
                            </h3>
                            <a
                              href={`tel:${winner.phone}`}
                              className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 font-semibold mt-0.5"
                            >
                              <Phone className="w-3.5 h-3.5 text-secondary" />
                              <span>{winner.phone}</span>
                            </a>
                          </div>
                        </div>

                        {/* Botón Suplente / Reemplazar esta ganadora si el recibo no está en regla o no corresponde */}
                        <button
                          onClick={() => handleReplaceWinner(index)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-pink-300 text-pink-700 bg-pink-50 hover:bg-pink-100 hover:border-pink-400 transition-all text-xs font-bold shadow-xs cursor-pointer"
                          title="Sortear un reemplazo para este puesto"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Cambiar / Re-sortear</span>
                        </button>
                      </div>

                      {/* Botón Ver Recibo */}
                      <div className="pt-2 border-t border-border/60 flex items-center justify-between gap-2">
                        <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                          <UserCheck className="w-3 h-3 text-emerald-500" />
                          Verificar recibo:
                        </span>
                        <a
                          href={winner.receipt_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground font-bold text-xs transition-all"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Ver Recibo</span>
                          <ExternalLink className="w-3 h-3 opacity-70" />
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 bg-muted/40 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => handleSortear8(8)}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-card text-foreground hover:bg-muted text-xs font-bold transition-all cursor-pointer"
                  title="Volver a sortear los 8 puestos desde cero"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Volver a Sortear Todo</span>
                </button>

                <button
                  onClick={handleCopyWinners}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-pink-500 hover:bg-pink-600 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
                  title="Copiar lista formateada para WhatsApp"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-300" />
                      <span>¡Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar para WhatsApp</span>
                    </>
                  )}
                </button>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-foreground text-background font-bold text-xs hover:opacity-90 transition-all cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
