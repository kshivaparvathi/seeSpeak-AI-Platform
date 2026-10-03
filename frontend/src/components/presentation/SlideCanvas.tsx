import React from 'react';
import { 
  SlideItem, 
  PresentationThemeId, 
  PRESENTATION_THEMES 
} from '../../types/presentation';
import { 
  CheckCircle2, 
  ArrowRight, 
  TrendingUp, 
  Layers, 
  HelpCircle,
  Sparkles,
  Award,
  Zap,
  Clock
} from 'lucide-react';

interface SlideCanvasProps {
  slide: SlideItem;
  themeId?: PresentationThemeId;
  totalSlides?: number;
  isEditable?: boolean;
  onUpdateSlide?: (updated: SlideItem) => void;
  className?: string;
  isThumbnail?: boolean;
}

export const SlideCanvas: React.FC<SlideCanvasProps> = ({
  slide,
  themeId = 'modern-professional',
  totalSlides = 10,
  isEditable = false,
  onUpdateSlide,
  className = '',
  isThumbnail = false,
}) => {
  const theme = PRESENTATION_THEMES[themeId] || PRESENTATION_THEMES['modern-professional'];

  const handleFieldChange = (field: keyof SlideItem, value: any) => {
    if (!onUpdateSlide || !isEditable) return;
    onUpdateSlide({
      ...slide,
      [field]: value,
    });
  };

  const handleBulletChange = (idx: number, text: string) => {
    if (!onUpdateSlide || !isEditable) return;
    const bullets = [...(slide.bullet_points || [])];
    bullets[idx] = text;
    handleFieldChange('bullet_points', bullets);
  };

  const isDark = themeId === 'technology' || themeId === 'dark-professional';

  // -----------------------------------------------------------------
  // 1. TITLE SLIDE
  // -----------------------------------------------------------------
  if (slide.layout === 'title' || slide.slide_number === 1) {
    return (
      <div
        className={`relative w-full aspect-[16/9] ${theme.canvasBg} ${theme.fontFamily} rounded-md shadow-lg overflow-hidden flex flex-col justify-between p-8 sm:p-14 select-none ${className}`}
      >
        {/* Top Accent Strip */}
        <div className={`w-20 h-1.5 ${theme.accentBg} rounded-full mb-4`} />

        {/* Center Title Content */}
        <div className="flex-1 flex flex-col justify-center space-y-4">
          {isEditable && !isThumbnail ? (
            <input
              type="text"
              value={slide.title}
              onChange={(e) => handleFieldChange('title', e.target.value)}
              className={`text-2xl sm:text-4xl md:text-5xl font-black ${theme.titleColor} bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none w-full tracking-tight`}
            />
          ) : (
            <h1 className={`text-2xl sm:text-4xl md:text-5xl font-black ${theme.titleColor} tracking-tight leading-tight line-clamp-3`}>
              {slide.title}
            </h1>
          )}

          {isEditable && !isThumbnail ? (
            <input
              type="text"
              value={slide.subtitle || slide.content || ''}
              onChange={(e) => handleFieldChange('subtitle', e.target.value)}
              placeholder="Enter presentation subtitle..."
              className={`text-sm sm:text-xl ${theme.subtitleColor} bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none w-full font-medium`}
            />
          ) : (
            <p className={`text-sm sm:text-xl ${theme.subtitleColor} font-medium line-clamp-2`}>
              {slide.subtitle || slide.content || 'Professional Presentation Deck'}
            </p>
          )}
        </div>

        {/* Footer Meta */}
        <div className="pt-4 border-t border-slate-200/40 dark:border-slate-800 flex items-center justify-between text-xs sm:text-sm">
          <span className={`font-semibold ${theme.accentText}`}>
            seeSpeak AI Presentation Studio
          </span>
          <span className={`${theme.subtitleColor} font-mono text-xs`}>
            Slide 1 of {totalSlides}
          </span>
        </div>
      </div>
    );
  }

  // -----------------------------------------------------------------
  // STANDARD SLIDE CONTAINER (Headers, Slide Number, and Dynamic Body)
  // -----------------------------------------------------------------
  return (
    <div
      className={`relative w-full aspect-[16/9] ${theme.canvasBg} ${theme.fontFamily} rounded-md shadow-lg overflow-hidden flex flex-col justify-between p-6 sm:p-10 select-none ${className}`}
    >
      {/* Slide Header */}
      <div className="shrink-0 mb-4 pb-3 border-b border-slate-200/80 dark:border-slate-800 flex items-start justify-between gap-4">
        <div className="flex-1">
          {isEditable && !isThumbnail ? (
            <input
              type="text"
              value={slide.title}
              onChange={(e) => handleFieldChange('title', e.target.value)}
              className={`text-xl sm:text-2xl md:text-3xl font-extrabold ${theme.titleColor} bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none w-full`}
            />
          ) : (
            <h2 className={`text-xl sm:text-2xl md:text-3xl font-extrabold ${theme.titleColor} leading-tight line-clamp-2`}>
              {slide.title}
            </h2>
          )}

          {slide.subtitle && (
            <p className={`text-xs sm:text-sm font-medium ${theme.subtitleColor} mt-0.5`}>
              {slide.subtitle}
            </p>
          )}
        </div>

        {/* Slide Counter Badge */}
        <div className={`px-2.5 py-1 rounded-full text-xs font-bold font-mono shrink-0 ${theme.badgeBg}`}>
          {slide.slide_number} / {totalSlides}
        </div>
      </div>

      {/* Main Slide Body Dispatcher */}
      <div className="flex-1 flex flex-col justify-center overflow-hidden">
        {/* 2. TWO COLUMN / COMPARISON LAYOUT */}
        {(slide.layout === 'two-column' || slide.layout === 'comparison') && (
          <div className="grid grid-cols-2 gap-4 sm:gap-6 h-full items-stretch">
            {/* Column 1 */}
            <div className={`p-4 sm:p-6 rounded-xl border ${theme.cardBorder} ${theme.cardBg} flex flex-col justify-between shadow-xs`}>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className={`font-bold text-sm sm:text-lg ${theme.titleColor}`}>
                    {slide.columns?.[0]?.heading || 'Primary Focus'}
                  </h3>
                  {slide.columns?.[0]?.badge && (
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${theme.badgeBg}`}>
                      {slide.columns[0].badge}
                    </span>
                  )}
                </div>
                <ul className="space-y-2 text-xs sm:text-sm">
                  {(slide.columns?.[0]?.bullets || slide.bullet_points?.slice(0, 3) || []).map((b, i) => (
                    <li key={i} className={`flex items-start gap-2 ${theme.bodyColor}`}>
                      <CheckCircle2 size={15} className={`shrink-0 mt-0.5 ${theme.accentText}`} />
                      <span className="leading-snug">{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Column 2 */}
            <div className={`p-4 sm:p-6 rounded-xl border ${theme.cardBorder} ${theme.cardBg} flex flex-col justify-between shadow-xs`}>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className={`font-bold text-sm sm:text-lg ${theme.titleColor}`}>
                    {slide.columns?.[1]?.heading || 'Key Considerations'}
                  </h3>
                  {slide.columns?.[1]?.badge && (
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${theme.badgeBg}`}>
                      {slide.columns[1].badge}
                    </span>
                  )}
                </div>
                <ul className="space-y-2 text-xs sm:text-sm">
                  {(slide.columns?.[1]?.bullets || slide.bullet_points?.slice(3, 6) || []).map((b, i) => (
                    <li key={i} className={`flex items-start gap-2 ${theme.bodyColor}`}>
                      <CheckCircle2 size={15} className={`shrink-0 mt-0.5 ${theme.accentText}`} />
                      <span className="leading-snug">{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* 3. PROCESS / TIMELINE / STEPS LAYOUT */}
        {(slide.layout === 'process' || slide.layout === 'timeline' || slide.layout === 'steps') && (
          <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4 h-full items-stretch">
            {(slide.steps || [
              { step: 1, title: 'Phase 1: Ingestion', description: 'Analyze baseline structure.' },
              { step: 2, title: 'Phase 2: Architecture', description: 'Design modular pipelines.' },
              { step: 3, title: 'Phase 3: Rollout', description: 'Execute integration tests.' },
              { step: 4, title: 'Phase 4: Optimization', description: 'Continuous performance scaling.' }
            ]).slice(0, 4).map((stepItem, i) => (
              <div
                key={i}
                className={`p-3 sm:p-4 rounded-xl border ${theme.cardBorder} ${theme.cardBg} flex flex-col justify-between shadow-xs relative overflow-hidden group`}
              >
                <div className="space-y-2">
                  <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${theme.badgeBg}`}>
                    STEP {stepItem.step || i + 1}
                  </span>
                  <h4 className={`font-bold text-xs sm:text-base ${theme.titleColor} leading-tight`}>
                    {stepItem.title}
                  </h4>
                  <p className={`text-[11px] sm:text-xs ${theme.bodyColor} leading-relaxed line-clamp-4`}>
                    {stepItem.description}
                  </p>
                </div>
                <div className={`mt-3 pt-2 border-t border-slate-200/40 dark:border-slate-700/40 flex items-center justify-between text-[10px] ${theme.subtitleColor}`}>
                  <span>Stage {i + 1}</span>
                  <ArrowRight size={12} className={theme.accentText} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 4. STATS / METRICS CARDS LAYOUT */}
        {slide.layout === 'stats' && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 h-full items-stretch">
            {(slide.stats || [
              { value: '99.9%', label: 'Uptime', description: 'High availability standard.' },
              { value: '3.8x', label: 'Speedup', description: 'Compute performance gain.' },
              { value: '45%', label: 'Cost Savings', description: 'Resource optimization.' },
              { value: '<25ms', label: 'Latency', description: 'P99 response time.' }
            ]).slice(0, 4).map((stat, i) => (
              <div
                key={i}
                className={`p-4 rounded-xl border ${theme.cardBorder} ${theme.cardBg} flex flex-col justify-center text-center space-y-1 shadow-xs`}
              >
                <div className={`text-2xl sm:text-4xl font-black ${theme.accentText} tracking-tight`}>
                  {stat.value}
                </div>
                <div className={`font-bold text-xs sm:text-sm ${theme.titleColor}`}>
                  {stat.label}
                </div>
                {stat.description && (
                  <div className={`text-[10px] sm:text-xs ${theme.bodyColor} line-clamp-2 mt-1`}>
                    {stat.description}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* 5. TABLE LAYOUT */}
        {slide.layout === 'table' && slide.table_data && (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-xs sm:text-sm border-collapse rounded-xl overflow-hidden shadow-xs">
              <thead>
                <tr className={`${theme.headerBarBg} text-white`}>
                  {slide.table_data.headers.map((h, i) => (
                    <th key={i} className="p-2.5 sm:p-3 font-bold border-b border-white/10">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-slate-800' : 'divide-slate-200'}`}>
                {slide.table_data.rows.map((row, r_idx) => (
                  <tr key={r_idx} className={r_idx % 2 === 0 ? theme.cardBg : 'bg-transparent'}>
                    {row.map((cell, c_idx) => (
                      <td key={c_idx} className={`p-2.5 sm:p-3 ${theme.bodyColor} text-xs font-medium`}>
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 6. DEFAULT / BULLETS / CONCLUSION LAYOUT */}
        {slide.layout !== 'two-column' &&
          slide.layout !== 'comparison' &&
          slide.layout !== 'process' &&
          slide.layout !== 'timeline' &&
          slide.layout !== 'steps' &&
          slide.layout !== 'stats' &&
          slide.layout !== 'table' && (
            <div className="flex flex-col justify-center space-y-4">
              {slide.content && (
                <p className={`text-xs sm:text-base font-semibold ${theme.subtitleColor} leading-relaxed`}>
                  {slide.content}
                </p>
              )}

              <ul className="space-y-2.5 sm:space-y-3">
                {(slide.bullet_points || []).map((bullet, i) => (
                  <li key={i} className="flex items-start gap-2.5 sm:gap-3">
                    <span className={`w-2 h-2 rounded-full ${theme.accentBg} shrink-0 mt-2`} />
                    {isEditable && !isThumbnail ? (
                      <input
                        type="text"
                        value={bullet}
                        onChange={(e) => handleBulletChange(i, e.target.value)}
                        className={`text-xs sm:text-base font-medium ${theme.titleColor} bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none flex-1`}
                      />
                    ) : (
                      <span className={`text-xs sm:text-base font-medium ${theme.titleColor} leading-relaxed`}>
                        {bullet}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
      </div>

      {/* Slide Footer */}
      <div className="pt-2 border-t border-slate-200/40 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
        <span className="truncate max-w-[70%]">
          {slide.visual_hint || 'seeSpeak AI Presentation Studio'}
        </span>
        <span className="font-mono">Slide {slide.slide_number}</span>
      </div>
    </div>
  );
};
