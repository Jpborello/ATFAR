'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { confirmDialog } from '@/components/shared/ConfirmDialog';
import {
  FileText,
  DollarSign,
  Upload,
  BookOpen,
  Eye,
  Trash2
} from 'lucide-react';

interface SalaryScaleDoc {
  id: string;
  name: string;
  title?: string;
  period: string;
  file_url: string;
  active?: boolean;
  is_active?: boolean;
  created_at: string;
}

export default function AdminEscalasPage() {
  const [agreement, setAgreement] = useState<'may2026' | 'feb2026'>('may2026');
  const [period, setPeriod] = useState<string>('july');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [scales, setScales] = useState<any[]>([]);
  const [loadingScales, setLoadingScales] = useState(true);

  // Salary editing states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBasic, setEditBasic] = useState<number>(0);
  const [editNoRem, setEditNoRem] = useState<number>(0);

  // News states
  const [newsTitle, setNewsTitle] = useState('');
  const [newsCategory, setNewsCategory] = useState('Gremiales');
  const [newsContent, setNewsContent] = useState('');
  const [newsSummary, setNewsSummary] = useState('');
  const [newsVisibility, setNewsVisibility] = useState<'public' | 'pharmacy'>('public');
  const [newsImageUrl, setNewsImageUrl] = useState('');

  // File upload states
  const [pdfName, setPdfName] = useState('');
  const [pdfPeriod, setPdfPeriod] = useState('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfIsActive, setPdfIsActive] = useState<boolean>(true);
  const [uploadedDocs, setUploadedDocs] = useState<SalaryScaleDoc[]>([]);
  const [uploading, setUploading] = useState(false);

  const loadUploadedDocs = async () => {
    try {
      const isConfigured = 
        process.env.NEXT_PUBLIC_SUPABASE_URL !== 'your_supabase_project_url_here' && 
        !!process.env.NEXT_PUBLIC_SUPABASE_URL;

      if (!isConfigured) return;

      const { data, error } = await supabase
        .from('salary_scales_docs')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setUploadedDocs(data);
      }
    } catch (err) {
      console.error("Error loading uploaded docs:", err);
      toast.error('No pudimos cargar los documentos de escala salarial.');
    }
  };

  useEffect(() => {
    async function initDocs() {
      await loadUploadedDocs();
    }
    initDocs();
  }, []);

  useEffect(() => {
    async function loadScales() {
      setLoadingScales(true);
      try {
        const isConfigured = 
          process.env.NEXT_PUBLIC_SUPABASE_URL !== 'your_supabase_project_url_here' && 
          !!process.env.NEXT_PUBLIC_SUPABASE_URL;

        if (!isConfigured) return;

        const { data, error } = await supabase
          .from('salary_scales')
          .select('*')
          .eq('agreement', agreement)
          .eq('period', period)
          .order('is_additional', { ascending: true })
          .order('created_at', { ascending: true });

        if (error) throw error;
        setScales(data || []);
      } catch (err) {
        console.error("Error loading scales:", err);
        toast.error('No pudimos cargar la escala salarial.', {
          description: 'Revisá tu conexión y volvé a intentarlo.',
        });
      } finally {
        setLoadingScales(false);
      }
    }
    loadScales();
  }, [agreement, period]);

  const handleAgreementChange = (val: 'may2026' | 'feb2026') => {
    setAgreement(val);
    setPeriod(val === 'may2026' ? 'july' : 'may');
  };

  const handleSaveSalary = async (id: string) => {
    try {
      const { error } = await supabase
        .from('salary_scales')
        .update({
          basic: editBasic,
          no_rem: editNoRem
        })
        .eq('id', id);

      if (error) throw error;

      setScales(prev => prev.map(s => s.id === id ? { ...s, basic: editBasic, no_rem: editNoRem } : s));
      setEditingId(null);
      toast.success('Escala salarial actualizada y aplicada al sistema.');
    } catch (err) {
      console.error(err);
      toast.error('Error al actualizar la escala salarial.');
    }
  };

  const handlePublishNews = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsTitle || !newsContent || !newsSummary) {
      toast.warning('Completá todos los campos obligatorios (Título, Copete y Contenido).');
      return;
    }

    try {
      const isConfigured = 
        process.env.NEXT_PUBLIC_SUPABASE_URL !== 'your_supabase_project_url_here' && 
        !!process.env.NEXT_PUBLIC_SUPABASE_URL;

      if (isConfigured) {
        const { error } = await supabase
          .from('announcements')
          .insert({
            title: newsTitle,
            summary: newsSummary,
            content: newsContent,
            category: newsCategory,
            visibility: newsVisibility,
            image_url: newsImageUrl || 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&q=80&w=600'
          });

        if (error) throw error;
      }

      setNewsTitle('');
      setNewsSummary('');
      setNewsContent('');
      setNewsImageUrl('');
      setNewsVisibility('public');
      toast.success('Noticia publicada con éxito en el sistema.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al publicar el comunicado.';
      toast.error(msg);
    }
  };

  const handleUploadPdf = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pdfName || !pdfPeriod) {
      toast.warning('Completá todos los campos.');
      return;
    }
    if (!pdfFile) {
      toast.warning('Seleccioná un archivo (PDF o Imagen).');
      return;
    }

    setUploading(true);
    try {
      const isConfigured = 
        process.env.NEXT_PUBLIC_SUPABASE_URL !== 'your_supabase_project_url_here' && 
        !!process.env.NEXT_PUBLIC_SUPABASE_URL;

      let fileUrl = '';

      if (isConfigured) {
        // 1. Upload file to Supabase Storage
        const fileExt = pdfFile.name.split('.').pop();
        const fileName = `scales-${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
        const filePath = `scales/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('receipts')
          .upload(filePath, pdfFile);

        if (uploadError) throw new Error(`Error al subir el archivo: ${uploadError.message}`);

        // 2. Get Public URL
        const { data: { publicUrl } } = supabase.storage
          .from('receipts')
          .getPublicUrl(filePath);

        fileUrl = publicUrl;

        // 3. If setting as active, turn other active scales off
        if (pdfIsActive) {
          const { error: updateError } = await supabase
            .from('salary_scales_docs')
            .update({ is_active: false })
            .eq('is_active', true);
            
          if (updateError) console.warn("Could not deactivate previous scales:", updateError.message);
        }

        // 4. Insert into database
        const { error: insertError } = await supabase
          .from('salary_scales_docs')
          .insert({
            title: pdfName,
            period: pdfPeriod,
            file_url: fileUrl,
            is_active: pdfIsActive
          });

        if (insertError) throw new Error(`Error al registrar en BD: ${insertError.message}`);
      } else {
        fileUrl = URL.createObjectURL(pdfFile);
        console.warn("Supabase not configured, simulating local upload.");
      }

      setPdfName('');
      setPdfPeriod('');
      setPdfFile(null);
      setPdfIsActive(true);
      await loadUploadedDocs();
      toast.success('Escala salarial cargada y publicada exitosamente.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al subir la escala.';
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const isConfigured = 
        process.env.NEXT_PUBLIC_SUPABASE_URL !== 'your_supabase_project_url_here' && 
        !!process.env.NEXT_PUBLIC_SUPABASE_URL;

      if (!isConfigured) return;

      if (!currentStatus) {
        // We are setting it to active, so first deactivate others
        await supabase
          .from('salary_scales_docs')
          .update({ is_active: false })
          .eq('is_active', true);
      }

      const { error } = await supabase
        .from('salary_scales_docs')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      
      await loadUploadedDocs();
      toast.success('Estado de escala salarial actualizado.');
    } catch (err) {
      console.error(err);
      toast.error('Error al actualizar el estado.');
    }
  };

  const handleDeleteDoc = async (id: string, fileUrl: string) => {
    const confirmed = await confirmDialog({
      title: 'Eliminar documento',
      message: '¿Estás seguro de que querés eliminar este documento de escala salarial?',
      confirmLabel: 'Eliminar',
      danger: true,
    });
    if (!confirmed) return;

    try {
      const isConfigured = 
        process.env.NEXT_PUBLIC_SUPABASE_URL !== 'your_supabase_project_url_here' && 
        !!process.env.NEXT_PUBLIC_SUPABASE_URL;

      if (isConfigured) {
        try {
          if (fileUrl.includes('/receipts/')) {
            const pathParts = fileUrl.split('/receipts/');
            if (pathParts.length > 1) {
              const filePath = pathParts[1];
              await supabase.storage.from('receipts').remove([filePath]);
            }
          }
        } catch (storageErr) {
          console.warn("Storage deletion error (ignored):", storageErr);
        }

        const { error } = await supabase
          .from('salary_scales_docs')
          .delete()
          .eq('id', id);

        if (error) throw error;
      }

      setUploadedDocs(prev => prev.filter(d => d.id !== id));
      toast.success('Documento eliminado del sistema.');
    } catch (err) {
      console.error(err);
      toast.error('Error al eliminar el documento.');
    }
  };

  return (
    <div className="space-y-8">
      {/* Title Header */}
      <div className="border-b border-border pb-6">
        <h1 className="text-3xl font-extrabold text-foreground tracking-tight">
          Novedades y Escalas Salariales
        </h1>
        <p className="text-sm text-muted-foreground">
          Gestión de sueldos básicos por convenio, carga de actas paritarias y publicación de comunicados.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Edit Salaries Grid */}
        <div className="lg:col-span-7 bg-card border border-border rounded-3xl p-6 shadow-lg glass space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border pb-4 gap-4">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-secondary" />
              Básicos y No Remunerativos
            </h2>
            
            {/* Agreement & Period Selectors */}
            <div className="flex gap-2">
              <select
                value={agreement}
                onChange={(e) => handleAgreementChange(e.target.value as 'may2026' | 'feb2026')}
                className="px-2.5 py-1.5 rounded-xl border border-border bg-background text-xs font-bold focus:outline-none text-foreground"
              >
                <option value="may2026">Acuerdo Mayo 2026</option>
                <option value="feb2026">Acuerdo Febrero 2026</option>
              </select>

              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl border border-border bg-background text-xs font-bold focus:outline-none text-foreground"
              >
                {agreement === 'may2026' ? (
                  <>
                    <option value="may">Mayo 2026</option>
                    <option value="june">Junio 2026</option>
                    <option value="july">Julio 2026</option>
                  </>
                ) : (
                  <>
                    <option value="feb">Febrero 2026</option>
                    <option value="march">Marzo 2026</option>
                    <option value="april">Abril 2026</option>
                    <option value="may">Mayo 2026</option>
                  </>
                )}
              </select>
            </div>
          </div>

          {loadingScales ? (
            <div className="h-60 w-full flex items-center justify-center text-xs font-semibold text-muted-foreground">
              Cargando grilla salarial...
            </div>
          ) : scales.length === 0 ? (
            <div className="h-60 w-full flex flex-col items-center justify-center text-xs text-muted-foreground border border-dashed border-border rounded-2xl">
              No se encontraron escalas para este período.
            </div>
          ) : (
            <div className="space-y-3">
              {scales.map((cat) => (
                <div 
                  key={cat.id}
                  className="border border-border rounded-xl p-4 flex flex-col bg-card/60 hover:bg-muted/10 transition-all gap-4"
                >
                  <div className="flex items-start justify-between w-full">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-xs font-bold text-foreground">{cat.category}</h3>
                        <span className={`inline-flex px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${
                          cat.is_additional 
                            ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20' 
                            : 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                        }`}>
                          {cat.is_additional ? 'Adicional' : 'Básico'}
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground font-semibold leading-relaxed max-w-md">{cat.description || '---'}</p>
                    </div>

                    <div className="flex-shrink-0">
                      {editingId !== cat.id && (
                        <button
                          onClick={() => {
                            setEditingId(cat.id);
                            setEditBasic(Number(cat.basic));
                            setEditNoRem(Number(cat.no_rem));
                          }}
                          className="text-[10px] text-secondary hover:underline font-bold"
                        >
                          Editar valores
                        </button>
                      )}
                    </div>
                  </div>

                  {editingId === cat.id ? (
                    <div className="flex flex-wrap items-center gap-4 bg-muted/20 border border-border/80 p-3 rounded-xl w-full">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-700 dark:text-slate-350 uppercase">Básico:</span>
                        <span className="text-[10px] font-bold">$</span>
                        <input
                          type="number"
                          step="0.01"
                          value={editBasic}
                          onChange={(e) => setEditBasic(Number(e.target.value))}
                          className="w-24 px-2 py-1 rounded-lg border border-border bg-background text-xs font-semibold focus:outline-none"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-700 dark:text-slate-350 uppercase">No Rem:</span>
                        <span className="text-[10px] font-bold">$</span>
                        <input
                          type="number"
                          step="0.01"
                          value={editNoRem}
                          onChange={(e) => setEditNoRem(Number(e.target.value))}
                          className="w-24 px-2 py-1 rounded-lg border border-border bg-background text-xs font-semibold focus:outline-none"
                        />
                      </div>

                      <div className="flex gap-1.5 ml-auto">
                        <button
                          onClick={() => handleSaveSalary(cat.id)}
                          className="px-2.5 py-1 rounded-lg bg-secondary text-secondary-foreground text-[10px] font-bold cursor-pointer hover:bg-secondary/90 transition-all"
                        >
                          Guardar
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="px-2 py-1 rounded-lg border border-border text-[10px] text-muted-foreground cursor-pointer hover:bg-muted transition-all bg-white"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-6 border-t border-border/40 pt-2.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                      <div>
                        <span className="text-[9px] text-muted-foreground uppercase mr-1">Básico:</span>
                        <span className="text-foreground font-extrabold">${Number(cat.basic).toLocaleString('es-AR')}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-muted-foreground uppercase mr-1">No Rem:</span>
                        <span className="text-foreground font-extrabold">${Number(cat.no_rem).toLocaleString('es-AR')}</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: News and PDF tools */}
        <div className="lg:col-span-5 space-y-6">
          {/* News publisher form */}
          <form onSubmit={handlePublishNews} className="bg-card border border-border rounded-3xl p-6 shadow-lg glass space-y-4">
            <h3 className="font-bold text-foreground text-sm border-b border-border pb-3 flex items-center gap-2">
              <BookOpen className="w-4.5 h-4.5 text-secondary" />
              Publicar Comunicado
            </h3>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Título de la Noticia *</label>
              <input
                type="text"
                required
                value={newsTitle}
                onChange={(e) => setNewsTitle(e.target.value)}
                placeholder="Ej. Comunicado sobre el feriado del 9 de Julio"
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-secondary/50 text-xs transition-all text-foreground"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Copete / Resumen Corto *</label>
              <input
                type="text"
                required
                value={newsSummary}
                onChange={(e) => setNewsSummary(e.target.value)}
                placeholder="Una breve descripción que se verá en el listado..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-secondary/50 text-xs transition-all text-foreground"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Categoría</label>
                <select
                  value={newsCategory}
                  onChange={(e) => setNewsCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-secondary/50 text-xs transition-all text-foreground"
                >
                  <option value="Gremiales">Gremiales</option>
                  <option value="Beneficios">Beneficios</option>
                  <option value="Capacitación">Capacitación</option>
                  <option value="Institucional">Institucional</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Visibilidad / Destino</label>
                <select
                  value={newsVisibility}
                  onChange={(e) => setNewsVisibility(e.target.value as 'public' | 'pharmacy')}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-secondary/50 text-xs transition-all text-foreground font-bold"
                >
                  <option value="public">Público (Web y Noticias)</option>
                  <option value="pharmacy">Privado (Sólo Farmacias)</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">URL de Imagen (Opcional)</label>
              <input
                type="text"
                value={newsImageUrl}
                onChange={(e) => setNewsImageUrl(e.target.value)}
                placeholder="Ej. https://images.unsplash.com/..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-secondary/50 text-xs transition-all text-foreground"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Contenido del Comunicado *</label>
              <textarea
                required
                rows={3}
                value={newsContent}
                onChange={(e) => setNewsContent(e.target.value)}
                placeholder="Escribí el texto completo que leerán los afiliados..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-secondary/50 text-xs transition-all resize-none text-foreground"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-secondary text-secondary-foreground text-xs font-bold hover:bg-secondary/90 transition-all shadow-sm cursor-pointer"
            >
              Publicar Comunicado
            </button>
          </form>

          {/* PDF document publisher */}
          <form onSubmit={handleUploadPdf} className="bg-card border border-border rounded-3xl p-6 shadow-lg glass space-y-4">
            <h3 className="font-bold text-foreground text-sm border-b border-border pb-3 flex items-center gap-2">
              <Upload className="w-4.5 h-4.5 text-secondary" />
              Subir Acta o Escala Salarial
            </h3>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Nombre del Documento *</label>
              <input
                type="text"
                required
                value={pdfName}
                onChange={(e) => setPdfName(e.target.value)}
                placeholder="Ej. Acuerdo Salarial Paritarias CCT"
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-secondary/50 text-xs transition-all text-foreground"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Período / Mes aplicable *</label>
              <input
                type="text"
                required
                value={pdfPeriod}
                onChange={(e) => setPdfPeriod(e.target.value)}
                placeholder="Ej. Julio 2026"
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-secondary/50 text-xs transition-all text-foreground"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground block">Archivo (PDF o Imagen) *</label>
              <input 
                type="file" 
                accept="application/pdf,image/*" 
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    setPdfFile(e.target.files[0]);
                  }
                }}
                className="hidden"
                id="pdf-file-upload"
              />
              <label 
                htmlFor="pdf-file-upload" 
                className="border border-dashed border-border rounded-xl p-4 text-center cursor-pointer hover:bg-muted/10 transition-all block bg-background text-foreground animate-pulse-slow"
              >
                <span className="text-xs font-semibold text-muted-foreground block">
                  {pdfFile ? `Seleccionado: ${pdfFile.name}` : 'Click para seleccionar PDF o Imagen'}
                </span>
                <span className="text-[10px] text-muted-foreground/75 block mt-1">Máximo 10MB</span>
              </label>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="pdfIsActive"
                checked={pdfIsActive}
                onChange={(e) => setPdfIsActive(e.target.checked)}
                className="rounded text-primary focus:ring-primary w-4 h-4 cursor-pointer"
              />
              <label htmlFor="pdfIsActive" className="text-xs font-bold text-foreground cursor-pointer select-none">
                Establecer como escala activa (carrusel de inicio)
              </label>
            </div>

            <button
              type="submit"
              disabled={uploading}
              className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/95 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {uploading ? 'Subiendo escala...' : 'Publicar Escala Salarial'}
            </button>
          </form>
        </div>
      </div>

      {/* Historical List of Documents in Admin */}
      <div className="bg-card border border-border rounded-3xl p-6 shadow-lg glass space-y-4">
        <h3 className="font-bold text-foreground text-sm border-b border-border pb-3 flex items-center gap-2">
          <FileText className="w-4.5 h-4.5 text-secondary" />
          Documentos de Escalas Salariales Cargados
        </h3>
        
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs text-foreground font-sans">
            <thead>
              <tr className="border-b border-border text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                <th className="py-3 px-4">Documento</th>
                <th className="py-3 px-4">Período</th>
                <th className="py-3 px-4 text-center">Estado en Carrusel</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {uploadedDocs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-xs text-muted-foreground font-semibold">
                    No se han cargado documentos de escala aún.
                  </td>
                </tr>
              ) : (
                uploadedDocs.map((doc) => (
                  <tr key={doc.id} className="hover:bg-muted/5 transition-colors">
                    <td className="py-3 px-4 font-bold">
                      {doc.title}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-700">
                      {doc.period}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleToggleActive(doc.id, !!(doc.is_active ?? doc.active))}
                        className={`inline-flex px-2 py-1 rounded text-[9px] font-black uppercase cursor-pointer hover:opacity-90 transition-all ${
                          doc.is_active
                            ? 'bg-emerald-500/15 text-emerald-600 border border-emerald-500/30'
                            : 'bg-slate-500/10 text-slate-500 border border-slate-500/20'
                        }`}
                      >
                        {doc.is_active ? 'Activa' : 'Inactiva (Activar)'}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex justify-end items-center gap-2">
                        <a
                          href={doc.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 text-slate-500 hover:text-primary transition-colors cursor-pointer"
                          title="Ver Documento"
                        >
                          <Eye className="w-4.5 h-4.5" />
                        </a>
                        <button
                          onClick={() => handleDeleteDoc(doc.id, doc.file_url)}
                          className="p-1 text-slate-500 hover:text-red-500 transition-colors cursor-pointer"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4.5 h-4.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
