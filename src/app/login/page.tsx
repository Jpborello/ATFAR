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
  ArrowLeft,
  AlertCircle,
  Sparkles,
  Eye,
  EyeOff
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

/**
 * A veces, sobre todo en el primer inicio de sesión del día, el cliente de
 * Supabase se queda esperando una respuesta que ya llegó (un problema
 * conocido de la librería cuando compite con el refresco automático de una
 * sesión guardada de un día anterior) y el botón queda trabado en
 * "Validando..." para siempre. Este helper le pone un límite de tiempo a
 * cualquier llamada a Supabase: si no responde a tiempo, en vez de colgarse
 * muestra un error y deja reintentar.
 */
function withTimeout<T>(promise: PromiseLike<T>, ms: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (err) => { clearTimeout(timer); reject(err); }
    );
  });
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') === 'register' ? 'register' : 'login';
  
  const [activeTab, setActiveTab] = useState<'login' | 'register'>(initialTab);
  const [registerRole, setRegisterRole] = useState<'employee' | 'pharmacy_owner'>('employee');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Form states
  // Form states
  const [email, setEmail] = useState('');
  const [emailConfirm, setEmailConfirm] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  
  // Role specific states
  const [cuil, setCuil] = useState('');
  const [pharmacyName, setPharmacyName] = useState('');
  const [pharmacyRazonSocial, setPharmacyRazonSocial] = useState('');
  const [pharmacyCuit, setPharmacyCuit] = useState('');
  const [pharmacyAddress, setPharmacyAddress] = useState('');
  const [pharmacyCrossStreets, setPharmacyCrossStreets] = useState('');
  const [pharmacyPhoneAlt, setPharmacyPhoneAlt] = useState('');
  const [hrName, setHrName] = useState('');
  const [hrEmail, setHrEmail] = useState('');
  const [hrPhone, setHrPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Recuperar contraseña
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const markTouched = (field: string) => setTouched((prev) => ({ ...prev, [field]: true }));

  // Validación en vivo (se muestra recién cuando el usuario terminó de completar el campo)
  const cuitDigitsRegex = /^\d{11}$/;
  const emailMismatch = touched.emailConfirm && emailConfirm.length > 0 && email !== emailConfirm;
  const passwordMismatch = touched.passwordConfirm && passwordConfirm.length > 0 && password !== passwordConfirm;
  const passwordTooShort = touched.password && password.length > 0 && password.length < 6;
  const cuilInvalid = touched.cuil && cuil.length > 0 && !cuitDigitsRegex.test(cuil);
  const pharmacyCuitInvalid = touched.pharmacyCuit && pharmacyCuit.length > 0 && !cuitDigitsRegex.test(pharmacyCuit);

  // Map coordinate picker states (Rosario default coords)
  const [latitude, setLatitude] = useState(-32.9468);
  const [longitude, setLongitude] = useState(-60.6393);

  // Autocomplete states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ id: string; name: string; address: string; latitude?: number; longitude?: number }[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedPharmacyId, setSelectedPharmacyId] = useState<string | null>(null);
  
  // Registration Guide states
  const [showRegisterGuide, setShowRegisterGuide] = useState(false);
  const [guideStep, setGuideStep] = useState(1);

  // Leaflet refs for coordinate sync
  const [mapRef, setMapRef] = useState<unknown>(null);
  const [markerRef, setMarkerRef] = useState<unknown>(null);

  // Handle URL tab changes
  useEffect(() => {
    const tab = searchParams.get('tab');
    const timer = setTimeout(() => {
      if (tab === 'register') setActiveTab('register');
      else setActiveTab('login');
    }, 0);
    return () => clearTimeout(timer);
  }, [searchParams]);

  // Leaflet map selector loading
  useEffect(() => {
    if (activeTab !== 'register' || registerRole !== 'pharmacy_owner' || typeof window === 'undefined') return;

    let isCancelled = false;
    let localMap: { remove: () => void; setView: (coords: [number, number], zoom?: number) => void; off?: (event: string, fn: (e: unknown) => void) => void } | null = null;

    Promise.all([
      import('leaflet'),
      import('leaflet/dist/leaflet.css')
    ]).then(([L]) => {
      if (isCancelled) return;

      type DefaultIconProto = { _getIconUrl?: unknown };
      delete (L.Icon.Default.prototype as DefaultIconProto)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      });

      const container = document.getElementById('map-selector') as (HTMLElement & { _leaflet_id?: number }) | null;
      if (!container || container._leaflet_id) return;

      const loadedMap = L.map('map-selector').setView([latitude, longitude], 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap'
      }).addTo(loadedMap);

      const loadedMarker = L.marker([latitude, longitude], { draggable: true }).addTo(loadedMap);

      localMap = loadedMap;

      loadedMarker.on('dragend', () => {
        const pos = loadedMarker.getLatLng();
        setLatitude(pos.lat);
        setLongitude(pos.lng);
      });

      loadedMap.on('click', (e: { latlng: { lat: number; lng: number } }) => {
        loadedMarker.setLatLng(e.latlng);
        setLatitude(e.latlng.lat);
        setLongitude(e.latlng.lng);
      });

      setMapRef(loadedMap);
      setMarkerRef(loadedMarker);
    }).catch(err => {
      console.warn("Failed to load map:", err);
    });

    return () => {
      isCancelled = true;
      if (localMap) {
        localMap.remove();
      }
      setMapRef(null);
      setMarkerRef(null);
    };
    // Solo se inicializa una vez al entrar al paso del mapa: si latitude/longitude
    // estuvieran en las deps, cada click/drag destruía y recreaba el mapa entero
    // (era la causa del crash al tocar el mapa). El sync de posición ya lo maneja
    // el effect de abajo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, registerRole]);

  // Update map position when coordinates are updated by autocompleting
  useEffect(() => {
    if (mapRef && markerRef) {
      const markerObj = markerRef as { setLatLng: (coords: [number, number]) => void };
      const mapObj = mapRef as { setView: (coords: [number, number], zoom?: number) => void };
      if (typeof markerObj.setLatLng === 'function') {
        markerObj.setLatLng([latitude, longitude]);
      }
      if (typeof mapObj.setView === 'function') {
        mapObj.setView([latitude, longitude], 15);
      }
    }
  }, [latitude, longitude, mapRef, markerRef]);

  // Search pharmacies in real-time
  useEffect(() => {
    if (searchQuery.trim().length < 3) {
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
          .select('id, name, address, latitude, longitude')
          .eq('registered', false)
          .ilike('name', `%${searchQuery}%`)
          .limit(10);
        
        if (!error && data) {
          setSearchResults(data);
        }
      } catch (err) {
        console.error("Error searching pharmacies:", err);
      } finally {
        setSearching(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const handleRoleSelect = (role: 'employee' | 'pharmacy_owner') => {
    setRegisterRole(role);
    if (role === 'pharmacy_owner') {
      const alreadySeen = localStorage.getItem('seen_register_guide');
      if (!alreadySeen) {
        setShowRegisterGuide(true);
        setGuideStep(1);
        localStorage.setItem('seen_register_guide', 'true');
      }
    }
  };

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

      const { data: authData, error: authError } = await withTimeout(
        supabase.auth.signInWithPassword({ email, password }),
        10000,
        'La respuesta está tardando más de lo normal. Probá iniciar sesión de nuevo.'
      );

      if (authError) throw new Error(authError.message);
      if (!authData.user) throw new Error('Usuario no encontrado.');

      // Fetch profile role
      const { data: profile, error: profileError } = await withTimeout(
        supabase.from('profiles').select('role').eq('id', authData.user.id).single(),
        10000,
        'La respuesta está tardando más de lo normal. Probá iniciar sesión de nuevo.'
      );

      if (profileError) throw new Error('Error al consultar el perfil de usuario.');

      if (profile.role === 'admin') {
        router.push('/admin');
      } else if (profile.role === 'pharmacy_owner') {
        router.push('/farmacia');
      } else {
        router.push('/empleado');
      }
    } catch (err: unknown) {
      console.error(err);
      setErrorMsg(err instanceof Error ? err.message : 'Error al iniciar sesión.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotLoading(true);
    setErrorMsg('');

    try {
      const isConfigured =
        process.env.NEXT_PUBLIC_SUPABASE_URL !== 'your_supabase_project_url_here' &&
        !!process.env.NEXT_PUBLIC_SUPABASE_URL;

      if (!isConfigured) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        setForgotSent(true);
        return;
      }

      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw new Error(error.message);
      setForgotSent(true);
    } catch (err: unknown) {
      console.error(err);
      setErrorMsg(err instanceof Error ? err.message : 'Error al enviar el correo de recuperación.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    if (email !== emailConfirm) {
      setErrorMsg('Los correos electrónicos ingresados no coinciden.');
      setLoading(false);
      return;
    }

    if (password !== passwordConfirm) {
      setErrorMsg('Las contraseñas ingresadas no coinciden.');
      setLoading(false);
      return;
    }

    if (registerRole === 'pharmacy_owner') {
      if (!cuitDigitsRegex.test(pharmacyCuit)) {
        setErrorMsg('El CUIT debe poseer exactamente 11 dígitos numéricos, sin espacios ni guiones.');
        setLoading(false);
        return;
      }
    } else if (registerRole === 'employee') {
      if (!cuitDigitsRegex.test(cuil)) {
        setErrorMsg('El CUIL debe poseer exactamente 11 dígitos numéricos, sin espacios ni guiones.');
        setLoading(false);
        return;
      }
    }

    let formattedPhone = phone.replace(/\D/g, '');
    if (formattedPhone.startsWith('0')) formattedPhone = formattedPhone.substring(1);
    if (formattedPhone.startsWith('15')) formattedPhone = formattedPhone.substring(2);
    if (formattedPhone.length > 0 && !formattedPhone.startsWith('54')) {
      formattedPhone = '549' + formattedPhone;
    }

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
        options: {
          data: {
            full_name: fullName,
            role: registerRole,
            phone: formattedPhone,
          }
        }
      });

      if (authError) {
        throw new Error(authError.message);
      }
      if (!authData.user) throw new Error('Error en el registro.');

      if (registerRole === 'pharmacy_owner') {
        let pharmacyError;
        let linkedPharmacyId: string | null = null;
        if (selectedPharmacyId) {
          // Update the pre-registered pharmacy to link to owner, mark as registered, and set real CUIT
          const { error: updateError } = await supabase
            .from('pharmacies')
            .update({
              owner_id: authData.user.id,
              registered: true,
              has_debt: true,
              cuit: pharmacyCuit,
              name: pharmacyName,
              razon_social: pharmacyRazonSocial,
              address: pharmacyAddress,
              cross_streets: pharmacyCrossStreets,
              phone_alt: pharmacyPhoneAlt,
              hr_name: hrName || null,
              hr_email: hrEmail || null,
              hr_phone: hrPhone || null,
              latitude: latitude,
              longitude: longitude
            })
            .eq('id', selectedPharmacyId);
          pharmacyError = updateError;
          linkedPharmacyId = selectedPharmacyId;
        } else {
          // Check if the pharmacy already exists in the database by CUIT
          const { data: existingPharm, error: fetchError } = await supabase
            .from('pharmacies')
            .select('id')
            .eq('cuit', pharmacyCuit)
            .maybeSingle();

          if (fetchError) console.error("Error checking existing pharmacy:", fetchError);

          if (existingPharm) {
            // Update the existing pharmacy to link to owner and mark as registered
            const { error: updateError } = await supabase
              .from('pharmacies')
              .update({
                owner_id: authData.user.id,
                registered: true,
                has_debt: true,
                name: pharmacyName,
                razon_social: pharmacyRazonSocial,
                address: pharmacyAddress,
                cross_streets: pharmacyCrossStreets,
                phone_alt: pharmacyPhoneAlt,
                hr_name: hrName || null,
                hr_email: hrEmail || null,
                hr_phone: hrPhone || null,
                latitude: latitude,
                longitude: longitude
              })
              .eq('id', existingPharm.id);
            pharmacyError = updateError;
            linkedPharmacyId = existingPharm.id;
          } else {
            // Insert a new pharmacy
            const { data: insertedPharm, error: insertError } = await supabase
              .from('pharmacies')
              .insert({
                name: pharmacyName,
                razon_social: pharmacyRazonSocial,
                cuit: pharmacyCuit,
                address: pharmacyAddress,
                cross_streets: pharmacyCrossStreets,
                phone_alt: pharmacyPhoneAlt,
                hr_name: hrName || null,
                hr_email: hrEmail || null,
                hr_phone: hrPhone || null,
                latitude: latitude,
                longitude: longitude,
                owner_id: authData.user.id,
                registered: true,
                has_debt: true
              })
              .select('id')
              .single();
            pharmacyError = insertError;
            linkedPharmacyId = insertedPharm?.id ?? null;
          }
        }

        if (pharmacyError) throw new Error(`Error al registrar farmacia: ${pharmacyError.message}`);

        if (linkedPharmacyId) {
          const { error: memberError } = await supabase
            .from('pharmacy_members')
            .insert({ pharmacy_id: linkedPharmacyId, user_id: authData.user.id, role: 'owner' });
          if (memberError) console.error('Error al vincular pharmacy_members:', memberError.message);
        }

        router.push('/farmacia');
      } else {
        // Vincular esta cuenta con la fila de nómina que su farmacia ya declaró (por CUIL).
        // No creamos una fila nueva en `employees`: esa tabla la gestiona la farmacia, y crear
        // un registro paralelo generaba duplicados o fallaba en silencio por el UNIQUE de cuil.
        const { error: claimError } = await supabase.rpc('claim_employee_profile', {
          p_cuil: cuil,
        });

        if (claimError) {
          console.warn('No se pudo vincular automáticamente al empleado:', claimError.message);
          // Seguimos igual: la cuenta quedó creada, el panel de empleado va a mostrar
          // "vinculación pendiente" hasta que la farmacia lo cargue en su nómina con este CUIL.
        }
        router.push('/empleado');
      }
    } catch (err: unknown) {
      console.error(err);
      setErrorMsg(err instanceof Error ? err.message : 'Error en el registro.');
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
                setPassword('');
                setShowPassword(false);
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
                setPassword('');
                setShowPassword(false);
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

          {activeTab === 'login' && showForgotPassword ? (
            /* Forgot Password Form */
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => {
                  setShowForgotPassword(false);
                  setForgotSent(false);
                  setErrorMsg('');
                }}
                className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer bg-transparent border-0"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Volver a iniciar sesión</span>
              </button>

              {forgotSent ? (
                <div className="text-center py-4 space-y-3">
                  <div className="inline-flex p-3 bg-emerald-500/10 text-emerald-600 rounded-full">
                    <Mail className="w-6 h-6" />
                  </div>
                  <p className="text-sm text-foreground font-semibold">
                    Te enviamos un correo a <strong>{forgotEmail}</strong> con un link para elegir una nueva contraseña.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Si no lo ves en unos minutos, revisá la carpeta de spam.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <p className="text-xs text-muted-foreground font-semibold">
                    Ingresá tu correo y te mandamos un link para elegir una nueva contraseña.
                  </p>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground">
                      Correo Electrónico
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="email"
                        required
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="ejemplo@correo.com"
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-secondary/55 text-sm transition-all"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="w-full inline-flex items-center justify-center px-6 py-3 rounded-xl bg-secondary text-secondary-foreground font-bold hover:bg-secondary/90 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    {forgotLoading ? 'Enviando...' : 'Enviar Link de Recuperación'}
                  </button>
                </form>
              )}
            </div>
          ) : activeTab === 'login' ? (
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
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotPassword(true);
                      setForgotEmail(email);
                      setErrorMsg('');
                    }}
                    className="text-xs text-secondary hover:underline font-semibold cursor-pointer bg-transparent border-0"
                  >
                    ¿La olvidaste?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
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

              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center px-6 py-3 rounded-xl bg-secondary text-secondary-foreground font-bold hover:bg-secondary/90 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed text-sm pt-3.5 pb-3.5"
              >
                {loading ? 'Validando...' : 'Ingresar'}
              </button>

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
                    onClick={() => handleRoleSelect('employee')}
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
                    onClick={() => handleRoleSelect('pharmacy_owner')}
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
                    Nombre Completo del Titular *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Ej. Emanuel Borello"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-secondary/55 text-sm transition-all text-foreground font-semibold"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">
                    Teléfono Celular (WhatsApp) *
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Ej: 3415556677 (sin 0 ni 15)"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-secondary/55 text-sm transition-all text-foreground font-semibold"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">
                    Correo Electrónico *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onBlur={() => markTouched('email')}
                      placeholder="correo@ejemplo.com"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-secondary/55 text-sm transition-all text-foreground"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">
                    Repetir Correo Electrónico *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="email"
                      required
                      value={emailConfirm}
                      onChange={(e) => setEmailConfirm(e.target.value)}
                      onBlur={() => markTouched('emailConfirm')}
                      placeholder="correo@ejemplo.com"
                      className={`w-full pl-9 pr-3 py-2.5 rounded-xl border bg-background focus:outline-none focus:ring-2 text-sm transition-all text-foreground font-semibold ${
                        emailMismatch ? 'border-red-400 focus:ring-red-400/40' : 'border-border focus:ring-secondary/55'
                      }`}
                    />
                  </div>
                  {emailMismatch && (
                    <span className="text-[11px] text-red-500 font-semibold">Los correos no coinciden.</span>
                  )}
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
                      onBlur={() => markTouched('cuil')}
                      placeholder="Ej. 20304445556"
                      className={`w-full pl-9 pr-3 py-2.5 rounded-xl border bg-background focus:outline-none focus:ring-2 text-sm transition-all ${
                        cuilInvalid ? 'border-red-400 focus:ring-red-400/40' : 'border-border focus:ring-secondary/55'
                      }`}
                    />
                  </div>
                  {cuilInvalid && (
                    <span className="text-[11px] text-red-500 font-semibold">El CUIL debe tener 11 números, sin guiones ni espacios.</span>
                  )}
                </div>
              ) : (
                /* Pharmacy Owner Fields */
                <div className="space-y-3.5 p-4 bg-muted/40 rounded-xl border border-border/80">
                  <div className="flex items-center justify-between border-b border-border/60 pb-1">
                    <span className="text-xs font-bold text-secondary uppercase tracking-wider block">
                      Datos de la Farmacia
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setShowRegisterGuide(true);
                        setGuideStep(1);
                      }}
                      className="text-[10px] text-secondary hover:underline font-bold flex items-center gap-1 cursor-pointer bg-transparent border-0"
                    >
                      💡 Ver Guía de Registro
                    </button>
                  </div>

                  {/* Search / Autocomplete */}
                  <div className="space-y-1 relative">
                    <label className="text-xs font-bold text-secondary flex items-center gap-1">
                      <Building2 className="w-3 h-3" />
                      Buscar mi Farmacia Pre-registrada
                    </label>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        if (selectedPharmacyId) {
                          setSelectedPharmacyId(null);
                        }
                      }}
                      placeholder="Escribí el nombre de la farmacia..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-secondary/50 text-sm transition-all text-foreground font-semibold"
                    />
                    {searching && (
                      <span className="absolute right-3.5 top-8 text-xs text-muted-foreground animate-pulse">
                        Buscando...
                      </span>
                    )}
                    {searchResults.length > 0 && !selectedPharmacyId && (
                      <div className="absolute left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto">
                        {searchResults.map((pharm) => (
                          <div
                            key={pharm.id}
                            onClick={() => {
                              setSelectedPharmacyId(pharm.id);
                              setPharmacyName(pharm.name);
                              setPharmacyAddress(pharm.address.split(',')[0]);
                              if (pharm.latitude && pharm.longitude) {
                                setLatitude(pharm.latitude);
                                setLongitude(pharm.longitude);
                              }
                              setSearchQuery(pharm.name);
                              setSearchResults([]);
                            }}
                            className="p-3 text-xs hover:bg-secondary/10 cursor-pointer border-b border-border/50 last:border-0 text-foreground"
                          >
                            <span className="font-bold block">{pharm.name}</span>
                            <span className="text-muted-foreground text-xs">{pharm.address}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {selectedPharmacyId && (
                      <div className="text-xs text-emerald-500 font-semibold flex items-center gap-1.5 mt-1 bg-emerald-500/10 border border-emerald-500/20 p-2 rounded-lg">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span>Vinculada con registro existente en la base de datos</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground">
                        Nombre de Fantasía *
                      </label>
                      <input
                        type="text"
                        required
                        value={pharmacyName}
                        onChange={(e) => setPharmacyName(e.target.value)}
                        placeholder="Ej. Farmacia Centro"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-secondary/50 text-sm transition-all text-foreground font-semibold"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground">
                        Razón Social *
                      </label>
                      <input
                        type="text"
                        required
                        value={pharmacyRazonSocial}
                        onChange={(e) => setPharmacyRazonSocial(e.target.value)}
                        placeholder="Ej. Farmacia Centro S.H."
                        className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-secondary/50 text-sm transition-all text-foreground font-semibold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground">
                        CUIT Comercial (11 números sin guiones) *
                      </label>
                      <input
                        type="text"
                        required
                        value={pharmacyCuit}
                        onChange={(e) => setPharmacyCuit(e.target.value)}
                        onBlur={() => markTouched('pharmacyCuit')}
                        placeholder="Ej. 30777888990"
                        className={`w-full px-3.5 py-2.5 rounded-xl border bg-background focus:outline-none focus:ring-2 text-sm transition-all text-foreground font-mono font-bold ${
                          pharmacyCuitInvalid ? 'border-red-400 focus:ring-red-400/40' : 'border-border focus:ring-secondary/50'
                        }`}
                      />
                      {pharmacyCuitInvalid && (
                        <span className="text-[11px] text-red-500 font-semibold">El CUIT debe tener 11 números, sin guiones ni espacios.</span>
                      )}
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground">
                        Teléfono Alternativo (Fijo/Móvil)
                      </label>
                      <input
                        type="text"
                        value={pharmacyPhoneAlt}
                        onChange={(e) => setPharmacyPhoneAlt(e.target.value)}
                        placeholder="Ej. 03414445555"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-secondary/50 text-sm transition-all text-foreground font-semibold"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground">
                        Dirección (Rosario, Santa Fe) *
                      </label>
                      <input
                        type="text"
                        required
                        value={pharmacyAddress}
                        onChange={(e) => setPharmacyAddress(e.target.value)}
                        placeholder="Ej. San Martin 1234"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-secondary/50 text-sm transition-all text-foreground font-semibold"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground">
                        Entre qué calles *
                      </label>
                      <input
                        type="text"
                        required
                        value={pharmacyCrossStreets}
                        onChange={(e) => setPharmacyCrossStreets(e.target.value)}
                        placeholder="Ej. Entre Mendoza y 3 de Febrero"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-secondary/50 text-sm transition-all text-foreground font-semibold"
                      />
                    </div>
                  </div>

                  <div className="space-y-1 pt-1">
                    <label className="text-xs font-semibold text-slate-500 block mb-1">
                      Geolocalización: Señale la posición exacta de la Farmacia
                    </label>
                    <div id="map-selector" className="h-44 w-full rounded-xl border border-border overflow-hidden bg-slate-100 z-10" />
                    <span className="text-xs text-muted-foreground block text-right font-medium">
                      Coordenadas: {latitude.toFixed(6)}, {longitude.toFixed(6)}
                    </span>
                  </div>

                  {/* Contacto de RRHH (Opcional) */}
                  <div className="pt-3 border-t border-border/80 space-y-3">
                    <span className="text-xs font-bold text-secondary uppercase tracking-wider block">
                      Contacto de RRHH / Liquidaciones (Opcional)
                    </span>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground">
                        Nombre del Responsable de RRHH
                      </label>
                      <input
                        type="text"
                        value={hrName}
                        onChange={(e) => setHrName(e.target.value)}
                        placeholder="Ej. Roberto Gómez"
                        className="w-full px-3.5 py-2 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-secondary/50 text-sm text-foreground font-semibold"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-muted-foreground">
                          Email de RRHH
                        </label>
                        <input
                          type="email"
                          value={hrEmail}
                          onChange={(e) => setHrEmail(e.target.value)}
                          placeholder="rrhh@farmacia.com"
                          className="w-full px-3.5 py-2 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-secondary/50 text-sm text-foreground font-semibold"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-muted-foreground">
                          Teléfono de RRHH
                        </label>
                        <input
                          type="text"
                          value={hrPhone}
                          onChange={(e) => setHrPhone(e.target.value)}
                          placeholder="Ej. 0341-4247815"
                          className="w-full px-3.5 py-2 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-secondary/50 text-sm text-foreground font-semibold"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">
                    Contraseña de Acceso *
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onBlur={() => markTouched('password')}
                      placeholder="Mínimo 6 caracteres"
                      className={`w-full pl-9 pr-12 py-2.5 rounded-xl border bg-background focus:outline-none focus:ring-2 text-sm transition-all text-foreground ${
                        passwordTooShort ? 'border-red-400 focus:ring-red-400/40' : 'border-border focus:ring-secondary/55'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {passwordTooShort && (
                    <span className="text-[11px] text-red-500 font-semibold">La contraseña debe tener al menos 6 caracteres.</span>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">
                    Repetir Contraseña *
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={passwordConfirm}
                      onChange={(e) => setPasswordConfirm(e.target.value)}
                      onBlur={() => markTouched('passwordConfirm')}
                      placeholder="Mínimo 6 caracteres"
                      className={`w-full pl-9 pr-12 py-2.5 rounded-xl border bg-background focus:outline-none focus:ring-2 text-sm transition-all text-foreground font-semibold ${
                        passwordMismatch ? 'border-red-400 focus:ring-red-400/40' : 'border-border focus:ring-secondary/55'
                      }`}
                    />
                  </div>
                  {passwordMismatch && (
                    <span className="text-[11px] text-red-500 font-semibold">Las contraseñas no coinciden.</span>
                  )}
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
      {/* Registration Guide Modal Overlay */}
      {showRegisterGuide && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[100] flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-card border border-border/80 rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-premium-lg relative animate-scaleIn space-y-6">
            
            {/* Header info */}
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-secondary uppercase tracking-widest bg-secondary/5 px-2.5 py-1 rounded-lg border border-secondary/10">
                Paso {guideStep} de 4
              </span>
              
              <button 
                type="button"
                onClick={() => setShowRegisterGuide(false)}
                className="text-xs text-muted-foreground hover:text-foreground font-bold cursor-pointer bg-transparent border-0"
              >
                Cerrar guía
              </button>
            </div>

            {/* Step content */}
            <div className="space-y-4 text-foreground text-left">
              {guideStep === 1 && (
                <div className="space-y-3">
                  <div className="w-12 h-12 bg-secondary/10 rounded-2xl flex items-center justify-center text-secondary mb-2">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-extrabold text-foreground tracking-tight">Paso 1: Buscar mi Farmacia Pre-registrada</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed font-semibold">
                    Para evitar crear registros duplicados, escribí el nombre de tu farmacia en el buscador. El sistema buscará en la base de datos oficial.
                  </p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Si tu farmacia aparece en la lista desplegable, seleccionala. Esto autocompletará gran parte de los datos y la asociará correctamente.
                  </p>
                </div>
              )}

              {guideStep === 2 && (
                <div className="space-y-3">
                  <div className="w-12 h-12 bg-secondary/10 rounded-2xl flex items-center justify-center text-secondary mb-2">
                    <FileCheck className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-extrabold text-foreground tracking-tight">Paso 2: Completar Nombre, Razón Social y CUIT</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed font-semibold">
                    Ingresá el Nombre de Fantasía, Razón Social (ej. &quot;Farmacia Centro S.H.&quot;) y CUIT Comercial (11 dígitos, sin guiones ni espacios).
                  </p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Estos datos comerciales deben ser exactos ya que aparecerán impresos en las boletas y comprobantes de aportes del sindicato.
                  </p>
                </div>
              )}

              {guideStep === 3 && (
                <div className="space-y-3">
                  <div className="w-12 h-12 bg-secondary/10 rounded-2xl flex items-center justify-center text-secondary mb-2">
                    <UserCheck className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-extrabold text-foreground tracking-tight">Paso 3: Dirección y Calles de Cruce</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed font-semibold">
                    Colocá la dirección postal de tu farmacia y especificá las calles entre las cuales se encuentra (ej. &quot;Entre Mendoza y 3 de Febrero&quot;).
                  </p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Esto asegura la correcta categorización por departamentos y facilita la fiscalización de aportes por parte del sindicato.
                  </p>
                </div>
              )}

              {guideStep === 4 && (
                <div className="space-y-3">
                  <div className="w-12 h-12 bg-secondary/10 rounded-2xl flex items-center justify-center text-secondary mb-2">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-extrabold text-foreground tracking-tight">Paso 4: Posicionamiento en el Mapa (Geolocalización)</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed font-semibold">
                    Hacé clic en el mapa o arrastrá el marcador azul para señalar la ubicación exacta de tu sucursal.
                  </p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Este paso es de suma importancia. De este modo, tu local se ubicará de forma exacta en el mapa de control de farmacias del sindicato.
                  </p>
                </div>
              )}
            </div>

            {/* Step indicators */}
            <div className="flex gap-1.5 justify-center py-2">
              {[1, 2, 3, 4].map((step) => (
                <div 
                  key={step} 
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    step === guideStep ? 'w-8 bg-secondary' : 'w-2 bg-slate-200'
                  }`}
                />
              ))}
            </div>

            {/* Navigation buttons */}
            <div className="pt-4 border-t border-border flex justify-between items-center">
              <button
                type="button"
                disabled={guideStep === 1}
                onClick={() => setGuideStep(prev => prev - 1)}
                className="px-4 py-2 rounded-xl border border-border text-xs font-bold text-slate-700 disabled:opacity-30 disabled:pointer-events-none hover:bg-slate-50 cursor-pointer bg-white transition-all"
              >
                Anterior
              </button>

              {guideStep < 4 ? (
                <button
                  type="button"
                  onClick={() => setGuideStep(prev => prev + 1)}
                  className="px-5 py-2 rounded-xl bg-secondary text-secondary-foreground text-xs font-bold cursor-pointer hover:bg-secondary/95 transition-all shadow-premium"
                >
                  Siguiente
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowRegisterGuide(false)}
                  className="px-6 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold cursor-pointer hover:bg-emerald-700 transition-all shadow-premium"
                >
                  ¡Entendido!
                </button>
              )}
            </div>
          </div>
        </div>
      )}
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
