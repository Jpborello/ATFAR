'use client';

import { useState } from 'react';
import { GraduationCap, Upload, Send, CheckCircle, AlertCircle, FileText, Plus, Trash } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface ChildRequest {
  fullName: string;
  age: string;
  schoolLevel: 'preescolar' | 'primaria' | 'secundaria' | '';
}

export default function UtilesPage() {
  const [affiliateData, setAffiliateData] = useState({
    fullName: '',
    cuil: '',
    email: '',
    phone: '',
  });
  
  const [childrenList, setChildrenList] = useState<ChildRequest[]>([
    { fullName: '', age: '', schoolLevel: '' }
  ]);

  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleAffiliateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setAffiliateData((prev) => ({ ...prev, [name]: value }));
  };

  const handleChildChange = (index: number, field: keyof ChildRequest, value: string) => {
    setChildrenList((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const addChild = () => {
    setChildrenList((prev) => [...prev, { fullName: '', age: '', schoolLevel: '' }]);
  };

  const removeChild = (index: number) => {
    if (childrenList.length === 1) return;
    setChildrenList((prev) => prev.filter((_, i) => i !== index));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
      if (!validTypes.includes(file.type)) {
        alert('Formato de archivo inválido. Subí un archivo PDF o una imagen (JPG, PNG).');
        return;
      }
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        alert('El archivo supera el límite de 5MB.');
        return;
      }
      setReceiptFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiptFile) {
      alert('Por favor, adjunta una copia de tu último recibo de sueldo para verificar la afiliación.');
      return;
    }

    const invalidChildren = childrenList.some(child => !child.fullName || !child.age || !child.schoolLevel);
    if (invalidChildren) {
      alert('Por favor, completa los datos de todos los hijos registrados.');
      return;
    }

    setLoading(true);
    setStatus('idle');

    try {
      // Check if Supabase configured
      const isConfigured = 
        process.env.NEXT_PUBLIC_SUPABASE_URL !== 'your_supabase_project_url_here' && 
        !!process.env.NEXT_PUBLIC_SUPABASE_URL;

      if (!isConfigured) {
        console.warn('Supabase not configured, simulating request.');
        await new Promise((resolve) => setTimeout(resolve, 2000));
        setStatus('success');
        setAffiliateData({ fullName: '', cuil: '', email: '', phone: '' });
        setChildrenList([{ fullName: '', age: '', schoolLevel: '' }]);
        setReceiptFile(null);
        setLoading(false);
        return;
      }

      // 1. Upload receipt to storage bucket 'receipts'
      const fileExt = receiptFile.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `receipts/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(filePath, receiptFile);

      if (uploadError) throw new Error(`Error al subir comprobante: ${uploadError.message}`);

      // 2. Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('receipts')
        .getPublicUrl(filePath);

      // 3. Create benefit request in Supabase 'benefit_requests'
      // Note: In database, we can store details in metadata column or create multiple rows
      const { error: insertError } = await supabase
        .from('benefit_requests')
        .insert({
          benefit_type: 'utiles_escolares_2026',
          status: 'pending',
          attachment_url: publicUrl,
          // Custom fields can be stored in metadata or JSONB
          metadata: {
            affiliate_cuil: affiliateData.cuil,
            affiliate_name: affiliateData.fullName,
            affiliate_email: affiliateData.email,
            affiliate_phone: affiliateData.phone,
            children: childrenList,
          }
        });

      if (insertError) throw new Error(`Error al registrar la solicitud: ${insertError.message}`);

      setStatus('success');
      setAffiliateData({ fullName: '', cuil: '', email: '', phone: '' });
      setChildrenList([{ fullName: '', age: '', schoolLevel: '' }]);
      setReceiptFile(null);
    } catch (error: unknown) {
      console.error(error);
      const msg = error instanceof Error ? error.message : 'Error al procesar la solicitud.';
      setErrorMessage(msg);
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative py-12 px-4 sm:px-6 lg:px-8">
      {/* Background decoration */}
      <div className="absolute inset-0 max-w-7xl mx-auto h-[400px] pointer-events-none opacity-20 dark:opacity-30">
        <div className="absolute top-[10%] right-[10%] w-[300px] h-[300px] rounded-full bg-accent blur-[90px]" />
      </div>

      <div className="max-w-4xl mx-auto relative space-y-10">
        <div className="text-center space-y-4">
          <div className="inline-flex p-3 bg-teal-500/15 text-teal-600 dark:text-teal-400 rounded-2xl">
            <GraduationCap className="w-8 h-8" />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
            Entrega de Útiles Escolares 2026
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Beneficio exclusivo para afiliados de ATFAR. Solicitá el kit escolar para tus hijos de nivel inicial, primario y secundario de forma 100% digital.
          </p>
        </div>

        {status === 'success' ? (
          <div className="bg-card border border-emerald-500/20 rounded-3xl p-8 text-center space-y-6 shadow-xl glass max-w-2xl mx-auto">
            <div className="inline-flex p-4 bg-emerald-500/10 text-emerald-500 rounded-full">
              <CheckCircle className="w-12 h-12" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-foreground">¡Solicitud Registrada!</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Tu pedido de útiles escolares para el ciclo lectivo 2026 fue recibido correctamente. El equipo del sindicato revisará tu recibo de sueldo y te notificará por email cuando el kit esté listo para retirar en la sede central (Corrientes 1572).
              </p>
            </div>
            <button
              onClick={() => setStatus('idle')}
              className="px-6 py-2.5 rounded-xl bg-secondary text-secondary-foreground font-semibold hover:bg-secondary/90 transition-all shadow-md text-sm"
            >
              Registrar otra solicitud
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Guidelines Box */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-card border border-border rounded-2xl p-6 shadow-lg space-y-4 glass">
                <h3 className="font-bold text-lg text-foreground">Requisitos obligatorios</h3>
                <ul className="space-y-3 text-xs text-muted-foreground leading-relaxed list-disc list-inside">
                  <li>Estar afiliado activo a ATFAR Rosario.</li>
                  <li>Adjuntar último recibo de sueldo (PDF o foto clara).</li>
                  <li>Los kits cubren niveles: Preescolar (sala de 4 y 5), Primaria (1° a 7° grado) y Secundaria (1° a 5°/6° año).</li>
                  <li>Las entregas se coordinan antes del inicio escolar en Febrero/Marzo 2026.</li>
                </ul>
              </div>
            </div>

            {/* Request Form */}
            <form onSubmit={handleSubmit} className="lg:col-span-8 bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-xl space-y-6 glass">
              {status === 'error' && (
                <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-sm">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Affiliate Details */}
              <div className="space-y-4">
                <h3 className="text-md font-bold text-foreground border-b border-border pb-2 flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-secondary rounded-full" />
                  Datos del Afiliado
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="fullName" className="text-sm font-semibold text-foreground">
                      Nombre y Apellido *
                    </label>
                    <input
                      type="text"
                      id="fullName"
                      name="fullName"
                      required
                      value={affiliateData.fullName}
                      onChange={handleAffiliateChange}
                      placeholder="Ej. María González"
                      className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-secondary/55 text-sm transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="cuil" className="text-sm font-semibold text-foreground">
                      CUIL del Afiliado *
                    </label>
                    <input
                      type="text"
                      id="cuil"
                      name="cuil"
                      required
                      value={affiliateData.cuil}
                      onChange={handleAffiliateChange}
                      placeholder="Ej. 27304445556"
                      className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-secondary/55 text-sm transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="email" className="text-sm font-semibold text-foreground">
                      Email de contacto *
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      required
                      value={affiliateData.email}
                      onChange={handleAffiliateChange}
                      placeholder="ejemplo@correo.com"
                      className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-secondary/55 text-sm transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="phone" className="text-sm font-semibold text-foreground">
                      Teléfono Móvil *
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      required
                      value={affiliateData.phone}
                      onChange={handleAffiliateChange}
                      placeholder="Ej. 3415556677"
                      className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-secondary/55 text-sm transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Children Details */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <h3 className="text-md font-bold text-foreground flex items-center gap-2">
                    <span className="w-1.5 h-4 bg-teal-500 rounded-full" />
                    Hijos en Edad Escolar
                  </h3>
                  <button
                    type="button"
                    onClick={addChild}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-secondary hover:text-secondary/80 bg-secondary/10 px-2.5 py-1.5 rounded-lg border border-secondary/20"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Agregar Hijo</span>
                  </button>
                </div>

                {childrenList.map((child, index) => (
                  <div 
                    key={index} 
                    className="relative bg-muted/30 border border-border rounded-xl p-4 sm:p-5 space-y-4 group/child"
                  >
                    {childrenList.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeChild(index)}
                        className="absolute top-4 right-4 p-1.5 rounded-lg border border-border text-muted-foreground hover:text-red-500 hover:border-red-200 transition-colors bg-card"
                        title="Eliminar este hijo"
                      >
                        <Trash className="w-4 h-4" />
                      </button>
                    )}
                    
                    <span className="inline-block text-xs font-semibold text-teal-600 dark:text-teal-400 uppercase tracking-wider mb-1">
                      Hijo/a #{index + 1}
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                      <div className="sm:col-span-6 space-y-2">
                        <label className="text-xs font-semibold text-foreground">
                          Nombre y Apellido del Hijo *
                        </label>
                        <input
                          type="text"
                          required
                          value={child.fullName}
                          onChange={(e) => handleChildChange(index, 'fullName', e.target.value)}
                          placeholder="Ej. Lucas Pérez"
                          className="w-full px-4 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-teal-500/50 text-sm transition-all"
                        />
                      </div>
                      <div className="sm:col-span-2 space-y-2">
                        <label className="text-xs font-semibold text-foreground">
                          Edad *
                        </label>
                        <input
                          type="number"
                          required
                          min={3}
                          max={18}
                          value={child.age}
                          onChange={(e) => handleChildChange(index, 'age', e.target.value)}
                          placeholder="Ej. 7"
                          className="w-full px-3 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-teal-500/50 text-sm transition-all text-center"
                        />
                      </div>
                      <div className="sm:col-span-4 space-y-2">
                        <label className="text-xs font-semibold text-foreground">
                          Nivel Escolar *
                        </label>
                        <select
                          required
                          value={child.schoolLevel}
                          onChange={(e) => handleChildChange(index, 'schoolLevel', e.target.value as 'preescolar' | 'primaria' | 'secundaria')}
                          className="w-full px-4 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-teal-500/50 text-sm transition-all"
                        >
                          <option value="">Seleccionar...</option>
                          <option value="preescolar">Preescolar (4 y 5 años)</option>
                          <option value="primaria">Primaria (1° a 7° grado)</option>
                          <option value="secundaria">Secundaria (1° a 6° año)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pay Slip Upload */}
              <div className="space-y-4 pt-2">
                <h3 className="text-md font-bold text-foreground border-b border-border pb-2 flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-emerald-500 rounded-full" />
                  Verificación de Afiliación
                </h3>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground block">
                    Adjuntar último Recibo de Sueldo *
                  </label>
                  <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-secondary/60 hover:bg-muted/10 transition-all cursor-pointer relative group">
                    <input
                      type="file"
                      accept=".pdf,image/png,image/jpeg"
                      onChange={handleFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full group-hover:scale-105 transition-transform">
                        <Upload className="w-6 h-6" />
                      </div>
                      {receiptFile ? (
                        <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                          <FileText className="w-4.5 h-4.5 text-emerald-500" />
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
                      Procesando Solicitud...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2 group-hover:translate-x-0.5 transition-transform" />
                      Enviar Solicitud de Kits
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
