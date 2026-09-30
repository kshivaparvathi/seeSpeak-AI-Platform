'use client';

import React from 'react';
import { 
  Mic, 
  Image as ImageIcon, 
  FileText, 
  Video, 
  BarChart3, 
  Lightbulb, 
  ArrowRight,
  Sparkles,
  Zap,
  Globe2
} from 'lucide-react';
import { SupportedLanguage } from '@/lib/types';
import { getLanguageInfo } from '@/lib/languages';

interface WelcomeScreenProps {
  onSelectPrompt: (prompt: string) => void;
  onOpenVoice: () => void;
  onTriggerFileUpload: (type: 'image' | 'pdf' | 'video' | 'data') => void;
  currentLanguage: SupportedLanguage;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  onSelectPrompt,
  onOpenVoice,
  onTriggerFileUpload,
  currentLanguage,
}) => {
  const langInfo = getLanguageInfo(currentLanguage);

  const quickActions = [
    {
      title: 'Talk to AI',
      desc: 'Real-time conversational voice in your language',
      icon: <Mic className="text-rose-400" size={22} />,
      color: 'from-rose-500/20 to-pink-500/10 border-rose-500/30 hover:border-rose-400',
      action: onOpenVoice,
    },
    {
      title: 'Analyze an Image',
      desc: 'Diagrams, OCR, error screenshots & visual Q&A',
      icon: <ImageIcon className="text-purple-400" size={22} />,
      color: 'from-purple-500/20 to-indigo-500/10 border-purple-500/30 hover:border-purple-400',
      action: () => onTriggerFileUpload('image'),
    },
    {
      title: 'Analyze a PDF',
      desc: 'Extract key points, summaries & study notes',
      icon: <FileText className="text-blue-400" size={22} />,
      color: 'from-blue-500/20 to-cyan-500/10 border-blue-500/30 hover:border-blue-400',
      action: () => onTriggerFileUpload('pdf'),
    },
    {
      title: 'Analyze a Video',
      desc: 'Lecture concepts, scenes & discussion review',
      icon: <Video className="text-amber-400" size={22} />,
      color: 'from-amber-500/20 to-yellow-500/10 border-amber-500/30 hover:border-amber-400',
      action: () => onTriggerFileUpload('video'),
    },
    {
      title: 'Analyze Data',
      desc: 'Spreadsheets (CSV, XLSX) & table metrics',
      icon: <BarChart3 className="text-emerald-400" size={22} />,
      color: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/30 hover:border-emerald-400',
      action: () => onTriggerFileUpload('data'),
    },
    {
      title: 'Ask Anything',
      desc: 'Code, concepts, multilingual Q&A & tutoring',
      icon: <Lightbulb className="text-yellow-400" size={22} />,
      color: 'from-indigo-500/20 to-violet-500/10 border-indigo-500/30 hover:border-indigo-400',
      action: () => onSelectPrompt('Explain how modern multimodal AI models work'),
    },
  ];

  const examplePrompts = [
    { text: 'Explain photosynthesis in Telugu', langHint: '🇮🇳 Telugu' },
    { text: 'Summarize this PDF in Telugu with key points', langHint: '📄 Doc + Telugu' },
    { text: 'Debug this code error and show the fix', langHint: '💻 Dev' },
    { text: 'Explain this diagram step-by-step', langHint: '👁️ Vision' },
    { text: 'Create 5 exam study questions with solutions', langHint: '🎓 Study' },
    { text: 'Compare the architecture between these files', langHint: '🔬 Multimodal' },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 md:py-12 flex flex-col items-center justify-center text-center animate-fadeIn select-none">
      {/* Top Banner Tag */}
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold mb-6 shadow-sm">
        <Sparkles size={14} className="text-indigo-400 animate-spin" style={{ animationDuration: '8s' }} />
        <span>Next-Gen Voice + Multimodal Intelligence</span>
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        <span className="text-slate-400 font-normal">Active in {langInfo.name}</span>
      </div>

      {/* Main Headings */}
      <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight leading-tight md:leading-tight mb-3">
        Your AI. Your Voice. Your Files.
      </h1>
      <p className="text-base md:text-xl text-slate-300 max-w-2xl font-light mb-8">
        Talk, upload, explore, learn and create — in the language you choose.
      </p>

      {/* Quick Action Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 w-full mb-10 text-left">
        {quickActions.map((action, idx) => (
          <button
            key={idx}
            onClick={action.action}
            className={`p-4 rounded-2xl bg-gradient-to-br ${action.color} bg-slate-900/60 backdrop-blur-sm border transition-all duration-200 hover:-translate-y-1 hover:shadow-xl group flex flex-col justify-between`}
          >
            <div className="flex items-start justify-between mb-3 w-full">
              <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60 shadow-inner group-hover:scale-110 transition-transform">
                {action.icon}
              </div>
              <ArrowRight
                size={16}
                className="text-slate-500 group-hover:text-white group-hover:translate-x-1 transition-all"
              />
            </div>
            <div>
              <h3 className="font-semibold text-white text-sm md:text-base group-hover:text-indigo-300 transition-colors">
                {action.title}
              </h3>
              <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                {action.desc}
              </p>
            </div>
          </button>
        ))}
      </div>

      {/* Example Prompt Chips */}
      <div className="w-full text-left">
        <div className="flex items-center gap-2 mb-3">
          <Zap size={14} className="text-amber-400" />
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Try Asking
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {examplePrompts.map((p, idx) => (
            <button
              key={idx}
              onClick={() => onSelectPrompt(p.text)}
              className="group flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-850 hover:bg-slate-800 border border-slate-700/80 text-xs md:text-sm text-slate-200 hover:text-white transition-all hover:border-indigo-500/50 shadow-sm"
            >
              <span>{p.text}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 group-hover:border-indigo-500/30 group-hover:text-indigo-300">
                {p.langHint}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
