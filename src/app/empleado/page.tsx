'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  GraduationCap, 
  FileText, 
  LogOut, 
  CheckCircle2, 
  Clock, 
  QrCode,
  ArrowRight,
  Loader2,
  Calendar,
  HeartHandshake
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface BenefitRequest {
  id: string;
  type: string;
  date: string;
  status: 'pending' | 'approved' | 'rejected';
}

export default function EmpleadoPortalPage() {
  const [loading, setLoading] = useState(true);
  const [employeeName, setEmployeeName] = useState('Cargando...');
  const [employeeCuil, setEmployeeCuil] = useState('...');
  const [affiliateNumber, setAffiliateNumber] = useState('...');
  const [pharmacyName, setPharmacyName] = useState('Farmacia del Sol');

  const [requests] = useState<BenefitRequest[]>([
    { id: '1', type: 'Entrega de Útiles Escolares 2026', date: '2026-06-25', status: 'approved' },
    { id: '2', type: 'Subsidio por Nacimiento', date: '2025-10-14', status: 'approved' },
  ]);

  useEffect(() => {
    const fetchEmployeeData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      const isConfigured = 
        process.env.NEXT_PUBLIC_SUPABASE_URL !== 'your_supabase_project_url_here' && 
        !!process.env.NEXT_PUBLIC_SUPABASE_URL;

      if (!isConfigured) {
        // Simulation details
        setEmployeeName('Gonzalo Andrés Rossi');
        setEmployeeCuil('20-36555444-1');
        setAffiliateNumber('AF-94827-02');
        setPharmacyName('Farmacia Belgrano (Rosario)');
        setLoading(false);
        return;
      }

      if (!session) {
        window.location.href = '/login';
        return;
      }

      // Check role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, full_name, phone')
        .eq('id', session.user.id)
        .single();

      if (profile?.role !== 'employee' && profile?.role !== 'admin') {
        window.location.href = '/login';
        return;
      }

      setEmployeeName(profile.full_name || 'Afiliado');
      setEmployeeCuil('20-' + Math.floor(10000000 + Math.random() * 90000000) + '-1');
      setAffiliateNumber('AF-' + Math.floor(10000 + Math.random() * 90000) + '-01');
      setLoading(false);
    };

    fetchEmployeeData();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-8 h-8 animate-spin text-secondary" />
          <span className="text-sm font-semibold text-muted-foreground">Verificando credenciales de afiliado...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-muted/20">
      {/* Top Header */}
      <header className="bg-card border-b border-border py-4 px-6 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-secondary text-secondary-foreground px-3 py-1.5 rounded-lg font-black tracking-widest text-sm shadow">
            ATFAR
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider block">Portal del Afiliado</span>
            <span className="text-[10px] text-muted-foreground block">Sindicato de Farmacia Rosario</span>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-border text-red-500 hover:bg-red-50/50 text-xs font-bold transition-all"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Cerrar Sesión</span>
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-grow max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Side: Profile & Digital Card */}
          <div className="lg:col-span-5 space-y-6">
            {/* Digital Union Card (WOW Factor widget) */}
            <div className="relative overflow-hidden bg-gradient-to-br from-primary to-slate-900 border border-slate-800 rounded-3xl p-6 text-white shadow-2xl space-y-8">
              {/* Card Design elements */}
              <div className="absolute top-0 right-0 w-44 h-44 bg-secondary/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-accent/10 rounded-full blur-2xl pointer-events-none" />

              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <span className="text-[9px] font-bold tracking-widest text-secondary uppercase block">Credencial Digital</span>
                  <span className="text-lg font-black tracking-widest text-white leading-none">ATFAR ROSARIO</span>
                </div>
                <div className="bg-secondary/20 border border-secondary/35 text-secondary text-[8px] font-extrabold px-2 py-1 rounded">
                  AFILIADO SINDICAL
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <span className="text-[8px] text-slate-400 uppercase tracking-wider block">Afiliado</span>
                  <span className="text-lg font-bold truncate block">{employeeName}</span>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[8px] text-slate-400 uppercase tracking-wider block">CUIL</span>
                    <span className="text-xs font-semibold">{employeeCuil}</span>
                  </div>
                  <div>
                    <span className="text-[8px] text-slate-400 uppercase tracking-wider block">N° Afiliación</span>
                    <span className="text-xs font-semibold text-secondary">{affiliateNumber}</span>
                  </div>
                </div>

                <div>
                  <span className="text-[8px] text-slate-400 uppercase tracking-wider block">Lugar de Trabajo Declarado</span>
                  <span className="text-xs font-medium truncate block">{pharmacyName}</span>
                </div>
              </div>

              {/* Barcode representation */}
              <div className="border-t border-slate-800/80 pt-4 flex items-center justify-between gap-4">
                <div className="h-10 w-44 bg-white/5 rounded-lg flex items-center justify-around px-2 opacity-75">
                  <div className="h-7 w-1 bg-white" />
                  <div className="h-7 w-0.5 bg-white" />
                  <div className="h-7 w-2 bg-white" />
                  <div className="h-7 w-0.5 bg-white" />
                  <div className="h-7 w-1 bg-white" />
                  <div className="h-7 w-1.5 bg-white" />
                  <div className="h-7 w-0.5 bg-white" />
                  <div className="h-7 w-2 bg-white" />
                  <div className="h-7 w-1 bg-white" />
                </div>
                <QrCode className="w-10 h-10 text-secondary/80 flex-shrink-0" />
              </div>
            </div>

            {/* Quick Actions Shortcuts */}
            <div className="bg-card border border-border rounded-3xl p-6 shadow-md glass space-y-4">
              <h3 className="font-bold text-foreground text-sm border-b border-border pb-2">Acceso a Gestiones</h3>
              <div className="grid grid-cols-1 gap-2">
                <Link
                  href="/escalas"
                  className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-card/40 hover:bg-muted/10 transition-all text-xs font-semibold group"
                >
                  <div className="flex items-center gap-2.5">
                    <FileText className="w-4.5 h-4.5 text-secondary" />
                    <span>Ver y Calcular Escalas Salariales</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                </Link>
                <Link
                  href="/utiles"
                  className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-card/40 hover:bg-muted/10 transition-all text-xs font-semibold group"
                >
                  <div className="flex items-center gap-2.5">
                    <GraduationCap className="w-4.5 h-4.5 text-secondary" />
                    <span>Solicitar Kit Escolar 2026</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>
            </div>
          </div>

          {/* Right Side: Benefits tracking */}
          <div className="lg:col-span-7 bg-card border border-border rounded-3xl p-6 shadow-lg glass space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <h3 className="font-bold text-foreground text-md flex items-center gap-2">
                <HeartHandshake className="w-5 h-5 text-secondary" />
                Estado de mis Solicitudes
              </h3>
              <span className="text-[10px] bg-secondary/10 text-secondary font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                Historial
              </span>
            </div>

            <div className="space-y-4">
              {requests.map((req) => (
                <div 
                  key={req.id}
                  className="border border-border rounded-2xl p-4.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card/60"
                >
                  <div className="space-y-1">
                    <h4 className="font-bold text-foreground text-sm leading-snug">{req.type}</h4>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      Presentado: {req.date}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {req.status === 'approved' ? (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold shadow-sm">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Aprobado / Listo</span>
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-bold shadow-sm">
                        <Clock className="w-4 h-4 animate-pulse" />
                        <span>En Revisión</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
