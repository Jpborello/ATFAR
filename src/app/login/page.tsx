'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { 
  Lock, 
  Mail, 
  User, 
  Phone, 
  Building2, 
  FileCheck, 
  UserCheck, 
  ShieldCheck, 
  ArrowLeft,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') === 'register' ? 'register' : 'login';
  
  const [activeTab, setActiveTab] = useState<'login' | 'register'>(initialTab);
  const [registerRole, setRegisterRole] = useState<'employee' | 'pharmacy_owner'>('employee');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  
  // Role specific states
  const [cuil, setCuil] = useState('');
  const [pharmacyName, setPharmacyName] = useState('');
  const [pharmacyCuit, setPharmacyCuit] = useState('');
  const [pharmacyAddress, setPharmacyAddress] = useState('');

  // Handle URL tab changes
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'register') setActiveTab('register');
    else setActiveTab('login');
  }, [searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const isConfigured = 
        process.env.NEXT_PUBLIC_SUPABASE_URL !== 'your_supabase_project_url_here' && 
        !!process.env.NEXT_PUBLIC_SUPABASE_URL;

      if (!isConfigured) {
        // Simulation mode
        await new Promise((resolve) => setTimeout(resolve, 1500));
        
        // Match specific test emails for simulation, or redirect by role
        if (email.includes('admin')) {
          router.push('/admin');
        } else if (email.includes('farmacia') || email.includes('owner')) {
          router.push('/farmacia');
        } else {
          router.push('/empleado');
        }
        return;
      }

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw new Error(authError.message);
      if (!authData.user) throw new Error('Usuario no encontrado.');

      // Fetch profile role
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', authData.user.id)
        .single();

      if (profileError) throw new Error('Error al consultar el perfil de usuario.');

      if (profile.role === 'admin') {
        router.push('/admin');
      } else if (profile.role === 'pharmacy_owner') {
        router.push('/farmacia');
      } else {
        router.push('/empleado');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Error al iniciar sesión.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const isConfigured = 
        process.env.NEXT_PUBLIC_SUPABASE_URL !== 'your_supabase_project_url_here' && 
        !!process.env.NEXT_PUBLIC_SUPABASE_URL;

      if (!isConfigured) {
        // Simulation mode
        await new Promise((resolve) => setTimeout(resolve, 1500));
        if (registerRole === 'pharmacy_owner') {
          router.push('/farmacia');
        } else {
          router.push('/empleado');
        }
        return;
      }

      // 1. Sign up user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) throw new Error(authError.message);
      if (!authData.user) throw new Error('Error en el registro.');

      // 2. Insert profile record (Supabase triggers or direct insert)
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          email,
          full_name: fullName,
          role: registerRole,
          phone,
        });

      if (profileError) throw new Error(`Error de perfil: ${profileError.message}`);

      // 3. Insert specific details based on role
      if (registerRole === 'pharmacy_owner') {
        const { error: pharmacyError } = await supabase
          .from('pharmacies')
          .insert({
            name: pharmacyName,
            cuit: pharmacyCuit,
            address: pharmacyAddress,
            owner_id: authData.user.id,
            registered: false,
          });

        if (pharmacyError) throw new Error(`Error al registrar farmacia: ${pharmacyError.message}`);
        router.push('/farmacia');
      } else {
        // Create employee profile row linked to user profile
        const { error: employeeError } = await supabase
          .from('employees')
          .insert({
            id: authData.user.id,
            cuil: cuil,
            full_name: fullName,
          });
        
        if (employeeError) console.error('Error registering employee row:', employeeError);
        router.push('/empleado');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Error en el registro.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden bg-background">
      {/* Background gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-secondary/15 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-accent/15 blur-[120px] pointer-events-none" />

      {/* Back button */}
      <div className="absolute top-6 left-6 z-10">
        <Link 
          href="/" 
          className="inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver al sitio</span>
        </Link>
      </div>

      <div className="w-full max-w-lg space-y-8 relative">
        {/* Header Brand */}
        <div className="text-center space-y-2">
          <div className="inline-flex bg-secondary text-secondary-foreground p-3.5 rounded-2xl font-black shadow-lg text-2xl tracking-widest mb-2">
            ATFAR
          </div>
          <h2 className="text-3xl font-extrabold text-foreground tracking-tight">
            Portal de Autogestión
          </h2>
          <p className="text-sm text-muted-foreground">
            Accedé a tus escalas, gestioná tu personal o consulta trámites gremiales.
          </p>
        </div>

        {/* Auth Box Card */}
        <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-2xl glass">
          {/* Tab Selector */}
          <div className="flex bg-muted/60 p-1.5 rounded-xl mb-6">
            <button
              onClick={() => {
                setActiveTab('login');
                setErrorMsg('');
              }}
              className={`flex-1 text-center py-2.5 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'login'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Iniciar Sesión
            </button>
            <button
              onClick={() => {
                setActiveTab('register');
                setErrorMsg('');
              }}
              className={`flex-1 text-center py-2.5 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'register'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Registrarse
            </button>
          </div>

          {errorMsg && (
            <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-sm mb-6">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {activeTab === 'login' ? (
            /* Login Form */
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">
                  Correo Electrónico
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ejemplo@correo.com"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-secondary/55 text-sm transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-muted-foreground">
                    Contraseña
                  </label>
                  <a href="#" className="text-xs text-secondary hover:underline font-semibold">
                    ¿La olvidaste?
                  </a>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-secondary/55 text-sm transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center px-6 py-3 rounded-xl bg-secondary text-secondary-foreground font-bold hover:bg-secondary/90 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed text-sm pt-3.5 pb-3.5"
              >
                {loading ? 'Validando...' : 'Ingresar'}
              </button>

              <div className="pt-2 text-center text-xs text-muted-foreground leading-relaxed bg-muted/20 p-3 rounded-xl border border-border/50">
                <span className="font-semibold block text-foreground mb-1">Cuentas de simulación disponibles:</span>
                • Admin: <code className="text-secondary font-mono">admin@atfar.org.ar</code> <br />
                • Farmacia: <code className="text-secondary font-mono">farmacia@atfar.org.ar</code> <br />
                • Empleado: <code className="text-secondary font-mono">empleado@atfar.org.ar</code>
              </div>
            </form>
          ) : (
            /* Register Form */
            <form onSubmit={handleRegister} className="space-y-4">
              {/* Role Selection Cards */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground">
                  Tipo de Afiliación
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div
                    onClick={() => setRegisterRole('employee')}
                    className={`border p-4 rounded-xl text-center cursor-pointer transition-all ${
                      registerRole === 'employee'
                        ? 'border-secondary bg-secondary/5 ring-1 ring-secondary'
                        : 'border-border bg-card hover:bg-muted/10'
                    }`}
                  >
                    <UserCheck className="w-5 h-5 mx-auto text-secondary mb-1" />
                    <span className="block text-xs font-bold text-foreground">Empleado / Afiliado</span>
                  </div>
                  <div
                    onClick={() => setRegisterRole('pharmacy_owner')}
                    className={`border p-4 rounded-xl text-center cursor-pointer transition-all ${
                      registerRole === 'pharmacy_owner'
                        ? 'border-secondary bg-secondary/5 ring-1 ring-secondary'
                        : 'border-border bg-card hover:bg-muted/10'
                    }`}
                  >
                    <Building2 className="w-5 h-5 mx-auto text-secondary mb-1" />
                    <span className="block text-xs font-bold text-foreground">Farmacia / Dueño</span>
                  </div>
                </div>
              </div>

              {/* General Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">
                    Nombre Completo
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Ej. Ana Rossi"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-secondary/55 text-sm transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">
                    Teléfono
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Ej. 3415554433"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-secondary/55 text-sm transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">
                  Correo Electrónico
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="correo@ejemplo.com"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-secondary/55 text-sm transition-all"
                  />
                </div>
              </div>

              {/* Role specific inputs */}
              {registerRole === 'employee' ? (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">
                    CUIL del Trabajador
                  </label>
                  <div className="relative">
                    <FileCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      required
                      value={cuil}
                      onChange={(e) => setCuil(e.target.value)}
                      placeholder="Ej. 20304445556"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-secondary/55 text-sm transition-all"
                    />
                  </div>
                </div>
              ) : (
                /* Pharmacy Owner Fields */
                <div className="space-y-3 p-3 bg-muted/40 rounded-xl border border-border/80">
                  <span className="text-[10px] font-bold text-secondary uppercase tracking-wider">
                    Datos de la Farmacia
                  </span>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-muted-foreground">
                        Nombre de la Farmacia
                      </label>
                      <input
                        type="text"
                        required
                        value={pharmacyName}
                        onChange={(e) => setPharmacyName(e.target.value)}
                        placeholder="Ej. Farmacia Centro"
                        className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-secondary/50 text-xs transition-all"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-muted-foreground">
                        CUIT Comercial
                      </label>
                      <input
                        type="text"
                        required
                        value={pharmacyCuit}
                        onChange={(e) => setPharmacyCuit(e.target.value)}
                        placeholder="Ej. 30777888990"
                        className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-secondary/50 text-xs transition-all"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-muted-foreground">
                      Dirección (Rosario, Santa Fe)
                    </label>
                    <input
                      type="text"
                      required
                      value={pharmacyAddress}
                      onChange={(e) => setPharmacyAddress(e.target.value)}
                      placeholder="Ej. San Martin 1234"
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-secondary/50 text-xs transition-all"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">
                  Contraseña de Acceso
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-secondary/55 text-sm transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center px-6 py-3 rounded-xl bg-secondary text-secondary-foreground font-bold hover:bg-secondary/90 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed text-sm pt-3.5 pb-3.5"
              >
                {loading ? 'Creando cuenta...' : 'Crear mi Cuenta'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-5 h-5 border-2 border-secondary border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
