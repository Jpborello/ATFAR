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
  Loader2
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { calculateSeniority, getCurrentCategory } from '@/lib/dateUtils';
import { Payment } from '@/types';

interface PharmacyDetail {
  razonSocial: string;
  cuit: string;
  address: string;
  city: string;
  responsibleName: string;
  responsibleEmail: string;
  responsiblePhone: string;
  registeredDate: string;
  employees: number;
  paymentStatus: 'al_dia' | 'con_deuda';
  declarations: { month: string; date: string; employees: number; status: 'validada' | 'pendiente' }[];
  payments: { invoice: string; period: string; amount: number; status: 'pagado' | 'impago' | 'en_revision'; date: string; receiptUrl?: string | null }[];
  documents: { name: string; type: string; size: string }[];
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

  useEffect(() => {
    async function loadData() {
      try {
        const isConfigured = 
          process.env.NEXT_PUBLIC_SUPABASE_URL !== 'your_supabase_project_url_here' && 
          !!process.env.NEXT_PUBLIC_SUPABASE_URL;

        if (!isConfigured) {
          // Simulation fallback
          setPharmacy({
            razonSocial: id === '3' ? 'Farmacia Alberdi Coop.' : 'Farmacia del Centro S.R.L.',
            cuit: id === '3' ? '30-50443221-5' : '30-71122334-9',
            address: id === '3' ? 'Bv. Rondeau 1200' : 'San Martin 801',
            city: 'Rosario, Santa Fe',
            responsibleName: id === '3' ? 'Carlos Daniel Fernández' : 'Dr. Lucas Gómez',
            responsibleEmail: id === '3' ? 'fernandez@farmaciaalberdi.coop' : 'lucas.gomez@farmaciacentro.com',
            responsiblePhone: id === '3' ? '341 455-2233' : '341 425-9988',
            registeredDate: id === '3' ? '05 Mar 2025' : '12 Ene 2024',
            employees: id === '3' ? 3 : 3,
            paymentStatus: id === '3' ? 'con_deuda' : 'al_dia',
            declarations: [
              { month: 'Junio 2026', date: id === '3' ? '---' : '25/06/2026', employees: id === '3' ? 0 : 3, status: id === '3' ? 'pendiente' : 'validada' },
              { month: 'Mayo 2026', date: '28/05/2026', employees: 3, status: 'validada' },
            ],
            payments: [
              { invoice: 'FAC-2026-06', period: 'Junio 2026', amount: id === '3' ? 12500 : 45000, status: id === '3' ? 'impago' : 'pagado', date: '30/06/2026' },
              { invoice: 'FAC-2026-05', period: 'Mayo 2026', amount: id === '3' ? 12500 : 45000, status: 'pagado', date: '30/05/2026' }
            ],
            documents: [
              { name: 'habilitacion_provincial.pdf', type: 'Habilitación', size: '1.9 MB' },
              { name: 'constancia_cuit_afip.pdf', type: 'AFIP', size: '840 KB' },
            ]
          });

          setEmployees([
            { id: '1', fullName: 'Estela Maris Gómez', cuil: '27-30444555-8', category: 'Personal en Gestión de Farmacia', entryDate: '2024-03-15', active: true, isAffiliate: true },
            { id: '2', fullName: 'Carlos Alberto Rossi', cuil: '20-25666777-2', category: 'Cadetes', entryDate: '2019-01-10', active: true, isAffiliate: false },
            { id: '3', fullName: 'Matias Nicolás Fernández', cuil: '20-41222333-5', category: 'Aprendiz Ayudante', entryDate: '2016-11-01', active: true, isAffiliate: false },
          ]);
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
          : [
              { invoice: 'FAC-2026-06', period: 'Junio 2026', amount: mappedEmployees.length * 15000, status: pharmData.has_debt ? ('impago' as const) : ('pagado' as const), date: '30/06/2026', receiptUrl: null },
            ];

        setEmployees(mappedEmployees);

        if (pharmData) {
          setPharmacy({
            razonSocial: pharmData.razon_social || pharmData.name || 'Sin Razón Social',
            cuit: pharmData.cuit,
            address: pharmData.declared_addresses || pharmData.address || 'Sin Dirección',
            city: 'Rosario, Santa Fe',
            responsibleName: pharmData.profiles?.full_name || 'Sin Asignar',
            responsibleEmail: pharmData.profiles?.email || 'Sin Asignar',
            responsiblePhone: pharmData.profiles?.phone || 'Sin Asignar',
            registeredDate: new Date(pharmData.created_at).toLocaleDateString('es-AR'),
            employees: mappedEmployees.length,
            paymentStatus: pharmData.has_debt ? 'con_deuda' : 'al_dia',
            declarations: [
              { month: 'Junio 2026', date: '25/06/2026', employees: mappedEmployees.length, status: 'validada' },
            ],
            payments: mappedPayments,
            documents: [
              { name: 'constancia_cuit_afip.pdf', type: 'AFIP', size: '840 KB' },
            ]
          });
        }
      } catch (err) {
        console.error("Error loading data from Supabase:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [id]);

  if (loading || !pharmacy) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Cargando Detalle de Farmacia...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header breadcrumbs */}
      <div>
        <Link 
          href="/admin/farmacias"
          className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-primary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver a Farmacias</span>
        </Link>
      </div>

      {/* Main Grid split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Commercial profile */}
        <div className="lg:col-span-5 space-y-6">
          {/* Main Card */}
          <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-premium glass space-y-6">
            <div className="flex items-center gap-4 border-b border-border pb-5">
              <div className="p-3.5 bg-primary/5 text-primary border border-primary/10 rounded-2xl">
                <Building2 className="w-7 h-7 text-secondary" />
              </div>
              <div className="truncate">
                <h1 className="text-xl font-black text-foreground truncate">{pharmacy.razonSocial}</h1>
                <span className="text-[10px] font-mono text-muted-foreground">CUIT: {pharmacy.cuit}</span>
              </div>
            </div>

            <div className="space-y-4 text-xs font-semibold">
              <div className="flex justify-between">
                <span className="text-muted-foreground uppercase">Estado Gremial:</span>
                <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase ${
                  pharmacy.paymentStatus === 'al_dia' 
                    ? 'bg-emerald-500/10 text-emerald-600' 
                    : 'bg-red-500/10 text-red-600'
                }`}>
                  {pharmacy.paymentStatus === 'al_dia' ? 'Al Día' : 'Con Deuda'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground uppercase">Empleados Declarados:</span>
                <span className="text-foreground">{employees.length} trabajadores</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground uppercase">Fecha Registro Web:</span>
                <span className="text-foreground">{pharmacy.registeredDate}</span>
              </div>
            </div>

            <hr className="border-border/60" />

            {/* Responsible Manager Details */}
            <div className="space-y-4">
              <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
                <User className="w-4 h-4 text-secondary" />
                Datos del Responsable
              </h3>
              
              <div className="space-y-3 text-xs font-semibold text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span className="text-foreground">Nombre:</span>
                  <span>{pharmacy.responsibleName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-secondary" />
                  <span>{pharmacy.responsibleEmail}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-secondary" />
                  <span>{pharmacy.responsiblePhone}</span>
                  {pharmacy.responsiblePhone && pharmacy.responsiblePhone !== 'Sin Asignar' && (
                    <a
                      href={`https://wa.me/${pharmacy.responsiblePhone.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-2 px-2 py-0.5 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 font-bold text-[9px] uppercase tracking-wider transition-colors inline-flex items-center"
                      title="Abrir Chat de WhatsApp"
                    >
                      WhatsApp
                    </a>
                  )}
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-secondary mt-0.5" />
                  <span>{pharmacy.address}, {pharmacy.city}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Uploaded Documents File List */}
          <div className="bg-card border border-border rounded-3xl p-6 shadow-premium glass space-y-4">
            <h3 className="font-bold text-foreground text-sm border-b border-border pb-2">Documentación Presentada</h3>
            <div className="space-y-2">
              {pharmacy.documents.map((doc, idx) => (
                <div 
                  key={idx}
                  className="p-3 border border-border rounded-xl flex items-center justify-between gap-3 text-xs font-semibold bg-background/50 hover:bg-muted/15 transition-all"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FileText className="w-4.5 h-4.5 text-secondary flex-shrink-0" />
                    <div className="truncate">
                      <span className="block text-foreground truncate">{doc.name}</span>
                      <span className="block text-[9px] text-muted-foreground font-medium">{doc.type} • {doc.size}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => alert(`Simulando descarga de: ${doc.name}`)}
                    className="p-1.5 rounded-lg border border-border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                    title="Descargar"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Invoices, Declarations & Employees List */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Declared Employees Table */}
          <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-premium glass space-y-6">
            <div className="border-b border-border pb-4">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <Users className="w-5 h-5 text-secondary" />
                Nómina Activa de Personal
              </h2>
              <p className="text-[10px] text-muted-foreground mt-0.5">Empleados declarados por la farmacia con categoría y antigüedad actualizada</p>
            </div>

            {employees.length === 0 ? (
              <div className="text-center py-6 text-xs font-semibold text-muted-foreground">
                No hay empleados declarados en la nómina de esta farmacia.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border text-slate-500 font-bold uppercase tracking-wider bg-slate-50">
                      <th className="py-2.5 px-3">Nombre y CUIL</th>
                      <th className="py-2.5 px-3">Categoría</th>
                      <th className="py-2.5 px-3 text-center">Afiliado</th>
                      <th className="py-2.5 px-3 text-center">Ingreso</th>
                      <th className="py-2.5 px-3 text-center">Antigüedad</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 font-semibold text-slate-700">
                    {employees.map((emp) => {
                      const catInfo = getCurrentCategory(emp.category, emp.entryDate);
                      return (
                        <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3 px-3">
                            <span className="font-bold text-[#0f172a] block">{emp.fullName}</span>
                            <span className="font-mono text-[10px] text-slate-400 block mt-0.5">{emp.cuil}</span>
                          </td>
                          <td className="py-3 px-3 text-slate-500">
                            <div className="flex flex-col">
                              <span>{catInfo.category}</span>
                              {catInfo.promoted && (
                                <span className="text-[9px] text-emerald-600 font-black uppercase tracking-wider bg-emerald-500/10 px-1.5 py-0.5 rounded w-max mt-0.5">
                                  Promovido (+{catInfo.steps} cat.)
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center">
                            {emp.isAffiliate ? (
                              <span className="inline-flex items-center px-1.5 py-0.5 bg-emerald-500/10 text-emerald-600 rounded text-[9px] font-black uppercase border border-emerald-500/20">
                                Sí
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-1.5 py-0.5 bg-slate-500/10 text-slate-500 rounded text-[9px] font-black uppercase border border-slate-500/10">
                                No
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center text-slate-500">{emp.entryDate}</td>
                          <td className="py-3 px-3 text-center text-slate-500 font-bold">{calculateSeniority(emp.entryDate)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Declarations Log */}
          <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-premium glass space-y-6">
            <div className="border-b border-border pb-4">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <FileText className="w-5 h-5 text-secondary" />
                Historial de Declaraciones Juradas
              </h2>
            </div>

            <div className="divide-y divide-border/60">
              {pharmacy.declarations.map((dec, idx) => (
                <div key={idx} className="py-3.5 first:pt-0 last:pb-0 flex items-center justify-between gap-4 text-xs">
                  <div className="space-y-0.5">
                    <span className="font-bold text-foreground block">{dec.month}</span>
                    <span className="text-[10px] text-muted-foreground block font-medium">Presentada: {dec.date}</span>
                  </div>

                  <div className="flex items-center gap-6">
                    <span className="text-muted-foreground font-semibold">Nómina: {dec.employees} empleados</span>
                    
                    {dec.status === 'validada' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-bold text-[9px] uppercase shadow-sm">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Validada</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 font-bold text-[9px] uppercase shadow-sm">
                        <Clock className="w-3 h-3 animate-pulse" />
                        <span>Pendiente</span>
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Account Status / Payments Log */}
          <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-premium glass space-y-6">
            <div className="border-b border-border pb-4">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-secondary" />
                Estado de Cuenta y Recibos de Pago
              </h2>
            </div>

            <div className="divide-y divide-border/60">
              {pharmacy.payments.map((pay, idx) => (
                <div key={idx} className="py-3.5 first:pt-0 last:pb-0 flex items-center justify-between gap-4 text-xs">
                  <div className="space-y-0.5">
                    <span className="font-bold text-foreground block">{pay.invoice}</span>
                    <span className="text-[10px] text-muted-foreground block font-medium">Período: {pay.period} • Vencimiento: {pay.date}</span>
                  </div>

                  <div className="flex items-center gap-6">
                    <span className="font-bold text-foreground text-sm">${pay.amount.toLocaleString('es-AR')}</span>
                    
                    {pay.receiptUrl && (
                      <a
                        href={pay.receiptUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-border text-primary hover:bg-primary/5 text-[10px] font-bold transition-all bg-white shadow-sm"
                        title="Ver Comprobante"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Ver Comprobante</span>
                      </a>
                    )}
                    
                    {pay.status === 'pagado' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-bold text-[9px] uppercase shadow-sm">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Pagado</span>
                      </span>
                    ) : pay.status === 'en_revision' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 font-bold text-[9px] uppercase shadow-sm">
                        <Clock className="w-3 h-3 animate-pulse" />
                        <span>En Revisión</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-500/10 text-red-600 font-bold text-[9px] uppercase shadow-sm">
                        <XCircle className="w-3 h-3" />
                        <span>Vencido / Impago</span>
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
