'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { 
  CreditCard, 
  ArrowLeft, 
  CheckCircle2, 
  XCircle, 
  Calendar, 
  Download, 
  ShieldCheck, 
  DollarSign,
  Loader2,
  Lock,
  ArrowRight,
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
}

export default function PagosPage() {
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  const [checkoutInvoice, setCheckoutInvoice] = useState<Invoice | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  // CC States
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');

  // Transfer States
  const [paymentMethod, setPaymentMethod] = useState<'online' | 'transfer'>('online');
  const [transactionFileName, setTransactionFileName] = useState('');
  const [transactionCode, setTransactionCode] = useState('');
  const [transferDate, setTransferDate] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function loadInvoices() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const isConfigured = 
          process.env.NEXT_PUBLIC_SUPABASE_URL !== 'your_supabase_project_url_here' && 
          !!process.env.NEXT_PUBLIC_SUPABASE_URL;

        if (!isConfigured || !session) {
          // Simulation fallback
          setInvoices([
            { id: '1', invoiceNumber: 'FAC-2026-06', period: 'Junio 2026', amount: 45000, status: 'impago', dueDate: '10/07/2026', payDate: '---' },
            { id: '2', invoiceNumber: 'FAC-2026-05', period: 'Mayo 2026', amount: 45000, status: 'pagado', dueDate: '10/06/2026', payDate: '09/06/2026' },
            { id: '3', invoiceNumber: 'FAC-2026-04', period: 'Abril 2026', amount: 41800, status: 'pagado', dueDate: '10/05/2026', payDate: '08/05/2026' },
          ]);
          setLoading(false);
          return;
        }

        // Fetch pharmacy
        const { data: pharmacy } = await supabase
          .from('pharmacies')
          .select('id')
          .eq('owner_id', session.user.id)
          .single();

        if (pharmacy) {
          // Fetch invoices
          const { data: paymentList } = await supabase
            .from('payments')
            .select('*')
            .eq('pharmacy_id', pharmacy.id)
            .order('created_at', { ascending: false });

          if (paymentList && paymentList.length > 0) {
            setInvoices(paymentList.map(p => ({
              id: p.id,
              invoiceNumber: p.invoice_number,
              period: p.period,
              amount: Number(p.amount),
              status: p.status as 'pagado' | 'impago' | 'en_revision',
              dueDate: new Date(p.due_date).toLocaleDateString('es-AR'),
              payDate: p.pay_date ? new Date(p.pay_date).toLocaleDateString('es-AR') : '---'
            })));
          } else {
            // Seed a default test invoice
            const defaultInvoice = {
              pharmacy_id: pharmacy.id,
              invoice_number: 'FAC-2026-06',
              period: 'Junio 2026',
              amount: 45000,
              status: 'impago',
              due_date: '2026-07-10'
            };

            const { data: newPay } = await supabase
              .from('payments')
              .insert(defaultInvoice)
              .select()
              .single();

            if (newPay) {
              setInvoices([{
                id: newPay.id,
                invoiceNumber: newPay.invoice_number,
                period: newPay.period,
                amount: Number(newPay.amount),
                status: newPay.status as 'pagado' | 'impago' | 'en_revision',
                dueDate: new Date(newPay.due_date).toLocaleDateString('es-AR'),
                payDate: '---'
              }]);
            }
          }
        }
      } catch (err) {
        console.error("Error loading invoices:", err);
      } finally {
        setLoading(false);
      }
    }

    loadInvoices();
  }, []);

  const handleOpenCheckout = (invoice: Invoice) => {
    setCheckoutInvoice(invoice);
    setPaymentSuccess(false);
    setPaymentMethod('online');
    setTransactionFileName('');
    setTransactionCode('');
    setTransferDate('');
    setReceiptFile(null);
  };

  const handleCopyCbu = () => {
    navigator.clipboard.writeText('0650020701000000379012');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleProcessPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardNumber || !cardName || !cardExpiry || !cardCvv || !checkoutInvoice) {
      alert('Por favor complete todos los datos de tarjeta.');
      return;
    }

    setPaymentLoading(true);

    try {
      const isConfigured = 
        process.env.NEXT_PUBLIC_SUPABASE_URL !== 'your_supabase_project_url_here' && 
        !!process.env.NEXT_PUBLIC_SUPABASE_URL;

      if (isConfigured) {
        const { error } = await supabase
          .from('payments')
          .update({
            status: 'pagado',
            pay_date: new Date().toISOString().split('T')[0]
          })
          .eq('id', checkoutInvoice.id);

        if (error) throw error;
      }

      setInvoices((prev) =>
        prev.map((inv) =>
          inv.id === checkoutInvoice.id
            ? { ...inv, status: 'pagado', payDate: new Date().toLocaleDateString('es-AR') }
            : inv
        )
      );

      setPaymentSuccess(true);
      setCardNumber('');
      setCardName('');
      setCardExpiry('');
      setCardCvv('');
    } catch (err: any) {
      alert(err.message || 'Error al procesar el pago.');
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleProcessTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transactionCode || !transferDate || !transactionFileName || !checkoutInvoice || !receiptFile) {
      alert('Por favor complete todos los campos y adjunte el comprobante.');
      return;
    }

    setPaymentLoading(true);

    try {
      const isConfigured = 
        process.env.NEXT_PUBLIC_SUPABASE_URL !== 'your_supabase_project_url_here' && 
        !!process.env.NEXT_PUBLIC_SUPABASE_URL;

      let publicUrl = '';

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

        // 3. Update payment in database
        const { error: updateError } = await supabase
          .from('payments')
          .update({
            status: 'en_revision',
            pay_date: transferDate,
            transaction_code: transactionCode,
            receipt_url: publicUrl
          })
          .eq('id', checkoutInvoice.id);

        if (updateError) throw updateError;
      }

      setInvoices((prev) =>
        prev.map((inv) =>
          inv.id === checkoutInvoice.id
            ? { ...inv, status: 'en_revision', payDate: 'Pendiente Aud.' }
            : inv
        )
      );

      setPaymentSuccess(true);
    } catch (err: any) {
      alert(err.message || 'Error al enviar comprobante.');
    } finally {
      setPaymentLoading(false);
    }
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
                          onClick={() => alert(`Descargando comprobante de pago: ${inv.invoiceNumber}.pdf`)}
                          className="p-1.5 rounded-lg border border-border hover:bg-muted text-muted-foreground"
                          title="Descargar Recibo"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : inv.status === 'en_revision' ? (
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-500/10 text-amber-600 rounded-lg text-[9px] font-black uppercase">
                          <Clock className="w-3.5 h-3.5" />
                          <span>En Revisión</span>
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-0.5 px-2.5 py-1 bg-red-500/10 text-red-600 rounded-lg text-[9px] font-black uppercase">
                          <XCircle className="w-3 h-3" />
                          <span>Impago</span>
                        </span>
                        <button
                          onClick={() => handleOpenCheckout(inv)}
                          className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-secondary text-secondary-foreground hover:bg-secondary/90 transition-all text-xs font-bold uppercase tracking-wider shadow-sm"
                        >
                          Pagar Aportes
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
                  /* Mercado Pago Form */
                  <form onSubmit={handleProcessPayment} className="space-y-4">
                    {/* MP branding */}
                    <div className="flex items-center justify-between border-b border-border pb-1">
                      <div className="flex items-center gap-1">
                        <div className="w-3.5 h-3.5 rounded-full bg-[#009ee3] flex items-center justify-center text-[8px] font-black text-white">m</div>
                        <span className="text-xs font-black text-[#009ee3]">mercado pago</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground font-bold">Tarjeta</span>
                    </div>

                    <div className="bg-[#009ee3]/5 p-3 rounded-xl border border-[#009ee3]/10 space-y-1 text-xs">
                      <div className="flex justify-between font-bold text-foreground">
                        <span>Boleta:</span>
                        <span className="text-[#009ee3]">{checkoutInvoice.invoiceNumber}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Período:</span>
                        <span>{checkoutInvoice.period}</span>
                      </div>
                      <div className="flex justify-between font-black text-foreground pt-1.5 border-t border-border/60">
                        <span>Total:</span>
                        <span className="text-[#009ee3] text-sm">${checkoutInvoice.amount.toLocaleString('es-AR')}</span>
                      </div>
                    </div>

                    {/* Credit Card Mock Form */}
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-muted-foreground uppercase">Nombre en la tarjeta</label>
                        <input
                          type="text"
                          required
                          value={cardName}
                          onChange={(e) => setCardName(e.target.value)}
                          placeholder="TITULAR DE LA CUENTA"
                          className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-[#009ee3] text-xs uppercase font-semibold"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-muted-foreground uppercase">Número de tarjeta</label>
                        <input
                          type="text"
                          required
                          maxLength={19}
                          value={cardNumber}
                          onChange={(e) => setCardNumber(e.target.value.replace(/\s?/g, '').replace(/(\d{4})/g, '$1 ').trim())}
                          placeholder="0000 0000 0000 0000"
                          className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-[#009ee3] text-xs font-mono text-center"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-muted-foreground uppercase">Vencimiento</label>
                          <input
                            type="text"
                            required
                            maxLength={5}
                            value={cardExpiry}
                            onChange={(e) => setCardExpiry(e.target.value)}
                            placeholder="MM/AA"
                            className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-[#009ee3] text-xs text-center"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-muted-foreground uppercase">CVV</label>
                          <input
                            type="password"
                            required
                            maxLength={4}
                            value={cardCvv}
                            onChange={(e) => setCardCvv(e.target.value)}
                            placeholder="***"
                            className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-[#009ee3] text-xs text-center"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Submit */}
                    <button
                      type="submit"
                      disabled={paymentLoading}
                      className="w-full py-3 rounded-xl bg-[#009ee3] text-white hover:bg-[#008ac6] text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-md disabled:opacity-50 cursor-pointer"
                    >
                      {paymentLoading ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Procesando...
                        </>
                      ) : (
                        <>
                          <Lock className="w-3.5 h-3.5" />
                          Pagar Aportes
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
                ) : (
                  /* Bank Transfer / Receipt Upload Form */
                  <form onSubmit={handleProcessTransfer} className="space-y-4">
                    {/* ATFAR Bank info */}
                    <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-3.5 text-xs text-emerald-950 font-semibold space-y-2">
                      <span className="text-[10px] font-extrabold text-emerald-800 uppercase block tracking-wider">Cuentas del Sindicato</span>
                      <div className="space-y-1 font-medium text-slate-700">
                        <div className="flex justify-between">
                          <span>Banco:</span>
                          <span className="font-bold text-emerald-950">Banco Municipal</span>
                        </div>
                        <div className="flex justify-between items-center gap-2">
                          <span>CBU:</span>
                          <div className="flex items-center gap-1 font-mono font-bold text-emerald-950">
                            <span>0650020701000000379012</span>
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
                          <span className="font-bold text-emerald-950">ATFAR.ROSARIO.GREMIO</span>
                        </div>
                        <div className="flex justify-between">
                          <span>CUIT:</span>
                          <span className="font-bold text-emerald-950">30-54827379-1</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {/* File upload */}
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-muted-foreground uppercase">Comprobante (Imagen o PDF)</label>
                        <div className="relative border border-dashed border-emerald-300 bg-emerald-500/5 hover:bg-emerald-500/10 rounded-xl p-4 text-center cursor-pointer transition-all">
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
                          <Upload className="w-6 h-6 text-emerald-600 mx-auto mb-1.5" />
                          <span className="text-[10px] font-bold text-slate-700 block truncate">
                            {transactionFileName || 'Adjuntar archivo (PDF, JPG, PNG)'}
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
                          className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs font-semibold"
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
                          className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs font-semibold"
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
    </div>
  );
}
