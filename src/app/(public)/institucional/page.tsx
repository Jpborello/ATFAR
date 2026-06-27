'use client';

import { ShieldCheck, Award, Users, BookOpen } from 'lucide-react';

export default function InstitucionalPage() {
  const comision = [
    { name: 'Jorge Ariel Rossi', role: 'Secretario General' },
    { name: 'María Alejandra Gómez', role: 'Prosecretaria General' },
    { name: 'Carlos Daniel Fernández', role: 'Secretario Gremial' },
    { name: 'Ana Estela Benítez', role: 'Secretaria de Finanzas' },
    { name: 'Guillermo Hugo Rossi', role: 'Secretario de Actas' },
    { name: 'Patricia Mabel Díaz', role: 'Secretaria de Acción Social y Turismo' },
  ];

  return (
    <div className="bg-background text-foreground min-h-screen py-12 px-4 sm:px-6 lg:px-8 relative">
      {/* Background decorations */}
      <div className="absolute top-[10%] left-[10%] w-[350px] h-[350px] rounded-full bg-primary/5 blur-[100px] pointer-events-none" />

      <div className="max-w-5xl mx-auto space-y-16 relative">
        {/* Page Header */}
        <div className="text-center space-y-4">
          <span className="text-[10px] font-bold text-secondary uppercase tracking-widest block">Sobre Nosotros</span>
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
            Historia Institucional
          </h1>
          <p className="text-md text-muted-foreground max-w-2xl mx-auto leading-relaxed font-medium">
            Conocé los orígenes de la federación y quiénes integramos la Comisión Directiva de la Asociación de Trabajadores de Farmacia de Rosario.
          </p>
        </div>

        {/* Two-Column Grid: History and Commission */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Extensive History */}
          <div className="lg:col-span-7 bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-premium glass space-y-6">
            <div className="flex items-center gap-2.5 border-b border-border pb-4">
              <div className="p-2.5 bg-primary/5 text-primary rounded-xl border border-primary/10">
                <BookOpen className="w-5 h-5 text-secondary" />
              </div>
              <h2 className="text-xl font-bold text-foreground">Trayectoria Sindical</h2>
            </div>
            
            <div className="space-y-4 text-sm text-muted-foreground leading-relaxed font-medium">
              <p>
                La Asociación de Trabajadores de Farmacia de Rosario (ATFAR) fue fundada el 14 de Mayo de 1927. Nació del impulso de un grupo de empleados que, frente a jornadas laborales extenuantes y remuneraciones precarias, decidieron organizarse para sentar las bases de la representación colectiva de la actividad farmacéutica en Rosario y zonas aledañas.
              </p>
              <p>
                A lo largo de casi un siglo de lucha, ATFAR ha alcanzado hitos fundamentales, como la conquista de las primeras 8 horas de trabajo diario en el sector, licencias por enfermedad, asignaciones familiares, la creación de la Obra Social del sector (OSPF) y la firma de convenios colectivos paritarios de carácter nacional (CCT 659/13).
              </p>
              <p>
                Hoy en día, nuestra organización continúa adaptándose a los nuevos desafíos tecnológicos y normativos del sistema de salud argentino, asegurando que cada trabajador de farmacia desempeñe sus tareas en ambientes seguros y con remuneraciones dignas acordes a su responsabilidad profesional.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border/80">
              <div className="text-center space-y-1">
                <span className="block text-2xl font-black text-primary">1927</span>
                <span className="block text-[10px] font-bold text-muted-foreground uppercase">Fundación</span>
              </div>
              <div className="text-center space-y-1">
                <span className="block text-2xl font-black text-primary">120+</span>
                <span className="block text-[10px] font-bold text-muted-foreground uppercase">Farmacias</span>
              </div>
              <div className="text-center space-y-1">
                <span className="block text-2xl font-black text-primary">N° 379</span>
                <span className="block text-[10px] font-bold text-muted-foreground uppercase">Pers. Gremial</span>
              </div>
            </div>
          </div>

          {/* Right Column: Board of Directors */}
          <div className="lg:col-span-5 bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-premium glass space-y-6">
            <div className="flex items-center gap-2.5 border-b border-border pb-4">
              <div className="p-2.5 bg-primary/5 text-primary rounded-xl border border-primary/10">
                <Users className="w-5 h-5 text-secondary" />
              </div>
              <h2 className="text-xl font-bold text-foreground">Comisión Directiva</h2>
            </div>

            <div className="space-y-4">
              {comision.map((member, idx) => (
                <div key={idx} className="flex justify-between items-center py-2 border-b border-border/40 last:border-0 last:pb-0">
                  <div className="space-y-0.5">
                    <span className="block text-sm font-bold text-foreground">{member.name}</span>
                    <span className="block text-xs text-muted-foreground font-medium">{member.role}</span>
                  </div>
                  <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                </div>
              ))}
            </div>
            
            <div className="bg-muted/40 p-4 rounded-2xl border border-border text-center">
              <p className="text-[10px] text-muted-foreground leading-relaxed italic">
                * Gestión sindical periodo 2024 - 2028. Todos los integrantes son elegidos mediante el voto directo de los trabajadores de farmacia afiliados.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
