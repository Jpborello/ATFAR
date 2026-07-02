'use client';

import { useState } from 'react';
import { Briefcase, Upload, Send, CheckCircle, AlertCircle, FileText } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function BolsaPage() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    message: '',
    position: 'Personal en Gestión de Farmacia',
  });
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type !== 'application/pdf') {
        alert('Por favor, subí solo archivos en formato PDF.');
        return;
      }
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        alert('El archivo supera el límite de 5MB.');
        return;
      }
      setCvFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cvFile) {
      alert('Por favor, selecciona tu archivo CV en formato PDF.');
      return;
    }

    setLoading(true);
    setStatus('idle');

    try {
      // Check if Supabase keys are configured, otherwise run simulation
      const isConfigured = 
        process.env.NEXT_PUBLIC_SUPABASE_URL !== 'your_supabase_project_url_here' && 
        !!process.env.NEXT_PUBLIC_SUPABASE_URL;

      if (!isConfigured) {
        console.warn('Supabase not configured, running simulation.');
        // Simulate upload delay
        await new Promise((resolve) => setTimeout(resolve, 2000));
        setStatus('success');
        setFormData({ fullName: '', email: '', phone: '', message: '', position: 'Personal en Gestión de Farmacia' });
        setCvFile(null);
        setLoading(false);
        return;
      }

      // 1. Upload CV file to Supabase Storage Bucket 'cvs'
      const fileExt = cvFile.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `public/${fileName}`;

      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('cvs')
        .upload(filePath, cvFile);

      if (uploadError) throw new Error(`Error al subir el archivo: ${uploadError.message}`);

      // 2. Get Public URL of the uploaded file
      const { data: { publicUrl } } = supabase.storage
        .from('cvs')
        .getPublicUrl(filePath);

      // 3. Insert application into database table 'job_applications'
      const { error: insertError } = await supabase
        .from('job_applications')
        .insert({
          full_name: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          message: formData.message,
          cv_url: publicUrl,
          position: formData.position,
        });

      if (insertError) throw new Error(`Error al guardar los datos: ${insertError.message}`);

      setStatus('success');
      setFormData({ fullName: '', email: '', phone: '', message: '', position: 'Personal en Gestión de Farmacia' });
      setCvFile(null);
    } catch (error: any) {
      console.error(error);
      setErrorMessage(error.message || 'Ocurrió un error inesperado al enviar la solicitud.');
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative py-12 px-4 sm:px-6 lg:px-8">
      {/* Background decoration */}
      <div className="absolute inset-0 max-w-7xl mx-auto h-[400px] pointer-events-none opacity-20 dark:opacity-30">
        <div className="absolute top-[10%] left-[10%] w-[300px] h-[300px] rounded-full bg-secondary blur-[90px]" />
      </div>

      <div className="max-w-4xl mx-auto relative space-y-10">
        <div className="text-center space-y-4">
          <div className="inline-flex p-3 bg-secondary/15 text-secondary rounded-2xl">
            <Briefcase className="w-8 h-8" />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
            Bolsa de Trabajo
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Formá parte de nuestra red. Cargá tu currículum vitae en PDF para que las farmacias adheridas de Rosario puedan convocarte a entrevistas de trabajo.
          </p>
        </div>

        {status === 'success' ? (
          <div className="bg-card border border-emerald-500/20 rounded-3xl p-8 text-center space-y-6 shadow-xl glass max-w-2xl mx-auto">
            <div className="inline-flex p-4 bg-emerald-500/10 text-emerald-500 rounded-full">
              <CheckCircle className="w-12 h-12" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-foreground">¡CV Recibido Exitosamente!</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Tus datos fueron cargados con éxito en la base de datos de la Bolsa de Trabajo de ATFAR. Cuando una farmacia registre una búsqueda laboral compatible con tu perfil, te podrán contactar.
              </p>
            </div>
            <button
              onClick={() => setStatus('idle')}
              className="px-6 py-2.5 rounded-xl bg-secondary text-secondary-foreground font-semibold hover:bg-secondary/90 transition-all shadow-md text-sm"
            >
              Cargar otra postulación
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Info Box */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-card border border-border rounded-2xl p-6 shadow-lg space-y-4 glass">
                <h3 className="font-bold text-lg text-foreground">Información Importante</h3>
                <ul className="space-y-3 text-xs text-muted-foreground leading-relaxed list-disc list-inside">
                  <li>El archivo debe estar únicamente en formato <strong>PDF</strong>.</li>
                  <li>El tamaño máximo permitido es de <strong>5 MB</strong>.</li>
                  <li>Asegúrate de incluir datos de contacto actualizados (teléfono y correo).</li>
                  <li>Las búsquedas laborales activas son consultadas por los farmacéuticos asociados mensualmente.</li>
                </ul>
              </div>
            </div>

            {/* Form Box */}
            <form onSubmit={handleSubmit} className="lg:col-span-8 bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-xl space-y-6 glass">
              {status === 'error' && (
                <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-sm">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="fullName" className="text-sm font-semibold text-foreground">
                    Nombre Completo *
                  </label>
                  <input
                    type="text"
                    id="fullName"
                    name="fullName"
                    required
                    value={formData.fullName}
                    onChange={handleInputChange}
                    placeholder="Ej. Juan Pérez"
                    className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-secondary/55 text-sm transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="phone" className="text-sm font-semibold text-foreground">
                    Teléfono de Contacto *
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    required
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="Ej. 3416554433"
                    className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-secondary/55 text-sm transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="position" className="text-sm font-semibold text-foreground">
                  Puesto / Categoría al que se postula *
                </label>
                <select
                  id="position"
                  name="position"
                  required
                  value={formData.position}
                  onChange={(e) => setFormData(prev => ({ ...prev, position: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-secondary/55 text-sm transition-all font-semibold text-foreground"
                >
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

              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-semibold text-foreground">
                  Correo Electrónico *
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="ejemplo@correo.com"
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-secondary/55 text-sm transition-all"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="message" className="text-sm font-semibold text-foreground">
                  Breve presentación / Experiencia (Opcional)
                </label>
                <textarea
                  id="message"
                  name="message"
                  rows={4}
                  value={formData.message}
                  onChange={handleInputChange}
                  placeholder="Contanos brevemente tu experiencia en farmacias, puestos deseados, o disponibilidad horaria..."
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-secondary/55 text-sm transition-all resize-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground block">
                  Adjuntar Currículum Vitae (PDF) *
                </label>
                <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-secondary/60 hover:bg-muted/10 transition-all cursor-pointer relative group">
                  <input
                    type="file"
                    id="cvFile"
                    accept=".pdf"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <div className="p-3 bg-secondary/10 text-secondary rounded-full group-hover:scale-105 transition-transform">
                      <Upload className="w-6 h-6" />
                    </div>
                    {cvFile ? (
                      <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                        <FileText className="w-4.5 h-4.5 text-secondary" />
                        <span>{cvFile.name} ({(cvFile.size / 1024 / 1024).toFixed(2)} MB)</span>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm font-semibold text-foreground">
                          Hacé clic para buscar o arrastrá tu PDF acá
                        </p>
                        <p className="text-xs text-muted-foreground">PDF de hasta 5 MB</p>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full inline-flex items-center justify-center px-6 py-3.5 rounded-xl bg-secondary text-secondary-foreground font-bold hover:bg-secondary/95 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
                      Procesando envío...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2 group-hover:translate-x-0.5 transition-transform" />
                      Enviar Postulación
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
