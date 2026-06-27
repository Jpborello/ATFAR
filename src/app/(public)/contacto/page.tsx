'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { Mail, Phone, MapPin, Clock, Send, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

// Dynamic import of the map to prevent SSR document issues
const ContactMap = dynamic(() => import('@/components/map/ContactMap'), {
  ssr: false,
  loading: () => (
    <div className="h-[300px] w-full rounded-2xl bg-muted animate-pulse flex flex-col items-center justify-center text-xs font-semibold text-muted-foreground gap-2">
      <Loader2 className="w-5 h-5 animate-spin text-secondary" />
      <span>Cargando mapa de localización...</span>
    </div>
  ),
});

export default function ContactoPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: 'Afiliación',
    message: '',
  });

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus('idle');

    // Simulate sending message
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setLoading(false);
    setStatus('success');
    setFormData({ name: '', email: '', phone: '', subject: 'Afiliación', message: '' });
  };

  return (
    <div className="bg-background text-foreground min-h-screen py-12 px-4 sm:px-6 lg:px-8 relative">
      {/* Background decoration */}
      <div className="absolute top-[10%] right-[10%] w-[350px] h-[350px] rounded-full bg-primary/5 blur-[100px] pointer-events-none" />

      <div className="max-w-6xl mx-auto space-y-12 relative">
        {/* Header */}
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <span className="text-[10px] font-bold text-secondary uppercase tracking-widest block">Atención al Público</span>
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
            Contacto
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed font-medium">
            ¿Tenés alguna duda sobre tu afiliación, aportes, obra social o escalas? Envianos tu consulta y te responderemos a la brevedad.
          </p>
        </div>

        {/* Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Info & Map */}
          <div className="lg:col-span-5 space-y-6">
            {/* Info Card */}
            <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-premium glass space-y-6">
              <h3 className="font-bold text-foreground text-md border-b border-border pb-3">Información Institucional</h3>
              
              <div className="space-y-4 text-sm font-medium">
                <div className="flex items-start gap-3 text-muted-foreground">
                  <Phone className="w-5 h-5 text-secondary flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="block text-foreground font-semibold">Teléfono Fijo</span>
                    <a href="tel:03414247814" className="hover:text-secondary block">0341 424-7814</a>
                  </div>
                </div>

                <div className="flex items-start gap-3 text-muted-foreground">
                  <Mail className="w-5 h-5 text-secondary flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="block text-foreground font-semibold">Correo de Consultas</span>
                    <a href="mailto:contacto@atfar.org.ar" className="hover:text-secondary block">contacto@atfar.org.ar</a>
                  </div>
                </div>

                <div className="flex items-start gap-3 text-muted-foreground">
                  <MapPin className="w-5 h-5 text-secondary flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="block text-foreground font-semibold">Sede Rosario</span>
                    <span>Corrientes 1572, S2000 Rosario, Santa Fe</span>
                  </div>
                </div>

                <div className="flex items-start gap-3 text-muted-foreground">
                  <Clock className="w-5 h-5 text-secondary flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="block text-foreground font-semibold">Horarios de Atención</span>
                    <span>Lunes a Viernes de 08:00 a 16:00 hs</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Map Container */}
            <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-premium glass h-[320px]">
              <ContactMap />
            </div>
          </div>

          {/* Right Column: Contact Form */}
          <div className="lg:col-span-7">
            {status === 'success' ? (
              <div className="bg-card border border-emerald-500/20 rounded-3xl p-8 text-center space-y-6 shadow-premium glass">
                <div className="inline-flex p-4 bg-emerald-500/10 text-emerald-500 rounded-full">
                  <CheckCircle className="w-12 h-12" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold text-foreground">¡Mensaje Enviado!</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Tu consulta fue recibida correctamente. Nuestro equipo de mesa de entrada de ATFAR responderá a tu correo electrónico en un lapso no mayor a 24 horas hábiles.
                  </p>
                </div>
                <button
                  onClick={() => setStatus('idle')}
                  className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-all shadow-premium text-xs uppercase tracking-wider"
                >
                  Enviar otro mensaje
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-xl space-y-5 glass">
                <h3 className="font-bold text-foreground text-md border-b border-border pb-3">Formulario de Contacto</h3>
                
                {status === 'error' && (
                  <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-sm">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <span>Ocurrió un error al enviar el mensaje. Intentalo de nuevo.</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label htmlFor="name" className="text-xs font-semibold text-muted-foreground">Nombre y Apellido *</label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      required
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="Ej. Juan Pérez"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-secondary/50 text-xs transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="phone" className="text-xs font-semibold text-muted-foreground">Teléfono</label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="Ej. 3415554433"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-secondary/50 text-xs transition-all text-center"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2 space-y-1">
                    <label htmlFor="email" className="text-xs font-semibold text-muted-foreground">Correo Electrónico *</label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      required
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="ejemplo@correo.com"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-secondary/50 text-xs transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="subject" className="text-xs font-semibold text-muted-foreground">Motivo *</label>
                    <select
                      id="subject"
                      name="subject"
                      required
                      value={formData.subject}
                      onChange={handleInputChange}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-secondary/50 text-xs transition-all"
                    >
                      <option value="Afiliación">Afiliación</option>
                      <option value="Escalas Salariales">Escalas Salariales</option>
                      <option value="Obra Social">Obra Social</option>
                      <option value="Otros">Otros</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label htmlFor="message" className="text-xs font-semibold text-muted-foreground">Mensaje / Consulta *</label>
                  <textarea
                    id="message"
                    name="message"
                    required
                    rows={4}
                    value={formData.message}
                    onChange={handleInputChange}
                    placeholder="Escribí tu consulta en detalle acá..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-secondary/50 text-xs transition-all resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full inline-flex items-center justify-center px-6 py-3.5 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/95 transition-all text-xs uppercase tracking-wider shadow-premium disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Enviando mensaje...
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5 mr-2 group-hover:translate-x-0.5 transition-transform" />
                      Enviar Consulta
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
