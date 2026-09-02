/* eslint-disable @next/next/no-img-element */
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard,
  MapPin,
  GraduationCap,
  Briefcase,
  FileText,
  ClipboardCheck,
  LogOut,
  Menu, 
  X, 
  User, 
  ShieldAlert,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Bell,
  Search
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import SupportContact from '@/components/shared/SupportContact';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [adminName, setAdminName] = useState('Administrador');
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      const isConfigured = 
        process.env.NEXT_PUBLIC_SUPABASE_URL !== 'your_supabase_project_url_here' && 
        !!process.env.NEXT_PUBLIC_SUPABASE_URL;

      if (!isConfigured) {
        setAdminName('Admin Gremial (Simulado)');
        setLoading(false);
        return;
      }

      if (!session) {
        window.location.href = '/login';
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, full_name')
        .eq('id', session.user.id)
        .single();

      if (profile?.role !== 'admin') {
        if (profile?.role === 'pharmacy_owner') {
          window.location.href = '/farmacia';
        } else {
          window.location.href = '/empleado';
        }
        return;
      }

      setAdminName(profile.full_name || 'Administrador');
      setLoading(false);
    };

    checkAdmin();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  const menuItems = [
    { label: 'Vista General', href: '/admin', icon: LayoutDashboard },
    { label: 'Farmacias y Mapa', href: '/admin/farmacias', icon: MapPin },
    { label: 'Declaraciones Pendientes', href: '/admin/declaraciones', icon: ClipboardCheck },
    { label: 'Útiles Escolares', href: '/admin/utiles', icon: GraduationCap },
    { label: 'Bolsa de Empleo', href: '/admin/empleo', icon: Briefcase },
    { label: 'Novedades y Escalas', href: '/admin/escalas', icon: FileText },
    { label: 'Reportes y Cuentas', href: '/admin/reportes', icon: FileText }, // custom reports page
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Cargando Panel...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-[#f8fafc] text-[#1e293b] font-sans">
      {/* Sidebar - Desktop */}
      <aside className={`hidden lg:flex flex-col bg-card border-r border-border transition-all duration-300 relative flex-shrink-0 ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}>
        {/* Toggle Collapse Button */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute top-1/2 -right-3.5 -translate-y-1/2 bg-card border border-border p-1 rounded-full shadow-premium text-muted-foreground hover:text-foreground z-20 cursor-pointer hidden lg:block"
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>

        {/* Sidebar Brand Header */}
        <div className={`p-6 border-b border-border flex items-center gap-3 ${isCollapsed ? 'justify-center px-2' : ''}`}>
          <img src="/images/logo.jpg" alt="Logo" className="h-9 w-auto object-contain bg-white p-0.5 rounded border border-border" />
          {!isCollapsed && (
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-primary block leading-none">ATFAR</span>
              <span className="text-[9px] text-muted-foreground block font-bold">Panel Gremial</span>
            </div>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-6 space-y-1.5 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.label}
                href={item.href}
                title={isCollapsed ? item.label : undefined}
                className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all border ${
                  isActive
                    ? 'bg-primary text-primary-foreground border-primary shadow-premium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/40 border-transparent'
                } ${isCollapsed ? 'justify-center px-2' : ''}`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {!isCollapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User Card footer */}
        <div className={`p-4 border-t border-border space-y-3 ${isCollapsed ? 'flex flex-col items-center' : ''}`}>
          {!isCollapsed ? (
            <>
              <div className="flex items-center gap-3 px-2">
                <div className="p-2 bg-primary/5 text-primary border border-primary/10 rounded-xl">
                  <User className="w-4 h-4 text-secondary" />
                </div>
                <div className="truncate">
                  <span className="text-xs font-bold text-foreground block truncate">{adminName}</span>
                  <span className="text-[9px] text-muted-foreground flex items-center gap-0.5 font-bold uppercase">
                    <ShieldAlert className="w-3 h-3 text-secondary inline" />
                    <span>Administrador</span>
                  </span>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-border text-red-500 hover:bg-red-50/50 text-xs font-bold transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                Cerrar Sesión
              </button>
            </>
          ) : (
            <button
              onClick={handleLogout}
              title="Cerrar sesión"
              className="p-2.5 rounded-xl border border-border text-red-500 hover:bg-red-50/50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </aside>

      {/* Main Content Layout */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar navigation */}
        <header className="bg-card border-b border-border/80 px-6 py-4 flex items-center justify-between shadow-premium z-20">
          <div className="flex items-center gap-4">
            <span className="text-xs font-bold text-muted-foreground hidden sm:inline">
              Administración / {pathname === '/admin' ? 'Vista General' : pathname.includes('/declaraciones') ? 'Declaraciones Pendientes' : pathname.includes('/farmacias') ? 'Farmacias' : pathname.includes('/utiles') ? 'Útiles' : 'Gestión'}
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Search Input */}
            <div className="relative hidden md:block w-60">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar en panel..."
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-secondary/50 text-xs transition-all"
              />
            </div>

            <SupportContact />

            {/* Notifications Bell */}
            <button className="p-2 rounded-xl border border-border text-muted-foreground hover:text-foreground relative bg-card hover:bg-muted/40 transition-all cursor-pointer">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </button>

            {/* Mobile Sidebar Toggle */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 rounded-xl border border-border text-foreground hover:bg-muted/50 focus:outline-none transition-colors"
            >
              <Menu className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Mobile Navigation overlay drawer */}
        {sidebarOpen && (
          <div className="lg:hidden fixed inset-0 z-40 flex">
            <div 
              className="fixed inset-0 bg-black/45 backdrop-blur-sm"
              onClick={() => setSidebarOpen(false)}
            />
            <div className="relative flex flex-col w-64 max-w-xs bg-card border-r border-border h-full p-5 space-y-6 animate-slideIn">
              <div className="flex items-center justify-between pb-4 border-b border-border">
                <div className="flex items-center gap-2">
                  <img src="/images/logo.jpg" alt="Logo" className="h-8 w-auto object-contain bg-white p-0.5 rounded border border-border" />
                  <span className="text-xs font-black uppercase text-primary">ATFAR</span>
                </div>
                <button onClick={() => setSidebarOpen(false)} className="p-1 rounded-md border border-border">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <nav className="flex-1 space-y-1">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.label}
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all border ${
                        isActive
                          ? 'bg-primary text-primary-foreground border-primary shadow'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted border-transparent'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>

              <div className="border-t border-border pt-4 space-y-3">
                <div className="flex items-center gap-2.5 px-2">
                  <User className="w-4 h-4 text-secondary" />
                  <span className="text-xs font-bold text-foreground truncate">{adminName}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-border text-red-500 text-xs font-bold"
                >
                  <LogOut className="w-4 h-4" />
                  Cerrar Sesión
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Dashboard Pages Container */}
        <main className="flex-grow p-4 sm:p-6 lg:p-8 overflow-y-auto max-w-7xl w-full mx-auto space-y-6">
          {children}
        </main>
      </div>
    </div>
  );
}
