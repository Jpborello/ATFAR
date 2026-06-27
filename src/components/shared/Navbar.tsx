'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, LogOut, Shield, MapPin, ClipboardList, User, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface UserProfile {
  id: string;
  email: string;
  role: 'admin' | 'pharmacy_owner' | 'employee' | null;
  full_name: string | null;
}

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 15);
    };
    window.addEventListener('scroll', handleScroll);

    // Fetch user and profile role
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('role, full_name')
          .eq('id', session.user.id)
          .single();

        setProfile({
          id: session.user.id,
          email: session.user.email || '',
          role: profileData?.role || null,
          full_name: profileData?.full_name || null,
        });
      } else {
        setProfile(null);
      }
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('role, full_name')
          .eq('id', session.user.id)
          .single();

        setProfile({
          id: session.user.id,
          email: session.user.email || '',
          role: profileData?.role || null,
          full_name: profileData?.full_name || null,
        });
      } else {
        setProfile(null);
      }
    });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  const navLinks = [
    { label: 'Inicio', href: '/' },
    { label: 'Institucional', href: '/institucional' },
    { label: 'Escalas Salariales', href: '/escalas' },
    { label: 'Noticias', href: '/noticias' },
    { label: 'Contacto', href: '/contacto' },
  ];

  const getDashboardHref = () => {
    if (!profile) return '/login';
    if (profile.role === 'admin') return '/admin';
    if (profile.role === 'pharmacy_owner') return '/farmacia';
    return '/empleado';
  };

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 bg-card border-b border-border shadow-premium flex flex-col"
    >
      {/* Top Banner Notice */}
      <div className="bg-primary text-primary-foreground py-2 text-center text-[10px] sm:text-xs font-bold px-4 flex items-center justify-center gap-1.5 border-b border-white/5 font-sans">
        <Sparkles className="w-3.5 h-3.5 text-secondary animate-pulse" />
        <span>Novedades: Homologación de Escala Salarial CCT 659/13 vigente desde Junio 2026.</span>
        <Link href="/escalas" className="underline hover:opacity-90 ml-1">Ver Escalas →</Link>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-2 sm:py-3">
        <div className="flex items-center justify-between h-16">
          {/* Logo Brand */}
          <div className="flex-shrink-0 flex items-center">
            <Link href="/" className="flex items-center gap-3.5 group">
              <img 
                src="/images/logo.jpg" 
                alt="Logo ATFAR" 
                className="h-14 w-auto object-contain bg-white p-1 rounded-xl shadow-sm border border-border"
              />
              <div className="hidden sm:block">
                <span className="text-lg font-black tracking-wider text-primary uppercase block leading-none">
                  ATFAR
                </span>
                <span className="text-xs text-slate-700 block font-bold mt-1">
                  Federación de Trabajadores de Farmacia
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <div className="flex items-baseline gap-7">
              {navLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.label}
                    href={link.href}
                    className={`text-sm font-bold uppercase tracking-wider transition-colors hover:text-secondary ${
                      isActive ? 'text-primary font-black' : 'text-slate-800 hover:text-primary'
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>

            {/* Auth Buttons */}
            <div className="border-l border-border pl-8 flex items-center gap-4">
              {profile ? (
                <div className="flex items-center gap-4">
                  <Link
                    href={getDashboardHref()}
                    className="flex items-center gap-2 text-sm font-bold px-6 py-3 rounded-xl bg-primary text-primary-foreground hover:bg-primary/95 transition-all shadow-premium"
                  >
                    {profile.role === 'admin' && <Shield className="w-4 h-4 text-secondary" />}
                    {profile.role === 'pharmacy_owner' && <MapPin className="w-4 h-4 text-secondary" />}
                    {profile.role === 'employee' && <ClipboardList className="w-4 h-4 text-secondary" />}
                    <span>Panel ({profile.role === 'admin' ? 'Sindicato' : profile.role === 'pharmacy_owner' ? 'Farmacia' : 'Empleado'})</span>
                  </Link>
                  <button
                    onClick={handleLogout}
                    title="Cerrar sesión"
                    className="p-3 rounded-xl border border-border text-slate-500 hover:text-red-500 hover:border-red-200 transition-colors bg-white cursor-pointer"
                  >
                    <LogOut className="w-4.5 h-4.5" />
                  </button>
                </div>
              ) : (
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center px-6 py-3 rounded-xl text-sm font-bold uppercase tracking-wider bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-premium transition-all transform hover:-translate-y-0.5"
                >
                  Ingresar al Sistema
                </Link>
              )}
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center p-2.5 rounded-xl text-foreground hover:text-primary hover:bg-muted/50 focus:outline-none transition-colors"
            >
              {isOpen ? <X className="h-6.5 w-6.5" /> : <Menu className="h-6.5 w-6.5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden bg-card border-b border-border shadow-premium-lg transition-all duration-300 animate-fadeIn">
          <div className="px-3 pt-2 pb-4 space-y-1">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.label}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className={`block px-4 py-3.5 rounded-xl text-base font-bold uppercase tracking-wider hover:bg-slate-50 ${
                    isActive ? 'text-primary bg-slate-50 font-black' : 'text-slate-800'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}

            <div className="border-t border-border pt-4 pb-2 px-4 mt-2">
              {profile ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <User className="w-4.5 h-4.5 text-secondary" />
                    <span className="text-xs font-bold text-slate-700 truncate">
                      {profile.full_name || profile.email}
                    </span>
                  </div>
                  <Link
                    href={getDashboardHref()}
                    onClick={() => setIsOpen(false)}
                    className="flex w-full items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold uppercase tracking-wider text-center"
                  >
                    Ir a Panel ({profile.role === 'admin' ? 'Sindicato' : profile.role === 'pharmacy_owner' ? 'Farmacia' : 'Empleado'})
                  </Link>
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      handleLogout();
                    }}
                    className="flex w-full items-center justify-center gap-2 px-4 py-3.5 rounded-xl border border-border text-red-500 hover:bg-red-50/50 text-sm font-bold uppercase tracking-wider bg-white"
                  >
                    <LogOut className="w-4 h-4" />
                    Cerrar Sesión
                  </button>
                </div>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setIsOpen(false)}
                  className="flex w-full items-center justify-center px-4 py-3.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold uppercase tracking-wider shadow-md text-center"
                >
                  Ingresar al Sistema
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
