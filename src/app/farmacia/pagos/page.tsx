'use client';

import { useState } from 'react';
import Link from 'next/link';
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
  ArrowRight
} from 'lucide-react';

interface Invoice {
  id: string;
  invoiceNumber: string;
  period: string;
  amount: number;
  status: 'pagado' | 'impago';
  dueDate: string;
  payDate: string;
}

export default function PagosPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([
    { id: '1', invoiceNumber: 'FAC-2026-06', period: 'Junio 2026', amount: 45000, status: 'impago', dueDate: '10/07/2026', payDate: '---' },
    { id: '2', invoiceNumber: 'FAC-2026-05', period: 'Mayo 2026', amount: 45000, status: 'pagado', dueDate: '10/06/2026', payDate: '09/06/2026' },
    { id: '3', invoiceNumber: 'FAC-2026-04', period: 'Abril 2026', amount: 41800, status: 'pagado', dueDate: '10/05/2026', payDate: '08/05/2026' },
  ]);

  const [checkoutInvoice, setCheckoutInvoice] = useState<Invoice | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');

  const handleOpenCheckout = (invoice: Invoice) => {
    setCheckoutInvoice(invoice);
    setPaymentSuccess(false);
  };

  const handleProcessPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardNumber || !cardName || !cardExpiry || !cardCvv) {
      alert('Por favor complete todos los datos de tarjeta.');
      return;
    }

    setPaymentLoading(true);
    // Simulate Mercado Pago processing
    await new Promise((resolve) => setTimeout(resolve, 2000));
    
    // Update local state invoice to paid
    if (checkoutInvoice) {
      setInvoices((prev) =>
        prev.map((inv) =>
          inv.id === checkoutInvoice.id
            ? { ...inv, status: 'pagado', payDate: new Date().toLocaleDateString('es-AR') }
            : inv
        )
      );
    }
    
    setPaymentLoading(false);
    setPaymentSuccess(true);
    // Clear inputs
    setCardNumber('');
    setCardName('');
    setCardExpiry('');
    setCardCvv('');
  };

  const totalUnpaid = invoices
    .filter((inv) => inv.status === 'impago')
    .reduce((sum, inv) => sum + inv.amount, 0);

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
              <div className="bg-card border-2 border-[#009ee3] rounded-3xl p-6 shadow-xl space-y-6 relative overflow-hidden animate-fadeIn">
                {/* MP branding */}
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div className="flex items-center gap-1">
                    <div className="w-3.5 h-3.5 rounded-full bg-[#009ee3] flex items-center justify-center text-[8px] font-black text-white">m</div>
                    <span className="text-xs font-black text-[#009ee3]">mercado pago</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-bold">Checkout Oficial</span>
                </div>

                {paymentSuccess ? (
                  <div className="text-center py-6 space-y-4">
                    <div className="inline-flex p-3 bg-emerald-500/10 text-emerald-500 rounded-full">
                      <CheckCircle2 className="w-10 h-10" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-extrabold text-foreground text-sm">¡Aportes Acreditados!</h4>
                      <p className="text-[10px] text-muted-foreground leading-relaxed">
                        El pago de **${checkoutInvoice.amount.toLocaleString('es-AR')}** fue validado por Mercado Pago y acreditado en tu estado de cuenta.
                      </p>
                    </div>
                    <button
                      onClick={() => setCheckoutInvoice(null)}
                      className="w-full py-2.5 rounded-xl bg-[#009ee3] text-white font-bold text-xs uppercase"
                    >
                      Volver
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleProcessPayment} className="space-y-4">
                    <div className="bg-muted/40 p-3.5 rounded-xl border border-border/80 space-y-1 text-xs">
                      <div className="flex justify-between font-bold text-foreground">
                        <span>Pago de Boleta:</span>
                        <span className="text-primary">{checkoutInvoice.invoiceNumber}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Período:</span>
                        <span>{checkoutInvoice.period}</span>
                      </div>
                      <div className="flex justify-between font-black text-foreground pt-1.5 border-t border-border/60">
                        <span>Monto Final:</span>
                        <span className="text-primary text-sm">${checkoutInvoice.amount.toLocaleString('es-AR')}</span>
                      </div>
                    </div>

                    {/* Credit Card Mock Form */}
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">Nombre en la tarjeta</label>
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
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">Número de tarjeta</label>
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
                          <label className="text-[10px] font-bold text-muted-foreground uppercase">Vencimiento</label>
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
                          <label className="text-[10px] font-bold text-muted-foreground uppercase">Cód. Seguridad</label>
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
                      className="w-full py-3 rounded-xl bg-[#009ee3] text-white hover:bg-[#008ac6] text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-md disabled:opacity-50"
                    >
                      {paymentLoading ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Procesando Cobro...
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
                      className="w-full text-center text-[10px] font-bold text-muted-foreground hover:text-foreground"
                    >
                      Cancelar Operación
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
