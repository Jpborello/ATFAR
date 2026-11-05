import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const paymentId = searchParams.get('paymentId') || '';
  const amount = searchParams.get('amount') || '0';
  const desc = searchParams.get('desc') || 'Aportes Sindicales ATFAR';

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Plus Pagos - Nuevo Banco de Santa Fe (Sandbox)</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body { background-color: #f1f5f9; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; }
    .card { background: white; max-width: 460px; width: 100%; border-radius: 20px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); overflow: hidden; border: 1px solid #e2e8f0; }
    .header { background: linear-gradient(135deg, #b91c1c 0%, #991b1b 100%); color: white; padding: 24px; text-align: center; }
    .badge { display: inline-block; background: rgba(255,255,255,0.2); padding: 4px 12px; border-radius: 999px; font-size: 11px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 8px; }
    .title { font-size: 20px; font-weight: 800; }
    .subtitle { font-size: 12px; opacity: 0.9; margin-top: 4px; }
    .content { padding: 24px; }
    .details { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 20px; }
    .row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px; }
    .row:last-child { margin-bottom: 0; }
    .label { color: #64748b; font-weight: 600; }
    .value { color: #0f172a; font-weight: 700; text-align: right; }
    .amount-box { text-align: center; padding: 16px 0; border-top: 1px dashed #cbd5e1; margin-top: 12px; }
    .amount-label { font-size: 12px; color: #64748b; font-weight: bold; text-transform: uppercase; }
    .amount-val { font-size: 32px; font-weight: 900; color: #0f172a; margin-top: 4px; }
    .methods { margin-bottom: 20px; }
    .method-title { font-size: 11px; font-weight: 800; text-transform: uppercase; color: #64748b; margin-bottom: 8px; }
    .method-pill { display: flex; align-items: center; gap: 8px; padding: 10px 14px; border: 2px solid #b91c1c; background: #fef2f2; border-radius: 10px; font-size: 13px; font-weight: 700; color: #991b1b; }
    .actions { display: flex; flex-direction: column; gap: 10px; }
    .btn-pay { background: #b91c1c; color: white; border: none; padding: 14px; border-radius: 12px; font-size: 14px; font-weight: 800; cursor: pointer; text-transform: uppercase; letter-spacing: 0.5px; transition: background 0.2s; }
    .btn-pay:hover { background: #991b1b; }
    .btn-cancel { background: transparent; color: #64748b; border: 1px solid #cbd5e1; padding: 12px; border-radius: 12px; font-size: 13px; font-weight: 700; cursor: pointer; text-align: center; text-decoration: none; display: block; }
    .btn-cancel:hover { background: #f8fafc; color: #0f172a; }
    .footer { text-align: center; padding: 16px; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="badge">Entorno de Pruebas (Sandbox)</div>
      <div class="title">Plus Pagos</div>
      <div class="subtitle">Nuevo Banco de Santa Fe / Administradora San Juan</div>
    </div>
    <div class="content">
      <div class="details">
        <div class="row">
          <span class="label">Comercio / Ente:</span>
          <span class="value">ATFAR (CCT 659/13)</span>
        </div>
        <div class="row">
          <span class="label">Concepto:</span>
          <span class="value">${desc}</span>
        </div>
        <div class="row">
          <span class="label">ID de Boleta:</span>
          <span class="value">${paymentId}</span>
        </div>
        <div class="amount-box">
          <div class="amount-label">Total a Pagar</div>
          <div class="amount-val">$${Number(amount).toLocaleString('es-AR')}</div>
        </div>
      </div>

      <div class="methods">
        <div class="method-title">Medio de Pago Seleccionado</div>
        <div class="method-pill">
          <span>💳</span>
          <span>Débito en Línea / Transferencia 3.0 Santa Fe</span>
        </div>
      </div>

      <div class="actions">
        <form method="POST" action="/api/payments/plus-pagos/simulate">
          <input type="hidden" name="paymentId" value="${paymentId}" />
          <button type="submit" class="btn-pay" style="width: 100%;">
            ✓ Simular Pago Aprobado
          </button>
        </form>
        <button onclick="window.history.back()" class="btn-cancel">
          Cancelar y Volver
        </button>
      </div>
    </div>
    <div class="footer">
      Esta es una pasarela de prueba local. No se debita dinero real.
    </div>
  </div>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const paymentId = formData.get('paymentId') as string;

    if (!paymentId) {
      return NextResponse.json({ error: 'Falta paymentId' }, { status: 400 });
    }

    // Buscamos la boleta para saber la pharmacy_id
    const { data: payment, error } = await supabaseAdmin
      .from('payments')
      .select('id, pharmacy_id')
      .eq('id', paymentId)
      .single();

    if (error || !payment) {
      return NextResponse.json({ error: 'Boleta no encontrada' }, { status: 404 });
    }

    const todayIso = new Date().toISOString().slice(0, 10);
    const txCode = 'PLUS-SIM-' + Math.floor(100000 + Math.random() * 900000);

    // Actualizamos el pago como pagado
    await supabaseAdmin
      .from('payments')
      .update({
        status: 'pagado',
        pay_date: todayIso,
        transaction_code: txCode,
        payment_provider: 'plus_pagos',
      })
      .eq('id', payment.id);

    // Redirigir de regreso al panel de pagos de la farmacia
    const redirectUrl = new URL(`/farmacia/${payment.pharmacy_id}/pagos?simulated_success=true&tx=${txCode}`, request.url);
    return NextResponse.redirect(redirectUrl.toString(), 303);
  } catch (err) {
    console.error('Error en simulate POST:', err);
    return NextResponse.json({ error: 'Error al simular pago' }, { status: 500 });
  }
}

