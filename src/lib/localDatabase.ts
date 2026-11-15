/**
 * Gestor Local-First e IndexedDB para ATFAR
 * Permite almacenar y consultar la base de datos completa de farmacias,
 * nóminas y pagos sin conexión a internet (Modo Contingencia).
 */

export interface LocalDbSnapshot {
  version: string;
  exportedAt: string;
  windowsPath?: string;
  counts: {
    pharmacies: number;
    employees: number;
    payments: number;
    scales: number;
    members: number;
    benefits: number;
    jobApplications: number;
  };
  data: {
    pharmacies: any[];
    employees: any[];
    payments: any[];
    salaryScales: any[];
    pharmacyMembers: any[];
    benefitRequests: any[];
    jobApplications: any[];
  };
}

const DB_NAME = 'atfar_local_first_db';
const DB_VERSION = 1;
const STORE_NAME = 'snapshots';
const KEY_CURRENT = 'current_database_snapshot';
const LS_MODE_KEY = 'atfar_operation_mode'; // 'online' | 'local'
const LS_META_KEY = 'atfar_local_snapshot_meta';

/**
 * Abre la conexión a IndexedDB en el navegador.
 */
function openIndexedDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB no está disponible en este entorno.'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Guarda el snapshot completo en IndexedDB y metadatos en localStorage.
 */
export async function saveLocalSnapshot(snapshot: LocalDbSnapshot): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    const db = await openIndexedDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(snapshot, KEY_CURRENT);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });

    // Guardar resumen ligero en localStorage para acceso síncrono instantáneo
    localStorage.setItem(
      LS_META_KEY,
      JSON.stringify({
        exportedAt: snapshot.exportedAt,
        counts: snapshot.counts,
        windowsPath: snapshot.windowsPath,
      })
    );
  } catch (err) {
    console.warn('Fallo al guardar en IndexedDB, intentando localStorage:', err);
    try {
      localStorage.setItem(KEY_CURRENT, JSON.stringify(snapshot));
    } catch (lsErr) {
      console.error('No se pudo guardar en localStorage (tamaño excedido):', lsErr);
    }
  }
}

/**
 * Recupera el snapshot activo desde IndexedDB (o localStorage como fallback).
 */
export async function loadLocalSnapshot(): Promise<LocalDbSnapshot | null> {
  if (typeof window === 'undefined') return null;

  try {
    const db = await openIndexedDB();
    const snapshot = await new Promise<LocalDbSnapshot | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(KEY_CURRENT);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });

    if (snapshot) return snapshot;
  } catch (err) {
    console.warn('Error leyendo de IndexedDB, buscando en localStorage:', err);
  }

  // Fallback a localStorage
  try {
    const raw = localStorage.getItem(KEY_CURRENT);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignorar
  }

  return null;
}

/**
 * Obtiene los metadatos del último respaldo local sin cargar el payload completo en memoria.
 */
export function getLocalSnapshotMeta(): { exportedAt: string; counts: LocalDbSnapshot['counts']; windowsPath?: string } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(LS_META_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Consulta si el modo de operación actual es "local" (contingencia sin internet).
 */
export function isLocalOperationMode(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(LS_MODE_KEY) === 'local';
}

/**
 * Cambia el modo de operación entre 'online' y 'local'.
 */
export function setLocalOperationMode(isLocal: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LS_MODE_KEY, isLocal ? 'local' : 'online');
  // Disparar evento para que la interfaz se entere inmediatamente
  window.dispatchEvent(new CustomEvent('atfar:mode-change', { detail: { isLocal } }));
}

/**
 * Busca farmacias en el snapshot local (búsqueda ultra rápida en memoria).
 */
export function searchLocalPharmacies(snapshot: LocalDbSnapshot, query: string) {
  const q = query.trim().toLowerCase();
  const list = snapshot.data.pharmacies || [];
  if (!q) return list;

  return list.filter((p) => {
    const name = (p.nombre_fantasia || p.name || p.razon_social || '').toLowerCase();
    const cuit = (p.cuit || '').toLowerCase().replace(/[^0-9]/g, '');
    const cleanQ = q.replace(/[^0-9]/g, '');
    const address = (p.address || p.declared_addresses || '').toLowerCase();
    const owner = (p.resp_name || '').toLowerCase();

    return (
      name.includes(q) ||
      (cleanQ && cuit.includes(cleanQ)) ||
      address.includes(q) ||
      owner.includes(q)
    );
  });
}

/**
 * Obtiene los detalles completos de una farmacia con su nómina y pagos vinculados en local.
 */
export function getLocalPharmacyDetails(snapshot: LocalDbSnapshot, pharmacyId: string) {
  const pharmacy = (snapshot.data.pharmacies || []).find((p) => p.id === pharmacyId);
  if (!pharmacy) return null;

  const employees = (snapshot.data.employees || []).filter(
    (e) => e.pharmacy_id === pharmacyId && e.active !== false
  );

  const payments = (snapshot.data.payments || []).filter(
    (p) => p.pharmacy_id === pharmacyId
  );

  return {
    pharmacy,
    employees,
    payments,
  };
}

/**
 * Dispara la descarga en el navegador de un archivo Blob.
 */
export function triggerBrowserFileDownload(content: string, filename: string, mimeType: string) {
  if (typeof window === 'undefined') return;
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
