'use client';

import React from 'react';
import { 
  Sparkles, 
  GraduationCap, 
  Volume2, 
  Settings as SettingsIcon, 
  Plus, 
  Menu,
  Moon,
  Sun,
  Bot
} from 'lucide-react';
import { AgentMode, SupportedLanguage } from '@/lib/types';
import { SUPPORTED_LANGUAGES } from '@/lib/languages';

interface HeaderProps {
  currentLanguage: SupportedLanguage;
  onLanguageChange: (lang: SupportedLanguage) => void;
  detectedMode: AgentMode;
  learningMode: boolean;
  onToggleLearningMode: () => void;
  voiceStatus: 'idle' | 'listening' | 'speaking';
  onNewChat: () => void;
  onOpenSettings: () => void;
  onToggleSidebar: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

const MODE_LABELS: Record<AgentMode, { label: string; icon: string; color: string }> = {
  general: { label: 'General AI', icon: '⚡', color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' },
  study: { label: 'Study Tutor', icon: '🎓', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  developer: { label: 'Dev Assistant', icon: '💻', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  document: { label: 'Doc Analyst', icon: '📄', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  vision: { label: 'Vision AI', icon: '👁️', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  meeting: { label: 'Meeting Note', icon: '👥', color: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
  research: { label: 'Research Pro', icon: '🔬', color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' },
};

export const Header: React.FC<HeaderProps> = ({
  currentLanguage,
  onLanguageChange,
  detectedMode,
  learningMode,
  onToggleLearningMode,
  voiceStatus,
  onNewChat,
  onOpenSettings,
  onToggleSidebar,
  theme,
  onToggleTheme,
}) => {
  const modeInfo = MODE_LABELS[detectedMode] || MODE_LABELS.general;

  return (
    <header className="h-16 px-3 md:px-6 border-b border-slate-800/80 bg-slate-900/80 backdrop-blur-md flex items-center justify-between sticky top-0 z-30 select-none">
      {/* Left: Mobile Menu + Logo + Mode Badge */}
      <div className="flex items-center gap-2 md:gap-4">
        <button
          onClick={onToggleSidebar}
          aria-label="Toggle Sidebar"
          className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 transition-colors lg:hidden"
        >
          <Menu size={20} />
        </button>

        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/25 ring-1 ring-white/20">
            <Sparkles size={18} className="text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold tracking-tight text-lg text-white font-sans">
                AURA
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                PRO
              </span>
            </div>
          </div>
        </div>

        {/* Auto-detected Mode Badge */}
        <div
          title="Auto-detected conversation mode based on your input"
          className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${modeInfo.color} transition-all`}
        >
          <span>{modeInfo.icon}</span>
          <span>{modeInfo.label}</span>
        </div>
      </div>

      {/* Middle/Right: Controls */}
      <div className="flex items-center gap-1.5 md:gap-3">
        {/* Learning Mode Switch */}
        <button
          onClick={onToggleLearningMode}
          title="Toggle Learning Mode (Interactive Socratic Tutoring)"
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
            learningMode
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm shadow-amber-500/20'
              : 'bg-slate-800/60 text-slate-400 border-slate-700/60 hover:text-slate-200'
          }`}
        >
          <GraduationCap size={15} className={learningMode ? 'text-amber-400 animate-bounce' : ''} />
          <span className="hidden md:inline">Learning Mode</span>
          <span
            className={`w-2 h-2 rounded-full ${
              learningMode ? 'bg-amber-400 shadow-sm shadow-amber-400' : 'bg-slate-600'
            }`}
          />
        </button>

        {/* Language Selector */}
        <div className="relative">
          <select
            value={currentLanguage}
            onChange={(e) => onLanguageChange(e.target.value as SupportedLanguage)}
            className="bg-slate-800/90 text-slate-200 text-xs md:text-sm font-medium py-1.5 pl-2.5 pr-7 rounded-lg border border-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer appearance-none"
            title="Select AI Response Language"
          >
            {SUPPORTED_LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code} className="bg-slate-900 text-slate-100 py-1">
                {lang.flag} {lang.name} ({lang.nativeName})
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 20 20">
              <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
            </svg>
          </div>
        </div>

        {/* Voice Status Indicator */}
        <div
          title={`Voice Engine: ${voiceStatus.toUpperCase()}`}
          className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono transition-all ${
            voiceStatus === 'listening'
              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
              : voiceStatus === 'speaking'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              : 'bg-slate-800/50 text-slate-400 border border-slate-700/50'
          }`}
        >
          <Volume2 size={14} className={voiceStatus === 'speaking' ? 'animate-bounce text-emerald-400' : ''} />
          <span className="capitalize">{voiceStatus}</span>
        </div>

        {/* New Chat Button */}
        <button
          onClick={onNewChat}
          title="Start New Conversation"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium shadow-md shadow-indigo-600/20 transition-all hover:scale-[1.02]"
        >
          <Plus size={15} />
          <span className="hidden sm:inline">New Chat</span>
        </button>

        {/* Settings Button */}
        <button
          onClick={onOpenSettings}
          title="Settings & API Key"
          className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 transition-colors"
        >
          <SettingsIcon size={18} />
        </button>
      </div>
    </header>
  );
};
