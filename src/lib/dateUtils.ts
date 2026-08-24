export const cctCategories = [
  'Cadetes',
  'Aprendiz Ayudante',
  'Personal Auxiliar Interno y Externo',
  'Personal con Asignación Específica',
  'Ayudante en Gestión de Farmacia',
  'Personal en Gestión de Farmacia',
  'Farmacéutico'
];

export function calculateSeniorityYears(entryDateStr: string | null | undefined): number {
  if (!entryDateStr) return 0;
  const entryDate = new Date(entryDateStr);
  if (isNaN(entryDate.getTime())) return 0;
  
  const today = new Date();
  let years = today.getFullYear() - entryDate.getFullYear();
  let months = today.getMonth() - entryDate.getMonth();
  const days = today.getDate() - entryDate.getDate();
  
  if (days < 0) months--;
  if (months < 0) {
    years--;
  }
  return Math.max(0, years);
}

export function calculateSeniority(entryDateStr: string | null | undefined): string {
  if (!entryDateStr) return 'Sin fecha';
  const entryDate = new Date(entryDateStr);
  if (isNaN(entryDate.getTime())) return 'Fecha inválida';
  
  const today = new Date();
  
  let years = today.getFullYear() - entryDate.getFullYear();
  let months = today.getMonth() - entryDate.getMonth();
  const days = today.getDate() - entryDate.getDate();
  
  if (days < 0) {
    months--;
  }
  if (months < 0) {
    years--;
    months += 12;
  }
  
  const parts: string[] = [];
  if (years > 0) {
    parts.push(`${years} ${years === 1 ? 'año' : 'años'}`);
  }
  if (months > 0) {
    parts.push(`${months} ${months === 1 ? 'mes' : 'meses'}`);
  }
  
  if (parts.length === 0) {
    return 'Menos de un mes';
  }
  
  return parts.join(' y ');
}

export function getCurrentCategory(registeredCategory: string, entryDateStr: string | null | undefined): { category: string; promoted: boolean; steps: number } {
  const years = calculateSeniorityYears(entryDateStr);
  const steps = Math.floor(years / 5);
  
  const baseIndex = cctCategories.indexOf(registeredCategory);
  if (baseIndex === -1) {
    return { category: registeredCategory, promoted: false, steps: 0 };
  }
  
  if (steps === 0) {
    return { category: registeredCategory, promoted: false, steps: 0 };
  }
  
  const targetIndex = Math.min(cctCategories.length - 1, baseIndex + steps);
  const promoted = targetIndex > baseIndex;
  
  return {
    category: cctCategories[targetIndex],
    promoted,
    steps: targetIndex - baseIndex
  };
}

export function isReceiptValid(receiptDateStr: string | null | undefined): boolean {
  if (!receiptDateStr) return false;
  const receiptDate = new Date(receiptDateStr);
  if (isNaN(receiptDate.getTime())) return false;
  
  const diffTime = Math.abs(new Date().getTime() - receiptDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays <= 180; // 6 months maximum validity
}

export function getReceiptStatus(receiptDateStr: string | null | undefined): { valid: boolean; label: string; color: string } {
  if (!receiptDateStr) {
    return { valid: false, label: 'Sin Recibo', color: 'red' };
  }
  const valid = isReceiptValid(receiptDateStr);
  if (valid) {
    return { valid: true, label: 'Al Día (6m)', color: 'emerald' };
  }
  return { valid: false, label: 'Vencido (+6m)', color: 'red' };
}

export type PharmacyDebtStatus = 'al_dia' | 'en_proceso' | 'con_deuda';

interface DebtStatusPharmacy {
  has_debt?: boolean | null;
  debt_override_until?: string | null;
}

interface DebtStatusPayment {
  status?: string | null;
  due_date?: string | null;
}

/**
 * `has_debt` en la base ya es la fuente de verdad (la calcula un trigger +
 * un job diario, con 7 días de gracia sobre boletas recién vencidas y
 * respetando la excepción manual del admin). Acá solo distinguimos, para
 * mostrar, si un false es "genuinamente al día" o "al día por gracia/
 * excepción" (En Proceso) — nunca reimplementa el cálculo de deuda.
 */
export function getPharmacyDebtStatus(
  pharmacy: DebtStatusPharmacy,
  payments: DebtStatusPayment[] = []
): { status: PharmacyDebtStatus; label: string } {
  if (pharmacy.has_debt) {
    return { status: 'con_deuda', label: 'Con Deuda' };
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const overrideActive = !!pharmacy.debt_override_until && pharmacy.debt_override_until >= todayStr;
  const graceActive = payments.some((p) => {
    if (p.status !== 'impago' && p.status !== 'unpaid') return false;
    return !!p.due_date && p.due_date < todayStr;
  });

  if (overrideActive || graceActive) {
    return { status: 'en_proceso', label: 'En Proceso' };
  }

  return { status: 'al_dia', label: 'Al Día' };
}

