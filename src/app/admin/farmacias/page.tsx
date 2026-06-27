'use client';

import { useState } from 'react';
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
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([
    { id: '1', razonSocial: 'Farmacia del Centro S.R.L.', cuit: '30-71122334-9', address: 'San Martin 801', city: 'Rosario', responsible: 'Dr. Lucas Gómez', employeeCount: 14, status: 'activa', lastDeclaration: 'Junio 2026', paymentStatus: 'al_dia', lat: -32.9479, lng: -60.6394 },
    { id: '2', razonSocial: 'Farmacia Belgrano', cuit: '30-68444555-2', address: 'Pellegrini 1420', city: 'Rosario', responsible: 'Dra. María Rossi', employeeCount: 8, status: 'activa', lastDeclaration: 'Junio 2026', paymentStatus: 'al_dia', lat: -32.9567, lng: -60.6548 },
    { id: '3', razonSocial: 'Farmacia Alberdi Coop.', cuit: '30-50443221-5', address: 'Bv. Rondeau 1200', city: 'Rosario', responsible: 'Carlos Fernández', employeeCount: 3, status: 'inactiva', lastDeclaration: 'Mayo 2026', paymentStatus: 'con_deuda', lat: -32.9064, lng: -60.6865 },
    { id: '4', razonSocial: 'Farmacia del Parque', cuit: '30-71888999-4', address: 'Av. Francia 850', city: 'Rosario', responsible: 'Guillermo Benítez', employeeCount: 6, status: 'activa', lastDeclaration: 'Junio 2026', paymentStatus: 'al_dia', lat: -32.9582, lng: -60.6659 },
    { id: '5', razonSocial: 'Farmacia Rosario Norte', cuit: '30-65222333-1', address: 'Corrientes 1572', city: 'Rosario', responsible: 'Patricia Díaz', employeeCount: 5, status: 'activa', lastDeclaration: 'Mayo 2026', paymentStatus: 'con_deuda', lat: -32.9324, lng: -60.6558 },
    { id: '6', razonSocial: 'Farmacia Sur S.A.', cuit: '30-75440220-7', address: 'San Martín 4500', city: 'Rosario', responsible: 'Martín López', employeeCount: 12, status: 'activa', lastDeclaration: 'Junio 2026', paymentStatus: 'al_dia', lat: -32.9892, lng: -60.6402 },
    { id: '7', razonSocial: 'Farmacia Pellegrini Gral.', cuit: '30-58442991-3', address: 'Av. Pellegrini 2300', city: 'Rosario', responsible: 'Ana Benítez', employeeCount: 4, status: 'activa', lastDeclaration: 'Junio 2026', paymentStatus: 'pendiente', lat: -32.9610, lng: -60.6601 },
  ]);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterPayment, setFilterPayment] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [showMap, setShowMap] = useState(false);
  const itemsPerPage = 5;

  // Actions
  const handleDelete = (id: string) => {
    if (confirm('¿Seguro que deseas eliminar este registro de farmacia?')) {
      setPharmacies(prev => prev.filter(p => p.id !== id));
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
              registered: p.paymentStatus !== 'con_deuda'
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
