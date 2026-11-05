/**
 * Categorías laborales oficiales bajo Convenio Colectivo de Trabajo CCT 659/13.
 */
export const CCT_CATEGORIES = [
  'Cadetes',
  'Aprendiz Ayudante',
  'Personal Auxiliar Interno y Externo',
  'Personal con Asignación Específica',
  'Ayudante en Gestión de Farmacia',
  'Personal en Gestión de Farmacia',
  'Farmacéutico',
] as const;

export type CctCategory = typeof CCT_CATEGORIES[number];

export const PHARMACIST_CATEGORY = 'Farmacéutico';

