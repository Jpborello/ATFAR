'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Building2, 
  Users, 
  FileText, 
  CreditCard, 
  LogOut, 
  CheckCircle2, 
  ArrowRight,
  MapPin,
  Calendar,
  ShieldCheck,
  Plus,
  Trash2,
  Loader2
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Employee {
  id: string;
  fullName: string;
  cuil: string;
  category: string;
  entryDate: string;
  active: boolean;
}

export default function FarmaciaDashboard() {
  const [loading, setLoading] = useState(true);
  const [pharmacyName, setPharmacyName] = useState('...');
  const [pharmacyCuit, setPharmacyCuit] = useState('...');
  const [pharmacyAddress, setPharmacyAddress] = useState('...');
  
  const [employees, setEmployees] = useState<Employee[]>([
    { id: '1', fullName: 'Estela Maris Gómez', cuil: '27-30444555-8', category: 'Auxiliar de Farmacia', entryDate: '2024-03-15', active: true },
    { id: '2', fullName: 'Carlos Alberto Rossi', cuil: '20-25666777-2', category: 'Cajero de Farmacia', entryDate: '2025-01-10', active: true },
    { id: '3', fullName: 'Matias Nicolás Fernández', cuil: '20-41222333-5', category: 'Personal de Salón (Vendedor)', entryDate: '2025-11-01', active: true },
  ]);

  useEffect(() => {
    const fetchPharmacy = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      const isConfigured = 
        process.env.NEXT_PUBLIC_SUPABASE_URL !== 'your_supabase_project_url_here' && 
        !!process.env.NEXT_PUBLIC_SUPABASE_URL;

      if (!isConfigured) {
        setPharmacyName('Farmacia Central S.A.');
        setPharmacyCuit('30-71122334-9');
        setPharmacyAddress('Pellegrini 1650, Rosario');
        setLoading(false);
        return;
      }

      if (!session) {
        window.location.href = '/login';
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (profile?.role !== 'pharmacy_owner' && profile?.role !== 'admin') {
        window.location.href = '/login';
        return;
      }

      const { data: pharmacy } = await supabase
        .from('pharmacies')
        .select('name, cuit, address')
        .eq('owner_id', session.user.id)
        .single();

      if (pharmacy) {
        setPharmacyName(pharmacy.name);
        setPharmacyCuit(pharmacy.cuit);
        setPharmacyAddress(pharmacy.address);
      }
      setLoading(false);
    };

    fetchPharmacy();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  const handleDeleteEmployee = (id: string) => {
    if (confirm('¿Seguro que deseas eliminar este empleado del registro de tu nómina?')) {
      setEmployees(prev => prev.filter(e => e.id !== id));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Cargando Portal...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc] text-[#1e293b]">
      {/* Top Header */}
      <header className="bg-card border-b border-border/80 py-4 px-6 flex items-center justify-between shadow-premium">
        <div className="flex items-center gap-3">
          <img src="/images/logo.jpg" alt="Logo" className="h-9 w-auto object-contain bg-white p-0.5 rounded border border-border" />
          <div>
            <span className="text-xs font-black uppercase tracking-wider text-primary block leading-none">ATFAR</span>
            <span className="text-[9px] text-muted-foreground block font-bold">Portal de Farmacias</span>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-border text-red-500 hover:bg-red-50/50 text-xs font-bold transition-all"
        >
          <LogOut className="w-4 h-4" />
          <span>Cerrar Sesión</span>
        </button>
      </header>

      {/* Main container */}
      <main className="flex-grow max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        
        {/* Pharmacy Details card */}
        <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-premium glass flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-primary/5 text-primary border border-primary/10 rounded-2xl">
              <Building2 className="w-8 h-8 text-secondary" />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl sm:text-2xl font-black text-foreground">{pharmacyName}</h2>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-semibold text-muted-foreground">
                <span>CUIT: {pharmacyCuit}</span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-secondary" />
                  {pharmacyAddress}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 text-xs font-bold shadow-sm">
              <CheckCircle2 className="w-4 h-4" />
              <span>Habilitación Al Día</span>
            </span>
          </div>
        </div>

        {/* Shortcut panel cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* DDJJ link */}
          <div className="bg-card border border-border rounded-3xl p-6 shadow-premium hover:shadow-premium-lg transition-all space-y-4 flex flex-col justify-between glass">
            <div className="space-y-3">
              <div className="p-3 bg-primary/5 text-primary rounded-xl inline-block border border-primary/10">
                <FileText className="w-6 h-6 text-secondary" />
              </div>
              <h3 className="font-bold text-lg text-foreground">Declaraciones Juradas</h3>
              <p className="text-xs text-muted-foreground leading-relaxed font-medium">
                Presentá la planilla mensual obligatoria informando la nómina del CCT correspondiente a tu local.
              </p>
            </div>
            <div className="pt-4">
              <Link
                href="/farmacia/declaraciones"
                className="w-full inline-flex items-center justify-center gap-1 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider hover:bg-primary/95 transition-all shadow-premium"
              >
                <span>Nueva DDJJ</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Payments link */}
          <div className="bg-card border border-border rounded-3xl p-6 shadow-premium hover:shadow-premium-lg transition-all space-y-4 flex flex-col justify-between glass">
            <div className="space-y-3">
              <div className="p-3 bg-primary/5 text-primary rounded-xl inline-block border border-primary/10">
                <CreditCard className="w-6 h-6 text-secondary" />
              </div>
              <h3 className="font-bold text-lg text-foreground">Pagos de Aportes</h3>
              <p className="text-xs text-muted-foreground leading-relaxed font-medium">
                Consultá tu estado de cuenta corriente, descargá recibos y pagá aportes vencidos con Mercado Pago.
              </p>
            </div>
            <div className="pt-4">
              <Link
                href="/farmacia/pagos"
                className="w-full inline-flex items-center justify-center gap-1 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider hover:bg-primary/95 transition-all shadow-premium"
              >
                <span>Ver Cuentas y Pagar</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Summary metrics card */}
          <div className="bg-card border border-border rounded-3xl p-6 shadow-premium glass space-y-4">
            <h3 className="font-bold text-foreground text-sm border-b border-border pb-2">Estado del Período</h3>
            
            <div className="space-y-3 text-xs font-semibold text-muted-foreground">
              <div className="flex justify-between">
                <span>Último Período Declarado:</span>
                <span className="text-foreground">Junio 2026</span>
              </div>
              <div className="flex justify-between">
                <span>Personal en Nómina:</span>
                <span className="text-foreground">{employees.length} empleados</span>
              </div>
              <div className="flex justify-between">
                <span>Estado de Pago Aportes:</span>
                <span className="text-emerald-500 font-bold bg-emerald-500/10 px-2.5 py-0.5 rounded">Al Día</span>
              </div>
            </div>
          </div>
        </div>

        {/* Staff Table Summary */}
        <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-premium glass space-y-6">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <h3 className="font-bold text-foreground text-md flex items-center gap-2">
              <Users className="w-5 h-5 text-secondary" />
              Nómina de Empleados Declarada
            </h3>
            <span className="text-[10px] bg-secondary/15 text-secondary font-black px-2.5 py-1 rounded-full uppercase tracking-wider shadow-sm">
              Junio 2026
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border text-muted-foreground font-bold uppercase tracking-wider bg-muted/20">
                  <th className="py-3 px-4">Nombre y Apellido</th>
                  <th className="py-3 px-4">CUIL</th>
                  <th className="py-3 px-4">Categoría Profesional</th>
                  <th className="py-3 px-4 text-center">Ingreso</th>
                  <th className="py-3 px-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 font-semibold text-foreground">
                {employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-muted/10 transition-colors">
                    <td className="py-3 px-4 font-bold">{emp.fullName}</td>
                    <td className="py-3 px-4 font-mono text-muted-foreground">{emp.cuil}</td>
                    <td className="py-3 px-4 text-muted-foreground">{emp.category}</td>
                    <td className="py-3 px-4 text-center text-muted-foreground">{emp.entryDate}</td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleDeleteEmployee(emp.id)}
                        className="p-1.5 rounded-lg border border-border hover:bg-red-50 text-muted-foreground hover:text-red-500 hover:border-red-200 transition-colors bg-card"
                        title="Dar de Baja"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </main>
    </div>
  );
}
