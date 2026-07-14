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
  Sparkles,
  Eye,
  EyeOff
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
  const [showPassword, setShowPassword] = useState(false);

  // Map coordinate picker states (Rosario default coords)
  const [latitude, setLatitude] = useState(-32.9468);
  const [longitude, setLongitude] = useState(-60.6393);

  // Autocomplete states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedPharmacyId, setSelectedPharmacyId] = useState<string | null>(null);
  
  // Registration Guide states
  const [showRegisterGuide, setShowRegisterGuide] = useState(false);
  const [guideStep, setGuideStep] = useState(1);

  // Leaflet refs for coordinate sync
  const [mapRef, setMapRef] = useState<any>(null);
  const [markerRef, setMarkerRef] = useState<any>(null);

  // Handle URL tab changes
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'register') setActiveTab('register');
    else setActiveTab('login');
  }, [searchParams]);

  // Leaflet map selector loading
  useEffect(() => {
    if (activeTab !== 'register' || registerRole !== 'pharmacy_owner' || typeof window === 'undefined') return;

    let mapInstance: any = { removeEventListener: () => {}, remove: () => {} };
    let markerInstance: any = { removeEventListener: () => {} };
    let isCancelled = false;

    const handleDragEnd = () => {
      if (markerInstance && typeof markerInstance.getLatLng === 'function') {
        const position = markerInstance.getLatLng();
        setLatitude(position.lat);
        setLongitude(position.lng);
      }
    };

    const handleMapClick = (e: any) => {
      if (markerInstance && typeof markerInstance.setLatLng === 'function') {
        markerInstance.setLatLng(e.latlng);
        setLatitude(e.latlng.lat);
        setLongitude(e.latlng.lng);
      }
    };

    Promise.all([
      import('leaflet'),
      import('leaflet/dist/leaflet.css' as any)
    ]).then(([L]) => {
      if (isCancelled) return;

      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      });

      const container = document.getElementById('map-selector');
      if (!container) return;

      const loadedMap = L.map('map-selector').setView([latitude, longitude], 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap'
      }).addTo(loadedMap);

      const loadedMarker = L.marker([latitude, longitude], { draggable: true }).addTo(loadedMap);
      
      mapInstance = loadedMap;
      markerInstance = loadedMarker;

      setMapRef(loadedMap);
      setMarkerRef(loadedMarker);

      markerInstance.addEventListener('dragend', handleDragEnd);
      mapInstance.addEventListener('click', handleMapClick);
    }).catch(err => {
      console.warn("Failed to load map:", err);
    });

    return () => {
      isCancelled = true;
      markerInstance.removeEventListener('dragend', handleDragEnd);
      mapInstance.removeEventListener('click', handleMapClick);
      mapInstance.remove();
      setMapRef(null);
      setMarkerRef(null);
    };
  }, [activeTab, registerRole]);

  // Update map position when coordinates are updated by autocompleting
  useEffect(() => {
    if (mapRef && markerRef) {
      markerRef.setLatLng([latitude, longitude]);
      mapRef.setView([latitude, longitude], 15);
    }
  }, [latitude, longitude, mapRef, markerRef]);

  // Search pharmacies in real-time
  useEffect(() => {
    if (searchQuery.trim().length < 3) {
      setSearchResults([]);
      return;
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
    } catch (err: unknown) {
      console.error(err);
      setErrorMsg(err instanceof Error ? err.message : 'Error al iniciar sesión.');
    } finally {
      setLoading(false);
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
      const cuitRegex = /^\d{11}$/;
      if (!cuitRegex.test(pharmacyCuit)) {
        setErrorMsg('El CUIT debe poseer exactamente 11 dígitos numéricos, sin espacios ni guiones.');
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
        alert("Error de Supabase Auth: " + authError.message + " (Status: " + authError.status + ")");
        throw new Error(authError.message);
      }
      if (!authData.user) throw new Error('Error en el registro.');

      if (registerRole === 'pharmacy_owner') {
        let pharmacyError;
        if (selectedPharmacyId) {
          // Update the pre-registered pharmacy to link to owner, mark as registered, and set real CUIT
          const { error: updateError } = await supabase
            .from('pharmacies')
            .update({
              owner_id: authData.user.id,
              registered: true,
              cuit: pharmacyCuit,
              name: pharmacyName,
              razon_social: pharmacyRazonSocial,
              address: pharmacyAddress,
              cross_streets: pharmacyCrossStreets,
              phone_alt: pharmacyPhoneAlt,
              latitude: latitude,
              longitude: longitude
            })
            .eq('id', selectedPharmacyId);
          pharmacyError = updateError;
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
                name: pharmacyName,
                razon_social: pharmacyRazonSocial,
                address: pharmacyAddress,
                cross_streets: pharmacyCrossStreets,
                phone_alt: pharmacyPhoneAlt,
                latitude: latitude,
                longitude: longitude
              })
              .eq('id', existingPharm.id);
            pharmacyError = updateError;
          } else {
            // Insert a new pharmacy
            const { error: insertError } = await supabase
              .from('pharmacies')
              .insert({
                name: pharmacyName,
                razon_social: pharmacyRazonSocial,
                cuit: pharmacyCuit,
                address: pharmacyAddress,
                cross_streets: pharmacyCrossStreets,
                phone_alt: pharmacyPhoneAlt,
                latitude: latitude,
                longitude: longitude,
                owner_id: authData.user.id,
                registered: true,
              });
            pharmacyError = insertError;
          }
        }

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
                      placeholder="correo@ejemplo.com"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-secondary/55 text-sm transition-all text-foreground font-semibold"
                    />
                  </div>
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
                        placeholder="Ej. 30777888990"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-secondary/50 text-sm transition-all text-foreground font-mono font-bold"
                      />
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
                      placeholder="Mínimo 6 caracteres"
                      className="w-full pl-9 pr-12 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-secondary/55 text-sm transition-all text-foreground"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
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
                      placeholder="Mínimo 6 caracteres"
                      className="w-full pl-9 pr-12 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-secondary/55 text-sm transition-all text-foreground font-semibold"
                    />
                  </div>
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
                    Ingresá el Nombre de Fantasía, Razón Social (ej. "Farmacia Centro S.H.") y CUIT Comercial (11 dígitos, sin guiones ni espacios).
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
                    Colocá la dirección postal de tu farmacia y especificá las calles entre las cuales se encuentra (ej. "Entre Mendoza y 3 de Febrero").
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
