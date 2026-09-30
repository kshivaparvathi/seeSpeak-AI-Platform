import React from 'react';
import { FEATURES } from '../config/features';
import { SupportedLanguage } from '../types';
import { getLanguageInfo } from '../config/languages';
import { 
  FileText, 
  Image as ImageIcon, 
  Mic, 
  Headphones, 
  Video, 
  BarChart3, 
  ArrowRight, 
  Sparkles, 
  Zap, 
  Compass
} from 'lucide-react';

interface HomePageProps {
  onNavigate: (route: string) => void;
  selectedLanguage: SupportedLanguage;
  onSelectPrompt: (prompt: string, featureId: string) => void;
  onShowIntro?: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  onNavigate,
  selectedLanguage,
  onSelectPrompt,
  onShowIntro,
}) => {
  const langInfo = getLanguageInfo(selectedLanguage);

  const getFeatureIcon = (id: string) => {
    switch (id) {
      case 'document-analysis':
        return <FileText size={22} className="text-blue-400" />;
      case 'visual-intelligence':
        return <ImageIcon size={22} className="text-purple-400" />;
      case 'ai-interview':
        return <Mic size={22} className="text-rose-400" />;
      case 'customer-support':
        return <Headphones size={22} className="text-emerald-400" />;
      case 'video-audio-review':
        return <Video size={22} className="text-amber-400" />;
      case 'data-study':
      default:
        return <BarChart3 size={22} className="text-indigo-400" />;
    }
  };

  const samplePrompts = [
    { text: 'Explain how modern multimodal AI models work', featureId: 'data-study', langHint: '💡 Concept' },
    { text: 'Analyze this Operating Systems PDF in Telugu', featureId: 'document-analysis', langHint: '🇮🇳 Telugu' },
    { text: 'Practice software engineer mock interview', featureId: 'ai-interview', langHint: '🎤 Live Voice' },
    { text: 'Debug error screenshot and show the code fix', featureId: 'visual-intelligence', langHint: '💻 Vision' },
    { text: 'Contact customer service about my subscription', featureId: 'customer-support', langHint: '🎧 Support' },
    { text: 'Summarize meeting audio notes in Marathi', featureId: 'video-audio-review', langHint: '🇮🇳 Marathi' },
  ];

  return (
    <div className="relative min-h-full flex-1 flex flex-col justify-between max-w-6xl mx-auto px-4 py-8 md:py-12 select-none animate-fadeIn overflow-y-auto">
      {/* Background Depth Lights */}
      <div className="absolute top-10 left-1/3 w-96 h-96 bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-80 h-80 bg-purple-600/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Top Banner Tag */}
      <div className="flex items-center justify-between w-full mb-8">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-slate-800 text-xs text-slate-300 shadow-sm">
          <Sparkles size={13} className="text-indigo-400" />
          <span>Multimodal AI Workspace</span>
          <span className="w-1 h-1 rounded-full bg-slate-600" />
          <span className="text-slate-400">{langInfo.name}</span>
        </div>

        {onShowIntro && (
          <button
            onClick={onShowIntro}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-850 border border-slate-800 text-xs text-slate-400 hover:text-white transition-colors"
          >
            <Compass size={14} />
            <span>Intro Screen</span>
          </button>
        )}
      </div>

      {/* Hero Section */}
      <div className="text-center max-w-3xl mx-auto mb-10">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-tight mb-3">
          Specialized AI Workspaces
        </h1>
        <p className="text-sm md:text-base text-slate-400 max-w-xl mx-auto font-light leading-relaxed">
          Select a dedicated module below. Each workspace maintains its own isolated conversation, file context, and specialized reasoning model.
        </p>
      </div>

      {/* Six Floating AI Modules */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4.5 w-full mb-12">
        {FEATURES.map((feature) => (
          <button
            key={feature.id}
            onClick={() => onNavigate(feature.route)}
            className={`relative p-5 rounded-2xl bg-gradient-to-br ${feature.colorScheme.bg} bg-slate-900/70 border ${feature.colorScheme.border} backdrop-blur-md transition-all duration-200 hover:-translate-y-1.5 hover:shadow-2xl group flex flex-col justify-between text-left cursor-pointer overflow-hidden`}
            style={{
              boxShadow: `0 8px 30px rgba(0, 0, 0, 0.4)`,
            }}
          >
            {/* Top Row: Icon + Arrow */}
            <div>
              <div className="flex items-start justify-between mb-4 w-full">
                <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60 shadow-inner group-hover:scale-110 transition-transform">
                  {getFeatureIcon(feature.id)}
                </div>
                <div className="w-7 h-7 rounded-lg bg-slate-800/50 border border-slate-700/40 flex items-center justify-center text-slate-500 group-hover:text-white group-hover:translate-x-0.5 transition-all">
                  <ArrowRight size={14} />
                </div>
              </div>

              {/* Title & Tagline */}
              <h3 className="font-bold text-white text-base md:text-lg group-hover:text-indigo-300 transition-colors">
                {feature.title}
              </h3>
              <div className="text-[11px] font-mono text-indigo-400/80 mb-2">
                {feature.tagline}
              </div>
              <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                {feature.description}
              </p>
            </div>

            {/* Bottom Status / Enter Badge */}
            <div className="mt-5 pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500 font-medium">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/80" />
                Isolated Workspace
              </span>
              <span className="text-indigo-400 group-hover:translate-x-0.5 transition-transform font-mono">
                Launch →
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* Suggested Quick Starters */}
      <div className="w-full max-w-3xl mx-auto text-left">
        <div className="flex items-center gap-2 mb-3">
          <Zap size={14} className="text-amber-400" />
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Quick Prompts
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {samplePrompts.map((p, idx) => (
            <button
              key={idx}
              onClick={() => onSelectPrompt(p.text, p.featureId)}
              className="group flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900/80 hover:bg-slate-850 border border-slate-800 hover:border-indigo-500/40 text-xs text-slate-300 hover:text-white transition-all shadow-sm cursor-pointer"
            >
              <span>{p.text}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                {p.langHint}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
