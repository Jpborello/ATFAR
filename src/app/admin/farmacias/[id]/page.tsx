'use client';

import { use } from 'react';
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
  Calendar,
  CreditCard,
  Download,
  ShieldCheck
} from 'lucide-react';

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
  payments: { invoice: string; period: string; amount: number; status: 'pagado' | 'impago'; date: string }[];
  documents: { name: string; type: string; size: string }[];
}

export default function FarmaciaPerfilAdminPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  // Mock details database lookup
  const pharmacyDb: { [key: string]: PharmacyDetail } = {
    '1': {
      razonSocial: 'Farmacia del Centro S.R.L.',
      cuit: '30-71122334-9',
      address: 'San Martin 801',
      city: 'Rosario, Santa Fe',
      responsibleName: 'Dr. Lucas Gómez',
      responsibleEmail: 'lucas.gomez@farmaciacentro.com',
      responsiblePhone: '341 425-9988',
      registeredDate: '12 Ene 2024',
      employees: 14,
      paymentStatus: 'al_dia',
      declarations: [
        { month: 'Junio 2026', date: '25/06/2026', employees: 14, status: 'validada' },
        { month: 'Mayo 2026', date: '24/05/2026', employees: 14, status: 'validada' },
        { month: 'Abril 2026', date: '25/04/2026', employees: 13, status: 'validada' },
      ],
      payments: [
        { invoice: 'FAC-2026-06', period: 'Junio 2026', amount: 45000, status: 'pagado', date: '26/06/2026' },
        { invoice: 'FAC-2026-05', period: 'Mayo 2026', amount: 45000, status: 'pagado', date: '25/05/2026' },
        { invoice: 'FAC-2026-04', period: 'Abril 2026', amount: 41800, status: 'pagado', date: '26/04/2026' },
      ],
      documents: [
        { name: 'habilitacion_provincial_2026.pdf', type: 'Habilitación', size: '2.4 MB' },
        { name: 'constancia_cuit_afip.pdf', type: 'AFIP', size: '840 KB' },
      ]
    },
    '3': {
      razonSocial: 'Farmacia Alberdi Coop.',
      cuit: '30-50443221-5',
      address: 'Bv. Rondeau 1200',
      city: 'Rosario, Santa Fe',
      responsibleName: 'Carlos Daniel Fernández',
      responsibleEmail: 'fernandez@farmaciaalberdi.coop',
      responsiblePhone: '341 455-2233',
      registeredDate: '05 Mar 2025',
      employees: 3,
      paymentStatus: 'con_deuda',
      declarations: [
        { month: 'Junio 2026', date: '---', employees: 0, status: 'pendiente' },
        { month: 'Mayo 2026', date: '28/05/2026', employees: 3, status: 'validada' },
        { month: 'Abril 2026', date: '28/04/2026', employees: 3, status: 'validada' },
      ],
      payments: [
        { invoice: 'FAC-2026-06', period: 'Junio 2026', amount: 12500, status: 'impago', date: '---' },
        { invoice: 'FAC-2026-05', period: 'Mayo 2026', amount: 12500, status: 'pagado', date: '30/05/2026' },
        { invoice: 'FAC-2026-04', period: 'Abril 2026', amount: 12500, status: 'pagado', date: '30/04/2026' },
      ],
      documents: [
        { name: 'habilitacion_provincial_2025.pdf', type: 'Habilitación', size: '1.9 MB' },
      ]
    }
  };

  // Fallback if pharmacy detail not found in mock
  const data = pharmacyDb[id] || pharmacyDb['1'];

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
                <h1 className="text-xl font-black text-foreground truncate">{data.razonSocial}</h1>
                <span className="text-[10px] font-mono text-muted-foreground">CUIT: {data.cuit}</span>
              </div>
            </div>

            <div className="space-y-4 text-xs font-semibold">
              <div className="flex justify-between">
                <span className="text-muted-foreground uppercase">Estado Gremial:</span>
                <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase ${
                  data.paymentStatus === 'al_dia' 
                    ? 'bg-emerald-500/10 text-emerald-600' 
                    : 'bg-red-500/10 text-red-600'
                }`}>
                  {data.paymentStatus === 'al_dia' ? 'Al Día' : 'Con Deuda'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground uppercase">Empleados Declarados:</span>
                <span className="text-foreground">{data.employees} trabajadores</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground uppercase">Fecha Registro Web:</span>
                <span className="text-foreground">{data.registeredDate}</span>
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
                  <span>{data.responsibleName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-secondary" />
                  <span>{data.responsibleEmail}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-secondary" />
                  <span>{data.responsiblePhone}</span>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-secondary mt-0.5" />
                  <span>{data.address}, {data.city}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Uploaded Documents File List */}
          <div className="bg-card border border-border rounded-3xl p-6 shadow-premium glass space-y-4">
            <h3 className="font-bold text-foreground text-sm border-b border-border pb-2">Documentación Presentada</h3>
            <div className="space-y-2">
              {data.documents.map((doc, idx) => (
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

        {/* Right Column: Invoices & Declarations Lists */}
        <div className="lg:col-span-7 space-y-6">
          {/* Declarations Log */}
          <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-premium glass space-y-6">
            <div className="border-b border-border pb-4">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <FileText className="w-5 h-5 text-secondary" />
                Historial de Declaraciones Juradas
              </h2>
            </div>

            <div className="divide-y divide-border/60">
              {data.declarations.map((dec, idx) => (
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
              {data.payments.map((pay, idx) => (
                <div key={idx} className="py-3.5 first:pt-0 last:pb-0 flex items-center justify-between gap-4 text-xs">
                  <div className="space-y-0.5">
                    <span className="font-bold text-foreground block">{pay.invoice}</span>
                    <span className="text-[10px] text-muted-foreground block font-medium">Período: {pay.period} • Vencimiento: {pay.date}</span>
                  </div>

                  <div className="flex items-center gap-6">
                    <span className="font-bold text-foreground text-sm">${pay.amount.toLocaleString('es-AR')}</span>
                    
                    {pay.status === 'pagado' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-bold text-[9px] uppercase shadow-sm">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Pagado</span>
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
