import { LifeBuoy } from 'lucide-react';

export const SUPPORT_EMAIL = 'neocoresystem@gmail.com';
export const SUPPORT_PHONE_DISPLAY = '341 798-1212';
export const SUPPORT_PHONE_TEL = '+543417981212';

interface SupportContactProps {
  compact?: boolean;
}

export default function SupportContact({ compact = false }: SupportContactProps) {
  if (compact) {
    return (
      <a
        href={`mailto:${SUPPORT_EMAIL}`}
        title={`Soporte técnico Neo Core Sys: ${SUPPORT_EMAIL} · Tel: ${SUPPORT_PHONE_DISPLAY}`}
        className="inline-flex items-center gap-1.5 text-[10px] xl:text-[11px] font-bold text-slate-700 hover:text-primary border border-border hover:border-primary/40 rounded-full px-2.5 py-1.5 bg-slate-50/90 hover:bg-white transition-all whitespace-nowrap"
      >
        <LifeBuoy className="w-3.5 h-3.5 text-secondary flex-shrink-0" />
        <span className="uppercase tracking-wider">Soporte</span>
      </a>
    );
  }

  return (
    <div
      title={`Soporte técnico: ${SUPPORT_EMAIL} · ${SUPPORT_PHONE_DISPLAY}`}
      className="inline-flex items-center gap-1.5 sm:gap-2 text-[9px] sm:text-[10px] font-bold text-muted-foreground border border-border rounded-full px-2.5 sm:px-3 py-1.5 whitespace-nowrap"
    >
      <LifeBuoy className="w-3.5 h-3.5 flex-shrink-0" />
      <span className="uppercase tracking-wider hidden sm:inline">Soporte:</span>
      <a href={`mailto:${SUPPORT_EMAIL}`} className="hover:text-primary transition-colors font-mono normal-case tracking-normal">
        <span className="hidden sm:inline">{SUPPORT_EMAIL}</span>
        <span className="sm:hidden">Escribinos</span>
      </a>
      <span className="hidden md:inline text-border">•</span>
      <a href={`tel:${SUPPORT_PHONE_TEL}`} className="hidden md:inline hover:text-primary transition-colors font-mono normal-case tracking-normal">
        {SUPPORT_PHONE_DISPLAY}
      </a>
    </div>
  );
}
