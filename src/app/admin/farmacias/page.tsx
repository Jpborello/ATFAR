'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
  Search,
  Map as MapIcon,
  Eye,
  Trash2,
  FileSpreadsheet,
  Loader2,
  CheckCircle2,
  Users,
  Building2,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { confirmDialog } from '@/components/shared/ConfirmDialog';

// Dynamic import of the map to prevent SSR issues
const PharmacyMap = dynamic(() => import('@/components/map/PharmacyMap'), {
  ssr: false,
  loading: () => (
    <div className="h-[350px] w-full rounded-2xl bg-muted animate-pulse flex flex-col items-center justify-center text-xs font-semibold text-muted-foreground gap-2">
      <Loader2 className="w-5 h-5 animate-spin text-primary" />
      <span>Cargando mapa de geolocalizaciones...</span>
    </div>
  ),
});

type PaymentStatus = 'al_dia' | 'con_deuda' | 'pendiente';

interface RegisteredPharmacy {
  id: string;
  razonSocial: string;
  cuit: string;
  address: string;
  responsible: string;
  employeeCount: number;
  paymentStatus: PaymentStatus;
  lat: number;
  lng: number;
}

interface PadronPharmacy {
  id: string;
  razonSocial: string;
  cuit: string;
}

interface DbPharmacyRaw {
  id: string;
  name: string;
  cuit?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  has_debt?: boolean;
  profiles?: { full_name?: string } | { full_name?: string }[] | null;
  payments?: { status?: string }[] | null;
}

const PAYMENT_LABEL: Record<PaymentStatus, string> = {
  al_dia: 'Al día',
  con_deuda: 'Con deuda',
  pendiente: 'En revisión',
};

const PAYMENT_STYLE: Record<PaymentStatus, string> = {
  al_dia: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  con_deuda: 'bg-red-50 text-red-700 border border-red-200',
  pendiente: 'bg-amber-50 text-amber-700 border border-amber-200',
};

// Un CUIT del padrón importado en bloque siempre arranca con este prefijo
// (secuencial, no es un CUIT real) — sirve para mostrarlo claramente marcado.
const isPlaceholderCuit = (cuit: string) => /^990000\d{5}$/.test(cuit);

export default function FarmaciasPanelPage() {
  const [tab, setTab] = useState<'registradas' | 'padron'>('registradas');

  // Farmacias registradas (las que realmente se afiliaron al sistema)
  const [pharmacies, setPharmacies] = useState<RegisteredPharmacy[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showMap, setShowMap] = useState(false);

  // Padrón completo (farmacias de Rosario que todavía no se afiliaron)
  const [padronQuery, setPadronQuery] = useState('');
  const [padronResults, setPadronResults] = useState<PadronPharmacy[]>([]);
  const [padronLoading, setPadronLoading] = useState(false);
  const [padronTotal, setPadronTotal] = useState<number | null>(null);

  useEffect(() => {
    async function fetchRegistered() {
      try {
        const { data, error } = await supabase
          .from('pharmacies')
          .select(
            `
            id,
            name,
            cuit,
            address,
            latitude,
            longitude,
            has_debt,
            owner_id,
            profiles:owner_id (full_name),
            payments(status)
          `
          )
          .eq('registered', true)
          .order('name');

        if (error) throw error;

        // El conteo de empleados se trae aparte: es una sola consulta liviana
        // (solo hay que sumar por farmacia), en vez de dejarlo fijo en 0.
        const { data: employeesData, error: empError } = await supabase
          .from('employees')
          .select('pharmacy_id')
          .eq('active', true);

        if (empError) throw empError;

        const employeeCounts = new Map<string, number>();
        (employeesData || []).forEach((e: { pharmacy_id: string }) => {
          employeeCounts.set(e.pharmacy_id, (employeeCounts.get(e.pharmacy_id) || 0) + 1);
        });

        const mapped = ((data as unknown as DbPharmacyRaw[]) || []).map((p) => {
          const hasImpago = p.payments?.some((pay) => pay.status === 'impago');
          const hasEnRevision = p.payments?.some((pay) => pay.status === 'en_revision');

          let paymentStatus: PaymentStatus = 'al_dia';
          if (p.has_debt || hasImpago) paymentStatus = 'con_deuda';
          else if (hasEnRevision) paymentStatus = 'pendiente';

          const respName = Array.isArray(p.profiles) ? p.profiles[0]?.full_name : p.profiles?.full_name;

          return {
            id: p.id,
            razonSocial: p.name,
            cuit: p.cuit || 'Sin CUIT',
            address: p.address || 'Sin Dirección',
            responsible: respName || 'Sin Responsable',
            employeeCount: employeeCounts.get(p.id) || 0,
            paymentStatus,
            lat: p.latitude || -32.9511,
            lng: p.longitude || -60.6663,
          };
        });

        setPharmacies(mapped);
      } catch (err) {
        console.error('Error loading registered pharmacies:', err);
        toast.error('No pudimos cargar las farmacias registradas.', {
          description: 'Revisá tu conexión y volvé a intentarlo.',
        });
      } finally {
        setLoading(false);
      }
    }

    fetchRegistered();
  }, []);

  // Cuántas farmacias hay en el padrón sin afiliar (para el botón de la solapa)
  useEffect(() => {
    async function fetchPadronTotal() {
      const { count, error } = await supabase
        .from('pharmacies')
        .select('id', { count: 'exact', head: true })
        .or('registered.eq.false,registered.is.null');
      if (!error) setPadronTotal(count ?? 0);
    }
    fetchPadronTotal();
  }, []);

  // Búsqueda del padrón: se dispara solo cuando el admin escribe (nunca se
  // traen las ~980 filas de una), con un pequeño debounce.
  useEffect(() => {
    if (tab !== 'padron') return;
    const term = padronQuery.trim();
    if (term.length < 2) {
      setPadronResults([]);
      return;
    }
    const safeTerm = term.replace(/[,()%]/g, '');
    const handle = setTimeout(async () => {
      setPadronLoading(true);
      try {
        const { data, error } = await supabase
          .from('pharmacies')
          .select('id, name, cuit')
          .or('registered.eq.false,registered.is.null')
          .or(`name.ilike.%${safeTerm}%,cuit.ilike.%${safeTerm}%`)
          .order('name')
          .limit(50);
        if (error) throw error;
        setPadronResults(
          (data || []).map((p) => ({ id: p.id, razonSocial: p.name, cuit: p.cuit || 'Sin CUIT' }))
        );
      } catch (err) {
        console.error('Error searching padrón:', err);
        toast.error('No pudimos buscar en el padrón.');
      } finally {
        setPadronLoading(false);
      }
    }, 350);
    return () => clearTimeout(handle);
  }, [padronQuery, tab]);

  // Actions
  const handleDeleteRegistered = async (id: string, razonSocial: string) => {
    const confirmed = await confirmDialog({
      title: 'Eliminar farmacia',
      message: `¿Seguro que deseas eliminar el registro de "${razonSocial}"? Esta acción no se puede deshacer.`,
      confirmLabel: 'Eliminar',
      danger: true,
    });
    if (!confirmed) return;
    try {
      const { error } = await supabase.from('pharmacies').delete().eq('id', id);
      if (error) throw error;
      setPharmacies((prev) => prev.filter((p) => p.id !== id));
      toast.success('Farmacia eliminada.');
    } catch (err) {
      console.error('Error deleting pharmacy:', err);
      toast.error('Ocurrió un error al eliminar la farmacia.');
    }
  };

  const handleDeletePadron = async (id: string, razonSocial: string) => {
    const confirmed = await confirmDialog({
      title: 'Eliminar del padrón',
      message: `¿Seguro que deseas eliminar "${razonSocial}" del padrón? Esta acción no se puede deshacer.`,
      confirmLabel: 'Eliminar',
      danger: true,
    });
    if (!confirmed) return;
    try {
      const { error } = await supabase.from('pharmacies').delete().eq('id', id);
      if (error) throw error;
      setPadronResults((prev) => prev.filter((p) => p.id !== id));
      toast.success('Farmacia eliminada del padrón.');
    } catch (err) {
      console.error('Error deleting pharmacy from padrón:', err);
      toast.error('Ocurrió un error al eliminar la farmacia.');
    }
  };

  const handleMarkPaidTransition = async (id: string, razonSocial: string) => {
    const confirmed = await confirmDialog({
      title: 'Marcar como Al Día',
      message: `¿"${razonSocial}" ya pagó por fuera del sistema este mes? Va a figurar "Al Día" hasta fin de mes, y después el cálculo normal vuelve a aplicar solo.`,
      confirmLabel: 'Marcar Al Día',
    });
    if (!confirmed) return;
    try {
      const { error } = await supabase.rpc('set_pharmacy_debt_override', { p_pharmacy_id: id, p_clear: false });
      if (error) throw error;
      setPharmacies((prev) => prev.map((p) => (p.id === id ? { ...p, paymentStatus: 'al_dia' } : p)));
      toast.success('Farmacia marcada como Al Día hasta fin de mes.');
    } catch (err) {
      console.error('Error marking pharmacy as paid:', err);
      toast.error('Ocurrió un error al actualizar el estado de la farmacia.');
    }
  };

  const csvEscape = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;

  const handleExportCsv = (rows: RegisteredPharmacy[]) => {
    if (rows.length === 0) {
      toast.warning('No hay farmacias para exportar con los filtros actuales.');
      return;
    }
    const headers = ['Razón Social', 'CUIT', 'Dirección', 'Responsable', 'Empleados', 'Estado de Pago'];
    const lines = [
      headers.map(csvEscape).join(','),
      ...rows.map((p) =>
        [p.razonSocial, p.cuit, p.address, p.responsible, p.employeeCount, PAYMENT_LABEL[p.paymentStatus]]
          .map(csvEscape)
          .join(',')
      ),
    ];
    // BOM para que Excel detecte UTF-8 y no rompa los acentos
    const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `farmacias_atfar_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const filteredRegistradas = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return pharmacies.filter(
      (p) => p.razonSocial.toLowerCase().includes(q) || p.cuit.includes(searchQuery)
    );
  }, [pharmacies, searchQuery]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">Farmacias</h1>
          <p className="text-sm font-semibold text-muted-foreground mt-1">
            Gestión de afiliación y control de liquidación de aportes mensuales.
          </p>
        </div>

        {tab === 'registradas' && (
          <div className="flex gap-2 w-full sm:w-auto">
            <button
              onClick={() => setShowMap(!showMap)}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-border text-foreground text-sm font-bold hover:bg-muted/40 transition-all bg-card"
            >
              <MapIcon className="w-4 h-4 text-secondary" />
              <span>{showMap ? 'Ocultar Mapa' : 'Ver Mapa'}</span>
            </button>
            <button
              onClick={() => handleExportCsv(filteredRegistradas)}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-border text-foreground text-sm font-bold hover:bg-muted/40 transition-all bg-card"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
              <span>Exportar</span>
            </button>
          </div>
        )}
      </div>

      {/* Segmented control: esto reemplaza al filtro escondido de antes */}
      <div className="inline-flex gap-2 bg-muted/50 p-1.5 rounded-2xl w-full sm:w-auto">
        <button
          onClick={() => setTab('registradas')}
          className={`flex-1 sm:flex-none text-left px-5 py-3.5 rounded-xl transition-all cursor-pointer ${
            tab === 'registradas' ? 'bg-primary text-primary-foreground shadow-premium' : 'text-foreground hover:bg-white/60'
          }`}
        >
          <span className="block text-sm font-black">Farmacias Registradas · {pharmacies.length}</span>
          <span className={`block text-xs font-semibold mt-0.5 ${tab === 'registradas' ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
            Afiliadas al sindicato
          </span>
        </button>
        <button
          onClick={() => setTab('padron')}
          className={`flex-1 sm:flex-none text-left px-5 py-3.5 rounded-xl transition-all cursor-pointer ${
            tab === 'padron' ? 'bg-primary text-primary-foreground shadow-premium' : 'text-foreground hover:bg-white/60'
          }`}
        >
          <span className="block text-sm font-black">Padrón Completo{padronTotal !== null ? ` · ${padronTotal}` : ''}</span>
          <span className={`block text-xs font-semibold mt-0.5 ${tab === 'padron' ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
            Todavía no se afiliaron
          </span>
        </button>
      </div>

      {tab === 'registradas' ? (
        <div className="space-y-6">
          {/* Optional Map Drawer */}
          {showMap && (
            <div className="bg-card border border-border rounded-3xl p-4 shadow-premium glass animate-fadeIn">
              <div className="flex items-center gap-2 mb-3.5 px-2">
                <MapIcon className="w-4.5 h-4.5 text-secondary" />
                <h2 className="text-sm font-bold text-foreground">Mapa de farmacias registradas</h2>
              </div>
              <PharmacyMap
                pharmacies={pharmacies.map((p) => ({
                  id: p.id,
                  name: p.razonSocial,
                  address: p.address,
                  lat: p.lat,
                  lng: p.lng,
                  registered: true,
                  paymentStatus: p.paymentStatus,
                }))}
                selectedPharmacyId={null}
                onMapClick={() => {}}
                onSelectPharmacy={() => {}}
              />
            </div>
          )}

          {/* Search */}
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por nombre o CUIT..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-secondary/50 text-sm transition-all"
            />
          </div>

          {/* Card grid */}
          {filteredRegistradas.length === 0 ? (
            <div className="bg-card border border-dashed border-border rounded-3xl p-10 text-center text-sm text-muted-foreground font-semibold">
              Ninguna farmacia registrada coincide con la búsqueda.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {filteredRegistradas.map((pharmacy) => (
                <div
                  key={pharmacy.id}
                  className="bg-card border border-border rounded-3xl p-6 shadow-premium glass flex flex-col gap-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-lg font-extrabold text-foreground truncate">{pharmacy.razonSocial}</div>
                      <div className="text-xs font-semibold text-muted-foreground font-mono mt-0.5">
                        CUIT {pharmacy.cuit}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`px-3 py-1 rounded-full text-xs font-black whitespace-nowrap ${PAYMENT_STYLE[pharmacy.paymentStatus]}`}>
                        {PAYMENT_LABEL[pharmacy.paymentStatus]}
                      </span>
                      <button
                        onClick={() => handleDeleteRegistered(pharmacy.id, pharmacy.razonSocial)}
                        title="Eliminar"
                        className="p-2 rounded-lg border border-border text-muted-foreground hover:text-red-500 hover:border-red-200 transition-all bg-card"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="text-sm font-semibold text-slate-600">Responsable: {pharmacy.responsible}</div>

                  <div className="flex items-center gap-2.5 bg-muted/40 rounded-xl px-4 py-3">
                    <Users className="w-5 h-5 text-primary flex-shrink-0" />
                    <span className="text-xl font-extrabold text-primary">{pharmacy.employeeCount}</span>
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                      empleado{pharmacy.employeeCount === 1 ? '' : 's'} activo{pharmacy.employeeCount === 1 ? '' : 's'}
                    </span>
                  </div>

                  <div className="flex gap-2 mt-auto">
                    <Link
                      href={`/admin/farmacias/${pharmacy.id}`}
                      className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-border text-foreground text-sm font-bold hover:bg-muted/40 transition-all bg-card"
                    >
                      <Eye className="w-4 h-4" />
                      <span>Ver perfil</span>
                    </Link>
                    {pharmacy.paymentStatus === 'con_deuda' && (
                      <button
                        onClick={() => handleMarkPaidTransition(pharmacy.id, pharmacy.razonSocial)}
                        className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 text-sm font-bold hover:bg-emerald-100 transition-all"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Marcar al día</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-800 text-sm font-semibold leading-relaxed">
            <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>
              Estas son farmacias de Rosario que todavía no se afiliaron a ATFAR: no tienen empleados ni aportes
              cargados. Usá el buscador para ubicar una y, si se afilia, va a aparecer en &quot;Farmacias Registradas&quot;.
            </span>
          </div>

          <div className="relative w-full sm:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar en el padrón por nombre o CUIT (mínimo 2 letras)..."
              value={padronQuery}
              onChange={(e) => setPadronQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-secondary/50 text-sm transition-all"
            />
          </div>

          <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-premium glass">
            {padronQuery.trim().length < 2 ? (
              <div className="p-10 text-center text-sm text-muted-foreground font-semibold">
                Escribí un nombre o CUIT arriba para buscar en el padrón.
              </div>
            ) : padronLoading ? (
              <div className="p-10 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : padronResults.length === 0 ? (
              <div className="p-10 text-center text-sm text-muted-foreground font-semibold">
                No encontramos ninguna farmacia del padrón que coincida con &quot;{padronQuery}&quot;.
              </div>
            ) : (
              <div className="divide-y divide-border/70">
                {padronResults.map((p) => (
                  <div key={p.id} className="flex items-center justify-between gap-4 px-6 py-4">
                    <div className="min-w-0">
                      <div className="text-base font-bold text-foreground truncate">{p.razonSocial}</div>
                      <div className="text-xs font-semibold text-muted-foreground font-mono mt-0.5">
                        CUIT {p.cuit} {isPlaceholderCuit(p.cuit) ? '(sin verificar)' : ''}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Building2 className="w-4 h-4 text-muted-foreground hidden sm:block" />
                      <button
                        onClick={() => handleDeletePadron(p.id, p.razonSocial)}
                        title="Eliminar del padrón"
                        className="p-2.5 rounded-lg border border-border text-muted-foreground hover:text-red-500 hover:border-red-200 transition-all bg-card"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
