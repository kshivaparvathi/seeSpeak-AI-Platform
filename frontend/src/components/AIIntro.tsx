import React, { useState } from 'react';
import { AIOrb } from './AIOrb';
import { FEATURES } from '../config/features';
import { 
  ArrowRight, 
  Sparkles, 
  Mic, 
  Eye, 
  FileText, 
  BarChart3, 
  Video, 
  Globe2, 
  Headphones,
  CheckCircle2,
  ChevronDown
} from 'lucide-react';

interface AIIntroProps {
  onEnter: () => void;
  onSelectFeature?: (route: string) => void;
}

export const AIIntro: React.FC<AIIntroProps> = ({ onEnter, onSelectFeature }) => {
  const [orbState, setOrbState] = useState<'idle' | 'listening' | 'thinking'>('idle');
  const [isEntering, setIsEntering] = useState(false);

  const handleEnterClick = () => {
    setIsEntering(true);
    setTimeout(() => {
      onEnter();
    }, 200);
  };

  const handleFeatureClick = (route: string) => {
    if (onSelectFeature) {
      onSelectFeature(route);
    } else {
      handleEnterClick();
    }
  };

  const getFeatureIcon = (id: string) => {
    switch (id) {
      case 'document-analysis':
        return <FileText size={20} className="text-blue-400" />;
      case 'visual-intelligence':
        return <Eye size={20} className="text-purple-400" />;
      case 'ai-interview':
        return <Mic size={20} className="text-rose-400" />;
      case 'customer-support':
        return <Headphones size={20} className="text-emerald-400" />;
      case 'video-audio-review':
        return <Video size={20} className="text-amber-400" />;
      case 'data-study':
      default:
        return <BarChart3 size={20} className="text-indigo-400" />;
    }
  };

  return (
    <div
      className={`relative w-full min-h-screen flex flex-col justify-between p-4 sm:p-8 md:p-12 overflow-y-auto bg-[#030712] text-slate-100 select-none transition-opacity duration-300 ${
        isEntering ? 'opacity-0 scale-[0.99]' : 'opacity-100 scale-100'
      }`}
      style={{
        backgroundImage: `
          radial-gradient(circle at 50% 15%, rgba(99, 102, 241, 0.1) 0%, transparent 60%),
          radial-gradient(circle at 80% 70%, rgba(139, 92, 246, 0.05) 0%, transparent 50%),
          radial-gradient(circle at 20% 85%, rgba(30, 58, 138, 0.06) 0%, transparent 45%)
        `,
      }}
    >
      {/* Subtle Fine Grid Texture */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.035]"
        style={{
          backgroundImage: `linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)`,
          backgroundSize: '48px 48px',
        }}
      />

      {/* Top Header Bar */}
      <header className="relative z-10 w-full max-w-6xl mx-auto flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-indigo-400 shadow-sm">
            <Sparkles size={16} />
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold tracking-widest text-xs uppercase text-slate-200 font-mono">
              SEE SPEAK AI
            </span>
            <span className="text-[10px] text-slate-500 font-mono">Real-Time Multimodal Intelligence</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/90 border border-slate-800 text-[11px] text-slate-400 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Gemini Live Engine Active</span>
          </div>
          <button
            onClick={handleEnterClick}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600/90 hover:bg-indigo-500 text-white text-xs font-medium shadow-sm transition-all cursor-pointer"
          >
            <span>Open Dashboard</span>
            <ArrowRight size={13} />
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 w-full max-w-4xl mx-auto flex flex-col items-center text-center px-4 py-6 md:py-10">
        {/* Capability Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-950/50 border border-indigo-500/30 text-indigo-300 text-xs font-medium mb-6 shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping" />
          <span>Multimodal AI • Isolated Contexts • Live Voice</span>
        </div>

        {/* Central 3D AI Orb with subtle breathing & hover responsiveness */}
        <div
          className="my-3 md:my-5 transition-transform duration-500 ease-out hover:scale-105"
          onMouseEnter={() => setOrbState('thinking')}
          onMouseLeave={() => setOrbState('idle')}
        >
          <AIOrb size="hero" state={orbState} interactive={true} />
        </div>

        {/* Main Title Hierarchy */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight leading-[1.08] mb-4 text-white">
          See. Speak. Understand.
        </h1>

        <p className="text-base sm:text-lg md:text-xl text-slate-400 max-w-2xl font-normal mb-8 leading-relaxed">
          One intelligent multimodal workspace for voice, vision, files, media and data.
        </p>

        {/* Primary CTA Button */}
        <div className="flex flex-col items-center gap-4 mb-10">
          <button
            onClick={handleEnterClick}
            className="group relative inline-flex items-center gap-3 px-8 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm md:text-base shadow-xl shadow-indigo-600/25 hover:shadow-indigo-600/40 border border-indigo-400/20 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
          >
            <span>Enter seeSpeak AI</span>
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </button>

          {/* Supporting Micro-copy */}
          <div className="flex flex-wrap justify-center items-center gap-2.5 text-xs text-slate-500 font-mono tracking-wide">
            <span className="flex items-center gap-1.5 text-slate-300">
              <Mic size={13} className="text-rose-400" /> Voice
            </span>
            <span className="text-slate-700">•</span>
            <span className="flex items-center gap-1.5 text-slate-300">
              <Eye size={13} className="text-purple-400" /> Vision
            </span>
            <span className="text-slate-700">•</span>
            <span className="flex items-center gap-1.5 text-slate-300">
              <FileText size={13} className="text-blue-400" /> Files
            </span>
            <span className="text-slate-700">•</span>
            <span className="flex items-center gap-1.5 text-slate-300">
              <Video size={13} className="text-amber-400" /> Media
            </span>
            <span className="text-slate-700">•</span>
            <span className="flex items-center gap-1.5 text-slate-300">
              <BarChart3 size={13} className="text-emerald-400" /> Data
            </span>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="flex items-center gap-1.5 text-slate-500 text-xs font-mono animate-bounce mt-2 mb-6">
          <span>Explore 6 Workspaces Below</span>
          <ChevronDown size={14} />
        </div>
      </main>

      {/* Six Workspaces Section on the Landing Page */}
      <section className="relative z-10 w-full max-w-6xl mx-auto my-8 px-4">
        <div className="flex items-center justify-between mb-6 pb-3 border-b border-slate-900">
          <div>
            <h2 className="text-lg md:text-xl font-bold text-white tracking-tight">
              Six Dedicated AI Modules
            </h2>
            <p className="text-xs text-slate-400">
              Each workspace maintains completely isolated context, files, and reasoning.
            </p>
          </div>
          <button
            onClick={handleEnterClick}
            className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-mono cursor-pointer"
          >
            <span>View All</span>
            <ArrowRight size={13} />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((feat) => (
            <div
              key={feat.id}
              onClick={() => handleFeatureClick(feat.route)}
              className="group p-5 rounded-2xl bg-slate-900/80 hover:bg-slate-850 border border-slate-800 hover:border-indigo-500/40 transition-all duration-200 hover:-translate-y-1 shadow-lg hover:shadow-xl cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2.5 rounded-xl bg-slate-800 border border-slate-700/60 group-hover:scale-105 transition-transform">
                    {getFeatureIcon(feat.id)}
                  </div>
                  <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                    <CheckCircle2 size={11} />
                    <span>Isolated</span>
                  </span>
                </div>
                <h3 className="font-bold text-white text-base group-hover:text-indigo-300 transition-colors mb-1">
                  {feat.title}
                </h3>
                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                  {feat.description}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs text-indigo-400 font-medium">
                <span>Launch Module</span>
                <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Bottom Footer Details */}
      <footer className="relative z-10 w-full max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 font-mono border-t border-slate-900 pt-6 mt-12 gap-3">
        <span>Production Architecture • SQLite Grounded</span>
        <span>Feature-Scoped Contexts • Low Latency Voice • 11+ Languages</span>
      </footer>
    </div>
  );
};
