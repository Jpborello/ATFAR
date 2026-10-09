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
  UserCheck,
  Plus,
  Upload,
  X,
  Send,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { confirmDialog } from '@/components/shared/ConfirmDialog';
import { cctCategories } from '@/lib/dateUtils';

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

export default function AdminEmpleoPage() {
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPosition, setFilterPosition] = useState<string>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Manual CV upload (admin-side)
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    message: '',
    position: 'Personal en Gestión de Farmacia',
  });
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  async function fetchApplications() {
    try {
      const { data, error } = await supabase
        .from('job_applications')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setApplications(data || []);
    } catch (err) {
      console.error('Error loading applications:', err);
      toast.error('No pudimos cargar las postulaciones.', {
        description: 'Revisá tu conexión y volvé a intentarlo.',
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchApplications();
  }, []);

  const handleUploadFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type !== 'application/pdf') {
        toast.warning('Subí solo archivos en formato PDF.');
        return;
      }
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.warning('El archivo supera el límite de 5MB.');
        return;
      }
      setUploadFile(file);
    }
  };

  const resetUploadForm = () => {
    setUploadForm({ fullName: '', email: '', phone: '', message: '', position: 'Personal en Gestión de Farmacia' });
    setUploadFile(null);
    setUploadError('');
  };

  const handleManualUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      toast.warning('Seleccioná el archivo CV en formato PDF.');
      return;
    }

    setUploading(true);
    setUploadError('');

    try {
      // 1. Upload CV file to Supabase Storage Bucket 'cvs'
      const fileExt = uploadFile.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `public/${fileName}`;

      const { error: uploadErr } = await supabase.storage
        .from('cvs')
        .upload(filePath, uploadFile);

      if (uploadErr) throw new Error(`Error al subir el archivo: ${uploadErr.message}`);

      // 2. Get Public URL of the uploaded file
      const { data: { publicUrl } } = supabase.storage
        .from('cvs')
        .getPublicUrl(filePath);

      // 3. Insert application into database table 'job_applications'
      const { data: inserted, error: insertError } = await supabase
        .from('job_applications')
        .insert({
          full_name: uploadForm.fullName,
          email: uploadForm.email,
          phone: uploadForm.phone,
          message: uploadForm.message,
          cv_url: publicUrl,
          position: uploadForm.position,
        })
        .select()
        .single();

      if (insertError) throw new Error(`Error al guardar los datos: ${insertError.message}`);

      if (inserted) {
        setApplications(prev => [...prev, inserted as JobApplication]);
      } else {
        fetchApplications();
      }

      toast.success('CV cargado correctamente en la bolsa de empleo.');
      resetUploadForm();
      setShowUploadModal(false);
    } catch (err) {
      console.error('Error uploading CV manually:', err);
      const message = err instanceof Error ? err.message : 'Ocurrió un error inesperado al cargar el CV.';
      setUploadError(message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string, cvUrl: string) => {
    const confirmed = await confirmDialog({
      title: 'Eliminar postulación',
      message: '¿Seguro que deseas eliminar esta postulación de la bolsa de trabajo?',
      confirmLabel: 'Eliminar',
      danger: true,
    });
    if (!confirmed) return;

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
      toast.success('Postulación eliminada.');
    } catch (err) {
      console.error('Error deleting application:', err);
      toast.error('Ocurrió un error al eliminar el registro.');
    } finally {
      setDeletingId(null);
    }
  };

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
        
        <div className="flex items-center gap-4">
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

          {/* Manual Upload Button */}
          <button
            onClick={() => { resetUploadForm(); setShowUploadModal(true); }}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider hover:bg-primary/95 transition-all shadow-premium"
          >
            <Plus className="w-4 h-4" />
            <span>Cargar CV</span>
          </button>
        </div>
      </div>

      {/* Search Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-card border border-border p-4 rounded-2xl shadow-premium glass">
        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <div className="relative flex-grow">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre, correo, teléfono o mensaje..."
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
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-sm font-extrabold text-foreground">{app.full_name}</h2>
                      {app.position && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-primary/10 text-primary border border-primary/20">
                          {app.position}
                        </span>
                      )}
                    </div>
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

      {/* Manual CV Upload Modal */}
      {showUploadModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => !uploading && setShowUploadModal(false)}
        >
          <div
            className="bg-card border border-border rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto glass"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-5 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/5 text-primary border border-primary/10 rounded-xl">
                  <Upload className="w-5 h-5 text-secondary" />
                </div>
                <h2 className="text-sm font-extrabold text-foreground">Cargar CV manualmente</h2>
              </div>
              <button
                onClick={() => !uploading && setShowUploadModal(false)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all"
                disabled={uploading}
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            <form onSubmit={handleManualUpload} className="p-6 space-y-5">
              {uploadError && (
                <div className="flex items-center gap-3 p-3.5 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-xs">
                  <AlertCircle className="w-4.5 h-4.5 flex-shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Nombre Completo *</label>
                  <input
                    type="text"
                    required
                    value={uploadForm.fullName}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, fullName: e.target.value }))}
                    placeholder="Ej. Juan Pérez"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-secondary/50 text-xs transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Teléfono *</label>
                  <input
                    type="tel"
                    required
                    value={uploadForm.phone}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="Ej. 3416554433"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-secondary/50 text-xs transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Correo Electrónico *</label>
                <input
                  type="email"
                  required
                  value={uploadForm.email}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="ejemplo@correo.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-secondary/50 text-xs transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Puesto / Categoría *</label>
                <select
                  required
                  value={uploadForm.position}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, position: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-secondary/50 text-xs font-bold transition-all text-foreground"
                >
                  {cctCategories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                  <option value="Otros / Administrativo">Otros / Administrativo</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Presentación / Experiencia (Opcional)</label>
                <textarea
                  rows={3}
                  value={uploadForm.message}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, message: e.target.value }))}
                  placeholder="Breve resumen de experiencia, disponibilidad, etc..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-secondary/50 text-xs transition-all resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground block">Archivo CV (PDF) *</label>
                <div className="border-2 border-dashed border-border rounded-xl p-5 text-center hover:border-secondary/60 hover:bg-muted/10 transition-all cursor-pointer relative group">
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleUploadFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="flex flex-col items-center justify-center space-y-1.5">
                    <div className="p-2.5 bg-secondary/10 text-secondary rounded-full group-hover:scale-105 transition-transform">
                      <Upload className="w-5 h-5" />
                    </div>
                    {uploadFile ? (
                      <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                        <FileText className="w-4 h-4 text-secondary" />
                        <span>{uploadFile.name} ({(uploadFile.size / 1024 / 1024).toFixed(2)} MB)</span>
                      </div>
                    ) : (
                      <>
                        <p className="text-xs font-semibold text-foreground">
                          Hacé clic para buscar o arrastrá el PDF acá
                        </p>
                        <p className="text-[10px] text-muted-foreground">PDF de hasta 5 MB</p>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  disabled={uploading}
                  className="flex-1 inline-flex items-center justify-center px-4 py-3 rounded-xl border border-border text-foreground text-xs font-bold uppercase tracking-wider hover:bg-muted/40 transition-all disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-secondary text-secondary-foreground text-xs font-bold uppercase tracking-wider hover:bg-secondary/95 transition-all shadow-md disabled:opacity-50"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Cargando...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Cargar CV</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
