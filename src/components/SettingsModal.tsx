'use client';

import React, { useEffect, useState } from 'react';
import { 
  X, 
  Settings as SettingsIcon, 
  Key, 
  Volume2, 
  Sparkles, 
  Trash2, 
  Check, 
  Globe2, 
  Moon, 
  Sun,
  ShieldAlert
} from 'lucide-react';
import { AppSettings, PersonalityMode, SupportedLanguage } from '@/lib/types';
import { SUPPORTED_LANGUAGES } from '@/lib/languages';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSaveSettings: (settings: AppSettings) => void;
  onClearHistory: () => void;
  onClearCurrentFiles: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  onClearHistory,
  onClearCurrentFiles,
}) => {
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const loadVoices = () => {
        const v = window.speechSynthesis.getVoices();
        setAvailableVoices(v);
      };
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveSettings(localSettings);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-fadeIn select-none">
      <div className="relative w-full max-w-xl max-h-[90vh] rounded-3xl bg-slate-900 border border-slate-700/80 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400">
              <SettingsIcon size={18} />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">AURA Settings</h3>
              <p className="text-xs text-slate-400">Configure AI provider, voice, and preferences</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm">
          {/* Section: API Provider & Key */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 uppercase tracking-wider">
              <Key size={14} className="text-indigo-400" />
              <span>AI Provider & API Key</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setLocalSettings({ ...localSettings, provider: 'gemini' })}
                className={`p-3 rounded-xl border text-left text-xs transition-all ${
                  localSettings.provider === 'gemini'
                    ? 'bg-indigo-600/20 border-indigo-500 text-indigo-200 font-semibold'
                    : 'bg-slate-800/60 border-slate-700 text-slate-400'
                }`}
              >
                <p className="text-sm">Google Gemini</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Gemini 3.8 Flash / Multimodal</p>
              </button>

              <button
                type="button"
                onClick={() => setLocalSettings({ ...localSettings, provider: 'builtin' })}
                className={`p-3 rounded-xl border text-left text-xs transition-all ${
                  localSettings.provider === 'builtin'
                    ? 'bg-indigo-600/20 border-indigo-500 text-indigo-200 font-semibold'
                    : 'bg-slate-800/60 border-slate-700 text-slate-400'
                }`}
              >
                <p className="text-sm">Autonomous Engine</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Built-in local processor</p>
              </button>
            </div>

            {localSettings.provider === 'gemini' && (
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Gemini API Key (Optional if set in .env.local)
                </label>
                <input
                  type="password"
                  value={localSettings.apiKey || ''}
                  onChange={(e) => setLocalSettings({ ...localSettings, apiKey: e.target.value })}
                  placeholder="AIzaSy..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Your key remains strictly local in your browser session.
                </p>
              </div>
            )}
          </div>

          <hr className="border-slate-800" />

          {/* Section: Multilingual & Response Behavior */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 uppercase tracking-wider">
              <Globe2 size={14} className="text-indigo-400" />
              <span>Language & Personality</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Default Language</label>
                <select
                  value={localSettings.selectedLanguage}
                  onChange={(e) =>
                    setLocalSettings({
                      ...localSettings,
                      selectedLanguage: e.target.value as SupportedLanguage,
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  {SUPPORTED_LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.flag} {l.name} ({l.nativeName})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">AI Detail Level</label>
                <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-700">
                  {(['concise', 'balanced', 'detailed'] as PersonalityMode[]).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setLocalSettings({ ...localSettings, personality: p })}
                      className={`py-1 text-xs rounded-lg capitalize transition-all ${
                        localSettings.personality === p
                          ? 'bg-indigo-600 text-white font-medium'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <hr className="border-slate-800" />

          {/* Section: Voice & Speech */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 uppercase tracking-wider">
              <Volume2 size={14} className="text-emerald-400" />
              <span>Voice & Speech Synthesis</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Speech Speed: {localSettings.voiceSpeed}x
                </label>
                <input
                  type="range"
                  min="0.75"
                  max="1.5"
                  step="0.05"
                  value={localSettings.voiceSpeed}
                  onChange={(e) =>
                    setLocalSettings({ ...localSettings, voiceSpeed: parseFloat(e.target.value) })
                  }
                  className="w-full accent-indigo-500 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between pt-4">
                <div>
                  <p className="text-xs font-medium text-slate-200">Auto-play Responses</p>
                  <p className="text-[10px] text-slate-500">Read AI answers aloud automatically</p>
                </div>
                <input
                  type="checkbox"
                  checked={localSettings.autoPlayVoice}
                  onChange={(e) =>
                    setLocalSettings({ ...localSettings, autoPlayVoice: e.target.checked })
                  }
                  className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                />
              </div>
            </div>
          </div>

          <hr className="border-slate-800" />

          {/* Section: Privacy & Reset */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 uppercase tracking-wider">
              <ShieldAlert size={14} className="text-rose-400" />
              <span>Data & Privacy</span>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onClearCurrentFiles}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
              >
                Clear Attached Files
              </button>
              <button
                type="button"
                onClick={onClearHistory}
                className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs transition-colors flex items-center gap-1.5"
              >
                <Trash2 size={13} />
                <span>Delete All Chat History</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all"
          >
            {savedSuccess ? <Check size={14} className="text-emerald-300" /> : null}
            <span>{savedSuccess ? 'Saved!' : 'Save Settings'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
