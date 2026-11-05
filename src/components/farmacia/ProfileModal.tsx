'use client';

import React from 'react';
import { Building2, X } from 'lucide-react';

export interface PharmacyProfileData {
  cuit: string;
  razonSocial: string;
  nombreFantasia: string;
  whatsapp: string;
  actividadEconomica: string;
  initialPeriod: string;
  declaredEmployeeCount: number;
  branches: string;
  notes: string;
  declaredAddresses: string;
  respEmail: string;
  respPhone: string;
  respAltEmail: string;
  hrEmail: string;
  hrPhone: string;
  hrAltEmail: string;
  hrName: string;
  hrRole: string;
}

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profileData: PharmacyProfileData;
  onFieldChange: (field: keyof PharmacyProfileData, value: string | number) => void;
  onSave: (e: React.FormEvent) => void;
  profileTab: 'empresa' | 'contactos';
  setProfileTab: (tab: 'empresa' | 'contactos') => void;
  saving?: boolean;
}

export default function ProfileModal({
  isOpen,
  onClose,
  profileData,
  onFieldChange,
  onSave,
  profileTab,
  setProfileTab,
  saving = false,
}: ProfileModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto py-10 animate-fadeIn">
      <div className="bg-card border border-border rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-premium-lg relative animate-scaleIn max-h-[90vh] overflow-y-auto">
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-xl font-extrabold text-[#0f172a] tracking-tight mb-6 flex items-center gap-2">
          <Building2 className="w-6 h-6 text-primary" />
          <span>Configuración del Perfil de Farmacia</span>
        </h3>

        {/* Tabs control */}
        <div className="flex border-b border-border mb-6 font-bold text-xs uppercase tracking-wider">
          <button
            type="button"
            onClick={() => setProfileTab('empresa')}
            className={`py-3 px-4 border-b-2 transition-all cursor-pointer ${
              profileTab === 'empresa' 
                ? 'border-primary text-primary' 
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            Datos de la Empresa
          </button>
          <button
            type="button"
            onClick={() => setProfileTab('contactos')}
            className={`py-3 px-4 border-b-2 transition-all cursor-pointer ${
              profileTab === 'contactos' 
                ? 'border-primary text-primary' 
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            Responsables y RRHH
          </button>
        </div>

        <form onSubmit={onSave} className="space-y-6">
          {profileTab === 'empresa' ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block uppercase tracking-wider mb-1">CUIT de la Farmacia</label>
                  <input 
                    type="text" 
                    value={profileData.cuit} 
                    onChange={(e) => onFieldChange('cuit', e.target.value)} 
                    className="w-full rounded-xl border border-border px-4 py-2.5 bg-background text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 text-[#0f172a]"
                    required
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700 block uppercase tracking-wider">Período Inicial / Inicio de Actividades</label>
                    <span className="text-[10px] text-slate-400 font-semibold">Opcional / Informativo</span>
                  </div>
                  <input 
                    type="date" 
                    value={profileData.initialPeriod} 
                    onChange={(e) => onFieldChange('initialPeriod', e.target.value)} 
                    className="w-full rounded-xl border border-border px-4 py-2.5 bg-background text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 text-[#0f172a]"
                  />
                  <span className="text-[10px] text-slate-500 font-medium block mt-1 leading-snug">
                    Fecha de inicio de actividad o primer período que declara en el portal. Es un dato registral: <strong>no calcula deuda anterior</strong> ni genera cobros retroactivos.
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block uppercase tracking-wider mb-1">Razón Social</label>
                  <input 
                    type="text" 
                    value={profileData.razonSocial} 
                    onChange={(e) => onFieldChange('razonSocial', e.target.value)} 
                    className="w-full rounded-xl border border-border px-4 py-2.5 bg-background text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 text-[#0f172a]"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block uppercase tracking-wider mb-1">Nombre de Fantasía</label>
                  <input 
                    type="text" 
                    value={profileData.nombreFantasia} 
                    onChange={(e) => onFieldChange('nombreFantasia', e.target.value)} 
                    className="w-full rounded-xl border border-border px-4 py-2.5 bg-background text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 text-[#0f172a]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block uppercase tracking-wider mb-1">WhatsApp Institucional</label>
                  <input 
                    type="text" 
                    value={profileData.whatsapp} 
                    onChange={(e) => onFieldChange('whatsapp', e.target.value)} 
                    placeholder="Ej: +54 9 341 555-1234"
                    className="w-full rounded-xl border border-border px-4 py-2.5 bg-background text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 text-[#0f172a]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block uppercase tracking-wider mb-1">Actividad Económica Principal</label>
                  <input 
                    type="text" 
                    value={profileData.actividadEconomica} 
                    onChange={(e) => onFieldChange('actividadEconomica', e.target.value)} 
                    placeholder="Ej: Venta al por menor de medicamentos"
                    className="w-full rounded-xl border border-border px-4 py-2.5 bg-background text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 text-[#0f172a]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block uppercase tracking-wider mb-1">Direcciones Declaradas (Sedes)</label>
                <input 
                  type="text" 
                  value={profileData.declaredAddresses} 
                  onChange={(e) => onFieldChange('declaredAddresses', e.target.value)} 
                  placeholder="Ej: Sede Central: Córdoba 1500; Sucursal: Pellegrini 2000"
                  className="w-full rounded-xl border border-border px-4 py-2.5 bg-background text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 text-[#0f172a]"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block uppercase tracking-wider mb-1">Sucursales / Filiales</label>
                  <input 
                    type="text" 
                    value={profileData.branches} 
                    onChange={(e) => onFieldChange('branches', e.target.value)} 
                    placeholder="Ej: Rosario Centro, Funes"
                    className="w-full rounded-xl border border-border px-4 py-2.5 bg-background text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 text-[#0f172a]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block uppercase tracking-wider mb-1">Cantidad Estimada Empleados</label>
                  <input 
                    type="number" 
                    value={profileData.declaredEmployeeCount || ''} 
                    onChange={(e) => onFieldChange('declaredEmployeeCount', parseInt(e.target.value, 10) || 0)} 
                    className="w-full rounded-xl border border-border px-4 py-2.5 bg-background text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 text-[#0f172a]"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-muted/40 border border-border/80 rounded-2xl mb-4">
                <span className="text-xs font-black uppercase tracking-wider text-primary block mb-3">Responsable Titular</span>
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Teléfono Principal</label>
                      <input 
                        type="text" 
                        value={profileData.respPhone} 
                        onChange={(e) => onFieldChange('respPhone', e.target.value)} 
                        className="w-full rounded-xl border border-border px-3.5 py-2 bg-background text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 text-[#0f172a]"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Email Principal</label>
                      <input 
                        type="email" 
                        value={profileData.respEmail} 
                        onChange={(e) => onFieldChange('respEmail', e.target.value)} 
                        className="w-full rounded-xl border border-border px-3.5 py-2 bg-background text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 text-[#0f172a]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Email Alternativo</label>
                    <input 
                      type="email" 
                      value={profileData.respAltEmail} 
                      onChange={(e) => onFieldChange('respAltEmail', e.target.value)} 
                      className="w-full rounded-xl border border-border px-3.5 py-2 bg-background text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 text-[#0f172a]"
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 bg-muted/40 border border-border/80 rounded-2xl">
                <span className="text-xs font-black uppercase tracking-wider text-secondary block mb-3">Contacto de Recursos Humanos / Liquidación</span>
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Nombre del Responsable</label>
                      <input 
                        type="text" 
                        value={profileData.hrName} 
                        onChange={(e) => onFieldChange('hrName', e.target.value)} 
                        className="w-full rounded-xl border border-border px-3.5 py-2 bg-background text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 text-[#0f172a]"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Cargo / Rol</label>
                      <input 
                        type="text" 
                        value={profileData.hrRole} 
                        onChange={(e) => onFieldChange('hrRole', e.target.value)} 
                        placeholder="Ej: Contador, Liquidador"
                        className="w-full rounded-xl border border-border px-3.5 py-2 bg-background text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 text-[#0f172a]"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Email de RRHH</label>
                      <input 
                        type="email" 
                        value={profileData.hrEmail} 
                        onChange={(e) => onFieldChange('hrEmail', e.target.value)} 
                        className="w-full rounded-xl border border-border px-3.5 py-2 bg-background text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 text-[#0f172a]"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Teléfono Directo</label>
                      <input 
                        type="text" 
                        value={profileData.hrPhone} 
                        onChange={(e) => onFieldChange('hrPhone', e.target.value)} 
                        className="w-full rounded-xl border border-border px-3.5 py-2 bg-background text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 text-[#0f172a]"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-border flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-border text-slate-700 text-xs font-bold uppercase tracking-wider hover:bg-slate-50 transition-all cursor-pointer bg-white"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider hover:bg-primary/95 transition-all shadow-premium cursor-pointer disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Guardar Perfil'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

