'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FileText, ArrowLeft, Send, CheckCircle2, AlertCircle, Clock, Plus, Loader2 } from 'lucide-react';

interface DeclarationItem {
  period: string;
  submitDate: string;
  employeeCount: number;
  status: 'validada' | 'pendiente';
}

export default function DeclaracionesPage() {
  const [employeeCount, setEmployeeCount] = useState<number | ''>('');
  const [observations, setObservations] = useState('');
  const [period, setPeriod] = useState('Junio 2026');
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const [history, setHistory] = useState<DeclarationItem[]>([
    { period: 'Mayo 2026', submitDate: '24/05/2026', employeeCount: 3, status: 'validada' },
    { period: 'Abril 2026', submitDate: '25/04/2026', employeeCount: 3, status: 'validada' },
    { period: 'Marzo 2026', submitDate: '28/03/2026', employeeCount: 2, status: 'validada' },
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (employeeCount === '' || Number(employeeCount) <= 0) {
      alert('Por favor ingrese una cantidad válida de empleados.');
      return;
    }
    if (!confirmed) {
      alert('Debe confirmar los términos de la declaración jurada.');
      return;
    }

    setLoading(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    const newDDJJ: DeclarationItem = {
      period,
      submitDate: new Date().toLocaleDateString('es-AR'),
      employeeCount: Number(employeeCount),
      status: 'pendiente',
    };

    setHistory((prev) => [newDDJJ, ...prev]);
    setLoading(false);
    setSuccess(true);
    setEmployeeCount('');
    setObservations('');
    setConfirmed(false);
  };

  return (
    <div className="bg-[#f8fafc] text-[#1e293b] min-h-screen">
      {/* Top Header */}
      <header className="bg-card border-b border-border/80 py-4 px-6 flex items-center justify-between shadow-premium">
        <div className="flex items-center gap-3">
          <Link href="/farmacia">
            <img src="/images/logo.jpg" alt="Logo" className="h-9 w-auto object-contain bg-white p-0.5 rounded border border-border" />
          </Link>
          <div>
            <span className="text-xs font-black uppercase tracking-wider text-primary block leading-none">ATFAR</span>
            <span className="text-[9px] text-muted-foreground block font-bold">Declaraciones Juradas</span>
          </div>
        </div>

        <Link 
          href="/farmacia"
          className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver al Panel</span>
        </Link>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        
        {success ? (
          <div className="bg-card border border-emerald-500/20 rounded-3xl p-8 text-center space-y-6 shadow-premium max-w-2xl mx-auto glass">
            <div className="inline-flex p-4 bg-emerald-500/10 text-emerald-500 rounded-full">
              <CheckCircle2 className="w-12 h-12" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-foreground">¡Declaración Jurada Presentada!</h2>
              <p className="text-sm text-muted-foreground leading-relaxed font-medium">
                La declaración para el período **{period}** fue enviada con éxito. Quedará en estado pendiente de validación por el sector gremial de ATFAR. Se notificará a tu casilla de correo la aprobación.
              </p>
            </div>
            <button
              onClick={() => setSuccess(false)}
              className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/95 transition-all shadow-premium text-xs uppercase tracking-wider"
            >
              Cargar otra Declaración
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left: Form */}
            <form onSubmit={handleSubmit} className="lg:col-span-7 bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-xl space-y-5 glass">
              <h2 className="font-extrabold text-foreground text-lg border-b border-border pb-3 flex items-center gap-2">
                <FileText className="w-5 h-5 text-secondary" />
                Nueva Presentación Mensual
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label htmlFor="period-select" className="text-xs font-semibold text-muted-foreground">Período Declarable</label>
                  <select
                    id="period-select"
                    value={period}
                    onChange={(e) => setPeriod(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-secondary/50 text-xs transition-all font-semibold"
                  >
                    <option value="Junio 2026">Junio 2026</option>
                    <option value="Julio 2026">Julio 2026</option>
                    <option value="Agosto 2026">Agosto 2026</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label htmlFor="employeeCount" className="text-xs font-semibold text-muted-foreground">Cantidad de Empleados *</label>
                  <input
                    type="number"
                    id="employeeCount"
                    required
                    min={1}
                    value={employeeCount}
                    onChange={(e) => setEmployeeCount(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="Cantidad total del local"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-secondary/50 text-xs transition-all text-center font-bold"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label htmlFor="observations" className="text-xs font-semibold text-muted-foreground">Observaciones (Licencias, bajas temporales)</label>
                <textarea
                  id="observations"
                  rows={4}
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  placeholder="Detallá si hubo altas, jubilaciones o suspensiones durante este período..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-secondary/50 text-xs transition-all resize-none font-medium"
                />
              </div>

              {/* Sworn Confirmation */}
              <div className="flex items-start gap-3 p-3.5 bg-muted/40 rounded-xl border border-border/80">
                <input
                  type="checkbox"
                  id="confirm-ddjj"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  className="w-4.5 h-4.5 accent-primary mt-0.5 flex-shrink-0"
                />
                <label htmlFor="confirm-ddjj" className="text-[10px] text-muted-foreground font-semibold leading-relaxed">
                  Declaro bajo juramento de ley que la cantidad de empleados informada y las novedades consignadas se ajustan estrictamente a la realidad y a los libros de sueldos vigentes.
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center px-6 py-3.5 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/95 transition-all text-xs uppercase tracking-wider shadow-premium disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enviando DDJJ...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2 group-hover:translate-x-0.5 transition-transform" />
                    Presentar Declaración
                  </>
                )}
              </button>
            </form>

            {/* Right: History */}
            <div className="lg:col-span-5 bg-card border border-border rounded-3xl p-6 shadow-lg glass space-y-6">
              <h3 className="font-bold text-foreground text-md border-b border-border pb-3">Historial de Presentaciones</h3>
              
              <div className="divide-y divide-border/60 max-h-[350px] overflow-y-auto pr-1">
                {history.map((item, idx) => (
                  <div key={idx} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-4 text-xs font-semibold">
                    <div className="space-y-0.5">
                      <span className="text-foreground block">{item.period}</span>
                      <span className="text-[9px] text-muted-foreground font-medium block">Presentada: {item.submitDate}</span>
                    </div>

                    <div className="flex items-center gap-3.5">
                      <span className="text-muted-foreground font-bold">{item.employeeCount} empleados</span>
                      
                      {item.status === 'validada' ? (
                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-emerald-500/10 text-emerald-600 rounded text-[9px] font-black uppercase">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Validada</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-amber-500/10 text-amber-600 rounded text-[9px] font-black uppercase">
                          <Clock className="w-3 h-3 animate-pulse" />
                          <span>Pendiente</span>
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}
      </main>
    </div>
  );
}
