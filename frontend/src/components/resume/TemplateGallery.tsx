import React, { useState, useMemo } from 'react';
import { ALL_TEMPLATES, getTemplateById } from './templates/templateRegistry';
import { ScaledResumePreview } from './templates/ScaledResumePreview';
import { ResumeRenderer } from './templates/ResumeRenderer';
import { getSampleDataForTemplate } from './templates/sampleProfiles';
import { 
  TemplateId, 
  TemplateFilterCategory, 
  ResumeTemplate,
  ResumeData 
} from '../../types/resume';
import { 
  Search, 
  Heart, 
  CheckCircle2, 
  Eye, 
  ArrowRight, 
  X, 
  FileText,
  Sparkles
} from 'lucide-react';

interface TemplateGalleryProps {
  onSelectTemplate: (templateId: TemplateId) => void;
  selectedTemplateId?: TemplateId;
  activeResumeData?: ResumeData;
  onCancel?: () => void;
  canCancel?: boolean;
}

export const TemplateGallery: React.FC<TemplateGalleryProps> = ({
  onSelectTemplate,
  selectedTemplateId = 'ats-professional',
  onCancel,
  canCancel = false,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<TemplateFilterCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [previewModalTemplate, setPreviewModalTemplate] = useState<ResumeTemplate | null>(null);

  // Favorites state persisted to localStorage
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('resume_template_favorites');
      return saved ? JSON.parse(saved) : ['ats-professional', 'software-engineer', 'modern-two-column'];
    } catch {
      return ['ats-professional', 'software-engineer', 'modern-two-column'];
    }
  });

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites((prev) => {
      const updated = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
      try {
        localStorage.setItem('resume_template_favorites', JSON.stringify(updated));
      } catch (err) {
        console.error('Failed to save template favorites:', err);
      }
      return updated;
    });
  };

  const categories: { id: TemplateFilterCategory; label: string; count?: number }[] = [
    { id: 'all', label: 'All Templates' },
    { id: 'ats', label: 'ATS Friendly' },
    { id: 'tech', label: 'Software / Tech' },
    { id: 'modern', label: 'Modern' },
    { id: 'corporate', label: 'Corporate' },
    { id: 'academic', label: 'Academic' },
    { id: 'compact', label: 'One Page' },
    { id: 'favorites', label: `Favorites (${favorites.length})` },
  ];

  // Filter templates based on category & search
  const filteredTemplates = useMemo(() => {
    return ALL_TEMPLATES.filter((tmpl) => {
      // Category filter
      if (selectedCategory === 'favorites') {
        if (!favorites.includes(tmpl.id)) return false;
      } else if (selectedCategory !== 'all') {
        if (tmpl.filterCategory !== selectedCategory) return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = tmpl.name.toLowerCase().includes(q);
        const matchesCat = tmpl.category.toLowerCase().includes(q);
        const matchesTags = tmpl.tags.some((t) => t.toLowerCase().includes(q));
        if (!matchesName && !matchesCat && !matchesTags) {
          return false;
        }
      }

      return true;
    });
  }, [selectedCategory, searchQuery, favorites]);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f8fafc] dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-y-auto">
      {/* Top Header & Navigation Bar */}
      <div className="border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-6 py-5 sm:px-10 sticky top-0 z-20 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
              Choose a Resume Template
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
              Choose a professional template. Your information will be automatically organized and formatted into the selected design.
            </p>
          </div>

          {canCancel && onCancel && (
            <button
              onClick={onCancel}
              className="self-start md:self-center px-4 py-2 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
            >
              Back to Editor
            </button>
          )}
        </div>

        {/* Minimal Filter Chips & Search Bar */}
        <div className="max-w-7xl mx-auto mt-5 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Category Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                  selectedCategory === cat.id
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm font-semibold'
                    : 'bg-white dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700'
                }`}
              >
                {cat.id === 'favorites' && (
                  <Heart
                    size={12}
                    className={selectedCategory === cat.id ? 'fill-white dark:fill-slate-900' : 'text-rose-500 fill-rose-500'}
                  />
                )}
                <span>{cat.label}</span>
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative w-full lg:w-72 shrink-0">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search templates..."
              className="w-full pl-9 pr-8 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-white"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Overleaf-Style Template Gallery Grid */}
      <div className="max-w-7xl mx-auto w-full px-6 py-8 sm:px-10 flex-1">
        <div className="flex items-center justify-between text-xs text-slate-500 mb-6">
          <span>Showing <strong className="text-slate-900 dark:text-white font-semibold">{filteredTemplates.length}</strong> templates</span>
          <span className="hidden sm:inline text-slate-400">Hover over any template to preview or select</span>
        </div>

        {filteredTemplates.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 space-y-3">
            <FileText className="mx-auto text-slate-400" size={32} />
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">No matching templates found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Try adjusting your search query or reset your filters to browse all available layouts.
            </p>
            <button
              onClick={() => { setSelectedCategory('all'); setSearchQuery(''); }}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-900 text-white dark:bg-white dark:text-slate-900 cursor-pointer mt-2"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredTemplates.map((template) => {
              const isFav = favorites.includes(template.id);
              const isCurrent = selectedTemplateId === template.id;

              return (
                <div
                  key={template.id}
                  onClick={() => onSelectTemplate(template.id)}
                  className={`group relative flex flex-col cursor-pointer transition-all duration-200 ${
                    isCurrent ? 'ring-2 ring-emerald-500/80 rounded-lg p-1 -m-1' : ''
                  }`}
                >
                  {/* Clean Document Container — True A4 Scaled Resume Preview */}
                  <div className="relative w-full aspect-[210/297] bg-white rounded-sm shadow-[0_2px_10px_rgba(0,0,0,0.06)] group-hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] border border-slate-200/90 dark:border-slate-800 overflow-hidden transition-all duration-200 group-hover:-translate-y-1">
                    <ScaledResumePreview
                      templateId={template.id}
                      accentColor={template.accentDefault}
                    />

                    {/* Active Template Badge */}
                    {isCurrent && (
                      <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded bg-emerald-600 text-white text-[10px] font-bold tracking-wide uppercase shadow-sm flex items-center gap-1 z-10">
                        <CheckCircle2 size={11} />
                        <span>Current</span>
                      </div>
                    )}

                    {/* Subtle Favorite Button */}
                    <button
                      onClick={(e) => toggleFavorite(template.id, e)}
                      className={`absolute top-2.5 right-2.5 p-1.5 rounded-md bg-white/90 dark:bg-slate-900/90 backdrop-blur-xs text-slate-400 hover:text-rose-500 shadow-xs transition-colors cursor-pointer z-10 ${
                        isFav ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      }`}
                      title={isFav ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      <Heart
                        size={14}
                        className={isFav ? 'fill-rose-500 text-rose-500' : 'text-slate-400'}
                      />
                    </button>

                    {/* Hover Action Overlay */}
                    <div className="absolute inset-0 bg-slate-950/20 dark:bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center gap-2.5 p-4 backdrop-blur-[1px]">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectTemplate(template.id);
                        }}
                        className="w-40 py-2 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5 hover:scale-[1.02]"
                      >
                        <span>Use Template</span>
                        <ArrowRight size={13} />
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewModalTemplate(template);
                        }}
                        className="w-40 py-2 rounded-md bg-white/95 hover:bg-white text-slate-800 text-xs font-semibold shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5 hover:scale-[1.02]"
                      >
                        <Eye size={13} />
                        <span>Inspect Full</span>
                      </button>
                    </div>
                  </div>

                  {/* Minimal Overleaf-Style Footer: Title, Category, and Action */}
                  <div className="mt-3 flex items-start justify-between gap-2 px-0.5">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors leading-tight">
                        {template.name}
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {template.category}
                      </p>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectTemplate(template.id);
                      }}
                      className="text-xs font-medium text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors py-0.5 px-1 shrink-0 cursor-pointer flex items-center gap-1"
                    >
                      <span>Select</span>
                      <ArrowRight size={11} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Full-Scale Inspection Modal */}
      {previewModalTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-4xl h-[92vh] bg-slate-100 dark:bg-slate-900 rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800">
            {/* Modal Header */}
            <div className="p-4 sm:px-6 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>{previewModalTemplate.name}</span>
                    <span className="text-xs font-normal text-slate-500 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700">
                      {previewModalTemplate.category}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    High-fidelity Overleaf-grade rendering with 100% fictional candidate profile
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const id = previewModalTemplate.id;
                    setPreviewModalTemplate(null);
                    onSelectTemplate(id);
                  }}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Sparkles size={13} />
                  <span>Use This Template</span>
                </button>
                <button
                  onClick={() => setPreviewModalTemplate(null)}
                  className="p-2 rounded-lg text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                  title="Close preview"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Scrollable Document View */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex justify-center bg-slate-200/50 dark:bg-slate-950/60">
              <div className="w-full max-w-[800px] bg-white shadow-2xl rounded-xs">
                <ResumeRenderer
                  resumeData={getSampleDataForTemplate(previewModalTemplate.id)}
                  templateId={previewModalTemplate.id}
                  accentColor={previewModalTemplate.accentDefault}
                  zoom={1}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
