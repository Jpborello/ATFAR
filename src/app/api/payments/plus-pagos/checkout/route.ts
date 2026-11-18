import { NextResponse } from 'next/server';
import { createUserServerClient } from '@/lib/supabaseServer';
import { plusPagos } from '@/lib/payments/plusPagos';

/** Escapa texto para insertarlo en HTML (contenido o atributos). */
function esc(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Página intermedia: arma el formulario cifrado y lo envía solo al banco.
// Requiere sesión (la navegación desde el portal manda las cookies) y RLS
// limita la boleta a las farmacias del usuario.
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const paymentId = searchParams.get('paymentId');

    if (!paymentId) {
      return new NextResponse('Falta el identificador de pago (paymentId).', { status: 400 });
    }

    const supabase = await createUserServerClient();
    if (!supabase) {
      return new NextResponse('El servidor no está configurado correctamente.', { status: 500 });
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new NextResponse('Tu sesión expiró. Volvé a ingresar al portal de ATFAR para pagar.', { status: 401 });
    }

    const { data: payment, error } = await supabase
      .from('payments')
      .select('id, amount, invoice_number, period, status, pharmacy_id, external_reference, payment_provider')
      .eq('id', paymentId)
      .single();

    if (error || !payment) {
      console.error('Boleta no encontrada en checkout de Plus Pagos:', paymentId, error);
      return new NextResponse('No se encontró la boleta indicada.', { status: 404 });
    }

    if (payment.status !== 'impago') {
      return new NextResponse('Esta boleta ya no se encuentra en estado impago.', { status: 409 });
    }

    // El intento (TransaccionComercioId) lo crea /create; sin él no se puede
    // rastrear después el pago, así que no se manda nada al banco.
    if (payment.payment_provider !== 'plus_pagos' || !payment.external_reference) {
      return new NextResponse('Iniciá el pago desde el botón "Pagar online" del portal.', { status: 409 });
    }

    // Resolver URL base de la aplicación de forma dinámica y confiable
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || 'localhost:3000';
    const proto = request.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || `${proto}://${host}`;

    // Obtener la IP real del cliente
    const forwardedFor = request.headers.get('x-forwarded-for');
    const clientIp = (forwardedFor ? forwardedFor.split(',')[0].trim() : null) ||
      request.headers.get('x-real-ip') ||
      '127.0.0.1';

    const callbackSuccess = `${appUrl}/farmacia/${payment.pharmacy_id}/pagos?plus_pagos_success=true&payment_id=${payment.id}`;
    const callbackCancel = `${appUrl}/farmacia/${payment.pharmacy_id}/pagos?plus_pagos_cancel=true&payment_id=${payment.id}`;
    const description = `ATFAR - Aportes ${payment.period} - Boleta ${payment.invoice_number}`;
    const transactionId = payment.external_reference;

    // Generar la carga útil con encriptación AES-256-CBC y Hash SHA-256
    const formFields = plusPagos.buildFormPayload({
      clientIp,
      amount: Number(payment.amount),
      transactionId,
      description,
      callbackSuccess,
      callbackCancel,
    });

    const postUrl = plusPagos.getPostUrl();

    // Renderizar página de redirección automática segura con el formulario POST
    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Conectando con Plus Pagos | ATFAR</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: #f8fafc;
      color: #0f172a;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 1.5rem;
    }
    .card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 1rem;
      padding: 2.5rem 2rem;
      max-width: 440px;
      width: 100%;
      text-align: center;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05);
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      background: #f0fdf4;
      color: #166534;
      font-size: 0.75rem;
      font-weight: 600;
      padding: 0.25rem 0.65rem;
      border-radius: 9999px;
      border: 1px solid #bbf7d0;
      margin-bottom: 1.25rem;
    }
    .badge-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #22c55e;
    }
    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid #e2e8f0;
      border-top-color: #0284c7;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 1.5rem auto;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    h1 {
      font-size: 1.25rem;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 0.5rem;
      letter-spacing: -0.02em;
    }
    p {
      font-size: 0.875rem;
      color: #64748b;
      line-height: 1.5;
      margin-bottom: 1.5rem;
    }
    .invoice-info {
      background: #f1f5f9;
      border-radius: 0.5rem;
      padding: 0.875rem;
      margin-bottom: 1.5rem;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 0.8125rem;
      color: #334155;
      text-align: left;
    }
    .invoice-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 0.25rem;
    }
    .invoice-row:last-child { margin-bottom: 0; }
    .btn {
      display: inline-block;
      width: 100%;
      background: #0284c7;
      color: #ffffff;
      font-weight: 600;
      font-size: 0.875rem;
      padding: 0.75rem 1rem;
      border-radius: 0.5rem;
      border: none;
      cursor: pointer;
      text-decoration: none;
      transition: background 0.15s ease;
    }
    .btn:hover { background: #0369a1; }
    .secure-note {
      font-size: 0.75rem;
      color: #94a3b8;
      margin-top: 1rem;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">
      <span class="badge-dot"></span>
      Conexión Cifrada SSL 256-bit
    </div>

    <div class="spinner"></div>

    <h1>Redirigiendo a Plus Pagos</h1>
    <p>Estamos conectando con la pasarela oficial del <strong>Nuevo Banco de Santa Fe</strong> para procesar tu pago de forma segura.</p>

    <div class="invoice-info">
      <div class="invoice-row">
        <span>Boleta:</span>
        <strong>${esc(payment.invoice_number)}</strong>
      </div>
      <div class="invoice-row">
        <span>Período:</span>
        <strong>${esc(payment.period)}</strong>
      </div>
      <div class="invoice-row">
        <span>Total a abonar:</span>
        <strong style="color: #0284c7;">$${esc(Number(payment.amount).toLocaleString('es-AR', { minimumFractionDigits: 2 }))}</strong>
      </div>
    </div>

    <form id="ppForm" action="${esc(postUrl)}" method="POST">
      <input type="hidden" name="COMERCIO" value="${esc(formFields.COMERCIO)}" />
      <input type="hidden" name="SucursalComercio" value="${esc(formFields.SucursalComercio)}" />
      <input type="hidden" name="TransaccionComercioId" value="${esc(formFields.TransaccionComercioId)}" />
      <input type="hidden" name="Monto" value="${esc(formFields.Monto)}" />
      <input type="hidden" name="Hash" value="${esc(formFields.Hash)}" />
      <input type="hidden" name="CallbackSuccess" value="${esc(formFields.CallbackSuccess)}" />
      <input type="hidden" name="CallbackCancel" value="${esc(formFields.CallbackCancel)}" />
      <input type="hidden" name="Producto[0]" value="${esc(formFields['Producto[0]'])}" />

      <button type="submit" class="btn">Continuar al portal de pago si no redirige</button>
    </form>

    <div class="secure-note">
      Operación respaldada por Administradora San Juan S.A.
    </div>
  </div>

  <script>
    (function() {
      // Envío automático inmediato
      try {
        document.getElementById('ppForm').submit();
      } catch (e) {
        console.error('Error enviando formulario:', e);
      }
    })();
  </script>
</body>
</html>`;

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (err: unknown) {
    console.error('Error procesando checkout de Plus Pagos:', err);
    return new NextResponse('Error interno al preparar el pago.', { status: 500 });
  }
}
