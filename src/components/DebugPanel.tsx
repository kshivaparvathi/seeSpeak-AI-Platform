'use client';

import React, { useState } from 'react';
import { Bug, ChevronDown, ChevronUp, Terminal, Cpu, FileBox, Globe, CheckCircle2 } from 'lucide-react';
import { AgentMode, SupportedLanguage, UploadedFile } from '@/lib/types';

interface DebugPanelProps {
  inputType: string;
  selectedLanguage: SupportedLanguage;
  detectedLanguage: SupportedLanguage;
  activeModel: string;
  files: UploadedFile[];
  detectedMode: AgentMode;
  lastResponseLength?: number;
  status: string;
}

export const DebugPanel: React.FC<DebugPanelProps> = ({
  inputType,
  selectedLanguage,
  detectedLanguage,
  activeModel,
  files,
  detectedMode,
  lastResponseLength = 0,
  status,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-2 right-4 z-40 select-none">
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 text-xs font-mono shadow-xl backdrop-blur-md transition-all"
        title="Toggle Developer Diagnostics"
      >
        <Bug size={13} className="text-amber-400" />
        <span>Debug: {inputType}</span>
        {isOpen ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
      </button>

      {/* Expanded panel */}
      {isOpen && (
        <div className="absolute bottom-10 right-0 w-80 sm:w-96 p-4 rounded-2xl bg-slate-950/95 border border-slate-700/90 shadow-2xl text-xs font-mono text-slate-300 space-y-3 backdrop-blur-xl animate-fadeIn">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-slate-400">
            <span className="flex items-center gap-1.5 font-bold text-white">
              <Terminal size={14} className="text-indigo-400" /> Multimodal Pipeline
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
              Live Gemini
            </span>
          </div>

          <div className="space-y-1.5 text-[11px]">
            <div className="flex justify-between py-0.5 border-b border-slate-800/60">
              <span className="text-slate-500">Pipeline Route:</span>
              <span className="font-semibold text-indigo-300">{inputType}</span>
            </div>

            <div className="flex justify-between py-0.5 border-b border-slate-800/60">
              <span className="text-slate-500">Gemini Model:</span>
              <span className="text-emerald-300 font-semibold">{activeModel}</span>
            </div>

            <div className="flex justify-between py-0.5 border-b border-slate-800/60">
              <span className="text-slate-500">Selected Language:</span>
              <span className="text-slate-200 uppercase">{selectedLanguage}</span>
            </div>

            <div className="flex justify-between py-0.5 border-b border-slate-800/60">
              <span className="text-slate-500">Effective Language:</span>
              <span className="text-amber-300 uppercase font-bold">{detectedLanguage}</span>
            </div>

            <div className="flex justify-between py-0.5 border-b border-slate-800/60">
              <span className="text-slate-500">Active Mode:</span>
              <span className="text-purple-300 capitalize">{detectedMode}</span>
            </div>

            <div className="flex justify-between py-0.5 border-b border-slate-800/60">
              <span className="text-slate-500">Attached Files:</span>
              <span className="text-slate-200 font-bold">{files.length}</span>
            </div>

            {files.length > 0 && (
              <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 space-y-1 mt-1">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center justify-between text-[10px]">
                    <span className="truncate max-w-[170px] text-slate-300">{f.name}</span>
                    <span className="text-slate-500 uppercase">{f.type}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-between py-0.5 pt-1">
              <span className="text-slate-500">Current Status:</span>
              <span className="text-slate-400 italic truncate max-w-[200px]">{status || 'Ready'}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
