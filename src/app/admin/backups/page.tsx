/* eslint-disable @next/next/no-img-element */
'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Database,
  HardDriveDownload,
  FolderCheck,
  CheckCircle2,
  AlertTriangle,
  Download,
  RefreshCw,
  FileSpreadsheet,
  Upload,
  ShieldCheck,
  Search,
  Users,
  Building2,
  CreditCard,
  Copy,
  Check,
  Sparkles,
  Wifi,
  WifiOff,
  ExternalLink,
  ChevronRight,
  Eye,
  X,
  FileText
} from 'lucide-react';
import { toast } from 'sonner';
import {
  LocalDbSnapshot,
  saveLocalSnapshot,
  loadLocalSnapshot,
  getLocalSnapshotMeta,
  isLocalOperationMode,
  setLocalOperationMode,
  searchLocalPharmacies,
  getLocalPharmacyDetails,
  triggerBrowserFileDownload
} from '@/lib/localDatabase';

export default function AdminBackupsPage() {
  const [loading, setLoading] = useState(false);
  const [snapshot, setSnapshot] = useState<LocalDbSnapshot | null>(null);
  const [meta, setMeta] = useState<ReturnType<typeof getLocalSnapshotMeta>>(null);
  const [isLocalMode, setIsLocalMode] = useState(false);
  const [copiedPath, setCopiedPath] = useState(false);

  // Filtros de búsqueda en visor de contingencia local
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPharmacyId, setSelectedPharmacyId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'operaciones' | 'archivos' | 'restaurar'>('operaciones');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsLocalMode(isLocalOperationMode());
    const m = getLocalSnapshotMeta();
    setMeta(m);

    // Cargar el snapshot local desde IndexedDB al iniciar
    loadLocalSnapshot().then((s) => {
      if (s) {
        setSnapshot(s);
      }
    });

    const handleModeChange = (e: any) => {
      setIsLocalMode(Boolean(e.detail?.isLocal));
    };
    window.addEventListener('atfar:mode-change', handleModeChange);
    return () => window.removeEventListener('atfar:mode-change', handleModeChange);
  }, []);

  // Ejecuta la sincronización en 1 clic
  const handleSyncBackup = async () => {
    setLoading(true);
    const toastId = toast.loading('Extrayendo base completa y volcando en disco local...');

    try {
      const res = await fetch('/api/admin/backups/export', { method: 'POST' });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al generar el respaldo local');
      }

      const receivedSnapshot: LocalDbSnapshot = data.snapshot;

      // 1. Guardar en IndexedDB local
      await saveLocalSnapshot(receivedSnapshot);
      setSnapshot(receivedSnapshot);
      setMeta({
        exportedAt: receivedSnapshot.exportedAt,
        counts: receivedSnapshot.counts,
        windowsPath: data.filePath || data.backupDir,
      });

      // 2. Disparar descarga en el navegador como doble respaldo
      const dateStr = new Date().toISOString().slice(0, 10);
      triggerBrowserFileDownload(
        JSON.stringify(receivedSnapshot, null, 2),
        `backup_atfar_${data.timestamp || dateStr}.json`,
        'application/json'
      );

      toast.success('¡Base de datos blindada en local con éxito!', {
        id: toastId,
        description: data.savedToDisk
          ? `Guardado en: ${data.filePath || data.backupDir}`
          : 'Descargado al navegador y sincronizado en la memoria local.',
        duration: 5000,
      });
    } catch (err: any) {
      console.error('Error en respaldo:', err);
      toast.error('Error al generar respaldo', {
        id: toastId,
        description: err.message || 'No se pudo completar la operación.',
      });
    } finally {
      setLoading(false);
    }
  };

  // Conmuta modo online / local
  const toggleOperationMode = () => {
    const next = !isLocalMode;
    setIsLocalMode(next);
    setLocalOperationMode(next);
    toast.info(
      next
        ? 'Modo Local (Contingencia) ACTIVADO. La app opera 100% sobre la base local.'
        : 'Modo Online ACTIVADO. La app consulta directamente a la nube (Supabase).'
    );
  };

  // Copia la ruta de Windows al portapapeles
  const handleCopyPath = () => {
    const pathText = meta?.windowsPath || snapshot?.windowsPath || 'C:\\Users\\<Usuario>\\Backups_ATFAR';
    navigator.clipboard.writeText(pathText);
    setCopiedPath(true);
    toast.success('Ruta copiada al portapapeles');
    setTimeout(() => setCopiedPath(false), 2000);
  };

  // Carga manual de un archivo JSON de respaldo
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const parsed: LocalDbSnapshot = JSON.parse(text);

        if (!parsed.data || !parsed.counts) {
          throw new Error('El archivo no tiene el formato de respaldo válido de ATFAR.');
        }

        await saveLocalSnapshot(parsed);
        setSnapshot(parsed);
        setMeta({
          exportedAt: parsed.exportedAt,
          counts: parsed.counts,
          windowsPath: parsed.windowsPath,
        });

        toast.success('¡Respaldo importado correctamente!', {
          description: `${parsed.counts.pharmacies} farmacias y ${parsed.counts.employees} empleados listos para operar en local.`,
        });
        setActiveTab('operaciones');
      } catch (err: any) {
        toast.error('Error al importar archivo', {
          description: err.message || 'Archivo JSON corrupto o inválido.',
        });
      }
    };
    reader.readAsText(file);
  };

  // Farmacias filtradas para el visor de contingencia
  const filteredPharmacies = useMemo(() => {
    if (!snapshot) return [];
    return searchLocalPharmacies(snapshot, searchQuery);
  }, [snapshot, searchQuery]);

  // Detalle de farmacia seleccionada
  const selectedPharmacyDetails = useMemo(() => {
    if (!snapshot || !selectedPharmacyId) return null;
    return getLocalPharmacyDetails(snapshot, selectedPharmacyId);
  }, [snapshot, selectedPharmacyId]);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Top Banner de Control y Estado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Copias de Seguridad y Respaldo Local
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 text-[11px] font-bold">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Blindaje Local-First
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 font-medium mt-1">
            Mantené una réplica física exacta de todas las farmacias, empleados y aportes en tu computadora para operar sin conexión ante cortes de red.
          </p>
        </div>

        {/* Switch de Modo Online / Local */}
        <div className="flex items-center gap-3 bg-white border border-slate-200/80 p-1.5 rounded-2xl shadow-xs">
          <button
            onClick={() => isLocalMode && toggleOperationMode()}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              !isLocalMode
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Wifi className="w-3.5 h-3.5" />
            <span>Nube Supabase</span>
          </button>
          <button
            onClick={() => !isLocalMode && toggleOperationMode()}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              isLocalMode
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <WifiOff className="w-3.5 h-3.5" />
            <span>Modo Local (Offline)</span>
          </button>
        </div>
      </div>

      {/* Alerta de Modo Contingencia si está activo */}
      {isLocalMode && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-950 text-xs">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-bold text-amber-900 text-sm">Modo de Contingencia Local Activo</h4>
            <p className="text-amber-800 leading-relaxed font-medium">
              El sistema está trabajando exclusivamente con la base de datos guardada en tu equipo. Podés consultar nóminas, farmacias, escalas y deudas sin internet. Al restablecerse la conexión podés volver a cambiar al modo nube.
            </p>
          </div>
        </div>
      )}

      {/* Hero Bento Grid: Acción Principal y Métricas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Tarjeta Principal de Acción (1 Clic) */}
        <div className="lg:col-span-7 bg-gradient-to-br from-emerald-950 via-teal-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-premium relative overflow-hidden border border-emerald-500/20 flex flex-col justify-between space-y-6">
          <div className="space-y-3 relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-400/15 border border-emerald-400/30 text-emerald-300 text-[10px] font-black uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Respaldo Integral en 1 Clic</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">
              Sincronizar y Blindar Base Local
            </h2>
            <p className="text-xs sm:text-sm text-slate-200/90 leading-relaxed font-medium">
              Vuelca toda la información de la nube directamente a tu carpeta de Windows (en formatos <strong className="text-white">.JSON</strong> y <strong className="text-white">.CSV para Excel</strong>) y actualiza la memoria local del navegador para uso offline inmediato.
            </p>
          </div>

          {/* Carpeta detectada en Windows */}
          <div className="bg-white/10 border border-white/15 rounded-2xl p-4 space-y-1 relative z-10">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
                <FolderCheck className="w-3.5 h-3.5 text-emerald-400" />
                Carpeta Local en Windows
              </span>
              <button
                onClick={handleCopyPath}
                className="inline-flex items-center gap-1 text-[11px] text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                {copiedPath ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedPath ? 'Copiado' : 'Copiar ruta'}</span>
              </button>
            </div>
            <p className="font-mono text-xs text-white truncate">
              {meta?.windowsPath || snapshot?.windowsPath || 'C:\\Users\\<TuUsuario>\\Backups_ATFAR'}
            </p>
          </div>

          {/* Botón de Ejecución */}
          <div className="pt-2 relative z-10 flex flex-col sm:flex-row items-center gap-4">
            <button
              onClick={handleSyncBackup}
              disabled={loading}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-4 rounded-2xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                  <span>Sincronizando Base de Datos...</span>
                </>
              ) : (
                <>
                  <HardDriveDownload className="w-5 h-5 text-slate-950" />
                  <span>Sincronizar y Respaldar Ahora</span>
                </>
              )}
            </button>

            {meta?.exportedAt && (
              <span className="text-[11px] text-slate-300 font-medium">
                Último respaldo: {new Date(meta.exportedAt).toLocaleString('es-AR')}
              </span>
            )}
          </div>
        </div>

        {/* Tarjetas de Métricas de la Base de Datos */}
        <div className="lg:col-span-5 grid grid-cols-2 gap-4">
          <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Farmacias</span>
              <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
                <Building2 className="w-5 h-5" />
              </div>
            </div>
            <div>
              <span className="text-3xl font-black text-slate-900 font-mono">
                {snapshot?.counts.pharmacies ?? (meta?.counts.pharmacies ?? '—')}
              </span>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">En el padrón y registradas</p>
            </div>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nómina</span>
              <div className="p-2 bg-blue-50 text-blue-700 rounded-xl">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <div>
              <span className="text-3xl font-black text-slate-900 font-mono">
                {snapshot?.counts.employees ?? (meta?.counts.employees ?? '—')}
              </span>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">Empleados declarados</p>
            </div>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">DDJJ y Pagos</span>
              <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl">
                <CreditCard className="w-5 h-5" />
              </div>
            </div>
            <div>
              <span className="text-3xl font-black text-slate-900 font-mono">
                {snapshot?.counts.payments ?? (meta?.counts.payments ?? '—')}
              </span>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">Boletas y declaraciones</p>
            </div>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Escalas</span>
              <div className="p-2 bg-purple-50 text-purple-700 rounded-xl">
                <FileText className="w-5 h-5" />
              </div>
            </div>
            <div>
              <span className="text-3xl font-black text-slate-900 font-mono">
                {snapshot?.counts.scales ?? (meta?.counts.scales ?? '—')}
              </span>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">Categorías CCT 659/13</p>
            </div>
          </div>
        </div>
      </div>

      {/* Selector de Pestañas */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('operaciones')}
          className={`px-4 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'operaciones'
              ? 'border-emerald-600 text-emerald-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Centro de Operaciones Local ({snapshot?.data.pharmacies.length || 0} Farmacias)
        </button>
        <button
          onClick={() => setActiveTab('archivos')}
          className={`px-4 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'archivos'
              ? 'border-emerald-600 text-emerald-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Descargar Archivos para Excel
        </button>
        <button
          onClick={() => setActiveTab('restaurar')}
          className={`px-4 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'restaurar'
              ? 'border-emerald-600 text-emerald-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Cargar Respaldo JSON en otra PC
        </button>
      </div>

      {/* CONTENIDO 1: Centro de Operaciones Local (Buscador y Ficha Offline) */}
      {activeTab === 'operaciones' && (
        <div className="space-y-6">
          {!snapshot ? (
            <div className="bg-white border border-dashed border-slate-300 rounded-3xl p-12 text-center space-y-4">
              <Database className="w-12 h-12 text-slate-400 mx-auto" />
              <div className="space-y-1">
                <h3 className="font-bold text-slate-900 text-base">Todavía no tenés la base sincronizada en este navegador</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Hacé clic en &quot;Sincronizar y Respaldar Ahora&quot; para traer todas las farmacias, nóminas y pagos y habilitar el visor local.
                </p>
              </div>
              <button
                onClick={handleSyncBackup}
                disabled={loading}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-sm"
              >
                <HardDriveDownload className="w-4 h-4" />
                <span>Sincronizar Ahora</span>
              </button>
            </div>
          ) : (
            <>
              {/* Buscador ultra rápido */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar en la base local por CUIT, Nombre de Farmacia, Domicilio o Responsable..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white border border-slate-200/80 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-xs"
                />
              </div>

              {/* Grilla de Farmacias en Local */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredPharmacies.slice(0, 30).map((pharm) => {
                  const empCount = (snapshot.data.employees || []).filter(
                    (e) => e.pharmacy_id === pharm.id && e.active !== false
                  ).length;

                  return (
                    <div
                      key={pharm.id}
                      onClick={() => setSelectedPharmacyId(pharm.id)}
                      className="bg-white border border-slate-200/80 hover:border-emerald-500/50 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all cursor-pointer space-y-3 group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="p-2.5 bg-slate-50 text-slate-700 rounded-xl group-hover:bg-emerald-50 group-hover:text-emerald-700 transition-colors">
                          <Building2 className="w-5 h-5" />
                        </div>
                        {pharm.has_debt ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 text-[10px] font-bold">
                            <AlertTriangle className="w-3 h-3" />
                            Con Deuda
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                            <CheckCircle2 className="w-3 h-3" />
                            Al Día
                          </span>
                        )}
                      </div>

                      <div className="space-y-1">
                        <h4 className="font-bold text-slate-900 text-sm leading-snug group-hover:text-emerald-800 transition-colors line-clamp-1">
                          {pharm.nombre_fantasia || pharm.name || pharm.razon_social}
                        </h4>
                        <p className="font-mono text-xs font-semibold text-slate-500">CUIT: {pharm.cuit || 'Sin CUIT'}</p>
                        <p className="text-[11px] text-slate-600 truncate">{pharm.address || pharm.declared_addresses || 'Sin domicilio cargado'}</p>
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
                        <span>{empCount} empleado{empCount === 1 ? '' : 's'}</span>
                        <span className="text-emerald-700 font-bold group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                          Ver ficha <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {filteredPharmacies.length === 0 && (
                <div className="text-center py-12 text-xs text-slate-500 font-medium">
                  No se encontraron farmacias con ese criterio de búsqueda.
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* CONTENIDO 2: Descargar Archivos para Excel */}
      {activeTab === 'archivos' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-50 text-emerald-700 rounded-2xl">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Planilla de Farmacias (.CSV)</h3>
                <p className="text-xs text-slate-500">Compatible con Microsoft Excel, LibreOffice y Google Sheets.</p>
              </div>
            </div>
            <button
              onClick={() => {
                if (!snapshot) return toast.error('Sincronizá la base primero');
                const csv = generateClientCsv(snapshot.data.pharmacies, [
                  { key: 'cuit', label: 'CUIT' },
                  { key: 'nombre_fantasia', label: 'Nombre' },
                  { key: 'razon_social', label: 'Razón Social' },
                  { key: 'address', label: 'Domicilio' },
                  { key: 'has_debt', label: 'Deuda' },
                ]);
                triggerBrowserFileDownload(csv, 'farmacias_atfar.csv', 'text/csv;charset=utf-8;');
              }}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Descargar CSV Farmacias</span>
            </button>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-50 text-blue-700 rounded-2xl">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Nómina de Empleados (.CSV)</h3>
                <p className="text-xs text-slate-500">Nombres, CUILs, categorías, afiliados y sueldos vigentes.</p>
              </div>
            </div>
            <button
              onClick={() => {
                if (!snapshot) return toast.error('Sincronizá la base primero');
                const csv = generateClientCsv(snapshot.data.employees, [
                  { key: 'cuil', label: 'CUIL' },
                  { key: 'full_name', label: 'Nombre' },
                  { key: 'category', label: 'Categoría' },
                  { key: 'is_affiliate', label: 'Afiliado ATFAR' },
                  { key: 'entry_date', label: 'Fecha Ingreso' },
                ]);
                triggerBrowserFileDownload(csv, 'nomina_empleados_atfar.csv', 'text/csv;charset=utf-8;');
              }}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Descargar CSV Nómina</span>
            </button>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-indigo-50 text-indigo-700 rounded-2xl">
                <CreditCard className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Historial de DDJJ y Pagos (.CSV)</h3>
                <p className="text-xs text-slate-500">Boletas, comprobantes, estados de pago y liquidaciones.</p>
              </div>
            </div>
            <button
              onClick={() => {
                if (!snapshot) return toast.error('Sincronizá la base primero');
                const csv = generateClientCsv(snapshot.data.payments, [
                  { key: 'invoice_number', label: 'Nro Boleta' },
                  { key: 'period', label: 'Período' },
                  { key: 'amount', label: 'Monto' },
                  { key: 'status', label: 'Estado' },
                  { key: 'pay_date', label: 'Fecha Pago' },
                ]);
                triggerBrowserFileDownload(csv, 'ddjj_y_pagos_atfar.csv', 'text/csv;charset=utf-8;');
              }}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Descargar CSV Pagos</span>
            </button>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-50 text-purple-700 rounded-2xl">
                <Database className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Respaldo Maestro Completo (.JSON)</h3>
                <p className="text-xs text-slate-500">Toda la base estructurada para restaurar o migrar.</p>
              </div>
            </div>
            <button
              onClick={() => {
                if (!snapshot) return toast.error('Sincronizá la base primero');
                triggerBrowserFileDownload(
                  JSON.stringify(snapshot, null, 2),
                  'backup_maestro_atfar.json',
                  'application/json'
                );
              }}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-sm"
            >
              <Download className="w-4 h-4" />
              <span>Descargar JSON Maestro</span>
            </button>
          </div>
        </div>
      )}

      {/* CONTENIDO 3: Restaurar o Cargar Respaldo */}
      {activeTab === 'restaurar' && (
        <div className="bg-white border border-slate-200/80 rounded-3xl p-8 shadow-xs max-w-2xl mx-auto space-y-6 text-center">
          <div className="p-4 bg-emerald-50 text-emerald-700 rounded-3xl w-16 h-16 mx-auto flex items-center justify-center">
            <Upload className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h3 className="font-black text-xl text-slate-900">Cargar Respaldo JSON en esta PC</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              Si estás en otra máquina o sin internet, seleccioná el archivo <strong className="text-slate-800">backup_atfar_...json</strong> generado previamente para levantar inmediatamente la base de datos completa.
            </p>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".json"
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>Seleccionar Archivo de Respaldo (.json)</span>
          </button>
        </div>
      )}

      {/* MODAL / DRAWER: Ficha Completa de Farmacia en Local */}
      {selectedPharmacyDetails && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 sm:p-8 space-y-6">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full">
                  Ficha Local (Modo Contingencia)
                </span>
                <h3 className="text-xl font-black text-slate-900 mt-2">
                  {selectedPharmacyDetails.pharmacy.nombre_fantasia || selectedPharmacyDetails.pharmacy.name}
                </h3>
                <p className="font-mono text-xs text-slate-500 font-bold mt-0.5">
                  CUIT: {selectedPharmacyDetails.pharmacy.cuit || 'Sin CUIT'}
                </p>
              </div>
              <button
                onClick={() => setSelectedPharmacyId(null)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Datos Comerciales */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 bg-slate-50 rounded-2xl space-y-1">
                <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Razón Social</span>
                <p className="font-bold text-slate-800">{selectedPharmacyDetails.pharmacy.razon_social || '—'}</p>
              </div>
              <div className="p-3.5 bg-slate-50 rounded-2xl space-y-1">
                <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Domicilio Declarado</span>
                <p className="font-bold text-slate-800">{selectedPharmacyDetails.pharmacy.address || selectedPharmacyDetails.pharmacy.declared_addresses || '—'}</p>
              </div>
              <div className="p-3.5 bg-slate-50 rounded-2xl space-y-1">
                <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Teléfono / WhatsApp</span>
                <p className="font-bold text-slate-800">{selectedPharmacyDetails.pharmacy.phone_alt || selectedPharmacyDetails.pharmacy.whatsapp || '—'}</p>
              </div>
              <div className="p-3.5 bg-slate-50 rounded-2xl space-y-1">
                <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Estado Gremial</span>
                <p className="font-bold">
                  {selectedPharmacyDetails.pharmacy.has_debt ? (
                    <span className="text-red-700">Con Deuda Pendiente</span>
                  ) : (
                    <span className="text-emerald-700">Al Día</span>
                  )}
                </p>
              </div>
            </div>

            {/* Nómina de Empleados */}
            <div className="space-y-3">
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-700" />
                Nómina de Empleados Declarada ({selectedPharmacyDetails.employees.length})
              </h4>
              {selectedPharmacyDetails.employees.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No hay empleados registrados en nómina para esta farmacia.</p>
              ) : (
                <div className="border border-slate-200/80 rounded-2xl overflow-hidden divide-y divide-slate-100">
                  {selectedPharmacyDetails.employees.map((emp) => (
                    <div key={emp.id} className="p-3 bg-white flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-slate-900 block">{emp.full_name || emp.fullName}</span>
                        <span className="font-mono text-[11px] text-slate-500">CUIL: {emp.cuil}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-semibold text-slate-700 block">{emp.category}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                          emp.is_affiliate || emp.isAffiliate
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {emp.is_affiliate || emp.isAffiliate ? 'Afiliado ATFAR' : 'No Afiliado'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Historial de Pagos y Boletas */}
            <div className="space-y-3">
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-700" />
                Historial de Boletas y Declaraciones ({selectedPharmacyDetails.payments.length})
              </h4>
              {selectedPharmacyDetails.payments.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No hay registros de pagos previos.</p>
              ) : (
                <div className="border border-slate-200/80 rounded-2xl overflow-hidden divide-y divide-slate-100 max-h-48 overflow-y-auto">
                  {selectedPharmacyDetails.payments.map((pay) => (
                    <div key={pay.id} className="p-3 bg-white flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-slate-800 block">Período {pay.period}</span>
                        <span className="text-[11px] text-slate-500">Boleta: {pay.invoice_number || 'S/N'}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-slate-900 block">
                          ${Number(pay.amount || 0).toLocaleString('es-AR')}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                          pay.status === 'pagado'
                            ? 'bg-emerald-50 text-emerald-700'
                            : pay.status === 'impago'
                            ? 'bg-red-50 text-red-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}>
                          {pay.status === 'pagado' ? 'Pagado' : pay.status === 'impago' ? 'Impago' : 'En Revisión'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedPharmacyId(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold uppercase tracking-wider hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cerrar Ficha
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper cliente para generar CSV rápido
function generateClientCsv(rows: Record<string, unknown>[], columns: { key: string; label: string }[]): string {
  const header = columns.map((c) => `"${c.label.replace(/"/g, '""')}"`).join(';');
  const lines = rows.map((row) =>
    columns
      .map((c) => {
        const val = row[c.key];
        if (val === null || val === undefined) return '""';
        if (typeof val === 'boolean') return val ? '"SÍ"' : '"NO"';
        const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
        return `"${str.replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`;
      })
      .join(';')
  );
  return '\uFEFF' + [header, ...lines].join('\r\n');
}
