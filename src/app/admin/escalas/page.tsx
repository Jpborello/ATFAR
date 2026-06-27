'use client';

import { useState } from 'react';
import { 
  FileText, 
  Plus, 
  CheckCircle2, 
  TrendingUp, 
  DollarSign, 
  Upload,
  BookOpen,
  Eye,
  Trash2
} from 'lucide-react';

interface CategorySalary {
  id: string;
  name: string;
  basicSalary: number;
}

export default function AdminEscalasPage() {
  const [salaries, setSalaries] = useState<CategorySalary[]>([
    { id: '1', name: 'Farmacéutico (Director Técnico)', basicSalary: 820000 },
    { id: '2', name: 'Auxiliar de Farmacia', basicSalary: 640000 },
    { id: '3', name: 'Cajero de Farmacia', basicSalary: 590000 },
    { id: '4', name: 'Personal de Salón (Vendedor)', basicSalary: 585000 },
    { id: '5', name: 'Personal Administrativo', basicSalary: 570000 },
    { id: '6', name: 'Cadete / Auxiliar de Portería', basicSalary: 520000 },
  ]);

  // Salary editing states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<number>(0);

  // News states
  const [newsTitle, setNewsTitle] = useState('');
  const [newsCategory, setNewsCategory] = useState('Gremiales');
  const [newsContent, setNewsContent] = useState('');
  const [publishedNewsCount, setPublishedNewsCount] = useState(3);

  // File upload states
  const [pdfName, setPdfName] = useState('');
  const [pdfPeriod, setPdfPeriod] = useState('');
  const [publishedPdfsCount, setPublishedPdfsCount] = useState(3);

  const handleSaveSalary = (id: string) => {
    setSalaries((prev) =>
      prev.map((sal) => (sal.id === id ? { ...sal, basicSalary: editValue } : sal))
    );
    setEditingId(null);
    alert('Básico de categoría actualizado con éxito.');
  };

  const handlePublishNews = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsTitle || !newsContent) return;
    setPublishedNewsCount((prev) => prev + 1);
    setNewsTitle('');
    setNewsContent('');
    alert('Noticia publicada con éxito en la web institucional.');
  };

  const handleUploadPdf = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pdfName || !pdfPeriod) return;
    setPublishedPdfsCount((prev) => prev + 1);
    setPdfName('');
    setPdfPeriod('');
    alert('Acta de acuerdo paritario cargada y vinculada.');
  };

  return (
    <div className="space-y-8">
      {/* Title Header */}
      <div className="border-b border-border pb-6">
        <h1 className="text-3xl font-extrabold text-foreground tracking-tight">
          Novedades y Escalas Salariales
        </h1>
        <p className="text-sm text-muted-foreground">
          Gestión de sueldos básicos por convenio, carga de actas paritarias y publicación de comunicados.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Edit Salaries Grid */}
        <div className="lg:col-span-7 bg-card border border-border rounded-3xl p-6 shadow-lg glass space-y-6">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-secondary" />
              Sueldos Básicos por Convenio
            </h2>
            <span className="text-xs text-muted-foreground">Mes vigente: Junio 2026</span>
          </div>

          <div className="space-y-3">
            {salaries.map((cat) => (
              <div 
                key={cat.id}
                className="border border-border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card/60 hover:bg-muted/10 transition-all"
              >
                <div className="space-y-0.5">
                  <h3 className="text-sm font-semibold text-foreground">{cat.name}</h3>
                  <span className="text-[10px] text-muted-foreground">Adicionales aplicables por ley</span>
                </div>

                <div className="flex items-center gap-3 justify-between sm:justify-end">
                  {editingId === cat.id ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-foreground">$</span>
                      <input
                        type="number"
                        value={editValue}
                        onChange={(e) => setEditValue(Number(e.target.value))}
                        className="w-28 px-2.5 py-1.5 rounded-lg border border-border bg-background text-xs font-semibold focus:outline-none"
                      />
                      <button
                        onClick={() => handleSaveSalary(cat.id)}
                        className="px-3 py-1.5 rounded-lg bg-secondary text-secondary-foreground text-xs font-bold"
                      >
                        Guardar
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-2.5 py-1.5 rounded-lg border border-border text-xs text-muted-foreground"
                      >
                        X
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="text-sm font-black text-foreground">
                        ${cat.basicSalary.toLocaleString('es-AR')}
                      </span>
                      <button
                        onClick={() => {
                          setEditingId(cat.id);
                          setEditValue(cat.basicSalary);
                        }}
                        className="text-xs text-secondary hover:underline font-semibold"
                      >
                        Editar
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: News and PDF tools */}
        <div className="lg:col-span-5 space-y-6">
          {/* News publisher form */}
          <form onSubmit={handlePublishNews} className="bg-card border border-border rounded-3xl p-6 shadow-lg glass space-y-4">
            <h3 className="font-bold text-foreground text-sm border-b border-border pb-3 flex items-center gap-2">
              <BookOpen className="w-4.5 h-4.5 text-secondary" />
              Publicar Comunicado
            </h3>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Título de la Noticia</label>
              <input
                type="text"
                required
                value={newsTitle}
                onChange={(e) => setNewsTitle(e.target.value)}
                placeholder="Ej. Comunicado sobre el feriado del 9 de Julio"
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-secondary/50 text-xs transition-all"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Categoría</label>
              <select
                value={newsCategory}
                onChange={(e) => setNewsCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-secondary/50 text-xs transition-all"
              >
                <option value="Gremiales">Gremiales</option>
                <option value="Beneficios">Beneficios</option>
                <option value="Capacitación">Capacitación</option>
                <option value="Institucional">Institucional</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Contenido del Comunicado</label>
              <textarea
                required
                rows={3}
                value={newsContent}
                onChange={(e) => setNewsContent(e.target.value)}
                placeholder="Escribí el texto completo que leerán los afiliados..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-secondary/50 text-xs transition-all resize-none"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-secondary text-secondary-foreground text-xs font-bold hover:bg-secondary/90 transition-all shadow-sm"
            >
              Publicar Noticia
            </button>
          </form>

          {/* PDF document publisher */}
          <form onSubmit={handleUploadPdf} className="bg-card border border-border rounded-3xl p-6 shadow-lg glass space-y-4">
            <h3 className="font-bold text-foreground text-sm border-b border-border pb-3 flex items-center gap-2">
              <Upload className="w-4.5 h-4.5 text-secondary" />
              Subir Acta de Acuerdo
            </h3>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Nombre del Documento</label>
              <input
                type="text"
                required
                value={pdfName}
                onChange={(e) => setPdfName(e.target.value)}
                placeholder="Ej. Acuerdo Salarial Paritarias CCT"
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-secondary/50 text-xs transition-all"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Período / Mes aplicable</label>
              <input
                type="text"
                required
                value={pdfPeriod}
                onChange={(e) => setPdfPeriod(e.target.value)}
                placeholder="Ej. Julio 2026"
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-secondary/50 text-xs transition-all"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground block">Archivo PDF de Convenio</label>
              <div className="border border-dashed border-border rounded-xl p-4 text-center cursor-pointer hover:bg-muted/10 transition-all">
                <span className="text-xs font-semibold text-muted-foreground block">
                  Click para cargar PDF
                </span>
                <span className="text-[10px] text-muted-foreground/75 block">PDF máximo 10MB</span>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/95 transition-all"
            >
              Publicar Acta PDF
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
