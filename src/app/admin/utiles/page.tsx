'use client';

import { useState, useEffect } from 'react';
import { 
  GraduationCap, 
  Search, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Eye, 
  Loader2, 
  FileText, 
  ExternalLink
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface BenefitRequest {
  id: string;
  benefit_type: string;
  status: 'pending' | 'approved' | 'rejected';
  attachment_url: string;
  metadata: {
    affiliate_name: string;
    affiliate_cuil: string;
    affiliate_email: string;
    affiliate_phone: string;
    children: Array<{
      fullName: string;
      age: string;
      schoolLevel: string;
    }>;
  };
  created_at: string;
}

export default function AdminUtilesPage() {
  const [requests, setRequests] = useState<BenefitRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedRequest, setSelectedRequest] = useState<BenefitRequest | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRequests() {
      try {
        const { data, error } = await supabase
          .from('benefit_requests')
          .select('*')
          .eq('benefit_type', 'utiles_escolares_2026')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setRequests(data || []);
      } catch (err) {
        console.error('Error loading benefit requests:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchRequests();
  }, []);

  const handleUpdateStatus = async (id: string, newStatus: 'approved' | 'rejected' | 'pending') => {
    setActionLoading(id);
    try {
      const { error } = await supabase
        .from('benefit_requests')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;
      setRequests(prev => prev.map(req => req.id === id ? { ...req, status: newStatus } : req));
      if (selectedRequest?.id === id) {
        setSelectedRequest(prev => prev ? { ...prev, status: newStatus } : null);
      }
    } catch (err) {
      console.error('Error updating request status:', err);
      alert('Ocurrió un error al actualizar el estado.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id: string, attachmentUrl: string) => {
    if (!confirm('¿Seguro que deseas eliminar esta solicitud permanentemente?')) return;
    setActionLoading(id);
    try {
      const { error } = await supabase
        .from('benefit_requests')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Try deleting the attachment from storage if present
      if (attachmentUrl) {
        try {
          const urlParts = attachmentUrl.split('/receipts/');
          if (urlParts.length > 1) {
            const filePath = decodeURIComponent(urlParts[1]);
            await supabase.storage.from('receipts').remove([filePath]);
          }
        } catch (storeErr) {
          console.error('Error deleting file from storage:', storeErr);
        }
      }

      setRequests(prev => prev.filter(req => req.id !== id));
      setIsModalOpen(false);
      setSelectedRequest(null);
    } catch (err) {
      console.error('Error deleting benefit request:', err);
      alert('Ocurrió un error al eliminar el registro.');
    } finally {
      setActionLoading(null);
    }
  };

  // Stats calculation
  const totalCount = requests.length;
  const pendingCount = requests.filter(r => r.status === 'pending').length;
  const approvedCount = requests.filter(r => r.status === 'approved').length;
  const rejectedCount = requests.filter(r => r.status === 'rejected').length;

  const filteredRequests = requests.filter(req => {
    const name = req.metadata?.affiliate_name || '';
    const cuil = req.metadata?.affiliate_cuil || '';
    const email = req.metadata?.affiliate_email || '';
    const phone = req.metadata?.affiliate_phone || '';
    
    const matchesSearch = 
      name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cuil.includes(searchQuery) ||
      email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      phone.includes(searchQuery);

    const matchesStatus = filterStatus === 'all' || req.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
            Solicitudes de Útiles Escolares
          </h1>
          <p className="text-xs font-semibold text-muted-foreground">
            Gestión y auditoría de kits escolares anuales y mochilas para hijos de afiliados.
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border/80 rounded-2xl p-4.5 space-y-2 shadow-sm">
          <span className="text-[10px] font-bold text-muted-foreground uppercase block font-sans">Total Recibidas</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-foreground">{totalCount}</span>
            <span className="p-1.5 rounded-lg bg-primary/5 text-primary border border-primary/10">
              <GraduationCap className="w-4 h-4" />
            </span>
          </div>
        </div>

        <div className="bg-card border border-border/80 rounded-2xl p-4.5 space-y-2 shadow-sm">
          <span className="text-[10px] font-bold text-muted-foreground uppercase block font-sans">Pendientes</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-foreground">{pendingCount}</span>
            <span className="p-1.5 rounded-lg bg-amber-500/5 text-amber-500 border border-amber-500/10">
              <Clock className="w-4 h-4" />
            </span>
          </div>
        </div>

        <div className="bg-card border border-border/80 rounded-2xl p-4.5 space-y-2 shadow-sm">
          <span className="text-[10px] font-bold text-muted-foreground uppercase block font-sans">Aprobadas</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-foreground">{approvedCount}</span>
            <span className="p-1.5 rounded-lg bg-emerald-500/5 text-emerald-500 border border-emerald-500/10">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
        </div>

        <div className="bg-card border border-border/80 rounded-2xl p-4.5 space-y-2 shadow-sm">
          <span className="text-[10px] font-bold text-muted-foreground uppercase block font-sans">Rechazadas</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-foreground">{rejectedCount}</span>
            <span className="p-1.5 rounded-lg bg-red-500/5 text-red-500 border border-red-500/10">
              <XCircle className="w-4 h-4" />
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-card border border-border/80 rounded-3xl p-4 shadow-sm flex flex-col md:flex-row items-center gap-4">
        <div className="relative w-full md:flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por afiliado, CUIL, email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/55 text-xs font-semibold"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <span className="text-xs font-bold text-muted-foreground whitespace-nowrap hidden sm:inline">Estado:</span>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full md:w-auto px-4 py-2.5 rounded-2xl border border-border bg-background focus:outline-none text-xs font-bold text-foreground"
          >
            <option value="all">Todos los Estados</option>
            <option value="pending">Pendiente</option>
            <option value="approved">Aprobado</option>
            <option value="rejected">Rechazado</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border/80 rounded-3xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="h-64 flex flex-col items-center justify-center text-xs text-muted-foreground font-semibold gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span>Cargando solicitudes...</span>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-xs text-muted-foreground font-semibold">
            No hay solicitudes que coincidan con la búsqueda.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs font-semibold">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-muted-foreground text-[10px] uppercase font-sans font-bold">
                  <th className="py-4 px-6">Afiliado</th>
                  <th className="py-4 px-6">Contacto</th>
                  <th className="py-4 px-6 text-center">Hijos</th>
                  <th className="py-4 px-6">Fecha Presentación</th>
                  <th className="py-4 px-6">Estado</th>
                  <th className="py-4 px-6 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-foreground">
                {filteredRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-muted/10 transition-colors">
                    <td className="py-4.5 px-6">
                      <span className="font-extrabold text-foreground block">
                        {req.metadata?.affiliate_name || 'Sin Nombre'}
                      </span>
                      <span className="text-[10px] text-muted-foreground block font-sans">
                        CUIL: {req.metadata?.affiliate_cuil || '---'}
                      </span>
                    </td>
                    <td className="py-4.5 px-6">
                      <span className="block">{req.metadata?.affiliate_email || '---'}</span>
                      <span className="text-[10px] text-muted-foreground block">
                        Tel: {req.metadata?.affiliate_phone || '---'}
                      </span>
                    </td>
                    <td className="py-4.5 px-6 text-center">
                      <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-bold">
                        {req.metadata?.children?.length || 0}
                      </span>
                    </td>
                    <td className="py-4.5 px-6">
                      <span className="text-muted-foreground font-sans">
                        {new Date(req.created_at).toLocaleDateString('es-AR')}
                      </span>
                    </td>
                    <td className="py-4.5 px-6">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                        req.status === 'approved'
                          ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                          : req.status === 'rejected'
                          ? 'bg-red-500/10 text-red-600 border-red-500/20'
                          : 'bg-amber-500/10 text-amber-600 border-amber-500/20 animate-pulse'
                      }`}>
                        {req.status === 'approved' ? 'Aprobada' : req.status === 'rejected' ? 'Rechazada' : 'Pendiente'}
                      </span>
                    </td>
                    <td className="py-4.5 px-6 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedRequest(req);
                            setIsModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg border border-border text-foreground hover:bg-muted/40 transition-all"
                          title="Ver detalle de la solicitud"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(req.id, req.attachment_url)}
                          disabled={actionLoading === req.id}
                          className="p-1.5 rounded-lg border border-border text-red-500 hover:bg-red-500/10 hover:border-red-500/20 transition-all"
                          title="Eliminar solicitud"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {isModalOpen && selectedRequest && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-card border border-border rounded-3xl max-w-lg w-full overflow-hidden shadow-premium relative animate-scaleIn flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-foreground tracking-tight">Detalle de Solicitud</h3>
                <p className="text-[10px] text-muted-foreground font-semibold">
                  Presentada el {new Date(selectedRequest.created_at).toLocaleDateString('es-AR')} a las {new Date(selectedRequest.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-xs text-muted-foreground hover:text-foreground font-bold cursor-pointer bg-transparent border-0"
              >
                Cerrar
              </button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto flex-1 text-left">
              {/* Affiliate Profile */}
              <div className="bg-muted/20 border border-border/60 rounded-2xl p-4 space-y-3">
                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest block">Datos del Afiliado</span>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Nombre y Apellido</span>
                    <span className="text-xs font-bold text-foreground block">{selectedRequest.metadata?.affiliate_name}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block">CUIL</span>
                    <span className="text-xs font-bold text-foreground block font-sans">{selectedRequest.metadata?.affiliate_cuil}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Email</span>
                    <span className="text-xs font-bold text-foreground block">{selectedRequest.metadata?.affiliate_email}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Teléfono</span>
                    <span className="text-xs font-bold text-foreground block font-sans">{selectedRequest.metadata?.affiliate_phone}</span>
                  </div>
                </div>
              </div>

              {/* Children List */}
              <div className="space-y-3">
                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest block">Hijos Declarados ({selectedRequest.metadata?.children?.length || 0})</span>
                <div className="space-y-2">
                  {selectedRequest.metadata?.children?.map((child, idx) => (
                    <div 
                      key={idx}
                      className="flex items-center justify-between border border-border/80 rounded-xl p-3 bg-card hover:bg-muted/10 transition-colors"
                    >
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-foreground block">{child.fullName}</span>
                        <span className="text-[10px] text-muted-foreground block font-sans">{child.age} años</span>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-[9px] font-extrabold uppercase tracking-wide">
                        {child.schoolLevel}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Salary Receipt / Attachment */}
              <div className="space-y-2">
                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest block">Recibo de Sueldo Adjunto</span>
                {selectedRequest.attachment_url ? (
                  <div className="flex items-center justify-between border border-border/85 rounded-xl p-3 bg-muted/20">
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-red-500" />
                      <span className="text-xs font-semibold truncate max-w-[180px]">Recibo_Sueldo_Verificacion</span>
                    </div>
                    <a
                      href={selectedRequest.attachment_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-card border border-border text-[10px] font-bold hover:bg-primary hover:text-white transition-all shadow-sm"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Ver Recibo</span>
                    </a>
                  </div>
                ) : (
                  <span className="text-xs text-red-500 block">No se adjuntó ningún recibo de sueldo.</span>
                )}
              </div>
            </div>

            {/* Actions Footer */}
            <div className="p-6 border-t border-border bg-muted/30 flex items-center justify-end gap-2">
              {selectedRequest.status === 'pending' ? (
                <>
                  <button
                    onClick={() => handleUpdateStatus(selectedRequest.id, 'rejected')}
                    disabled={actionLoading === selectedRequest.id}
                    className="px-4 py-2.5 rounded-xl border border-border text-red-600 bg-card hover:bg-red-500/5 hover:border-red-500/20 text-xs font-extrabold uppercase tracking-wide transition-all shadow-sm disabled:opacity-50"
                  >
                    Rechazar
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(selectedRequest.id, 'approved')}
                    disabled={actionLoading === selectedRequest.id}
                    className="px-4 py-2.5 rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 text-xs font-extrabold uppercase tracking-wide transition-all shadow-md disabled:opacity-50"
                  >
                    Aprobar Solicitud
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-2 text-xs font-bold col-span-2">
                  <span className="text-muted-foreground">Estado:</span>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    selectedRequest.status === 'approved' 
                      ? 'bg-emerald-500/10 text-emerald-600'
                      : 'bg-red-500/10 text-red-600'
                  }`}>
                    {selectedRequest.status === 'approved' ? 'Aprobada' : 'Rechazada'}
                  </span>
                  
                  {/* Option to change decision */}
                  <button
                    onClick={() => handleUpdateStatus(selectedRequest.id, 'pending')}
                    disabled={actionLoading === selectedRequest.id}
                    className="ml-2 text-[10px] text-primary hover:underline bg-transparent border-0 cursor-pointer"
                  >
                    Reabrir auditoría
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
