import React, { useState } from 'react';
import { InterviewSoundBox } from '../InterviewSoundBox';
import { SupportedLanguage } from '../../types';
import { ResumeData, TemplateId } from '../../types/resume';
import { 
  Mic, 
  Sparkles, 
  Send, 
  MessageSquare, 
  CheckCircle2, 
  AlertCircle, 
  Wand2, 
  Keyboard, 
  Layers 
} from 'lucide-react';

interface VoiceResumeAssistantProps {
  onVoiceExtracted: (spokenText: string) => Promise<void>;
  onVoiceCommand: (command: string) => Promise<string | void>;
  selectedLanguage: SupportedLanguage;
  isLoading: boolean;
  activeTemplateId: TemplateId;
}

export const VoiceResumeAssistant: React.FC<VoiceResumeAssistantProps> = ({
  onVoiceExtracted,
  onVoiceCommand,
  selectedLanguage,
  isLoading,
  activeTemplateId,
}) => {
  const [mode, setMode] = useState<'dictate' | 'command'>('dictate');
  const [typedInput, setTypedInput] = useState('');
  const [lastActionResult, setLastActionResult] = useState<string | null>(null);

  const handleSpeechCaptured = async (spokenText: string) => {
    if (!spokenText.trim()) return;
    if (mode === 'dictate') {
      await onVoiceExtracted(spokenText);
    } else {
      const res = await onVoiceCommand(spokenText);
      if (res) {
        setLastActionResult(res);
        setTimeout(() => setLastActionResult(null), 5000);
      }
    }
  };

  const handleTypedSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!typedInput.trim()) return;
    const text = typedInput.trim();
    setTypedInput('');
    if (mode === 'dictate') {
      await onVoiceExtracted(text);
    } else {
      const res = await onVoiceCommand(text);
      if (res) {
        setLastActionResult(res);
        setTimeout(() => setLastActionResult(null), 5000);
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Mode Toggle Pills */}
      <div className="flex items-center gap-2 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
        <button
          onClick={() => setMode('dictate')}
          className={`flex-1 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            mode === 'dictate'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <Mic size={13} />
          <span>Dictate Credentials (Merge)</span>
        </button>
        <button
          onClick={() => setMode('command')}
          className={`flex-1 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            mode === 'command'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <Wand2 size={13} />
          <span>Voice Commands & Edits</span>
        </button>
      </div>

      {/* Mode Description Notice */}
      {mode === 'dictate' ? (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 text-xs text-emerald-900 dark:text-emerald-200 leading-relaxed">
          <strong className="block mb-0.5">🎙 Natural Data Entry:</strong>
          Speak freely about your degree, college, CGPA, skills, or projects. AI extracts structured information and merges it into your resume without erasing earlier entries!
        </div>
      ) : (
        <div className="p-3.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/40 text-xs text-indigo-900 dark:text-indigo-200 leading-relaxed space-y-1">
          <strong className="block">⚡ Resume Voice Commands:</strong>
          <p className="text-[11px] opacity-90">
            You can give direct natural commands such as:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px] font-mono opacity-80 pt-0.5">
            <div>• "Add Python to my skills"</div>
            <div>• "Move projects above education"</div>
            <div>• "Make this resume one page"</div>
            <div>• "Switch to ATS Classic template"</div>
            <div>• "Change target role to Software Engineer"</div>
            <div>• "Make my summary shorter"</div>
          </div>
        </div>
      )}

      {lastActionResult && (
        <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 text-xs font-semibold text-emerald-900 dark:text-emerald-200 flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
          <span>{lastActionResult}</span>
        </div>
      )}

      {/* Real Interactive SoundBox */}
      <InterviewSoundBox
        onSpeechCaptured={handleSpeechCaptured}
        isProcessing={isLoading}
        isAiSpeaking={false}
        selectedLanguage={selectedLanguage}
        title={mode === 'dictate' ? '● Voice Dictation Ready' : '● Voice Command Ready'}
        idlePlaceholder={
          mode === 'dictate'
            ? 'Click [ START ] and speak your background or projects naturally...'
            : 'Click [ START ] and speak a command (e.g. "Add Docker to my skills")...'
        }
        startLabel={mode === 'dictate' ? '🎤 START SPEAKING' : '🎙 SPEAK COMMAND'}
        stopLabel={mode === 'dictate' ? '■ STOP & EXTRACT' : '■ RUN COMMAND'}
        disabled={isLoading}
      />

      {/* Alternative: Typed Input Bar */}
      <div className="pt-2">
        <form onSubmit={handleTypedSubmit} className="flex items-center gap-2">
          <div className="relative flex-1">
            <Keyboard size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={typedInput}
              onChange={(e) => setTypedInput(e.target.value)}
              placeholder={
                mode === 'dictate'
                  ? 'Or type details here (e.g. "My CGPA is 9.63 at CBIT, I know Java and Python")...'
                  : 'Or type a command (e.g. "Add MySQL to my skills", "Make summary shorter")...'
              }
              className="w-full pl-8 pr-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <button
            type="submit"
            disabled={!typedInput.trim() || isLoading}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-bold transition-all cursor-pointer disabled:opacity-40"
          >
            <Send size={13} />
          </button>
        </form>
      </div>
    </div>
  );
};
