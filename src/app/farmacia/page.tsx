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
  AlertTriangle,
  ArrowRight,
  MapPin,
  Calendar,
  ShieldCheck,
  Plus,
  Trash2,
  Loader2,
  X,
  Phone,
  Mail,
  FileCheck,
  Briefcase
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { calculateSeniority, getCurrentCategory } from '@/lib/dateUtils';

interface Employee {
  id: string;
  fullName: string;
  cuil: string;
  category: string;
  entryDate: string;
  active: boolean;
  isAffiliate: boolean;
}

export default function FarmaciaDashboard() {
  const [loading, setLoading] = useState(true);
  const [pharmacyId, setPharmacyId] = useState<string | null>(null);
  const [pharmacyName, setPharmacyName] = useState('...');
  const [pharmacyCuit, setPharmacyCuit] = useState('...');
  const [pharmacyAddress, setPharmacyAddress] = useState('...');
  const [hasDebt, setHasDebt] = useState(false);
  
  // Tutorial states
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(1);
  const [userId, setUserId] = useState<string | null>(null);
  
  // Modals state
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [profileTab, setProfileTab] = useState<'empresa' | 'contactos'>('empresa');

  // Detailed profile state
  const [profileData, setProfileData] = useState({
    cuit: '30-71122334-9',
    razonSocial: 'Farmacia Central S.A.',
    nombreFantasia: 'Farmacia Central',
    whatsapp: '3413889900',
    actividadEconomica: 'Venta al por menor de productos farmacéuticos y de herboristería',
    initialPeriod: '2024-03-01',
    declaredEmployeeCount: 3,
    branches: 'Sucursal Sur, Sucursal Norte',
    notes: 'Sede central Pellegrini sin observaciones.',
    declaredAddresses: 'Pellegrini 1650, Rosario',
    respEmail: 'director@farmaciacentral.com',
    respPhone: '0341-4247814',
    respAltEmail: 'admin@farmaciacentral.com',
    hrEmail: 'rrhh@farmaciacentral.com',
    hrPhone: '0341-4247815',
    hrAltEmail: 'contable@farmaciacentral.com',
    hrName: 'Roberto Gómez',
    hrRole: 'Contador / RRHH'
  });

  // Employee Add form state
  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpCuil, setNewEmpCuil] = useState('');
  const [newEmpCategory, setNewEmpCategory] = useState('Personal en Gestión de Farmacia');
  const [newEmpEntryDate, setNewEmpEntryDate] = useState('');
  const [newEmpWeeklyHours, setNewEmpWeeklyHours] = useState(44);
  const [newEmpIsAffiliate, setNewEmpIsAffiliate] = useState(false);

  const [employees, setEmployees] = useState<Employee[]>([
    { id: '1', fullName: 'Estela Maris Gómez', cuil: '27-30444555-8', category: 'Personal en Gestión de Farmacia', entryDate: '2024-03-15', active: true, isAffiliate: true },
    { id: '2', fullName: 'Carlos Alberto Rossi', cuil: '20-25666777-2', category: 'Personal con Asignación Específica', entryDate: '2025-01-10', active: true, isAffiliate: false },
    { id: '3', fullName: 'Matias Nicolás Fernández', cuil: '20-41222333-5', category: 'Personal con Asignación Específica', entryDate: '2025-11-01', active: true, isAffiliate: false },
  ]);

  const [announcements, setAnnouncements] = useState<any[]>([
    { id: '1', title: 'Nueva Homologación CCT 659/13', summary: 'Se informa a las farmacias la escala de Julio 2026 vigente para liquidaciones.', date: '25 Jun 2026' }
  ]);

  // CCT Categories List
  const cctCategories = [
    'Cadetes',
    'Aprendiz Ayudante',
    'Personal Auxiliar Interno y Externo',
    'Personal con Asignación Específica',
    'Ayudante en Gestión de Farmacia',
    'Personal en Gestión de Farmacia',
    'Farmacéutico'
  ];

  useEffect(() => {
    const fetchPharmacy = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      const isConfigured = 
        process.env.NEXT_PUBLIC_SUPABASE_URL !== 'your_supabase_project_url_here' && 
        !!process.env.NEXT_PUBLIC_SUPABASE_URL;

      if (!isConfigured) {
        setPharmacyName(profileData.nombreFantasia || profileData.razonSocial);
        setPharmacyCuit(profileData.cuit);
        setPharmacyAddress(profileData.declaredAddresses);
        setLoading(false);
        return;
      }

      if (!session) {
        window.location.href = '/login';
        return;
      }

      setUserId(session.user.id);

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, seen_tutorial')
        .eq('id', session.user.id)
        .single();

      if (profile?.role !== 'pharmacy_owner' && profile?.role !== 'admin') {
        window.location.href = '/login';
        return;
      }

      if (profile?.role === 'pharmacy_owner' && !profile?.seen_tutorial) {
        setShowTutorial(true);
      }

      let { data: pharmacy } = await supabase
        .from('pharmacies')
        .select('*')
        .eq('owner_id', session.user.id)
        .maybeSingle();

      if (!pharmacy) {
        // Autocreate pharmacy row if missing to prevent page crash
        const { data: newPharm, error: createError } = await supabase
          .from('pharmacies')
          .insert({
            name: 'Mi Farmacia',
            cuit: '99-' + Math.floor(10000000 + Math.random() * 90000000) + '-9',
            address: 'Dirección no declarada',
            owner_id: session.user.id,
            registered: true
          })
          .select()
          .single();

        if (!createError && newPharm) {
          pharmacy = newPharm;
        }
      }

      if (pharmacy) {
        // Sync has_debt status dynamically
        try {
          const todayStr = new Date().toISOString().split('T')[0];
          const { data: payments } = await supabase
            .from('payments')
            .select('status, due_date')
            .eq('pharmacy_id', pharmacy.id);

          let shouldHaveDebt = false;
          if (!payments || payments.length === 0) {
            shouldHaveDebt = true;
          } else {
            const hasPastDueUnpaid = payments.some(p => 
              (p.status === 'impago' || p.status === 'unpaid') && 
              p.due_date < todayStr
            );
            shouldHaveDebt = hasPastDueUnpaid;
          }

          if (pharmacy.has_debt !== shouldHaveDebt) {
            await supabase
              .from('pharmacies')
              .update({ has_debt: shouldHaveDebt })
              .eq('id', pharmacy.id);
            pharmacy.has_debt = shouldHaveDebt;
          }
        } catch (syncErr) {
          console.error("Error syncing pharmacy debt:", syncErr);
        }

        setPharmacyId(pharmacy.id);
        setPharmacyName(pharmacy.nombre_fantasia || pharmacy.name || pharmacy.razon_social);
        setPharmacyCuit(pharmacy.cuit);
        setPharmacyAddress(pharmacy.declared_addresses || pharmacy.address);
        setHasDebt(!!pharmacy.has_debt);
        
        setProfileData({
          cuit: pharmacy.cuit || '',
          razonSocial: pharmacy.razon_social || pharmacy.name || '',
          nombreFantasia: pharmacy.nombre_fantasia || pharmacy.name || '',
          whatsapp: pharmacy.whatsapp || '',
          actividadEconomica: pharmacy.actividad_economica || '',
          initialPeriod: pharmacy.initial_period || '',
          declaredEmployeeCount: pharmacy.declared_employee_count || 0,
          branches: pharmacy.branches || '',
          notes: pharmacy.notes || '',
          declaredAddresses: pharmacy.declared_addresses || pharmacy.address || '',
          respEmail: pharmacy.resp_email || '',
          respPhone: pharmacy.resp_phone || '',
          respAltEmail: pharmacy.resp_alt_email || '',
          hrEmail: pharmacy.hr_email || '',
          hrPhone: pharmacy.hr_phone || '',
          hrAltEmail: pharmacy.hr_alt_email || '',
          hrName: pharmacy.hr_name || '',
          hrRole: pharmacy.hr_role || ''
        } as any);

        // Fetch registered employees
        const { data: list } = await supabase
          .from('employees')
          .select('*')
          .eq('pharmacy_id', pharmacy.id);

        if (list) {
          setEmployees(list.map(emp => ({
            id: emp.id,
            fullName: emp.full_name,
            cuil: emp.cuil,
            category: emp.category,
            entryDate: emp.entry_date,
            active: emp.active,
            isAffiliate: !!emp.is_affiliate
          })));
        } else {
          setEmployees([]);
        }

        // Fetch announcements
        const { data: annData } = await supabase
          .from('announcements')
          .select('*')
          .eq('visibility', 'pharmacy')
          .order('created_at', { ascending: false });

        if (annData && annData.length > 0) {
          setAnnouncements(annData.map(a => ({
            id: a.id,
            title: a.title,
            summary: a.summary,
            date: new Date(a.created_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
          })));
        }
      }
      setLoading(false);
    };

    fetchPharmacy();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  const handleProfileFieldChange = (field: string, value: any) => {
    setProfileData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const isConfigured = 
      process.env.NEXT_PUBLIC_SUPABASE_URL !== 'your_supabase_project_url_here' && 
      !!process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (isConfigured) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { error } = await supabase
          .from('pharmacies')
          .update({
            name: profileData.nombreFantasia || profileData.razonSocial,
            cuit: profileData.cuit,
            address: profileData.declaredAddresses,
            initial_period: profileData.initialPeriod || null,
            razon_social: profileData.razonSocial,
            nombre_fantasia: profileData.nombreFantasia,
            whatsapp: profileData.whatsapp,
            actividad_economica: profileData.actividadEconomica,
            declared_employee_count: profileData.declaredEmployeeCount,
            branches: profileData.branches,
            notes: profileData.notes,
            declared_addresses: profileData.declaredAddresses,
            resp_email: profileData.respEmail,
            resp_phone: profileData.respPhone,
            resp_alt_email: profileData.respAltEmail,
            hr_email: profileData.hrEmail,
            hr_phone: profileData.hrPhone,
            hr_alt_email: profileData.hrAltEmail,
            hr_name: profileData.hrName,
            hr_role: profileData.hrRole,
          })
          .eq('owner_id', session.user.id);

        if (error) {
          alert('Error al guardar en Supabase: ' + error.message);
          return;
        }
      }
    }

    setPharmacyName(profileData.nombreFantasia || profileData.razonSocial);
    setPharmacyCuit(profileData.cuit);
    setPharmacyAddress(profileData.declaredAddresses);
    setIsProfileModalOpen(false);
  };

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmpName || !newEmpCuil || !newEmpEntryDate) {
      alert('Por favor, completa todos los campos requeridos.');
      return;
    }

    const isConfigured = 
      process.env.NEXT_PUBLIC_SUPABASE_URL !== 'your_supabase_project_url_here' && 
      !!process.env.NEXT_PUBLIC_SUPABASE_URL;

    let newId = Math.random().toString();

    if (isConfigured && pharmacyId) {
      const { data, error } = await supabase
        .from('employees')
        .insert({
          pharmacy_id: pharmacyId,
          full_name: newEmpName,
          cuil: newEmpCuil,
          category: newEmpCategory,
          entry_date: newEmpEntryDate,
          weekly_hours: newEmpWeeklyHours,
          active: true,
          is_affiliate: newEmpIsAffiliate
        })
        .select()
        .single();

      if (error) {
        alert('Error al guardar empleado: ' + error.message);
        return;
      }
      if (data) {
        newId = data.id;
      }
    }

    setEmployees(prev => [
      ...prev,
      {
        id: newId,
        fullName: newEmpName,
        cuil: newEmpCuil,
        category: newEmpCategory,
        entryDate: newEmpEntryDate,
        active: true,
        isAffiliate: newEmpIsAffiliate
      }
    ]);

    // reset fields
    setNewEmpName('');
    setNewEmpCuil('');
    setNewEmpCategory('Personal en Gestión de Farmacia');
    setNewEmpEntryDate('');
    setNewEmpWeeklyHours(44);
    setNewEmpIsAffiliate(false);
    setIsEmployeeModalOpen(false);
  };

  const handleDeleteEmployee = async (id: string) => {
    if (confirm('¿Seguro que deseas eliminar este empleado del registro de tu nómina?')) {
      const isConfigured = 
        process.env.NEXT_PUBLIC_SUPABASE_URL !== 'your_supabase_project_url_here' && 
        !!process.env.NEXT_PUBLIC_SUPABASE_URL;
      
      if (isConfigured) {
        const { error } = await supabase
          .from('employees')
          .delete()
          .eq('id', id);
        
        if (error) {
          alert('Error al eliminar empleado: ' + error.message);
          return;
        }
      }
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
    <div className="min-h-screen flex flex-col bg-[#f8fafc] text-[#1e293b] font-sans">
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
          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-border text-red-500 hover:bg-red-50/50 text-xs font-bold transition-all cursor-pointer bg-white"
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
            <div className="space-y-1.5">
              <h2 className="text-xl sm:text-2xl font-black text-[#0f172a]">{pharmacyName}</h2>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-bold text-slate-500">
                <span>CUIT: {pharmacyCuit}</span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-secondary" />
                  {pharmacyAddress}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/farmacia/postulantes"
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-border text-slate-800 hover:bg-slate-50 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer bg-white shadow-sm"
            >
              <Briefcase className="w-4 h-4 text-primary" />
              <span>Bolsa de Empleo</span>
            </Link>
            <button
              onClick={() => setIsProfileModalOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-border text-slate-800 hover:bg-slate-50 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer bg-white shadow-sm"
            >
              <Building2 className="w-4 h-4 text-primary" />
              <span>Editar Perfil</span>
            </button>
            {hasDebt ? (
              <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-red-500/10 text-red-600 text-xs font-bold shadow-sm animate-pulse">
                <AlertTriangle className="w-4 h-4" />
                <span>Con Deuda</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-emerald-500/10 text-emerald-600 text-xs font-bold shadow-sm">
                <CheckCircle2 className="w-4 h-4" />
                <span>Al Día</span>
              </span>
            )}
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
              <h3 className="font-bold text-lg text-[#0f172a]">Declaraciones Juradas</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-semibold">
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
              <h3 className="font-bold text-lg text-[#0f172a]">Pagos de Aportes</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-semibold">
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
            <h3 className="font-bold text-[#0f172a] text-sm border-b border-border pb-2">Estado del Período</h3>
            
            <div className="space-y-3 text-xs font-bold text-slate-500">
              <div className="flex justify-between">
                <span>Último Período Declarado:</span>
                <span className="text-[#0f172a]">Junio 2026</span>
              </div>
              <div className="flex justify-between">
                <span>Personal en Nómina:</span>
                <span className="text-[#0f172a]">{employees.length} empleados</span>
              </div>
              <div className="flex justify-between">
                <span>Estado de Pago Aportes:</span>
                {hasDebt ? (
                  <span className="text-red-600 font-bold bg-red-500/10 px-2.5 py-0.5 rounded">Con Deuda</span>
                ) : (
                  <span className="text-emerald-600 font-bold bg-emerald-500/10 px-2.5 py-0.5 rounded">Al Día</span>
                )}
              </div>
            </div>
            <div className="pt-3 border-t border-border/80">
              <Link
                href="/farmacia/acuerdos/acta-mayo-2026"
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-800 text-white text-xs font-bold uppercase tracking-wider hover:bg-slate-700 transition-all shadow-sm"
              >
                <FileText className="w-4 h-4 text-secondary" />
                <span>Acta Acuerdo Mayo 2026</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Main Grid split for Staff and Announcements */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Staff Table Summary */}
          <div className="lg:col-span-8 bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-premium glass space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <h3 className="font-bold text-[#0f172a] text-md flex items-center gap-2">
                <Users className="w-5 h-5 text-secondary" />
                Nómina de Empleados Declarada
              </h3>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsEmployeeModalOpen(true)}
                  className="inline-flex items-center justify-center gap-1 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider hover:bg-primary/95 transition-all shadow-premium cursor-pointer"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  <span>Agregar Empleado</span>
                </button>
                <span className="text-[10px] bg-secondary/15 text-secondary font-black px-2.5 py-1 rounded-full uppercase tracking-wider shadow-sm">
                  Junio 2026
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border text-slate-500 font-bold uppercase tracking-wider bg-slate-50">
                    <th className="py-3 px-4">Nombre y Apellido</th>
                    <th className="py-3 px-4">CUIL</th>
                    <th className="py-3 px-4">Categoría Profesional</th>
                    <th className="py-3 px-4 text-center">Afiliado</th>
                    <th className="py-3 px-4 text-center">Ingreso</th>
                    <th className="py-3 px-4 text-center">Antigüedad</th>
                    <th className="py-3 px-4 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 font-semibold text-slate-700">
                  {employees.map((emp) => {
                    const catInfo = getCurrentCategory(emp.category, emp.entryDate);
                    return (
                      <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-[#0f172a]">{emp.fullName}</td>
                        <td className="py-3.5 px-4 font-mono text-slate-500">{emp.cuil}</td>
                        <td className="py-3.5 px-4 text-slate-500">
                          <div className="flex flex-col">
                            <span>{catInfo.category}</span>
                            {catInfo.promoted && (
                              <span className="text-[9px] text-emerald-600 font-black uppercase tracking-wider bg-emerald-500/10 px-1.5 py-0.5 rounded w-max mt-0.5">
                                Promovido (+{catInfo.steps} cat.)
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {emp.isAffiliate ? (
                            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-emerald-500/10 text-emerald-600 rounded text-[9px] font-black uppercase border border-emerald-500/20">
                              Sí
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-slate-500/10 text-slate-500 rounded text-[9px] font-black uppercase border border-slate-500/10">
                              No
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center text-slate-500">{emp.entryDate}</td>
                        <td className="py-3.5 px-4 text-center text-slate-500 font-bold">{calculateSeniority(emp.entryDate)}</td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={() => handleDeleteEmployee(emp.id)}
                            className="p-1.5 rounded-lg border border-border hover:bg-red-50 text-slate-400 hover:text-red-500 hover:border-red-200 transition-colors bg-white cursor-pointer shadow-sm"
                            title="Dar de Baja"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Announcements Card (Pharmacy Exclusives) */}
          <div className="lg:col-span-4 bg-card border border-border rounded-3xl p-6 shadow-premium glass space-y-6">
            <div className="border-b border-border pb-4">
              <h3 className="font-bold text-[#0f172a] text-md flex items-center gap-2">
                <FileText className="w-5 h-5 text-secondary" />
                Circulares y Acuerdos
              </h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1 block">Exclusivo para Farmacias</p>
            </div>

            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
              {announcements.length === 0 ? (
                <div className="text-center py-6 text-xs text-muted-foreground font-semibold">
                  No hay comunicados gremiales en este momento.
                </div>
              ) : (
                announcements.map((ann) => (
                  <div key={ann.id} className="p-3.5 border border-border rounded-2xl bg-slate-50/50 hover:bg-slate-100/50 transition-colors space-y-1.5">
                    <span className="text-[9px] bg-secondary/15 text-secondary font-black px-2 py-0.5 rounded uppercase tracking-wider block w-max">
                      {ann.date}
                    </span>
                    <h4 className="font-bold text-xs text-[#0f172a] leading-snug">{ann.title}</h4>
                    <p className="text-[11px] text-slate-500 font-semibold leading-relaxed">{ann.summary}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </main>

      {/* Edit Profile Modal */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-premium-lg relative animate-scaleIn my-8">
            <button
              onClick={() => setIsProfileModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-extrabold text-[#0f172a] tracking-tight mb-6 flex items-center gap-2">
              <Building2 className="w-6 h-6 text-primary" />
              <span>Configuración del Perfil de Farmacia</span>
            </h3>

            {/* Tabs control */}
            <div className="flex border-b border-border mb-6 font-bold text-xs uppercase tracking-wider">
              <button
                onClick={() => setProfileTab('empresa')}
                className={`py-3 px-4 border-b-2 transition-all cursor-pointer ${
                  profileTab === 'empresa' 
                    ? 'border-primary text-primary' 
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                Datos de la Empresa
              </button>
              <button
                onClick={() => setProfileTab('contactos')}
                className={`py-3 px-4 border-b-2 transition-all cursor-pointer ${
                  profileTab === 'contactos' 
                    ? 'border-primary text-primary' 
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                Responsables y RRHH
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-6">
              {profileTab === 'empresa' ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block uppercase tracking-wider mb-1">CUIT de la Farmacia</label>
                      <input 
                        type="text" 
                        value={profileData.cuit} 
                        onChange={(e) => handleProfileFieldChange('cuit', e.target.value)} 
                        className="w-full rounded-xl border border-border px-4 py-2.5 bg-background text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 text-[#0f172a]"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block uppercase tracking-wider mb-1">Período Inicial</label>
                      <input 
                        type="date" 
                        value={profileData.initialPeriod} 
                        onChange={(e) => handleProfileFieldChange('initialPeriod', e.target.value)} 
                        className="w-full rounded-xl border border-border px-4 py-2.5 bg-background text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 text-[#0f172a]"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block uppercase tracking-wider mb-1">Razón Social</label>
                      <input 
                        type="text" 
                        value={profileData.razonSocial} 
                        onChange={(e) => handleProfileFieldChange('razonSocial', e.target.value)} 
                        className="w-full rounded-xl border border-border px-4 py-2.5 bg-background text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 text-[#0f172a]"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block uppercase tracking-wider mb-1">Nombre Fantasía</label>
                      <input 
                        type="text" 
                        value={profileData.nombreFantasia} 
                        onChange={(e) => handleProfileFieldChange('nombreFantasia', e.target.value)} 
                        className="w-full rounded-xl border border-border px-4 py-2.5 bg-background text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 text-[#0f172a]"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block uppercase tracking-wider mb-1">WhatsApp Comercial</label>
                      <input 
                        type="text" 
                        value={profileData.whatsapp} 
                        onChange={(e) => handleProfileFieldChange('whatsapp', e.target.value)} 
                        className="w-full rounded-xl border border-border px-4 py-2.5 bg-background text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 text-[#0f172a]"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block uppercase tracking-wider mb-1">Actividad Económica AFIP</label>
                      <input 
                        type="text" 
                        value={profileData.actividadEconomica} 
                        onChange={(e) => handleProfileFieldChange('actividadEconomica', e.target.value)} 
                        className="w-full rounded-xl border border-border px-4 py-2.5 bg-background text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 text-[#0f172a]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block uppercase tracking-wider mb-1">Domicilios Declarados (Sedes / Sucursales)</label>
                    <input 
                      type="text" 
                      value={profileData.declaredAddresses} 
                      onChange={(e) => handleProfileFieldChange('declaredAddresses', e.target.value)} 
                      className="w-full rounded-xl border border-border px-4 py-2.5 bg-background text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 text-[#0f172a]"
                      placeholder="Calle y Nro, Localidad"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block uppercase tracking-wider mb-1">Filiales</label>
                      <input 
                        type="text" 
                        value={profileData.branches} 
                        onChange={(e) => handleProfileFieldChange('branches', e.target.value)} 
                        className="w-full rounded-xl border border-border px-4 py-2.5 bg-background text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 text-[#0f172a]"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block uppercase tracking-wider mb-1">Cant. de Empleados Declarada</label>
                      <input 
                        type="number" 
                        value={profileData.declaredEmployeeCount} 
                        onChange={(e) => handleProfileFieldChange('declaredEmployeeCount', parseInt(e.target.value) || 0)} 
                        className="w-full rounded-xl border border-border px-4 py-2.5 bg-background text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 text-[#0f172a]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block uppercase tracking-wider mb-1">Observaciones</label>
                    <textarea 
                      value={profileData.notes} 
                      onChange={(e) => handleProfileFieldChange('notes', e.target.value)} 
                      rows={2}
                      className="w-full rounded-xl border border-border px-4 py-2.5 bg-background text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 text-[#0f172a] resize-none"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Responsable Legal */}
                  <div className="space-y-3.5 border-b border-border pb-4">
                    <span className="text-[10px] font-bold text-primary uppercase tracking-widest block font-sans">Responsable Principal / Firma Autorizada</span>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="text-[10px] font-bold text-slate-700 block uppercase tracking-wider mb-1">Email</label>
                        <input 
                          type="email" 
                          value={profileData.respEmail} 
                          onChange={(e) => handleProfileFieldChange('respEmail', e.target.value)} 
                          className="w-full rounded-xl border border-border px-4 py-2 bg-background text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 text-[#0f172a]"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-700 block uppercase tracking-wider mb-1">Teléfono</label>
                        <input 
                          type="text" 
                          value={profileData.respPhone} 
                          onChange={(e) => handleProfileFieldChange('respPhone', e.target.value)} 
                          className="w-full rounded-xl border border-border px-4 py-2 bg-background text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 text-[#0f172a]"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-700 block uppercase tracking-wider mb-1">Email Alternativo</label>
                        <input 
                          type="email" 
                          value={profileData.respAltEmail} 
                          onChange={(e) => handleProfileFieldChange('respAltEmail', e.target.value)} 
                          className="w-full rounded-xl border border-border px-4 py-2 bg-background text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 text-[#0f172a]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Responsable de RRHH / Segundo Contacto */}
                  <div className="space-y-3.5">
                    <span className="text-[10px] font-bold text-primary uppercase tracking-widest block font-sans">Segundo Responsable (RRHH / Contabilidad / Apoderado)</span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-bold text-slate-700 block uppercase tracking-wider mb-1">Nombre Completo del Responsable</label>
                        <input 
                          type="text" 
                          value={profileData.hrName || ''} 
                          onChange={(e) => handleProfileFieldChange('hrName', e.target.value)} 
                          className="w-full rounded-xl border border-border px-4 py-2 bg-background text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 text-[#0f172a]"
                          placeholder="Ej: Roberto Gómez"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-700 block uppercase tracking-wider mb-1">Relación / Cargo / Oficina</label>
                        <input 
                          type="text" 
                          value={profileData.hrRole || ''} 
                          onChange={(e) => handleProfileFieldChange('hrRole', e.target.value)} 
                          className="w-full rounded-xl border border-border px-4 py-2 bg-background text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 text-[#0f172a]"
                          placeholder="Ej: Contador, Recursos Humanos"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="text-[10px] font-bold text-slate-700 block uppercase tracking-wider mb-1">Email RRHH</label>
                        <input 
                          type="email" 
                          value={profileData.hrEmail || ''} 
                          onChange={(e) => handleProfileFieldChange('hrEmail', e.target.value)} 
                          className="w-full rounded-xl border border-border px-4 py-2 bg-background text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 text-[#0f172a]"
                          placeholder="rrhh@ejemplo.com"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-700 block uppercase tracking-wider mb-1">Teléfono RRHH</label>
                        <input 
                          type="text" 
                          value={profileData.hrPhone || ''} 
                          onChange={(e) => handleProfileFieldChange('hrPhone', e.target.value)} 
                          className="w-full rounded-xl border border-border px-4 py-2 bg-background text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 text-[#0f172a]"
                          placeholder="Ej: 3415556677"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-700 block uppercase tracking-wider mb-1">Email Alt. RRHH</label>
                        <input 
                          type="email" 
                          value={profileData.hrAltEmail || ''} 
                          onChange={(e) => handleProfileFieldChange('hrAltEmail', e.target.value)} 
                          className="w-full rounded-xl border border-border px-4 py-2 bg-background text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 text-[#0f172a]"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-border flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsProfileModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-border text-slate-700 text-xs font-bold uppercase tracking-wider hover:bg-slate-50 transition-all cursor-pointer bg-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider hover:bg-primary/95 transition-all shadow-premium cursor-pointer"
                >
                  Guardar Perfil
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Employee Modal */}
      {isEmployeeModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-premium-lg relative animate-scaleIn">
            <button
              onClick={() => setIsEmployeeModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-extrabold text-[#0f172a] tracking-tight mb-6 flex items-center gap-2">
              <Briefcase className="w-5.5 h-5.5 text-primary" />
              <span>Registrar Empleado en Nómina</span>
            </h3>

            <form onSubmit={handleAddEmployee} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block uppercase tracking-wider mb-1">Nombre y Apellido</label>
                <input 
                  type="text" 
                  value={newEmpName} 
                  onChange={(e) => setNewEmpName(e.target.value)} 
                  className="w-full rounded-xl border border-border px-4 py-2.5 bg-background text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 text-[#0f172a]"
                  placeholder="Ej: Juan Pérez"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block uppercase tracking-wider mb-1">CUIL del Empleado</label>
                  <input 
                    type="text" 
                    value={newEmpCuil} 
                    onChange={(e) => setNewEmpCuil(e.target.value)} 
                    className="w-full rounded-xl border border-border px-4 py-2.5 bg-background text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 text-[#0f172a]"
                    placeholder="20-XXXXXXXX-X"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block uppercase tracking-wider mb-1">Fecha de Ingreso</label>
                  <input 
                    type="date" 
                    value={newEmpEntryDate} 
                    onChange={(e) => setNewEmpEntryDate(e.target.value)} 
                    className="w-full rounded-xl border border-border px-4 py-2.5 bg-background text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 text-[#0f172a]"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block uppercase tracking-wider mb-1">Categoría Profesional CCT</label>
                <select
                  value={newEmpCategory}
                  onChange={(e) => setNewEmpCategory(e.target.value)}
                  className="w-full rounded-xl border border-border px-4 py-2.5 bg-background text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 text-[#0f172a]"
                >
                  {cctCategories.map((cat, idx) => (
                    <option key={idx} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-3 p-3.5 bg-slate-50 rounded-2xl border border-border/80">
                <input
                  type="checkbox"
                  id="new-emp-affiliate"
                  checked={newEmpIsAffiliate}
                  onChange={(e) => setNewEmpIsAffiliate(e.target.checked)}
                  className="w-4.5 h-4.5 accent-primary cursor-pointer rounded"
                />
                <label htmlFor="new-emp-affiliate" className="text-xs font-bold text-slate-700 cursor-pointer select-none">
                  Afiliado Sindical (Aporta cuota completa y aportes mutuales)
                </label>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Horas Semanales Declaradas</label>
                  <span className="text-xs font-extrabold text-primary bg-primary/5 px-2 py-0.5 rounded border border-primary/10">{newEmpWeeklyHours} hs</span>
                </div>
                <input 
                  type="range" 
                  min="1" 
                  max="44" 
                  value={newEmpWeeklyHours} 
                  onChange={(e) => setNewEmpWeeklyHours(parseInt(e.target.value))} 
                  className="w-full accent-primary h-2 bg-slate-200 rounded-lg cursor-pointer"
                />
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1 block">Rango: 1 hs (mínimo) a 44 hs (jornada completa)</span>
              </div>

              <div className="pt-4 border-t border-border flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsEmployeeModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-border text-slate-700 text-xs font-bold uppercase tracking-wider hover:bg-slate-50 transition-all cursor-pointer bg-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider hover:bg-primary/95 transition-all shadow-premium cursor-pointer"
                >
                  Registrar Empleado
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Onboarding Tutorial Modal */}
      {showTutorial && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[100] flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-card border border-border/80 rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-premium-lg relative animate-scaleIn space-y-6">
            
            {/* Header info */}
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-primary uppercase tracking-widest bg-primary/5 px-2.5 py-1 rounded-lg border border-primary/10">
                Paso {tutorialStep} de 4
              </span>
              
              <button 
                onClick={async () => {
                  try {
                    if (userId) {
                      await supabase.from('profiles').update({ seen_tutorial: true }).eq('id', userId);
                    }
                  } catch (e) {
                    console.error(e);
                  }
                  setShowTutorial(false);
                }}
                className="text-xs text-muted-foreground hover:text-foreground font-bold cursor-pointer"
              >
                Omitir guía
              </button>
            </div>

            {/* Step content */}
            <div className="space-y-4 text-foreground">
              {tutorialStep === 1 && (
                <div className="space-y-3">
                  <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-2">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-extrabold text-foreground tracking-tight">¡Bienvenido al Portal de Farmacias de ATFAR!</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed font-semibold">
                    Esta guía te asistirá en los primeros pasos necesarios para habilitar tu cuenta y comenzar a utilizar el sistema de liquidaciones de aportes obligatorios.
                  </p>
                </div>
              )}

              {tutorialStep === 2 && (
                <div className="space-y-3">
                  <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-600 mb-2">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-extrabold text-foreground tracking-tight">Paso 1: Mi Farmacia y Ubicación</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed font-semibold">
                    Antes que nada, verificá los datos de tu sucursal en el mapa de ATFAR. Hacé clic en "Ver / Editar Perfil" en el panel principal para completar tu razón social, CUIT y datos de contacto actualizados.
                  </p>
                </div>
              )}

              {tutorialStep === 3 && (
                <div className="space-y-3">
                  <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-600 mb-2">
                    <Users className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-extrabold text-foreground tracking-tight">Paso 2: Nómina de Empleados</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed font-semibold">
                    Cargá a tus empleados en la nómina activa ingresando su Nombre, CUIL, Categoría Profesional del CCT 659/13 y Fecha de Ingreso.
                  </p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Mantener esta lista al día es obligatorio y sirve para calcular de forma transparente el básico de las declaraciones mensuales.
                  </p>
                </div>
              )}

              {tutorialStep === 4 && (
                <div className="space-y-3">
                  <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-600 mb-2">
                    <FileText className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-extrabold text-foreground tracking-tight">Paso 3: Declaraciones y Reportar Pago</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed font-semibold">
                    Todos los meses debés generar tu Declaración Jurada, descargar la boleta de pago y realizar el depósito o transferencia bancaria.
                  </p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Una vez realizado el pago, recordá subir el comprobante de transferencia desde la sección de "Declaraciones y Pagos" para que el sindicato concilie y apruebe tu estado de cuenta.
                  </p>
                </div>
              )}
            </div>

            {/* Step indicators */}
            <div className="flex gap-1.5 justify-center py-2">
              {[1, 2, 3, 4].map((step) => (
                <div 
                  key={step} 
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    step === tutorialStep ? 'w-8 bg-primary' : 'w-2 bg-slate-200'
                  }`}
                />
              ))}
            </div>

            {/* Navigation buttons */}
            <div className="pt-4 border-t border-border flex justify-between items-center">
              <button
                disabled={tutorialStep === 1}
                onClick={() => setTutorialStep(prev => prev - 1)}
                className="px-4 py-2 rounded-xl border border-border text-xs font-bold text-slate-700 disabled:opacity-30 disabled:pointer-events-none hover:bg-slate-50 cursor-pointer bg-white transition-all"
              >
                Anterior
              </button>

              {tutorialStep < 4 ? (
                <button
                  onClick={() => setTutorialStep(prev => prev + 1)}
                  className="px-5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold cursor-pointer hover:bg-primary/95 transition-all shadow-premium"
                >
                  Siguiente
                </button>
              ) : (
                <button
                  onClick={async () => {
                    try {
                      if (userId) {
                        await supabase.from('profiles').update({ seen_tutorial: true }).eq('id', userId);
                      }
                    } catch (e) {
                      console.error(e);
                    }
                    setShowTutorial(false);
                  }}
                  className="px-6 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold cursor-pointer hover:bg-emerald-700 transition-all shadow-premium"
                >
                  ¡Comenzar!
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
