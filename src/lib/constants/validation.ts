/**
 * Expresión regular oficial para validar CUIT/CUIL de 11 dígitos numéricos sin guiones ni espacios.
 */
export const cuitDigitsRegex = /^\d{11}$/;

/**
 * Valida si un CUIT/CUIL tiene formato correcto (11 dígitos).
 */
export function isValidCuit(cuit: string | null | undefined): boolean {
  if (!cuit) return false;
  const clean = cuit.replace(/\D/g, '');
  return cuitDigitsRegex.test(clean);
}

