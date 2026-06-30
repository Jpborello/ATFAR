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
  let days = today.getDate() - entryDate.getDate();
  
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
  let days = today.getDate() - entryDate.getDate();
  
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
