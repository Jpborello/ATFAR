'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { 
  Building2, 
  Search, 
  Plus, 
  MapPin, 
  Map, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle,
  Eye,
  Trash2,
  ChevronDown,
  ArrowUpDown,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  Filter,
  Loader2
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

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

interface Pharmacy {
  id: string;
  razonSocial: string;
  cuit: string;
  address: string;
  city: string;
  responsible: string;
  employeeCount: number;
  status: 'activa' | 'inactiva';
  lastDeclaration: string;
  paymentStatus: 'al_dia' | 'con_deuda' | 'pendiente';
  lat: number;
  lng: number;
}

export default function FarmaciasPanelPage() {
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPharmacies() {
      try {
        let allPharmacies: any[] = [];
        let from = 0;
        let to = 999;
        let hasMore = true;

        while (hasMore) {
          const { data, error } = await supabase
            .from('pharmacies')
            .select(`
              id,
              name,
              cuit,
              address,
              latitude,
              longitude,
              registered,
              has_debt,
              owner_id,
              profiles:owner_id (full_name),
              payments(status)
            `)
            .range(from, to);

          if (error) throw error;

          if (data && data.length > 0) {
            allPharmacies = [...allPharmacies, ...data];
            from += 1000;
            to += 1000;
            if (data.length < 1000) {
              hasMore = false;
            }
          } else {
            hasMore = false;
          }
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mapped = allPharmacies.map((p: any) => {
          let pStatus: 'al_dia' | 'con_deuda' | 'pendiente' = 'al_dia';
          
          if (p.registered) {
            const hasImpago = p.payments?.some((pay: any) => pay.status === 'impago' || pay.status === 'unpaid');
            const hasEnRevision = p.payments?.some((pay: any) => pay.status === 'en_revision' || pay.status === 'pending');
            
            if (p.has_debt || hasImpago) {
              pStatus = 'con_deuda';
            } else if (hasEnRevision) {
              pStatus = 'pendiente';
            } else {
              pStatus = 'al_dia';
            }
          } else {
            pStatus = 'pendiente'; // For unregistered
          }

          return {
            id: p.id,
            razonSocial: p.name,
            cuit: p.cuit,
            address: p.address,
            city: 'Rosario',
            responsible: p.profiles?.full_name || 'Sin Responsable',
            employeeCount: 0,
            status: p.registered ? ('activa' as const) : ('inactiva' as const),
            lastDeclaration: '-',
            paymentStatus: pStatus,
            lat: p.latitude || -32.9511,
            lng: p.longitude || -60.6663
          };
        });
        setPharmacies(mapped);
      } catch (err) {
        console.error("Error loading pharmacies from Supabase:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchPharmacies();
  }, []);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterPayment, setFilterPayment] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [showMap, setShowMap] = useState(false);
  const itemsPerPage = 5;

  // Actions
  const handleDelete = async (id: string) => {
    if (confirm('¿Seguro que deseas eliminar este registro de farmacia?')) {
      try {
        const { error } = await supabase
          .from('pharmacies')
          .delete()
          .eq('id', id);
        if (error) throw error;
        setPharmacies(prev => prev.filter(p => p.id !== id));
      } catch (err) {
        console.error("Error deleting pharmacy:", err);
      }
    }
  };

  // Toggle sorting
  const handleSort = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  // Filtering & Sorting logic
  const processedPharmacies = pharmacies
    .filter(p => {
      const matchesSearch = p.razonSocial.toLowerCase().includes(searchQuery.toLowerCase()) || p.cuit.includes(searchQuery);
      const matchesPayment = filterPayment === 'all' || p.paymentStatus === filterPayment;
      return matchesSearch && matchesPayment;
    })
    .sort((a, b) => {
      if (sortOrder === 'asc') {
        return a.razonSocial.localeCompare(b.razonSocial);
      } else {
        return b.razonSocial.localeCompare(a.razonSocial);
      }
    });

  // Pagination calculations
  const totalItems = processedPharmacies.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const paginatedPharmacies = processedPharmacies.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
            Nómina de Farmacias
          </h1>
          <p className="text-xs font-semibold text-muted-foreground">
            Gestión comercial de locales adheridos y control de liquidación de aportes mensuales.
          </p>
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={() => setShowMap(!showMap)}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-border text-foreground text-xs font-bold uppercase tracking-wider hover:bg-muted/40 transition-all bg-card"
          >
            <Map className="w-4 h-4 text-secondary" />
            <span>{showMap ? 'Ocultar Mapa' : 'Ver Mapa'}</span>
          </button>
          <button
            onClick={() => alert('Simulando exportación a Excel...')}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-border text-foreground text-xs font-bold uppercase tracking-wider hover:bg-muted/40 transition-all bg-card"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
            <span>Exportar</span>
          </button>
        </div>
      </div>

      {/* Optional Map Drawer */}
      {showMap && (
        <div className="bg-card border border-border rounded-3xl p-4 shadow-premium glass animate-fadeIn">
          <div className="flex items-center gap-2 mb-3.5 px-2">
            <Map className="w-4.5 h-4.5 text-secondary" />
            <h2 className="text-sm font-bold text-foreground">Mapa de control territorial (Rosario)</h2>
          </div>
          <PharmacyMap
            pharmacies={pharmacies.map(p => ({
              id: p.id,
              name: p.razonSocial,
              address: p.address || p.city,
              lat: p.lat,
              lng: p.lng,
              registered: p.status === 'activa',
              paymentStatus: p.paymentStatus
            }))}
            selectedPharmacyId={null}
            onMapClick={() => {}}
            onSelectPharmacy={() => {}}
          />
        </div>
      )}

      {/* Advanced Filters Toolbar */}
      <div className="bg-card border border-border rounded-2xl p-4 shadow-premium glass flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          {/* Search bar */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por Razón Social o CUIT..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-secondary/50 text-xs transition-all"
            />
          </div>

          {/* Payment Filter */}
          <div className="relative w-full sm:w-44 flex items-center">
            <Filter className="absolute left-3 w-3.5 h-3.5 text-muted-foreground" />
            <select
              value={filterPayment}
              onChange={(e) => {
                setFilterPayment(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-secondary/50 text-xs transition-all"
            >
              <option value="all">Todos los pagos</option>
              <option value="al_dia">Al Día (Correcto)</option>
              <option value="con_deuda">Con Deuda (Aviso)</option>
              <option value="pendiente">Pendientes</option>
            </select>
          </div>
        </div>

        {/* Sorting trigger */}
        <button
          onClick={handleSort}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl border border-border text-xs font-bold text-muted-foreground hover:text-foreground bg-card hover:bg-muted/30 transition-all"
        >
          <ArrowUpDown className="w-3.5 h-3.5" />
          <span>Orden: {sortOrder === 'asc' ? 'A-Z' : 'Z-A'}</span>
        </button>
      </div>

      {/* Modern Table Card */}
      <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-premium glass">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/30 font-bold text-muted-foreground uppercase tracking-wider">
                <th className="py-4 px-6">Razón Social</th>
                <th className="py-4 px-4">CUIT</th>
                <th className="py-4 px-4">Ciudad</th>
                <th className="py-4 px-4">Responsable</th>
                <th className="py-4 px-4 text-center">Empleados</th>
                <th className="py-4 px-4 text-center">Estado</th>
                <th className="py-4 px-4">Última Declaración</th>
                <th className="py-4 px-4 text-center">Pago</th>
                <th className="py-4 px-6 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 font-semibold text-foreground">
              {paginatedPharmacies.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-xs text-muted-foreground">
                    Ninguna farmacia registrada coincide con los filtros aplicados.
                  </td>
                </tr>
              ) : (
                paginatedPharmacies.map((pharmacy) => (
                  <tr key={pharmacy.id} className="hover:bg-muted/10 transition-colors">
                    <td className="py-4 px-6 font-bold text-primary">{pharmacy.razonSocial}</td>
                    <td className="py-4 px-4 font-mono text-muted-foreground">{pharmacy.cuit}</td>
                    <td className="py-4 px-4 text-muted-foreground">{pharmacy.city}</td>
                    <td className="py-4 px-4 text-muted-foreground">{pharmacy.responsible}</td>
                    <td className="py-4 px-4 text-center font-bold">{pharmacy.employeeCount}</td>
                    <td className="py-4 px-4 text-center">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase ${
                        pharmacy.status === 'activa'
                          ? 'bg-emerald-500/10 text-emerald-600'
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        {pharmacy.status}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-muted-foreground">{pharmacy.lastDeclaration}</td>
                    <td className="py-4 px-4 text-center">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase ${
                        pharmacy.paymentStatus === 'al_dia'
                          ? 'bg-emerald-500/10 text-emerald-600'
                          : pharmacy.paymentStatus === 'pendiente'
                          ? 'bg-amber-500/10 text-amber-600'
                          : 'bg-red-500/10 text-red-600'
                      }`}>
                        {pharmacy.paymentStatus === 'al_dia' ? 'Al Día' : pharmacy.paymentStatus === 'pendiente' ? 'Pendiente' : 'Con Deuda'}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Link
                          href={`/admin/farmacias/${pharmacy.id}`}
                          className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-primary hover:border-primary/20 transition-all bg-card shadow-sm"
                          title="Ver Perfil"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Link>
                        <button
                          onClick={() => handleDelete(pharmacy.id)}
                          className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-red-500 hover:border-red-200 transition-all bg-card shadow-sm"
                          title="Eliminar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Toolbar */}
        {totalPages > 1 && (
          <div className="border-t border-border/80 px-6 py-4 flex items-center justify-between text-xs text-muted-foreground bg-muted/10 font-medium">
            <span>
              Mostrando página {currentPage} de {totalPages} ({totalItems} farmacias en total)
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                className="p-1.5 rounded-lg border border-border bg-card text-foreground disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted/40 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                className="p-1.5 rounded-lg border border-border bg-card text-foreground disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted/40 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
