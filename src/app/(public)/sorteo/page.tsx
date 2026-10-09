/* eslint-disable @next/next/no-img-element */
'use client';

import { useState } from 'react';
import { Gift, Upload, Send, CheckCircle, AlertCircle, FileText } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function SorteoDiaMadrePage() {
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
  });
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
      if (!validTypes.includes(file.type)) {
        setErrorMessage('Formato de archivo inválido. Subí un archivo PDF o una imagen (JPG, PNG).');
        setStatus('error');
        return;
      }
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setErrorMessage('El archivo supera el límite de 5MB.');
        setStatus('error');
        return;
      }
      setStatus('idle');
      setReceiptFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiptFile) {
      setErrorMessage('Adjuntá tu último recibo de sueldo con la afiliación al sindicato.');
      setStatus('error');
      return;
    }

    setLoading(true);
    setStatus('idle');

    try {
      const isConfigured =
        process.env.NEXT_PUBLIC_SUPABASE_URL !== 'your_supabase_project_url_here' &&
        !!process.env.NEXT_PUBLIC_SUPABASE_URL;

      if (!isConfigured) {
        console.warn('Supabase not configured, running simulation.');
        await new Promise((resolve) => setTimeout(resolve, 1500));
        setStatus('success');
        setFormData({ fullName: '', phone: '' });
        setReceiptFile(null);
        setLoading(false);
        return;
      }

      // 1. Upload receipt to storage bucket 'receipts'
      const fileExt = receiptFile.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `sorteo-dia-madre/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(filePath, receiptFile);

      if (uploadError) throw new Error(`Error al subir el recibo: ${uploadError.message}`);

      // 2. Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('receipts')
        .getPublicUrl(filePath);

      // 3. Insert entry into 'sorteo_dia_madre_entries'
      const { error: insertError } = await supabase
        .from('sorteo_dia_madre_entries')
        .insert({
          full_name: formData.fullName,
          phone: formData.phone,
          receipt_url: publicUrl,
        });

      if (insertError) throw new Error(`Error al registrar la participación: ${insertError.message}`);

      setStatus('success');
      setFormData({ fullName: '', phone: '' });
      setReceiptFile(null);
    } catch (error: unknown) {
      console.error(error);
      const message = error instanceof Error ? error.message : 'Ocurrió un error inesperado al enviar tu participación.';
      setErrorMessage(message);
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative py-12 px-4 sm:px-6 lg:px-8">
      {/* Background decoration */}
      <div className="absolute inset-0 max-w-7xl mx-auto h-[400px] pointer-events-none opacity-20 dark:opacity-30">
        <div className="absolute top-[10%] left-[10%] w-[300px] h-[300px] rounded-full bg-pink-400 blur-[90px]" />
      </div>

      <div className="max-w-4xl mx-auto relative space-y-10">
        <div className="text-center space-y-4">
          <div className="inline-flex p-3 bg-pink-500/15 text-pink-600 rounded-2xl">
            <Gift className="w-8 h-8" />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
            Sorteo Día de la Madre
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Gracias por todo lo que dan. Completá tus datos y adjuntá tu último recibo de sueldo con la afiliación al sindicato para participar.
          </p>
        </div>

        {status === 'success' ? (
          <div className="bg-card border border-emerald-500/20 rounded-3xl p-8 text-center space-y-6 shadow-xl glass max-w-2xl mx-auto">
            <div className="inline-flex p-4 bg-emerald-500/10 text-emerald-500 rounded-full">
              <CheckCircle className="w-12 h-12" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-foreground">¡Ya estás participando!</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Registramos tu participación en el Sorteo Día de la Madre de ATFAR. El sorteo se realiza el último domingo de octubre — ¡mucha suerte!
              </p>
            </div>
            <button
              onClick={() => setStatus('idle')}
              className="px-6 py-2.5 rounded-xl bg-secondary text-secondary-foreground font-semibold hover:bg-secondary/90 transition-all shadow-md text-sm"
            >
              Cargar otra participación
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Poster + Info Box */}
            <div className="lg:col-span-4 space-y-6">
              <div className="rounded-2xl overflow-hidden border border-border shadow-lg">
                <img
                  src="/images/sorteo_dia_madre.jpeg"
                  alt="Sorteo Día de la Madre - ATFAR"
                  className="w-full h-auto block"
                />
              </div>
              <div className="bg-card border border-border rounded-2xl p-6 shadow-lg space-y-4 glass">
                <h3 className="font-bold text-lg text-foreground">¿Cómo participar?</h3>
                <ul className="space-y-3 text-xs text-muted-foreground leading-relaxed list-disc list-inside">
                  <li>Enviá tu <strong>nombre completo</strong>.</li>
                  <li>Adjuntá el <strong>último recibo de sueldo</strong> con la afiliación al sindicato.</li>
                  <li>El sorteo se realiza el <strong>último domingo de octubre</strong>.</li>
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
                    placeholder="Ej. María González"
                    className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-pink-500/50 text-sm transition-all"
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
                    className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-pink-500/50 text-sm transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground block">
                  Adjuntar último Recibo de Sueldo *
                </label>
                <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-pink-400/60 hover:bg-muted/10 transition-all cursor-pointer relative group">
                  <input
                    type="file"
                    accept=".pdf,image/png,image/jpeg"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <div className="p-3 bg-pink-500/10 text-pink-600 rounded-full group-hover:scale-105 transition-transform">
                      <Upload className="w-6 h-6" />
                    </div>
                    {receiptFile ? (
                      <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                        <FileText className="w-4.5 h-4.5 text-pink-500" />
                        <span>{receiptFile.name} ({(receiptFile.size / 1024 / 1024).toFixed(2)} MB)</span>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm font-semibold text-foreground">
                          Hacé clic para buscar o arrastrá tu comprobante acá
                        </p>
                        <p className="text-xs text-muted-foreground">PDF, JPG o PNG de hasta 5 MB</p>
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
                      Enviando participación...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2 group-hover:translate-x-0.5 transition-transform" />
                      Quiero Participar
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
