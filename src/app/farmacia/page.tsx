/* eslint-disable @next/next/no-img-element */
'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Building2,
  Plus,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  LogOut,
  Loader2,
  Search,
  X,
  HelpCircle,
  Users,
  ArrowRightLeft,
  Sparkles,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import SupportContact from '@/components/shared/SupportContact';
import { Pharmacy } from '@/types';
import { getPharmacyDebtStatus } from '@/lib/dateUtils';

type PharmacyWithPayments = Pharmacy & { payments?: { status: string; due_date: string }[] };

interface MembershipRow {
  pharmacy_id: string;
  pharmacies: PharmacyWithPayments;
}

function MisFarmaciasContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const forceManage = searchParams.get('manage') === '1';
  const [loading, setLoading] = useState(true);
  const [pharmacies, setPharmacies] = useState<PharmacyWithPayments[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  // "Vincular otra farmacia" modal state
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [linkStep, setLinkStep] = useState<'search' | 'confirm' | 'new'>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ id: string; name: string; address: string; cuit: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const [linking, setLinking] = useState(false);

  const [form, setForm] = useState({ id: '', name: '', razonSocial: '', cuit: '', address: '' });
  const cuitDigitsRegex = /^\d{11}$/;

  // Mini guía "¿Cómo funciona esta pantalla?"
  const [showGuide, setShowGuide] = useState(false);
  const [guideStep, setGuideStep] = useState(1);

  const openGuide = () => {
    setGuideStep(1);
    setShowGuide(true);
  };

  // Cambiar contraseña (usuaria ya logueada)
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const openPasswordModal = () => {
    setNewPassword('');
    setNewPasswordConfirm('');
    setPasswordError('');
    setIsPasswordModalOpen(true);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');

    if (newPassword.length < 6) {
      setPasswordError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (newPassword !== newPasswordConfirm) {
      setPasswordError('Las contraseñas no coinciden.');
      return;
    }

    setPasswordSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw new Error(error.message);
      toast.success('Contraseña actualizada correctamente.');
      setIsPasswordModalOpen(false);
    } catch (err: unknown) {
      setPasswordError(err instanceof Error ? err.message : 'Error al actualizar la contraseña.');
    } finally {
      setPasswordSaving(false);
    }
  };

  const loadPharmacies = useCallback(async () => {
    try {
      const isConfigured =
        process.env.NEXT_PUBLIC_SUPABASE_URL !== 'your_supabase_project_url_here' &&
        !!process.env.NEXT_PUBLIC_SUPABASE_URL;

      if (!isConfigured) {
        // Simulation fallback (sin Supabase configurado)
        setPharmacies([
          { id: 'mock-1', name: 'Farmacia de Prueba Sol', nombre_fantasia: 'Farmacia de Prueba Sol', cuit: '30-12345678-9', address: 'Av. Pellegrini 1500, Rosario', declared_addresses: 'Av. Pellegrini 1500, Rosario', has_debt: false },
          { id: 'mock-2', name: 'Farmacia de Prueba Luna', nombre_fantasia: 'Farmacia de Prueba Luna', cuit: '30-98765432-1', address: 'Bv. Oroño 850, Rosario', declared_addresses: 'Bv. Oroño 850, Rosario', has_debt: true },
        ]);
        if (!localStorage.getItem('seen_mis_farmacias_guide')) {
          setGuideStep(1);
          setShowGuide(true);
          localStorage.setItem('seen_mis_farmacias_guide', 'true');
        }
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        window.location.href = '/login';
        return;
      }
      setUserId(session.user.id);

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (profile?.role !== 'pharmacy_owner' && profile?.role !== 'admin') {
        window.location.href = '/login';
        return;
      }

      const { data: memberships, error } = await supabase
        .from('pharmacy_members')
        .select('pharmacy_id, pharmacies(*, payments(status, due_date))')
        .eq('user_id', session.user.id);

      if (error) throw error;

      const rows = (memberships || []) as unknown as MembershipRow[];
      const list = rows.map((r) => r.pharmacies).filter(Boolean);

      if (list.length === 1 && !forceManage) {
        router.replace(`/farmacia/${list[0].id}`);
        return;
      }

      setPharmacies(list);

      const alreadySeenGuide = localStorage.getItem('seen_mis_farmacias_guide');
      if (!alreadySeenGuide) {
        setGuideStep(1);
        setShowGuide(true);
        localStorage.setItem('seen_mis_farmacias_guide', 'true');
      }
    } catch (err) {
      console.error('Error loading memberships:', err);
      toast.error('No pudimos cargar tus farmacias.', {
        description: 'Revisá tu conexión y volvé a intentarlo recargando la página.',
      });
    } finally {
      setLoading(false);
    }
  }, [router, forceManage]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadPharmacies();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadPharmacies]);

  // Search unclaimed pharmacies in the pre-loaded directory
  useEffect(() => {
    if (!isLinkModalOpen || linkStep !== 'search' || searchQuery.trim().length < 3) {
      const timer = setTimeout(() => {
        setSearchResults([]);
      }, 0);
      return () => clearTimeout(timer);
    }

    const delayDebounceFn = setTimeout(async () => {
      setSearching(true);
      try {
        const { data, error } = await supabase
          .from('pharmacies')
          .select('id, name, address, cuit')
          .eq('registered', false)
          .or(`name.ilike.%${searchQuery}%,cuit.ilike.%${searchQuery}%`)
          .limit(10);

        if (!error && data) {
          setSearchResults(data);
        }
      } catch (err) {
        console.error('Error searching pharmacies:', err);
      } finally {
        setSearching(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, isLinkModalOpen, linkStep]);

  const openLinkModal = () => {
    setLinkStep('search');
    setSearchQuery('');
    setSearchResults([]);
    setForm({ id: '', name: '', razonSocial: '', cuit: '', address: '' });
    setIsLinkModalOpen(true);
  };

  const selectResult = (pharm: { id: string; name: string; address: string; cuit: string }) => {
    setForm({
      id: pharm.id,
      name: pharm.name || '',
      razonSocial: '',
      cuit: pharm.cuit && !pharm.cuit.startsWith('99-') ? pharm.cuit : '',
      address: pharm.address || '',
    });
    setLinkStep('confirm');
  };

  const startNewPharmacy = () => {
    setForm({ id: '', name: searchQuery, razonSocial: '', cuit: '', address: '' });
    setLinkStep('new');
  };

  const handleLinkExisting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !form.id) return;
    if (!cuitDigitsRegex.test(form.cuit)) {
      toast.warning('El CUIT debe tener 11 dígitos numéricos, sin guiones ni espacios.');
      return;
    }
    setLinking(true);
    try {
      const { error: updateError } = await supabase
        .from('pharmacies')
        .update({
          owner_id: userId,
          registered: true,
          has_debt: true,
          name: form.name,
          razon_social: form.razonSocial || form.name,
          cuit: form.cuit,
          address: form.address,
        })
        .eq('id', form.id);

      if (updateError) throw updateError;

      const { error: memberError } = await supabase
        .from('pharmacy_members')
        .insert({ pharmacy_id: form.id, user_id: userId, role: 'owner' });

      if (memberError) throw memberError;

      toast.success('Farmacia vinculada correctamente.');
      setIsLinkModalOpen(false);
      loadPharmacies();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al vincular la farmacia.';
      toast.error(msg);
    } finally {
      setLinking(false);
    }
  };

  const handleCreateNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    if (!form.name || !form.cuit || !form.address) {
      toast.warning('Completá nombre, CUIT y dirección.');
      return;
    }
    if (!cuitDigitsRegex.test(form.cuit)) {
      toast.warning('El CUIT debe tener 11 dígitos numéricos, sin guiones ni espacios.');
      return;
    }
    setLinking(true);
    try {
      const { data: newPharm, error: insertError } = await supabase
        .from('pharmacies')
        .insert({
          name: form.name,
          razon_social: form.razonSocial || form.name,
          cuit: form.cuit,
          address: form.address,
          owner_id: userId,
          registered: true,
          has_debt: true,
        })
        .select('id')
        .single();

      if (insertError) throw insertError;

      const { error: memberError } = await supabase
        .from('pharmacy_members')
        .insert({ pharmacy_id: newPharm.id, user_id: userId, role: 'owner' });

      if (memberError) throw memberError;

      toast.success('Farmacia creada y vinculada correctamente.');
      setIsLinkModalOpen(false);
      loadPharmacies();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al crear la farmacia.';
      toast.error(msg);
    } finally {
      setLinking(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Cargando tus farmacias...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc] text-[#1e293b] font-sans">
      <header className="bg-card border-b border-border/80 py-4 px-6 flex items-center justify-between shadow-premium">
        <div className="flex items-center gap-3">
          <img src="/images/logo.jpg" alt="Logo" className="h-9 w-auto object-contain bg-white p-0.5 rounded border border-border" />
          <div>
            <span className="text-xs font-black uppercase tracking-wider text-primary block leading-none">ATFAR</span>
            <span className="text-[9px] text-muted-foreground block font-bold">Mis Farmacias</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <SupportContact />
          <button
            onClick={openPasswordModal}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-border text-slate-700 hover:bg-slate-50 text-xs font-bold transition-all cursor-pointer bg-white"
          >
            <Lock className="w-4 h-4 text-primary" />
            <span>Cambiar Contraseña</span>
          </button>
          <button
            onClick={handleLogout}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-border text-red-500 hover:bg-red-50/50 text-xs font-bold transition-all cursor-pointer bg-white"
          >
            <LogOut className="w-4 h-4" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </header>

      <main className="flex-grow max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-[#0f172a]">Mis Farmacias</h1>
              <button
                onClick={openGuide}
                title="¿Cómo funciona esta pantalla?"
                className="inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded-full border border-secondary/30 bg-secondary/10 text-secondary text-[10px] font-bold uppercase tracking-wider hover:bg-secondary/20 transition-all cursor-pointer"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>¿Cómo funciona?</span>
              </button>
            </div>
            <p className="text-xs text-slate-500 font-semibold">
              Elegí una farmacia para gestionar su nómina, declaraciones y pagos. ¿Sos un estudio contable con varias farmacias a cargo? Vinculalas todas acá, con una sola cuenta.
            </p>
          </div>
          <button
            onClick={openLinkModal}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider hover:bg-primary/95 transition-all shadow-premium cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Vincular otra Farmacia</span>
          </button>
        </div>

        {pharmacies.length === 0 ? (
          <div className="bg-card border border-dashed border-border rounded-3xl p-12 text-center space-y-4">
            <Building2 className="w-10 h-10 text-secondary mx-auto" />
            <div className="space-y-1">
              <h3 className="font-bold text-foreground text-sm">Todavía no tenés farmacias vinculadas</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Vinculá tu primera farmacia (o las que gestiones como estudio contable) para empezar a declarar nómina y pagar aportes.
              </p>
            </div>
            <button
              onClick={openLinkModal}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider hover:bg-primary/95 transition-all shadow-premium cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Vincular mi primera Farmacia</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {pharmacies.map((pharm) => {
              const debtStatus = getPharmacyDebtStatus(pharm, pharm.payments || []);
              return (
              <Link
                key={pharm.id}
                href={`/farmacia/${pharm.id}`}
                className="bg-card border border-border rounded-3xl p-6 shadow-premium hover:shadow-premium-lg transition-all space-y-4 glass block"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="p-3 bg-primary/5 text-primary border border-primary/10 rounded-2xl">
                    <Building2 className="w-6 h-6 text-secondary" />
                  </div>
                  {debtStatus.status === 'con_deuda' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-500/10 text-red-600 text-[10px] font-bold">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Con Deuda</span>
                    </span>
                  ) : debtStatus.status === 'en_proceso' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 text-[10px] font-bold">
                      <Clock className="w-3.5 h-3.5" />
                      <span>En Proceso</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 text-[10px] font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Al Día</span>
                    </span>
                  )}
                </div>
                <div className="space-y-1.5">
                  <h3 className="font-black text-[#0f172a] text-base leading-snug">
                    {pharm.nombre_fantasia || pharm.name || pharm.razon_social}
                  </h3>
                  <span className="text-xs font-bold text-slate-500 block">CUIT: {pharm.cuit}</span>
                  <span className="flex items-start gap-1 text-xs text-slate-500 font-semibold">
                    <MapPin className="w-3.5 h-3.5 text-secondary flex-shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{pharm.declared_addresses || pharm.address}</span>
                  </span>
                </div>
              </Link>
              );
            })}
          </div>
        )}
      </main>

      {/* Link Pharmacy Modal */}
      {isLinkModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-premium-lg relative animate-scaleIn space-y-5">
            <button
              onClick={() => setIsLinkModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-extrabold text-[#0f172a] tracking-tight flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" />
              <span>Vincular otra Farmacia</span>
            </h3>

            {linkStep === 'search' && (
              <div className="space-y-4">
                <p className="text-xs text-muted-foreground font-semibold">
                  Buscá la farmacia en la base de datos del sindicato. Si la encontrás, la vinculamos a tu cuenta en un paso;
                  si no aparece, vas a poder cargarla de cero.
                </p>
                <div className="space-y-1 relative">
                  <label className="text-xs font-semibold text-muted-foreground">Buscar por nombre o CUIT</label>
                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Ej: Farmacia Centro o 30777888990"
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm transition-all"
                      autoFocus
                    />
                    {searching && (
                      <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                    )}
                  </div>
                </div>

                {searchResults.length > 0 && (
                  <div className="border border-border rounded-xl max-h-56 overflow-y-auto divide-y divide-border/60">
                    {searchResults.map((pharm) => (
                      <button
                        key={pharm.id}
                        type="button"
                        onClick={() => selectResult(pharm)}
                        className="w-full text-left p-3 text-xs hover:bg-primary/5 transition-colors cursor-pointer"
                      >
                        <span className="font-bold text-[#0f172a] block">{pharm.name}</span>
                        <span className="text-muted-foreground">{pharm.address}</span>
                      </button>
                    ))}
                  </div>
                )}

                {searchQuery.trim().length >= 3 && !searching && searchResults.length === 0 && (
                  <div className="text-xs text-muted-foreground font-semibold text-center py-2">
                    No encontramos ninguna farmacia sin reclamar con ese nombre o CUIT.
                  </div>
                )}

                <button
                  type="button"
                  onClick={startNewPharmacy}
                  className="w-full text-center text-xs font-bold text-secondary hover:underline cursor-pointer"
                >
                  ¿No está en la lista? Cargar una farmacia nueva
                </button>
              </div>
            )}

            {linkStep === 'confirm' && (
              <form onSubmit={handleLinkExisting} className="space-y-4">
                <p className="text-xs text-muted-foreground font-semibold">
                  Confirmá los datos antes de vincular esta farmacia a tu cuenta.
                </p>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Nombre de Fantasía *</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm font-semibold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Razón Social</label>
                  <input
                    type="text"
                    value={form.razonSocial}
                    onChange={(e) => setForm((p) => ({ ...p, razonSocial: e.target.value }))}
                    placeholder={form.name}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm font-semibold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">CUIT Comercial (11 números) *</label>
                  <input
                    type="text"
                    required
                    value={form.cuit}
                    onChange={(e) => setForm((p) => ({ ...p, cuit: e.target.value }))}
                    placeholder="Ej. 30777888990"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm font-mono font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Dirección *</label>
                  <input
                    type="text"
                    required
                    value={form.address}
                    onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm font-semibold"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setLinkStep('search')}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-border text-slate-700 text-xs font-bold uppercase tracking-wider hover:bg-slate-50 transition-all cursor-pointer bg-white"
                  >
                    Volver
                  </button>
                  <button
                    type="submit"
                    disabled={linking}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider hover:bg-primary/95 transition-all shadow-premium disabled:opacity-50 cursor-pointer"
                  >
                    {linking ? 'Vinculando...' : 'Vincular Farmacia'}
                  </button>
                </div>
              </form>
            )}

            {linkStep === 'new' && (
              <form onSubmit={handleCreateNew} className="space-y-4">
                <p className="text-xs text-muted-foreground font-semibold">
                  Cargá los datos de la farmacia nueva. Podés completar el resto del perfil después desde su panel.
                </p>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Nombre de Fantasía *</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    placeholder="Ej. Farmacia Centro"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm font-semibold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Razón Social</label>
                  <input
                    type="text"
                    value={form.razonSocial}
                    onChange={(e) => setForm((p) => ({ ...p, razonSocial: e.target.value }))}
                    placeholder={form.name || 'Ej. Farmacia Centro S.H.'}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm font-semibold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">CUIT Comercial (11 números) *</label>
                  <input
                    type="text"
                    required
                    value={form.cuit}
                    onChange={(e) => setForm((p) => ({ ...p, cuit: e.target.value }))}
                    placeholder="Ej. 30777888990"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm font-mono font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Dirección *</label>
                  <input
                    type="text"
                    required
                    value={form.address}
                    onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                    placeholder="Ej. San Martín 1234, Rosario"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm font-semibold"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setLinkStep('search')}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-border text-slate-700 text-xs font-bold uppercase tracking-wider hover:bg-slate-50 transition-all cursor-pointer bg-white"
                  >
                    Volver
                  </button>
                  <button
                    type="submit"
                    disabled={linking}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider hover:bg-primary/95 transition-all shadow-premium disabled:opacity-50 cursor-pointer"
                  >
                    {linking ? 'Creando...' : 'Crear y Vincular'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Mini Guía: ¿Cómo funciona esta pantalla? */}
      {showGuide && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[100] flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-card border border-border/80 rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-premium-lg relative animate-scaleIn space-y-6">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-secondary uppercase tracking-widest bg-secondary/5 px-2.5 py-1 rounded-lg border border-secondary/10">
                Paso {guideStep} de 3
              </span>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="text-xs text-muted-foreground hover:text-foreground font-bold cursor-pointer bg-transparent border-0"
              >
                Cerrar guía
              </button>
            </div>

            <div className="space-y-4 text-foreground text-left">
              {guideStep === 1 && (
                <div className="space-y-3">
                  <div className="w-12 h-12 bg-secondary/10 rounded-2xl flex items-center justify-center text-secondary mb-2">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-extrabold text-foreground tracking-tight">¿Para qué sirve esta pantalla?</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed font-semibold">
                    Acá ves todas las farmacias que gestionás con tu cuenta. Si sos dueño de una sola, no vas a ver esta pantalla:
                    te llevamos directo a su panel.
                  </p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Si sos un <strong>estudio contable</strong> y llevás la contabilidad de varias farmacias, todas van a aparecer
                    juntas acá, con un solo usuario y contraseña.
                  </p>
                </div>
              )}

              {guideStep === 2 && (
                <div className="space-y-3">
                  <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-600 mb-2">
                    <Plus className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-extrabold text-foreground tracking-tight">¿Cómo sumo una farmacia nueva?</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed font-semibold">
                    Tocá el botón <strong>&quot;Vincular otra Farmacia&quot;</strong> y buscala por nombre o CUIT en la base del sindicato.
                  </p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Si todavía no está registrada, no hay problema: podés cargarla de cero completando sus datos básicos.
                  </p>
                </div>
              )}

              {guideStep === 3 && (
                <div className="space-y-3">
                  <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-600 mb-2">
                    <ArrowRightLeft className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-extrabold text-foreground tracking-tight">Cada farmacia queda separada</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed font-semibold">
                    Al entrar a una farmacia, todo lo que cargues ahí (nómina, declaraciones juradas, pagos) queda guardado
                    únicamente para esa farmacia. El sindicato las ve identificadas por separado, aunque las cargues con la misma cuenta.
                  </p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed flex items-start gap-1.5">
                    <Users className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-emerald-600" />
                    <span>
                      Para cambiar de farmacia, volvé a esta pantalla con el botón <strong>&quot;Mis Farmacias&quot;</strong> que
                      vas a ver arriba de cada panel.
                    </span>
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-1.5 justify-center py-2">
              {[1, 2, 3].map((step) => (
                <div
                  key={step}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    step === guideStep ? 'w-8 bg-secondary' : 'w-2 bg-slate-200'
                  }`}
                />
              ))}
            </div>

            <div className="pt-4 border-t border-border flex justify-between items-center">
              <button
                type="button"
                disabled={guideStep === 1}
                onClick={() => setGuideStep((prev) => prev - 1)}
                className="px-4 py-2 rounded-xl border border-border text-xs font-bold text-slate-700 disabled:opacity-30 disabled:pointer-events-none hover:bg-slate-50 cursor-pointer bg-white transition-all"
              >
                Anterior
              </button>

              {guideStep < 3 ? (
                <button
                  type="button"
                  onClick={() => setGuideStep((prev) => prev + 1)}
                  className="px-5 py-2 rounded-xl bg-secondary text-secondary-foreground text-xs font-bold cursor-pointer hover:bg-secondary/95 transition-all shadow-premium"
                >
                  Siguiente
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowGuide(false)}
                  className="px-6 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold cursor-pointer hover:bg-emerald-700 transition-all shadow-premium inline-flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>¡Entendido!</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Cambiar Contraseña Modal */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-premium-lg relative animate-scaleIn space-y-5">
            <button
              onClick={() => setIsPasswordModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-extrabold text-[#0f172a] tracking-tight flex items-center gap-2">
              <Lock className="w-5 h-5 text-primary" />
              <span>Cambiar Contraseña</span>
            </h3>

            <form onSubmit={handleChangePassword} className="space-y-4">
              {passwordError && (
                <div className="flex items-center gap-3 p-3.5 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-xs font-semibold">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{passwordError}</span>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Nueva Contraseña</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full pl-10 pr-12 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Repetir Contraseña</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    value={newPasswordConfirm}
                    onChange={(e) => setNewPasswordConfirm(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm transition-all"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-border text-slate-700 text-xs font-bold uppercase tracking-wider hover:bg-slate-50 transition-all cursor-pointer bg-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={passwordSaving}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider hover:bg-primary/95 transition-all shadow-premium disabled:opacity-50 cursor-pointer"
                >
                  {passwordSaving ? 'Guardando...' : 'Guardar Contraseña'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MisFarmaciasPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    }>
      <MisFarmaciasContent />
    </Suspense>
  );
}
