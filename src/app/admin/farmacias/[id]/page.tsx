'use client';

import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Building2, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  ArrowLeft, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  CreditCard,
  Download,
  Users,
  Loader2,
  ShieldCheck,
  MessageSquare
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { calculateSeniority, getCurrentCategory } from '@/lib/dateUtils';
import { Payment } from '@/types';
import { confirmDialog } from '@/components/shared/ConfirmDialog';

interface PharmacyDetail {
  id: string;
  name: string;
  nombreFantasia: string;
  razonSocial: string;
  cuit: string;
  address: string;
  declaredAddresses: string;
  crossStreets: string;
  city: string;
  whatsapp: string;
  phoneAlt: string;
  actividadEconomica: string;
  initialPeriod: string;
  declaredEmployeeCount: number;
  branches: string;
  notes: string;
  latitude: number | null;
  longitude: number | null;
  
  // Contacts
  responsibleName: string;
  responsibleEmail: string;
  responsiblePhone: string;
  responsibleAltEmail: string;
  
  hrName?: string;
  hrRole?: string;
  hrEmail?: string;
  hrPhone?: string;
  hrAltEmail?: string;
  
  registeredDate: string;
  employees: number;
  paymentStatus: 'al_dia' | 'con_deuda';
  declarations: { month: string; date: string; employees: number; status: 'validada' | 'pendiente' }[];
  payments: { invoice: string; period: string; amount: number; status: 'pagado' | 'impago' | 'en_revision'; date: string; receiptUrl?: string | null }[];
  documents: { name: string; type: string; size: string; url?: string | null }[];
}

interface Employee {
  id: string;
  fullName: string;
  cuil: string;
  category: string;
  entryDate: string;
  active: boolean;
  isAffiliate: boolean;
}

export default function FarmaciaPerfilAdminPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [loading, setLoading] = useState(true);
  const [pharmacy, setPharmacy] = useState<PharmacyDetail | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [activeTab, setActiveTab] = useState<'info' | 'contactos' | 'empleados' | 'pagos' | 'documentos'>('info');

  useEffect(() => {
    async function loadData() {
      try {
        const isConfigured = 
          process.env.NEXT_PUBLIC_SUPABASE_URL !== 'your_supabase_project_url_here' && 
          !!process.env.NEXT_PUBLIC_SUPABASE_URL;

        if (!isConfigured) {
          // Clean fallback
          setPharmacy({
            id: id,
            name: 'Farmacia Registrada',
            nombreFantasia: 'Farmacia Registrada',
            razonSocial: 'Farmacia Registrada S.A.',
            cuit: '30-00000000-0',
            address: 'Dirección Registrada',
            declaredAddresses: 'Dirección Registrada',
            crossStreets: 'Sin declarar',
            city: 'Rosario, Santa Fe',
            whatsapp: '',
            phoneAlt: '',
            actividadEconomica: 'Venta al por menor de productos farmacéuticos',
            initialPeriod: '',
            declaredEmployeeCount: 0,
            branches: 'Sede Única',
            notes: 'Sin observaciones.',
            latitude: -32.9468,
            longitude: -60.6393,
            responsibleName: 'Sin Responsable Asignado',
            responsibleEmail: 'sin_email@farmacia.com',
            responsiblePhone: '',
            responsibleAltEmail: '',
            hrName: undefined,
            hrRole: undefined,
            hrEmail: undefined,
            hrPhone: undefined,
            hrAltEmail: undefined,
            registeredDate: new Date().toLocaleDateString('es-AR'),
            employees: 0,
            paymentStatus: 'al_dia',
            declarations: [],
            payments: [],
            documents: []
          });

          setEmployees([]);
          setLoading(false);
          return;
        }

        // Real Supabase data fetching
        const { data: pharmData, error: pError } = await supabase
          .from('pharmacies')
          .select(`
            *,
            profiles:owner_id (full_name, email, phone)
          `)
          .eq('id', id)
          .single();

        if (pError) throw pError;

        // Fetch registered employees
        const { data: empList, error: eError } = await supabase
          .from('employees')
          .select('*')
          .eq('pharmacy_id', id);

        if (eError) throw eError;

        const mappedEmployees = empList ? empList.map(e => ({
          id: e.id,
          fullName: e.full_name,
          cuil: e.cuil,
          category: e.category || 'Cadetes',
          entryDate: e.entry_date || '',
          active: e.active,
          isAffiliate: !!e.is_affiliate
        })) : [];

        // Fetch real payments
        const { data: payList } = await supabase
          .from('payments')
          .select('*')
          .eq('pharmacy_id', id)
          .order('created_at', { ascending: false });

        const mappedPayments = payList && payList.length > 0
          ? payList.map((p: Payment) => ({
              invoice: p.invoice_number || 'N/A',
              period: p.period || 'Periodo',
              amount: Number(p.amount || 0),
              status: (p.status || 'impago') as 'pagado' | 'impago' | 'en_revision',
              date: p.pay_date ? new Date(p.pay_date).toLocaleDateString('es-AR') : p.due_date ? new Date(p.due_date).toLocaleDateString('es-AR') : 'Sin fecha',
              receiptUrl: p.receipt_url || null
            }))
          : [];

        setEmployees(mappedEmployees);

        if (pharmData) {
          setPharmacy({
            id: pharmData.id,
            name: pharmData.name || 'Sin Nombre',
            nombreFantasia: pharmData.nombre_fantasia || pharmData.name || 'Sin Nombre Fantasía',
            razonSocial: pharmData.razon_social || pharmData.name || 'Sin Razón Social',
            cuit: pharmData.cuit,
            address: pharmData.address || 'Sin Dirección',
            declaredAddresses: pharmData.declared_addresses || pharmData.address || 'Sin Dirección',
            crossStreets: pharmData.cross_streets || 'Sin declarar',
            city: 'Rosario, Santa Fe',
            whatsapp: pharmData.whatsapp || '',
            phoneAlt: pharmData.phone_alt || '',
            actividadEconomica: pharmData.actividad_economica || 'Venta al por menor de productos farmacéuticos',
            initialPeriod: pharmData.initial_period || '',
            declaredEmployeeCount: pharmData.declared_employee_count || mappedEmployees.length,
            branches: pharmData.branches || 'Sede Única',
            notes: pharmData.notes || 'Sin observaciones.',
            latitude: pharmData.latitude || null,
            longitude: pharmData.longitude || null,
            responsibleName: pharmData.profiles?.full_name || 'Sin Asignar',
            responsibleEmail: pharmData.profiles?.email || 'Sin Asignar',
            responsiblePhone: pharmData.profiles?.phone || 'Sin Asignar',
            responsibleAltEmail: pharmData.resp_alt_email || '',
            hrName: pharmData.hr_name || undefined,
            hrRole: pharmData.hr_role || undefined,
            hrEmail: pharmData.hr_email || undefined,
            hrPhone: pharmData.hr_phone || undefined,
            hrAltEmail: pharmData.hr_alt_email || undefined,
            registeredDate: new Date(pharmData.created_at).toLocaleDateString('es-AR'),
            employees: mappedEmployees.length,
            paymentStatus: pharmData.has_debt ? 'con_deuda' : 'al_dia',
            declarations: [],
            payments: mappedPayments,
            documents: []
          });
        }
      } catch (err) {
        console.error("Error loading data from Supabase:", err);
        toast.error('No pudimos cargar el detalle de la farmacia.', {
          description: 'Revisá tu conexión y volvé a intentarlo.',
        });
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [id]);

  const handleMarkPaidTransition = async () => {
    if (!pharmacy) return;
    const confirmed = await confirmDialog({
      title: 'Marcar como Al Día',
      message: `¿"${pharmacy.razonSocial}" ya pagó por fuera del sistema este mes? Va a figurar "Al Día" hasta fin de mes, y después el cálculo normal vuelve a aplicar solo.`,
      confirmLabel: 'Marcar Al Día',
    });
    if (!confirmed) return;
    try {
      const { error } = await supabase.rpc('set_pharmacy_debt_override', { p_pharmacy_id: id, p_clear: false });
      if (error) throw error;
      setPharmacy(prev => prev ? { ...prev, paymentStatus: 'al_dia' } : prev);
      toast.success('Farmacia marcada como Al Día hasta fin de mes.');
    } catch (err) {
      console.error('Error marking pharmacy as paid:', err);
      toast.error('Ocurrió un error al actualizar el estado de la farmacia.');
    }
  };

  if (loading || !pharmacy) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Cargando Ficha Completa de Farmacia...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header breadcrumbs & actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link 
          href="/admin/farmacias"
          className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-primary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver al Padrón de Farmacias</span>
        </Link>
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5 border ${
            pharmacy.paymentStatus === 'al_dia' 
              ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' 
              : 'bg-red-500/10 text-red-600 border-red-500/20'
          }`}>
            <span className={`w-2 h-2 rounded-full ${pharmacy.paymentStatus === 'al_dia' ? 'bg-emerald-500' : 'bg-red-500'}`} />
            {pharmacy.paymentStatus === 'al_dia' ? 'Estado: Al Día' : 'Estado: Con Deuda'}
          </span>
          {pharmacy.paymentStatus === 'con_deuda' && (
            <button
              onClick={handleMarkPaidTransition}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider border border-emerald-500/20 bg-emerald-500/5 text-emerald-600 hover:bg-emerald-500/10 transition-all cursor-pointer"
              title="Ya pagó por fuera del sistema este mes"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Marcar Al Día</span>
            </button>
          )}
        </div>
      </div>

      {/* Top Banner Header Card */}
      <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-premium glass relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-5">
            <div className="p-4 bg-primary/10 text-primary border border-primary/20 rounded-2xl flex-shrink-0">
              <Building2 className="w-9 h-9 text-secondary" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-black text-foreground">{pharmacy.nombreFantasia || pharmacy.razonSocial}</h1>
                <span className="text-xs font-mono font-bold bg-muted px-2.5 py-1 rounded-lg text-muted-foreground">
                  CUIT: {pharmacy.cuit}
                </span>
              </div>
              <p className="text-xs font-semibold text-muted-foreground flex items-center gap-2">
                <span className="font-bold text-foreground">{pharmacy.razonSocial}</span>
                <span>•</span>
                <span>{pharmacy.address}, {pharmacy.city}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 border-t md:border-t-0 pt-4 md:pt-0 border-border">
            {pharmacy.responsiblePhone && (
              <a
                href={`https://wa.me/${pharmacy.responsiblePhone.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 shadow-sm"
              >
                <MessageSquare className="w-4 h-4" />
                <span>WhatsApp Titular</span>
              </a>
            )}
            {pharmacy.hrPhone && (
              <a
                href={`https://wa.me/${pharmacy.hrPhone.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/95 text-white text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 shadow-sm"
              >
                <Phone className="w-4 h-4" />
                <span>WhatsApp RRHH</span>
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex overflow-x-auto border-b border-border bg-card/50 p-1 rounded-2xl font-bold text-xs uppercase tracking-wider gap-1 scrollbar-none">
        <button
          onClick={() => setActiveTab('info')}
          className={`flex items-center gap-2 py-3 px-5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'info'
              ? 'bg-primary text-primary-foreground shadow-md'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Datos de la Farmacia</span>
        </button>

        <button
          onClick={() => setActiveTab('contactos')}
          className={`flex items-center gap-2 py-3 px-5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'contactos'
              ? 'bg-primary text-primary-foreground shadow-md'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
        >
          <User className="w-4 h-4" />
          <span>Contactos y RRHH</span>
        </button>

        <button
          onClick={() => setActiveTab('empleados')}
          className={`flex items-center gap-2 py-3 px-5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'empleados'
              ? 'bg-primary text-primary-foreground shadow-md'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Nómina de Empleados</span>
          <span className={`ml-1 px-2 py-0.5 rounded-full text-[10px] font-black ${
            activeTab === 'empleados' ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'
          }`}>
            {employees.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('pagos')}
          className={`flex items-center gap-2 py-3 px-5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'pagos'
              ? 'bg-primary text-primary-foreground shadow-md'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>DDJJ y Estado de Cuenta</span>
          {pharmacy.paymentStatus === 'con_deuda' && (
            <span className="ml-1 w-2 h-2 rounded-full bg-red-400 animate-ping" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('documentos')}
          className={`flex items-center gap-2 py-3 px-5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'documentos'
              ? 'bg-primary text-primary-foreground shadow-md'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Documentación ({pharmacy.documents.length})</span>
        </button>
      </div>

      {/* TAB CONTENT PANELS */}
      <div className="space-y-6">

        {/* 1. DATOS DE LA FARMACIA */}
        {activeTab === 'info' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fadeIn">
            <div className="lg:col-span-8 bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-premium glass space-y-6">
              <div className="border-b border-border pb-4 flex items-center justify-between">
                <h2 className="text-lg font-extrabold text-foreground flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-secondary" />
                  Información Comercial y AFIP
                </h2>
                <span className="text-xs text-muted-foreground font-mono font-bold">ID: {pharmacy.id}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs font-semibold">
                <div className="space-y-1">
                  <span className="text-muted-foreground uppercase text-[10px] tracking-wider block">Razón Social</span>
                  <span className="text-foreground text-sm font-bold block">{pharmacy.razonSocial}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-muted-foreground uppercase text-[10px] tracking-wider block">Nombre de Fantasía</span>
                  <span className="text-foreground text-sm font-bold block">{pharmacy.nombreFantasia}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-muted-foreground uppercase text-[10px] tracking-wider block">CUIT Comercial</span>
                  <span className="text-foreground font-mono font-bold block">{pharmacy.cuit}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-muted-foreground uppercase text-[10px] tracking-wider block">Actividad Económica AFIP</span>
                  <span className="text-foreground block">{pharmacy.actividadEconomica}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-muted-foreground uppercase text-[10px] tracking-wider block">Domicilio Declarado</span>
                  <span className="text-foreground block">{pharmacy.declaredAddresses}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-muted-foreground uppercase text-[10px] tracking-wider block">Entre calles y Esquinas</span>
                  <span className="text-foreground block">{pharmacy.crossStreets}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-muted-foreground uppercase text-[10px] tracking-wider block">Filiales / Sucursales</span>
                  <span className="text-foreground block">{pharmacy.branches || 'Sede Única'}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-muted-foreground uppercase text-[10px] tracking-wider block">Período Inicial / Alta Gremial</span>
                  <span className="text-foreground block">{pharmacy.initialPeriod || 'Declarado al alta'}</span>
                </div>
              </div>

              {pharmacy.notes && (
                <div className="pt-4 border-t border-border space-y-1">
                  <span className="text-muted-foreground uppercase text-[10px] tracking-wider block font-bold">Observaciones Internas</span>
                  <p className="text-xs text-foreground bg-muted/40 p-3.5 rounded-xl border border-border leading-relaxed font-semibold">
                    {pharmacy.notes}
                  </p>
                </div>
              )}
            </div>

            {/* Quick summary sidebar */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-card border border-border rounded-3xl p-6 shadow-premium glass space-y-4">
                <h3 className="font-bold text-foreground text-sm border-b border-border pb-2">Resumen Operativo</h3>
                
                <div className="space-y-3 text-xs font-semibold">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground uppercase">Registro Web:</span>
                    <span className="text-foreground font-bold">{pharmacy.registeredDate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground uppercase">Nómina Registrada:</span>
                    <span className="text-foreground font-bold">{employees.length} empleados</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground uppercase">Empleados Declarados:</span>
                    <span className="text-foreground font-bold">{pharmacy.declaredEmployeeCount} empleados</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground uppercase">WhatsApp Comercial:</span>
                    <span className="text-foreground font-bold">{pharmacy.whatsapp || 'Sin registrar'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground uppercase">Teléfono Alternativo:</span>
                    <span className="text-foreground font-bold">{pharmacy.phoneAlt || 'Sin registrar'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. CONTACTOS Y RRHH */}
        {activeTab === 'contactos' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start animate-fadeIn">
            {/* Responsable Legal / Titular */}
            <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-premium glass space-y-6">
              <div className="border-b border-border pb-4 flex items-center justify-between">
                <h2 className="text-lg font-extrabold text-foreground flex items-center gap-2">
                  <User className="w-5 h-5 text-secondary" />
                  Responsable Principal / Titular
                </h2>
                <span className="text-[10px] font-black uppercase bg-secondary/10 text-secondary px-2.5 py-1 rounded-full">Firma Autorizada</span>
              </div>

              <div className="space-y-4 text-xs font-semibold">
                <div className="space-y-1">
                  <span className="text-muted-foreground uppercase text-[10px] tracking-wider block">Nombre y Apellido</span>
                  <span className="text-foreground text-sm font-bold block">{pharmacy.responsibleName}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-muted-foreground uppercase text-[10px] tracking-wider block">Email Principal</span>
                  <a href={`mailto:${pharmacy.responsibleEmail}`} className="text-primary text-sm font-bold block hover:underline">
                    {pharmacy.responsibleEmail}
                  </a>
                </div>
                <div className="space-y-1">
                  <span className="text-muted-foreground uppercase text-[10px] tracking-wider block">Teléfono Móvil / Fijo</span>
                  <span className="text-foreground font-bold block">{pharmacy.responsiblePhone}</span>
                </div>
                {pharmacy.responsibleAltEmail && (
                  <div className="space-y-1">
                    <span className="text-muted-foreground uppercase text-[10px] tracking-wider block">Email Alternativo</span>
                    <span className="text-foreground block">{pharmacy.responsibleAltEmail}</span>
                  </div>
                )}
              </div>

              {pharmacy.responsiblePhone && (
                <div className="pt-4 border-t border-border">
                  <a
                    href={`https://wa.me/${pharmacy.responsiblePhone.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase tracking-wider transition-all shadow-sm"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Iniciar Chat de WhatsApp con Titular</span>
                  </a>
                </div>
              )}
            </div>

            {/* Responsable de RRHH / Liquidaciones */}
            <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-premium glass space-y-6">
              <div className="border-b border-border pb-4 flex items-center justify-between">
                <h2 className="text-lg font-extrabold text-foreground flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  Responsable de RRHH / Liquidaciones
                </h2>
                <span className="text-[10px] font-black uppercase bg-primary/10 text-primary px-2.5 py-1 rounded-full">Liquidaciones</span>
              </div>

              {pharmacy.hrName || pharmacy.hrEmail || pharmacy.hrPhone ? (
                <div className="space-y-4 text-xs font-semibold">
                  <div className="space-y-1">
                    <span className="text-muted-foreground uppercase text-[10px] tracking-wider block">Nombre del Responsable</span>
                    <span className="text-foreground text-sm font-bold block">{pharmacy.hrName || 'No especificado'}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-muted-foreground uppercase text-[10px] tracking-wider block">Cargo / Área</span>
                    <span className="text-foreground font-bold block">{pharmacy.hrRole || 'Contabilidad / RRHH'}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-muted-foreground uppercase text-[10px] tracking-wider block">Email de RRHH</span>
                    {pharmacy.hrEmail ? (
                      <a href={`mailto:${pharmacy.hrEmail}`} className="text-primary text-sm font-bold block hover:underline">
                        {pharmacy.hrEmail}
                      </a>
                    ) : (
                      <span className="text-muted-foreground block">Sin email registrado</span>
                    )}
                  </div>
                  <div className="space-y-1">
                    <span className="text-muted-foreground uppercase text-[10px] tracking-wider block">Teléfono Directo RRHH</span>
                    <span className="text-foreground font-bold block">{pharmacy.hrPhone || 'Sin teléfono registrado'}</span>
                  </div>
                  {pharmacy.hrAltEmail && (
                    <div className="space-y-1">
                      <span className="text-muted-foreground uppercase text-[10px] tracking-wider block">Email Alt. RRHH</span>
                      <span className="text-foreground block">{pharmacy.hrAltEmail}</span>
                    </div>
                  )}

                  {pharmacy.hrPhone && (
                    <div className="pt-4 border-t border-border">
                      <a
                        href={`https://wa.me/${pharmacy.hrPhone.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/95 text-white text-xs font-bold uppercase tracking-wider transition-all shadow-sm"
                      >
                        <MessageSquare className="w-4 h-4" />
                        <span>Iniciar Chat con RRHH / Liquidaciones</span>
                      </a>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-xs font-semibold text-muted-foreground space-y-2">
                  <p>La farmacia aún no declaró datos del responsable de RRHH.</p>
                  <p className="text-[11px] text-muted-foreground/75">Los contactos por defecto se dirigen al titular registrado.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 3. NÓMINA DE EMPLEADOS */}
        {activeTab === 'empleados' && (
          <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-premium glass space-y-6 animate-fadeIn">
            <div className="border-b border-border pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-extrabold text-foreground flex items-center gap-2">
                  <Users className="w-5 h-5 text-secondary" />
                  Nómina Activa de Empleados Declarada
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">Categorización, antigüedad y estado gremial del personal de la farmacia</p>
              </div>
              <span className="text-xs font-mono font-bold bg-muted px-3 py-1.5 rounded-xl text-foreground self-start sm:self-auto">
                Total: {employees.length} trabajadores
              </span>
            </div>

            {employees.length === 0 ? (
              <div className="text-center py-10 text-xs font-semibold text-muted-foreground">
                No hay empleados declarados en la nómina de esta farmacia.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border text-slate-500 font-bold uppercase tracking-wider bg-slate-50">
                      <th className="py-3 px-4">Trabajador y CUIL</th>
                      <th className="py-3 px-4">Categoría CCT 659/13</th>
                      <th className="py-3 px-4 text-center">Afiliado Sindical</th>
                      <th className="py-3 px-4 text-center">Fecha Ingreso</th>
                      <th className="py-3 px-4 text-center">Antigüedad</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 font-semibold text-slate-700">
                    {employees.map((emp) => {
                      const catInfo = getCurrentCategory(emp.category, emp.entryDate);
                      return (
                        <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3.5 px-4">
                            <span className="font-bold text-[#0f172a] text-sm block">{emp.fullName}</span>
                            <span className="font-mono text-xs text-slate-400 block mt-0.5">CUIL: {emp.cuil}</span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-500">
                            <div className="flex flex-col">
                              <span className="font-bold text-[#0f172a]">{catInfo.category}</span>
                              {catInfo.promoted && (
                                <span className="text-[9px] text-emerald-600 font-black uppercase tracking-wider bg-emerald-500/10 px-2 py-0.5 rounded w-max mt-1 border border-emerald-500/20">
                                  Promovido por Antigüedad (+{catInfo.steps} cat.)
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            {emp.isAffiliate ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-500/10 text-emerald-600 rounded-full text-[10px] font-black uppercase border border-emerald-500/20">
                                <ShieldCheck className="w-3 h-3" />
                                <span>Afiliado ATFAR</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-500/10 text-slate-500 rounded-full text-[10px] font-black uppercase border border-slate-500/10">
                                No Afiliado
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center text-slate-500">{emp.entryDate}</td>
                          <td className="py-3.5 px-4 text-center text-slate-900 font-extrabold">{calculateSeniority(emp.entryDate)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* 4. DECLARACIONES JURADAS Y PAGOS */}
        {activeTab === 'pagos' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fadeIn">
            {/* DDJJ list */}
            <div className="lg:col-span-6 bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-premium glass space-y-6">
              <div className="border-b border-border pb-4">
                <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                  <FileText className="w-5 h-5 text-secondary" />
                  Historial de Declaraciones Juradas
                </h2>
              </div>

              {pharmacy.declarations.length === 0 ? (
                <div className="text-center py-8 text-xs font-semibold text-muted-foreground">
                  No hay declaraciones juradas presentadas en el sistema.
                </div>
              ) : (
                <div className="divide-y divide-border/60">
                  {pharmacy.declarations.map((dec, idx) => (
                    <div key={idx} className="py-3.5 first:pt-0 last:pb-0 flex items-center justify-between gap-4 text-xs">
                      <div className="space-y-0.5">
                        <span className="font-bold text-foreground block text-sm">{dec.month}</span>
                        <span className="text-[10px] text-muted-foreground block font-medium">Presentada: {dec.date}</span>
                      </div>

                      <div className="flex items-center gap-4">
                        <span className="text-muted-foreground font-semibold">{dec.employees} emp.</span>
                        {dec.status === 'validada' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 font-bold text-[9px] uppercase border border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Validada</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 font-bold text-[9px] uppercase border border-amber-500/20">
                            <Clock className="w-3 h-3 animate-pulse" />
                            <span>Pendiente</span>
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Payments / Invoices List */}
            <div className="lg:col-span-6 bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-premium glass space-y-6">
              <div className="border-b border-border pb-4">
                <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-secondary" />
                  Comprobantes y Aportes Gremiales
                </h2>
              </div>

              {pharmacy.payments.length === 0 ? (
                <div className="text-center py-8 text-xs font-semibold text-muted-foreground">
                  No hay comprobantes ni pagos cargados para esta farmacia.
                </div>
              ) : (
                <div className="divide-y divide-border/60">
                  {pharmacy.payments.map((pay, idx) => (
                    <div key={idx} className="py-3.5 first:pt-0 last:pb-0 flex items-center justify-between gap-4 text-xs">
                      <div className="space-y-0.5">
                        <span className="font-bold text-foreground block">{pay.invoice}</span>
                        <span className="text-[10px] text-muted-foreground block font-medium">Período: {pay.period}</span>
                      </div>

                      <div className="flex items-center gap-4">
                        <span className="font-bold text-foreground text-sm">${pay.amount.toLocaleString('es-AR')}</span>
                        
                        {pay.receiptUrl && (
                          <a
                            href={pay.receiptUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg border border-border text-primary hover:bg-primary/5 text-[10px] font-bold transition-all bg-white"
                            title="Ver Comprobante"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </a>
                        )}
                        
                        {pay.status === 'pagado' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 font-bold text-[9px] uppercase border border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Pagado</span>
                          </span>
                        ) : pay.status === 'en_revision' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 font-bold text-[9px] uppercase border border-amber-500/20">
                            <Clock className="w-3 h-3 animate-pulse" />
                            <span>En Revisión</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-500/10 text-red-600 font-bold text-[9px] uppercase border border-red-500/20">
                            <XCircle className="w-3 h-3" />
                            <span>Impago</span>
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 5. DOCUMENTACIÓN */}
        {activeTab === 'documentos' && (
          <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-premium glass space-y-6 animate-fadeIn">
            <div className="border-b border-border pb-4">
              <h2 className="text-lg font-extrabold text-foreground flex items-center gap-2">
                <FileText className="w-5 h-5 text-secondary" />
                Documentos Presentados por la Farmacia
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">Constancias de AFIP, habilitaciones y documentación respaldatoria</p>
            </div>

            {pharmacy.documents.length === 0 ? (
              <div className="text-center py-8 text-xs font-semibold text-muted-foreground">
                No se adjuntaron documentos adicionales para esta farmacia.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pharmacy.documents.map((doc, idx) => (
                  <div 
                    key={idx}
                    className="p-4 border border-border rounded-2xl flex items-center justify-between gap-4 text-xs font-semibold bg-background/50 hover:bg-muted/15 transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2.5 bg-secondary/10 text-secondary rounded-xl">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="truncate">
                        <span className="block text-foreground font-bold truncate text-sm">{doc.name}</span>
                        <span className="block text-[10px] text-muted-foreground font-medium uppercase mt-0.5">{doc.type} • {doc.size}</span>
                      </div>
                    </div>
                    {doc.url ? (
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        download
                        className="px-3 py-1.5 rounded-xl border border-border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground text-xs font-bold flex items-center gap-1.5 bg-white shadow-sm"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Descargar</span>
                      </a>
                    ) : (
                      <span
                        title="Todavía no se subió el archivo"
                        className="px-3 py-1.5 rounded-xl border border-border text-muted-foreground/50 text-xs font-bold flex items-center gap-1.5 bg-white/50 cursor-not-allowed"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Sin archivo</span>
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
