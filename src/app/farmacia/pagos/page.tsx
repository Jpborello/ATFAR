/* eslint-disable @next/next/no-img-element */
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { Pharmacy } from '@/types';
import { 
  CreditCard, 
  ArrowLeft, 
  CheckCircle2, 
  XCircle, 
  Download, 
  Loader2,
  Upload,
  Copy,
  Check,
  Clock,
  FileText
} from 'lucide-react';

interface Invoice {
  id: string;
  invoiceNumber: string;
  period: string;
  amount: number;
  status: 'pagado' | 'impago' | 'en_revision';
  dueDate: string;
  payDate: string;
  transactionCode?: string;
  receiptUrl?: string;
}

export default function PagosPage() {
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [ddjjFile, setDdjjFile] = useState<File | null>(null);
  const [ddjjFileName, setDdjjFileName] = useState('');

  const [checkoutInvoice, setCheckoutInvoice] = useState<Invoice | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);



  // Transfer States
  const [paymentMethod, setPaymentMethod] = useState<'online' | 'transfer'>('online');
  const [transactionFileName, setTransactionFileName] = useState('');
  const [transactionCode, setTransactionCode] = useState('');
  const [transferDate, setTransferDate] = useState('');
  const [copied, setCopied] = useState(false);

  const [pharmacy, setPharmacy] = useState<Pharmacy | null>(null);
  const [selectedDetailInvoice, setSelectedDetailInvoice] = useState<Invoice | null>(null);

  useEffect(() => {
    async function loadInvoices() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const isConfigured = 
          process.env.NEXT_PUBLIC_SUPABASE_URL !== 'your_supabase_project_url_here' && 
          !!process.env.NEXT_PUBLIC_SUPABASE_URL;

        if (!isConfigured || !session) {
          // Simulation fallback
          setPharmacy({
            id: 'mock-1',
            name: 'Farmacia de Prueba Sol',
            nombre_fantasia: 'Farmacia de Prueba Sol',
            razon_social: 'Farmacia Sol de Rosario S.A.',
            cuit: '30-12345678-9',
            address: 'Av. Pellegrini 1500, Rosario',
            declared_addresses: 'Av. Pellegrini 1500, Rosario'
          });
          setInvoices([
            { id: '1', invoiceNumber: 'BLT-202606-MOCK1', period: 'Junio 2026', amount: 45000, status: 'impago', dueDate: '10/07/2026', payDate: '---', transactionCode: '', receiptUrl: '' },
            { id: '2', invoiceNumber: 'BLT-202605-MOCK2', period: 'Mayo 2026', amount: 45000, status: 'pagado', dueDate: '10/06/2026', payDate: '09/06/2026', transactionCode: 'TX-884271', receiptUrl: '#' },
            { id: '3', invoiceNumber: 'BLT-202604-MOCK3', period: 'Abril 2026', amount: 41800, status: 'pagado', dueDate: '10/05/2026', payDate: '08/05/2026', transactionCode: 'TX-758219', receiptUrl: '#' },
          ]);
          setLoading(false);
          return;
        }

        // Fetch pharmacy
        const { data: pharmacyData } = await supabase
          .from('pharmacies')
          .select('*')
          .eq('owner_id', session.user.id)
          .single();

        if (pharmacyData) {
          setPharmacy(pharmacyData);
          // Fetch invoices
          const { data: paymentList } = await supabase
            .from('payments')
            .select('*')
            .eq('pharmacy_id', pharmacyData.id)
            .order('created_at', { ascending: false });

          if (paymentList) {
            setInvoices(paymentList.map(p => ({
              id: p.id,
              invoiceNumber: p.invoice_number,
              period: p.period,
              amount: Number(p.amount),
              status: p.status as 'pagado' | 'impago' | 'en_revision',
              dueDate: new Date(p.due_date).toLocaleDateString('es-AR'),
              payDate: p.pay_date ? new Date(p.pay_date).toLocaleDateString('es-AR') : '---',
              transactionCode: p.transaction_code || '',
              receiptUrl: p.receipt_url || ''
            })));
          } else {
            setInvoices([]);
          }
        }
      } catch (err) {
        console.error("Error loading invoices:", err);
        toast.error('No pudimos cargar tus pagos.', {
          description: 'Revisá tu conexión y volvé a intentarlo.',
        });
      } finally {
        setLoading(false);
      }
    }

    loadInvoices();
  }, []);

  const handleOpenCheckout = (invoice: Invoice) => {
    setCheckoutInvoice(invoice);
    setPaymentSuccess(false);
    setPaymentMethod('transfer');
    setTransactionFileName('');
    setTransactionCode(invoice.invoiceNumber); // Prefill transactionCode with invoice number!
    setTransferDate(new Date().toISOString().split('T')[0]); // Prefill transfer date with today's date!
    setReceiptFile(null);
    setDdjjFile(null);
    setDdjjFileName('');
  };

  const handleCopyCbu = () => {
    navigator.clipboard.writeText('3300000610000019519073');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleProcessTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transactionCode || !transferDate || !transactionFileName || !checkoutInvoice || !receiptFile) {
      toast.warning('Completá todos los campos y adjuntá el comprobante de pago.');
      return;
    }

    setPaymentLoading(true);

    try {
      const isConfigured = 
        process.env.NEXT_PUBLIC_SUPABASE_URL !== 'your_supabase_project_url_here' && 
        !!process.env.NEXT_PUBLIC_SUPABASE_URL;

      let publicUrl = '';
      let ddjjPublicUrl = '';

      if (isConfigured) {
        // 1. Upload receipt to storage bucket 'receipts'
        const fileExt = receiptFile.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
        const filePath = `receipts/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('receipts')
          .upload(filePath, receiptFile);

        if (uploadError) throw new Error(`Error al subir comprobante: ${uploadError.message}`);

        // 2. Get Public URL
        const { data: { publicUrl: url } } = supabase.storage
          .from('receipts')
          .getPublicUrl(filePath);

        publicUrl = url;

        // 2b. Upload DDJJ if provided
        if (ddjjFile) {
          const ddjjExt = ddjjFile.name.split('.').pop();
          const ddjjName = `${Date.now()}-ddjj-${Math.random().toString(36).substring(2, 15)}.${ddjjExt}`;
          const ddjjPath = `receipts/${ddjjName}`;

          const { error: ddjjUploadError } = await supabase.storage
            .from('receipts')
            .upload(ddjjPath, ddjjFile);

          if (ddjjUploadError) throw new Error(`Error al subir declaración jurada: ${ddjjUploadError.message}`);

          const { data: { publicUrl: dUrl } } = supabase.storage
            .from('receipts')
            .getPublicUrl(ddjjPath);

          ddjjPublicUrl = dUrl;
        }

        // 3. Update payment in database
        const { error: updateError } = await supabase
          .from('payments')
          .update({
            status: 'en_revision',
            pay_date: transferDate,
            transaction_code: transactionCode,
            receipt_url: publicUrl,
            ddjj_url: ddjjPublicUrl || null
          })
          .eq('id', checkoutInvoice.id);

        if (updateError) throw updateError;
      }

      setInvoices((prev) =>
        prev.map((inv) =>
          inv.id === checkoutInvoice.id
            ? { 
                ...inv, 
                status: 'en_revision', 
                payDate: new Date(transferDate + 'T00:00:00').toLocaleDateString('es-AR'),
                transactionCode: transactionCode
              }
            : inv
        )
      );

      setPaymentSuccess(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al enviar comprobante.';
      toast.error(msg);
    } finally {
      setPaymentLoading(false);
    }
  };

  const handlePrint = (invoice: Invoice) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const receiptHtml = `
      <html>
        <head>
          <title>Comprobante ${invoice.invoiceNumber}</title>
          <style>
            body { font-family: sans-serif; padding: 40px; color: #1e293b; line-height: 1.5; }
            .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 20px; margin-bottom: 30px; }
            .logo-text { font-size: 24px; font-weight: bold; color: #0284c7; letter-spacing: 1px; }
            .subtitle { font-size: 12px; color: #64748b; margin-top: 5px; text-transform: uppercase; font-weight: bold; }
            .title { font-size: 18px; font-weight: bold; margin-top: 15px; margin-bottom: 5px; }
            .section { margin-bottom: 25px; }
            .section-title { font-size: 12px; font-weight: bold; text-transform: uppercase; color: #64748b; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; margin-bottom: 10px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
            .field { margin-bottom: 8px; }
            .label { font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase; }
            .value { font-size: 13px; font-weight: bold; color: #0f172a; }
            .amount-box { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; text-align: center; margin-top: 20px; }
            .amount-label { font-size: 12px; color: #64748b; font-weight: bold; text-transform: uppercase; }
            .amount-val { font-size: 28px; font-weight: 900; color: #0f172a; margin-top: 5px; }
            .status-badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; text-transform: uppercase; margin-top: 5px; }
            .status-pagado { background-color: #dcfce7; color: #15803d; }
            .status-revision { background-color: #fef3c7; color: #b45309; }
            .status-impago { background-color: #fee2e2; color: #b91c1c; }
            .footer { text-align: center; margin-top: 50px; font-size: 10px; color: #94a3b8; border-top: 1px dashed #e2e8f0; padding-top: 20px; }
            @media print {
              body { padding: 20px; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo-text">ATFAR</div>
            <div class="subtitle">Asociación de Trabajadores de Farmacias de Rosario</div>
            <div class="subtitle" style="font-size: 10px; margin-top: 2px;">Personería Gremial Nº 1391 • CUIT 30-54827379-1</div>
            <div class="title">BOLETA DE APORTES SINDICALES Y MUTUAL (CCT 659/13)</div>
          </div>

          <div class="section">
            <div class="section-title">Datos de la Farmacia</div>
            <div class="grid">
              <div class="field">
                <div class="label">Razón Social / Fantasía</div>
                <div class="value">${pharmacy?.razon_social || pharmacy?.nombre_fantasia || 'FARMACIA ADHERIDA'}</div>
              </div>
              <div class="field">
                <div class="label">CUIT</div>
                <div class="value">${pharmacy?.cuit || '---'}</div>
              </div>
              <div class="field" style="grid-column: span 2;">
                <div class="label">Dirección Declarada</div>
                <div class="value">${pharmacy?.address || pharmacy?.declared_addresses || '---'}</div>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Detalle de Liquidación</div>
            <div class="grid">
              <div class="field">
                <div class="label">Boleta / Comprobante Nº</div>
                <div class="value">${invoice.invoiceNumber}</div>
              </div>
              <div class="field">
                <div class="label">Período</div>
                <div class="value">${invoice.period}</div>
              </div>
              <div class="field">
                <div class="label">Fecha de Vencimiento</div>
                <div class="value">${invoice.dueDate}</div>
              </div>
              <div class="field">
                <div class="label">Estado del Pago</div>
                <div>
                  <span class="status-badge status-${invoice.status === 'pagado' ? 'pagado' : invoice.status === 'en_revision' ? 'revision' : 'impago'}">
                    ${invoice.status === 'pagado' ? 'PAGADO' : invoice.status === 'en_revision' ? 'EN REVISIÓN' : 'IMPAGO'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          ${invoice.status !== 'impago' ? `
          <div class="section">
            <div class="section-title">Información de Transferencia</div>
            <div class="grid">
              <div class="field">
                <div class="label">Fecha de Pago</div>
                <div class="value">${invoice.payDate}</div>
              </div>
              <div class="field">
                <div class="label">Referencia / Transacción</div>
                <div class="value" style="font-family: monospace;">${invoice.transactionCode || '---'}</div>
              </div>
              <div class="field" style="grid-column: span 2;">
                <div class="label">Cuenta de Destino</div>
                <div class="value">Banco de Santa Fe • CBU 3300000610000019519073 • ALIAS PILA.TORNO.ZAR</div>
              </div>
            </div>
          </div>
          ` : `
          <div class="section">
            <div class="section-title">Cuentas de Depósito Autorizadas</div>
            <div class="value" style="font-size: 12px; font-weight: normal; color: #475569;">
              Transferir a: <strong>Banco de Santa Fe</strong><br/>
              Nº Cuenta: <strong>000001951907</strong><br/>
              CBU: <strong>3300000610000019519073</strong><br/>
              Alias: <strong>PILA.TORNO.ZAR</strong><br/>
              CUIT: <strong>30-54827379-1</strong>
            </div>
          </div>
          `}

          <div class="amount-box">
            <div class="amount-label">Monto Total Liquidado</div>
            <div class="amount-val">$${invoice.amount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</div>
          </div>

          <div class="footer">
            <p>Este comprobante es un documento digital oficial generado por el Portal de Farmacias de ATFAR.</p>
            <p style="font-size: 9px; margin-top: 5px; color: #cbd5e1;">Generado el ${new Date().toLocaleString('es-AR')}</p>
          </div>

          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `;
    printWindow.document.write(receiptHtml);
    printWindow.document.close();
  };

  const totalUnpaid = invoices
    .filter((inv) => inv.status === 'impago')
    .reduce((sum, inv) => sum + inv.amount, 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Cargando Estado de Cuenta...</span>
        </div>
      </div>
    );
  }

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
            <span className="text-[9px] text-muted-foreground block font-bold">Estado de Cuenta y Pagos</span>
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
        
        {/* Account balance card */}
        <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-premium glass flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-primary/5 text-primary border border-primary/10 rounded-2xl">
              <CreditCard className="w-8 h-8 text-secondary" />
            </div>
            <div className="space-y-1">
              <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-widest block">Total Aportes Pendientes</h2>
              <span className="text-3xl font-black text-primary">${totalUnpaid.toLocaleString('es-AR')}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold shadow-sm ${
              totalUnpaid === 0 
                ? 'bg-emerald-500/10 text-emerald-600' 
                : 'bg-red-500/10 text-red-600'
            }`}>
              {totalUnpaid === 0 ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
              <span>{totalUnpaid === 0 ? 'Sin saldo pendiente' : 'Deuda pendiente'}</span>
            </span>
          </div>
        </div>

        {/* Layout split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left: Invoices List */}
          <div className="lg:col-span-8 bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-premium glass space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <h3 className="font-bold text-foreground text-md">Boletas de Aportes Emitidas</h3>
              <span className="text-[10px] text-muted-foreground font-bold">Convenio CCT 659/13</span>
            </div>

            <div className="divide-y divide-border/60">
              {invoices.map((inv) => (
                <div key={inv.id} className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs font-semibold">
                  <div className="space-y-1">
                    <span className="text-sm font-bold text-primary block">{inv.invoiceNumber}</span>
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-muted-foreground font-medium">
                      <span>Período: {inv.period}</span>
                      <span>Vence: {inv.dueDate}</span>
                      {inv.status === 'pagado' && <span className="text-emerald-500 font-bold">Pago: {inv.payDate}</span>}
                      {inv.status === 'en_revision' && <span className="text-amber-500 font-bold">Auditoría: {inv.payDate}</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-6 justify-between sm:justify-end">
                    <span className="text-sm font-black text-foreground">${inv.amount.toLocaleString('es-AR')}</span>
                    
                    {inv.status === 'pagado' ? (
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-0.5 px-2.5 py-1 bg-emerald-500/10 text-emerald-600 rounded-lg text-[9px] font-black uppercase">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Pagado</span>
                        </span>
                        <button
                          onClick={() => setSelectedDetailInvoice(inv)}
                          className="p-1.5 rounded-lg border border-border hover:bg-muted text-muted-foreground cursor-pointer flex items-center gap-1 text-[10px] font-bold"
                          title="Ver y/o Imprimir Recibo"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Recibo</span>
                        </button>
                      </div>
                    ) : inv.status === 'en_revision' ? (
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-500/10 text-amber-600 rounded-lg text-[9px] font-black uppercase">
                          <Clock className="w-3.5 h-3.5" />
                          <span>En Revisión</span>
                        </span>
                        <button
                          onClick={() => setSelectedDetailInvoice(inv)}
                          className="p-1.5 rounded-lg border border-border hover:bg-muted text-muted-foreground cursor-pointer flex items-center gap-1 text-[10px] font-bold"
                          title="Ver Detalle"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Detalle</span>
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-0.5 px-2.5 py-1 bg-red-500/10 text-red-600 rounded-lg text-[9px] font-black uppercase">
                          <XCircle className="w-3 h-3" />
                          <span>Impago</span>
                        </span>
                        <button
                          onClick={() => setSelectedDetailInvoice(inv)}
                          className="p-1.5 rounded-lg border border-border hover:bg-muted text-muted-foreground cursor-pointer"
                          title="Ver Boleta Detallada"
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenCheckout(inv)}
                          className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-secondary text-secondary-foreground hover:bg-secondary/90 transition-all text-xs font-bold uppercase tracking-wider shadow-sm cursor-pointer"
                        >
                          Pagar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Payment simulator form / Checkout */}
          <div className="lg:col-span-4">
            {checkoutInvoice ? (
              <div className={`bg-card border-2 rounded-3xl p-6 shadow-xl space-y-5 relative overflow-hidden animate-fadeIn transition-colors ${
                paymentMethod === 'online' ? 'border-[#009ee3]' : 'border-emerald-500'
              }`}>
                {/* Header with Switcher Tabs */}
                <div className="space-y-3">
                  <div className="flex bg-muted p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('online')}
                      className={`flex-1 text-[10px] font-bold uppercase tracking-wider py-2 rounded-lg transition-all cursor-pointer ${
                        paymentMethod === 'online'
                          ? 'bg-card text-[#009ee3] shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Pago Online
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('transfer')}
                      className={`flex-1 text-[10px] font-bold uppercase tracking-wider py-2 rounded-lg transition-all cursor-pointer ${
                        paymentMethod === 'transfer'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Transferencia
                    </button>
                  </div>
                </div>

                {paymentSuccess ? (
                  <div className="text-center py-6 space-y-4">
                    <div className={`inline-flex p-3 rounded-full ${
                      paymentMethod === 'online' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
                    }`}>
                      {paymentMethod === 'online' ? <CheckCircle2 className="w-10 h-10" /> : <Clock className="w-10 h-10" />}
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-extrabold text-foreground text-sm">
                        {paymentMethod === 'online' ? '¡Aportes Acreditados!' : '¡Comprobante Enviado!'}
                      </h4>
                      <p className="text-[10px] text-muted-foreground leading-relaxed">
                        {paymentMethod === 'online' ? (
                          `El pago de **$${checkoutInvoice.amount.toLocaleString('es-AR')}** fue validado por Mercado Pago y acreditado en tu estado de cuenta.`
                        ) : (
                          `El comprobante por **$${checkoutInvoice.amount.toLocaleString('es-AR')}** fue cargado con éxito. Queda en revisión por el sindicato.`
                        )}
                      </p>
                    </div>
                    <button
                      onClick={() => setCheckoutInvoice(null)}
                      className={`w-full py-2.5 rounded-xl font-bold text-xs uppercase text-white cursor-pointer ${
                        paymentMethod === 'online' ? 'bg-[#009ee3] hover:bg-[#008ac6]' : 'bg-emerald-600 hover:bg-emerald-700'
                      }`}
                    >
                      Volver
                    </button>
                  </div>
                ) : paymentMethod === 'online' ? (
                  <div className="space-y-5 text-center py-6">
                    <div className="inline-flex p-4 bg-[#009ee3]/10 text-[#009ee3] rounded-full">
                      <CreditCard className="w-8 h-8" />
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-extrabold text-foreground text-sm">Pago Online (Mercado Pago)</h4>
                      <p className="text-[11px] text-muted-foreground leading-relaxed font-semibold">
                        Esta función estará disponible próximamente. Por el momento, por favor realizá tus pagos mediante transferencia bancaria y adjuntá el comprobante en la pestaña de **Transferencia**.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('transfer')}
                      className="w-full py-2.5 rounded-xl bg-secondary text-secondary-foreground hover:bg-secondary/90 text-xs font-bold uppercase tracking-wider transition-all shadow-sm cursor-pointer"
                    >
                      Ir a Transferencia Bancaria
                    </button>
                    <button
                      type="button"
                      onClick={() => setCheckoutInvoice(null)}
                      className="w-full text-center text-[10px] font-bold text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  /* Bank Transfer / Receipt Upload Form */
                  <form onSubmit={handleProcessTransfer} className="space-y-4">
                    {/* Current invoice info */}
                    <div className="bg-[#f8fafc] border border-border rounded-xl p-3.5 text-xs text-[#0f172a] space-y-1.5 shadow-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground font-semibold">Boleta a Pagar:</span>
                        <span className="font-extrabold text-primary">{checkoutInvoice.invoiceNumber}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground font-semibold">Período:</span>
                        <span className="font-bold">{checkoutInvoice.period}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground font-semibold">Monto a Transferir:</span>
                        <span className="font-black text-slate-900">${checkoutInvoice.amount.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                    {/* ATFAR Bank info */}
                    <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-3.5 text-xs text-emerald-950 font-semibold space-y-2">
                      <span className="text-[10px] font-extrabold text-emerald-800 uppercase block tracking-wider">Cuentas del Sindicato</span>
                      <div className="space-y-1 font-medium text-slate-700">
                        <div className="flex justify-between">
                          <span>Banco:</span>
                          <span className="font-bold text-emerald-950">Banco de Santa Fe</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Nº de Cuenta:</span>
                          <span className="font-bold text-emerald-950 font-mono">000001951907</span>
                        </div>
                        <div className="flex justify-between items-center gap-2">
                          <span>CBU:</span>
                          <div className="flex items-center gap-1 font-mono font-bold text-emerald-950">
                            <span>3300000610000019519073</span>
                            <button
                              type="button"
                              onClick={handleCopyCbu}
                              className="p-1 hover:bg-emerald-500/10 rounded text-emerald-700 cursor-pointer"
                              title="Copiar CBU"
                            >
                              {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                            </button>
                          </div>
                        </div>
                        <div className="flex justify-between">
                          <span>Alias:</span>
                          <span className="font-bold text-emerald-950">PILA.TORNO.ZAR</span>
                        </div>
                        <div className="flex justify-between">
                          <span>CUIT:</span>
                          <span className="font-bold text-emerald-950">30-54827379-1</span>
                        </div>
                      </div>
                    </div>
                    {/* File uploads */}
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-muted-foreground uppercase">Comprobante de Pago *</label>
                        <div className="relative border border-dashed border-emerald-300 bg-emerald-500/5 hover:bg-emerald-500/10 rounded-xl p-3.5 text-center cursor-pointer transition-all">
                          <input
                            type="file"
                            accept="image/*,.pdf"
                            required
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                setTransactionFileName(file.name);
                                setReceiptFile(file);
                              }
                            }}
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                          />
                          <Upload className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
                          <span className="text-[10px] font-bold text-slate-700 block truncate">
                            {transactionFileName || 'Adjuntar Comprobante de Pago'}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-muted-foreground uppercase">Declaración Jurada (DDJJ) Firmada</label>
                        <div className="relative border border-dashed border-emerald-300 bg-emerald-500/5 hover:bg-emerald-500/10 rounded-xl p-3.5 text-center cursor-pointer transition-all">
                          <input
                            type="file"
                            accept="image/*,.pdf"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                setDdjjFileName(file.name);
                                setDdjjFile(file);
                              }
                            }}
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                          />
                          <Upload className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
                          <span className="text-[10px] font-bold text-slate-700 block truncate">
                            {ddjjFileName || 'Adjuntar Declaración Jurada (Opcional)'}
                          </span>
                        </div>
                      </div>

                      {/* Transaction Code */}
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-muted-foreground uppercase">Número de Transacción / Referencia</label>
                        <input
                          type="text"
                          required
                          value={transactionCode}
                          onChange={(e) => setTransactionCode(e.target.value)}
                          placeholder="Ej: TX-948273"
                          className="w-full px-3 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs font-semibold text-[#0f172a]"
                        />
                      </div>

                      {/* Date */}
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-muted-foreground uppercase">Fecha de Transferencia</label>
                        <input
                          type="date"
                          required
                          value={transferDate}
                          onChange={(e) => setTransferDate(e.target.value)}
                          className="w-full px-3 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs font-semibold text-[#0f172a]"
                        />
                      </div>
                    </div>

                    {/* Submit */}
                    <button
                      type="submit"
                      disabled={paymentLoading}
                      className="w-full py-3 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-md disabled:opacity-50 cursor-pointer"
                    >
                      {paymentLoading ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Enviando...
                        </>
                      ) : (
                        <>
                          <FileText className="w-3.5 h-3.5" />
                          Enviar Comprobante
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setCheckoutInvoice(null)}
                      className="w-full text-center text-[10px] font-bold text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      Cancelar
                    </button>
                  </form>
                )}
              </div>
            ) : (
              <div className="bg-muted/40 border border-dashed border-border rounded-3xl p-6 text-center space-y-4">
                <CreditCard className="w-8 h-8 text-secondary mx-auto" />
                <div className="space-y-1">
                  <h4 className="font-bold text-foreground text-sm">Pago Electrónico de Boletas</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed max-w-xs mx-auto">
                    Seleccioná cualquier boleta marcada como impaga y utilizá la integración de pasarela de pago para regularizar tu cuenta corriente de aportes.
                  </p>
                </div>
              </div>
            )}
          </div>

        </div>
      </main>

      {/* Detailed Invoice Modal */}
      {selectedDetailInvoice && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn animate-duration-200">
          <div className="bg-card border border-border rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl space-y-6 p-6 sm:p-8 animate-scaleUp animate-duration-200">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h3 className="font-extrabold text-foreground text-base">Boleta de Aportes Detallada</h3>
                <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Convenio CCT 659/13</span>
              </div>
              <button 
                onClick={() => setSelectedDetailInvoice(null)}
                className="p-1 hover:bg-muted rounded-lg text-muted-foreground transition-colors cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="space-y-5 text-xs">
              
              {/* Union Header Logo/Text */}
              <div className="text-center bg-slate-50/50 border border-slate-100 rounded-2xl p-4 space-y-1">
                <span className="text-sm font-black text-primary block tracking-wider">ATFAR</span>
                <span className="text-[10px] text-muted-foreground font-bold uppercase block">Asoc. Trabajadores de Farmacias de Rosario</span>
                <span className="text-[9px] text-slate-400 block">Personería Gremial Nº 1391 • CUIT 30-54827379-1</span>
              </div>

              {/* Pharmacy Details */}
              <div className="space-y-2">
                <span className="text-[10px] font-extrabold text-secondary uppercase block tracking-wider">Datos de la Farmacia</span>
                <div className="bg-muted/40 rounded-xl p-3 border border-border/80 space-y-1 text-slate-700 font-semibold">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Razón Social:</span>
                    <span className="text-foreground">{pharmacy?.razon_social || pharmacy?.nombre_fantasia || 'FARMACIA ADHERIDA'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">CUIT:</span>
                    <span className="text-foreground">{pharmacy?.cuit || '---'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Dirección:</span>
                    <span className="text-foreground truncate max-w-[200px]" title={pharmacy?.address || pharmacy?.declared_addresses}>
                      {pharmacy?.address || pharmacy?.declared_addresses || '---'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Invoice details */}
              <div className="space-y-2">
                <span className="text-[10px] font-extrabold text-secondary uppercase block tracking-wider">Detalle del Comprobante</span>
                <div className="bg-muted/40 rounded-xl p-3 border border-border/80 space-y-1 text-slate-700 font-semibold">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Número de Boleta:</span>
                    <span className="font-mono text-primary font-bold">{selectedDetailInvoice.invoiceNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Período Liquidado:</span>
                    <span className="text-foreground">{selectedDetailInvoice.period}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Vencimiento:</span>
                    <span className="text-foreground">{selectedDetailInvoice.dueDate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Estado de la cuenta:</span>
                    <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                      selectedDetailInvoice.status === 'pagado'
                        ? 'bg-emerald-500/10 text-emerald-600'
                        : selectedDetailInvoice.status === 'en_revision'
                        ? 'bg-amber-500/10 text-amber-600'
                        : 'bg-red-500/10 text-red-600'
                    }`}>
                      {selectedDetailInvoice.status === 'pagado' ? 'Pagado' : selectedDetailInvoice.status === 'en_revision' ? 'En Revisión' : 'Impago'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Payment Details */}
              {selectedDetailInvoice.status !== 'impago' && (
                <div className="space-y-2">
                  <span className="text-[10px] font-extrabold text-emerald-800 uppercase block tracking-wider">Información de Transferencia</span>
                  <div className="bg-emerald-500/5 rounded-xl p-3 border border-emerald-500/10 space-y-1 text-slate-700 font-semibold">
                    <div className="flex justify-between">
                      <span className="text-emerald-800/80">Fecha de Pago:</span>
                      <span className="text-emerald-950">{selectedDetailInvoice.payDate}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-emerald-800/80">Código de Transacción:</span>
                      <span className="font-mono text-emerald-950">{selectedDetailInvoice.transactionCode || '---'}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Total Amount Box */}
              <div className="bg-[#f8fafc] border border-border rounded-xl p-4 text-center space-y-1">
                <span className="text-[10px] font-extrabold text-muted-foreground uppercase block tracking-wider">Total Liquidado</span>
                <span className="text-2xl font-black text-[#0f172a] block">
                  ${selectedDetailInvoice.amount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </span>
              </div>

            </div>

            {/* Modal Actions */}
            <div className="flex gap-3 border-t border-border pt-4">
              <button
                onClick={() => handlePrint(selectedDetailInvoice)}
                className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/95 text-xs uppercase tracking-wider shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer animate-pulse"
              >
                <Download className="w-4 h-4" />
                Imprimir Boleta
              </button>
              <button
                onClick={() => setSelectedDetailInvoice(null)}
                className="py-3 px-5 rounded-xl border border-border bg-card font-bold hover:bg-muted/10 text-xs uppercase text-muted-foreground transition-all cursor-pointer"
              >
                Cerrar
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
