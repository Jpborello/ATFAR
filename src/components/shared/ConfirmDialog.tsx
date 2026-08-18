'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';

type ConfirmOptions = {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
};

type ConfirmRequest = ConfirmOptions & {
  resolve: (value: boolean) => void;
};

let currentListener: ((request: ConfirmRequest | null) => void) | null = null;

/**
 * Reemplazo de window.confirm() que respeta el estilo visual del sitio.
 * Uso: const ok = await confirmDialog('¿Seguro que querés eliminar esto?');
 */
export function confirmDialog(options: ConfirmOptions | string): Promise<boolean> {
  const normalized: ConfirmOptions = typeof options === 'string' ? { message: options } : options;
  return new Promise((resolve) => {
    if (!currentListener) {
      // No hay <ConfirmDialogHost /> montado (no debería pasar, está en el layout raíz).
      resolve(window.confirm(normalized.message));
      return;
    }
    currentListener({ ...normalized, resolve });
  });
}

export function ConfirmDialogHost() {
  const [request, setRequest] = useState<ConfirmRequest | null>(null);

  useEffect(() => {
    currentListener = setRequest;
    return () => {
      currentListener = null;
    };
  }, []);

  if (!request) return null;

  const close = (result: boolean) => {
    request.resolve(result);
    setRequest(null);
  };

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fadeIn"
      onClick={() => close(false)}
    >
      <div
        className="bg-card border border-border rounded-3xl max-w-sm w-full overflow-hidden shadow-premium relative animate-scaleIn p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
              request.danger ? 'bg-red-500/10 text-red-500' : 'bg-secondary/10 text-secondary'
            }`}
          >
            <AlertTriangle className="w-4.5 h-4.5" />
          </div>
          <div className="space-y-1 pt-1">
            <h3 className="text-sm font-extrabold text-foreground tracking-tight">
              {request.title || 'Confirmar acción'}
            </h3>
            <p className="text-xs text-muted-foreground font-medium leading-relaxed">
              {request.message}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={() => close(false)}
            className="px-4 py-2 rounded-xl text-xs font-bold text-muted-foreground hover:bg-muted/40 transition-all cursor-pointer bg-transparent border-0"
          >
            {request.cancelLabel || 'Cancelar'}
          </button>
          <button
            type="button"
            onClick={() => close(true)}
            className={`px-4 py-2 rounded-xl text-xs font-bold text-white transition-all cursor-pointer border-0 ${
              request.danger ? 'bg-red-500 hover:bg-red-600' : 'bg-primary hover:bg-primary/90'
            }`}
          >
            {request.confirmLabel || 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
}
