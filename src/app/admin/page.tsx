'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  Building2, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  TrendingUp, 
  Clock, 
  ArrowUpRight,
  ArrowRight,
  ShieldCheck,
  DollarSign
} from 'lucide-react';

export default function AdminDashboardPage() {
  const cards = [
    { 
      label: 'Farmacias Registradas', 
      value: '142', 
      detail: 'Padrón total comercial', 
      color: 'text-primary bg-primary/5 border-primary/10',
      icon: Building2 
    },
    { 
      label: 'Farmacias Activas', 
      value: '130', 
      detail: 'Declaraciones presentadas al día', 
      color: 'text-emerald-600 bg-emerald-500/5 border-emerald-500/10',
      icon: CheckCircle2 
    },
    { 
      label: 'Farmacias con Deuda', 
      value: '12', 
      detail: 'Aportes pendientes de pago', 
      color: 'text-red-600 bg-red-500/5 border-red-500/10',
      icon: XCircle 
    },
    { 
      label: 'Declaraciones Pendientes', 
      value: '8', 
      detail: 'Esperando validación de nómina', 
      color: 'text-amber-600 bg-amber-500/5 border-amber-500/10',
      icon: AlertTriangle 
    },
  ];

  const chartData = [
    { month: 'Ene', amount: 3800000, height: 'h-32' },
    { month: 'Feb', amount: 4100000, height: 'h-36' },
    { month: 'Mar', amount: 4400000, height: 'h-40' },
    { month: 'Abr', amount: 4200000, height: 'h-38' },
    { month: 'May', amount: 4600000, height: 'h-44' },
    { month: 'Jun', amount: 4850000, height: 'h-48' }, // Current month
  ];

  const recentActivity = [
    { id: 1, pharmacy: 'Farmacia del Centro', action: 'Declaración mensual presentada (Junio)', date: 'Hace 15 min', status: 'pending', amount: '$45.000' },
    { id: 2, pharmacy: 'Farmacia Alberdi', action: 'Pago de aportes procesado con éxito', date: 'Hace 2 horas', status: 'paid', amount: '$38.200' },
    { id: 3, pharmacy: 'Farmacia Rosario Norte', action: 'Generación de deuda por período vencido', date: 'Ayer', status: 'unpaid', amount: '$12.500' },
    { id: 4, pharmacy: 'Farmacia Belgrano', action: 'Declaración mensual validada por administración', date: 'Ayer', status: 'paid', amount: '$41.000' },
  ];

  return (
    <div className="space-y-8">
      {/* Top Welcome Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
            Resumen General
          </h1>
          <p className="text-xs font-semibold text-muted-foreground">
            Monitoreo en tiempo real de aportes y registros comerciales de farmacia.
          </p>
        </div>
        
        {/* Recaudación Mensual Card inside header */}
        <div className="bg-card border border-border rounded-2xl px-5 py-3 shadow-premium flex items-center gap-3.5 glass">
          <div className="p-2 bg-primary/5 text-primary border border-primary/10 rounded-xl">
            <DollarSign className="w-5 h-5 text-secondary" />
          </div>
          <div>
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest block">Recaudación Mensual (Jun)</span>
            <span className="text-xl font-black text-primary">$4.850.000</span>
          </div>
        </div>
      </div>

      {/* Grid of indicators */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {cards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div 
              key={idx}
              className="bg-card border border-border rounded-3xl p-5 shadow-premium hover:shadow-premium-lg transition-all flex items-center justify-between gap-4 glass"
            >
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                  {card.label}
                </span>
                <span className="text-3xl font-black text-foreground block">
                  {card.value}
                </span>
                <span className="text-[10px] text-muted-foreground font-medium block">
                  {card.detail}
                </span>
              </div>
              <div className={`p-3.5 rounded-xl border ${card.color}`}>
                <Icon className="w-5 h-5" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Graphs & Recents Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Chart Column */}
        <div className="lg:col-span-7 bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-premium glass space-y-6">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div>
              <h2 className="text-base font-bold text-foreground">Tendencias de Recaudación</h2>
              <p className="text-[10px] text-muted-foreground">Evolución de aportes de farmacias en el último semestre</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-emerald-500 font-bold bg-emerald-500/10 px-2.5 py-1 rounded-lg">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>+18.4% anual</span>
            </div>
          </div>

          {/* Bar Chart Representation */}
          <div className="flex items-end justify-between h-64 pt-6 px-4">
            {chartData.map((data, idx) => (
              <div key={idx} className="flex flex-col items-center gap-3 w-12 group cursor-pointer">
                {/* Tooltip on hover */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-primary text-primary-foreground text-[10px] font-bold py-1 px-2 rounded absolute mb-20 translate-y-[-24px] shadow-premium">
                  ${(data.amount / 1000000).toFixed(1)}M
                </div>
                
                {/* Column */}
                <div className={`w-8 rounded-t-lg bg-primary/20 group-hover:bg-primary transition-all duration-300 ${data.height}`} />
                <span className="text-xs font-semibold text-muted-foreground">{data.month}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity Table Column */}
        <div className="lg:col-span-5 bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-premium glass space-y-6">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div>
              <h2 className="text-base font-bold text-foreground">Declaraciones y Pagos</h2>
              <p className="text-[10px] text-muted-foreground">Últimos movimientos registrados en el portal</p>
            </div>
            <Link 
              href="/admin/farmacias" 
              className="text-xs font-bold text-primary hover:underline flex items-center gap-0.5 group"
            >
              <span>Ver todas</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          <div className="divide-y divide-border/60">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="py-4 first:pt-0 last:pb-0 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-foreground block">{activity.pharmacy}</span>
                  <span className="text-[10px] text-muted-foreground block font-medium">{activity.action}</span>
                  <span className="text-[9px] text-muted-foreground font-semibold flex items-center gap-1">
                    <Clock className="w-3 h-3 text-secondary" />
                    {activity.date}
                  </span>
                </div>
                
                <div className="text-right space-y-1 flex-shrink-0">
                  <span className="text-xs font-bold text-foreground block">{activity.amount}</span>
                  <span className={`inline-block text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${
                    activity.status === 'paid' 
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                      : activity.status === 'pending'
                      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                      : 'bg-red-500/10 text-red-600 dark:text-red-400'
                  }`}>
                    {activity.status === 'paid' ? 'Pagado' : activity.status === 'pending' ? 'Pendiente' : 'Deuda'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
