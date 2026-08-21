'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle2, ArrowLeft, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

function ResetPasswordContent() {
  const router = useRouter();
  const [checkingLink, setCheckingLink] = useState(true);
  const [linkValid, setLinkValid] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function validateRecoveryLink() {
      try {
        const isConfigured =
          process.env.NEXT_PUBLIC_SUPABASE_URL !== 'your_supabase_project_url_here' &&
          !!process.env.NEXT_PUBLIC_SUPABASE_URL;

        if (!isConfigured) {
          setLinkValid(true);
          return;
        }

        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        }

        const { data: { session } } = await supabase.auth.getSession();
        setLinkValid(!!session);
      } catch (err) {
        console.error('Error validando link de recuperación:', err);
        setLinkValid(false);
      } finally {
        setCheckingLink(false);
      }
    }

    validateRecoveryLink();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (password.length < 6) {
      setErrorMsg('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (password !== passwordConfirm) {
      setErrorMsg('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    try {
      const isConfigured =
        process.env.NEXT_PUBLIC_SUPABASE_URL !== 'your_supabase_project_url_here' &&
        !!process.env.NEXT_PUBLIC_SUPABASE_URL;

      if (!isConfigured) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        setSuccess(true);
        return;
      }

      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw new Error(error.message);
      setSuccess(true);
    } catch (err: unknown) {
      console.error(err);
      setErrorMsg(err instanceof Error ? err.message : 'Error al actualizar la contraseña.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden bg-background">
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-secondary/15 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-accent/15 blur-[120px] pointer-events-none" />

      <div className="absolute top-6 left-6 z-10">
        <Link
          href="/login"
          className="inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver al login</span>
        </Link>
      </div>

      <div className="w-full max-w-md space-y-8 relative">
        <div className="text-center space-y-2">
          <div className="inline-flex bg-secondary text-secondary-foreground p-3.5 rounded-2xl font-black shadow-lg text-2xl tracking-widest mb-2">
            ATFAR
          </div>
          <h2 className="text-2xl font-extrabold text-foreground tracking-tight">
            Elegí tu nueva contraseña
          </h2>
        </div>

        <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-2xl glass">
          {checkingLink ? (
            <div className="flex flex-col items-center gap-2 py-8">
              <Loader2 className="w-6 h-6 animate-spin text-secondary" />
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Validando link...</span>
            </div>
          ) : !linkValid ? (
            <div className="text-center py-4 space-y-4">
              <div className="inline-flex p-3 bg-red-500/10 text-red-500 rounded-full">
                <AlertCircle className="w-6 h-6" />
              </div>
              <p className="text-sm text-foreground font-semibold">
                Este link no es válido o ya venció.
              </p>
              <p className="text-xs text-muted-foreground">
                Pedí un nuevo link de recuperación desde la pantalla de inicio de sesión.
              </p>
              <Link
                href="/login"
                className="inline-flex items-center justify-center px-6 py-2.5 rounded-xl bg-secondary text-secondary-foreground font-bold hover:bg-secondary/90 transition-all text-xs uppercase tracking-wider"
              >
                Volver al login
              </Link>
            </div>
          ) : success ? (
            <div className="text-center py-4 space-y-4">
              <div className="inline-flex p-3 bg-emerald-500/10 text-emerald-600 rounded-full">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <p className="text-sm text-foreground font-semibold">
                ¡Contraseña actualizada con éxito!
              </p>
              <button
                onClick={() => router.push('/login')}
                className="inline-flex items-center justify-center px-6 py-2.5 rounded-xl bg-secondary text-secondary-foreground font-bold hover:bg-secondary/90 transition-all text-xs uppercase tracking-wider cursor-pointer"
              >
                Ir a Iniciar Sesión
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMsg && (
                <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-sm">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Nueva Contraseña</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full pl-10 pr-12 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-secondary/55 text-sm transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Repetir Contraseña</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-secondary/55 text-sm transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center px-6 py-3 rounded-xl bg-secondary text-secondary-foreground font-bold hover:bg-secondary/90 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {loading ? 'Guardando...' : 'Guardar Nueva Contraseña'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-secondary" />
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
