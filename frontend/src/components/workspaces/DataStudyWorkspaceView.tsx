import React, { useRef, useEffect, useState } from 'react';
import { 
  FileSpreadsheet, 
  BarChart3, 
  TrendingUp, 
  Sparkles, 
  Bot, 
  User, 
  Copy, 
  Check, 
  Volume2, 
  AlertCircle, 
  CheckCircle2, 
  GraduationCap, 
  HelpCircle, 
  Binary, 
  Table, 
  ChevronRight,
  ShieldCheck,
  Calculator,
  Search
} from 'lucide-react';
import { Conversation, Message, SupportedLanguage, ConversationFile } from '../../types';
import { FileUpload } from '../FileUpload';
import { ChatComposer } from '../ChatComposer';
import { FeatureVisual } from '../FeatureVisual';
import { speakText, stopSpeaking, detectLanguageFromText, isSpeaking } from '../../utils/speech';

interface DataStudyWorkspaceViewProps {
  conversation: Conversation | null;
  messages: Message[];
  attachedFiles: ConversationFile[];
  onSendMessage: (text: string) => Promise<void>;
  onFileUpload: (file: File) => Promise<void>;
  selectedLanguage: SupportedLanguage;
  onSelectLanguage: (lang: SupportedLanguage) => void;
  isLoading: boolean;
  streamingText?: string;
  error?: string | null;
  onOpenVoice?: () => void;
}

export const DataStudyWorkspaceView: React.FC<DataStudyWorkspaceViewProps> = ({
  conversation,
  messages,
  attachedFiles,
  onSendMessage,
  onFileUpload,
  selectedLanguage,
  onSelectLanguage,
  isLoading,
  streamingText,
  error,
  onOpenVoice,
}) => {
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [tableData, setTableData] = useState<{ headers: string[]; rows: string[][] } | null>(null);
  const [isVoiceOutputEnabled, setIsVoiceOutputEnabled] = useState<boolean>(() => {
    return localStorage.getItem('seespeak_voice_output') === 'true';
  });

  const dataFiles = attachedFiles.filter(
    (f) =>
      f.mime_type.includes('sheet') ||
      f.mime_type.includes('csv') ||
      f.mime_type.includes('excel') ||
      f.filename.match(/\.(csv|xlsx|xls|tsv|json|txt)$/i)
  );

  useEffect(() => {
    if (dataFiles.length > 0 && !activeFileId) {
      setActiveFileId(dataFiles[0].id);
    }
  }, [dataFiles, activeFileId]);

  // If CSV file exists, fetch first few lines for interactive table preview
  useEffect(() => {
    const file = dataFiles.find((f) => f.id === activeFileId) || dataFiles[0];
    if (file && file.filename.endsWith('.csv')) {
      const filename = file.file_path.split(/[\\/]/).pop();
      fetch(`/uploads/${filename}`)
        .then((res) => res.text())
        .then((text) => {
          const lines = text.trim().split('\n').slice(0, 6);
          if (lines.length > 0) {
            const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
            const rows = lines.slice(1).map((line) =>
              line.split(',').map((cell) => cell.trim().replace(/^"|"$/g, ''))
            );
            setTableData({ headers, rows });
          }
        })
        .catch(() => setTableData(null));
    } else {
      setTableData(null);
    }
  }, [activeFileId, dataFiles]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText, isLoading]);

  const handleSpeak = (text: string, id: string) => {
    if (speakingId === id || isSpeaking()) {
      stopSpeaking();
      setSpeakingId(null);
      return;
    }
    const lang = detectLanguageFromText(text, selectedLanguage);
    setSpeakingId(id);
    speakText(text, lang, {
      onStart: () => setSpeakingId(id),
      onEnd: () => setSpeakingId(null),
      onError: () => setSpeakingId(null),
    });
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleVoiceOutput = () => {
    setIsVoiceOutputEnabled((prev) => {
      const next = !prev;
      localStorage.setItem('seespeak_voice_output', String(next));
      if (!next) {
        stopSpeaking();
        setSpeakingId(null);
      }
      return next;
    });
  };

  const activeDataFile = dataFiles.find((f) => f.id === activeFileId) || dataFiles[0];

  const studyActions = [
    {
      title: 'Statistical Trends & Distributions',
      desc: 'Summary metrics, outliers & patterns',
      prompt: 'Perform a full statistical analysis on this dataset. Include summary statistics (mean, median, ranges), trend direction, anomalies, and critical correlations.',
      icon: <TrendingUp size={15} className="text-teal-500" />,
    },
    {
      title: 'Formula & Math Calculations',
      desc: 'Step-by-step mathematical explanations',
      prompt: 'Explain the mathematical formulas, algorithms, or calculations present in this material with clear step-by-step derivations and worked examples.',
      icon: <Calculator size={15} className="text-indigo-500" />,
    },
    {
      title: 'Exam Flashcards & Practice Quiz',
      desc: '5 interactive flashcards with test questions',
      prompt: 'Generate 5 high-yield study flashcards and a practice quiz based on this study material with detailed rationales for each answer.',
      icon: <GraduationCap size={15} className="text-purple-500" />,
    },
    {
      title: 'Tabular Summary & Key Metrics',
      desc: 'Executive data overview table',
      prompt: 'Construct a clean tabular summary summarizing key variables, metrics, categories, and findings from this dataset.',
      icon: <Table size={15} className="text-blue-500" />,
    },
    {
      title: 'Data Hygiene & Missing Value Audit',
      desc: 'Find anomalies, NULLs & duplicates',
      prompt: 'Audit this dataset for data quality issues: identify missing values, corrupted rows, inconsistencies, duplicate records, and recommend data cleaning steps.',
      icon: <Binary size={15} className="text-amber-500" />,
    },
  ];

  const isEmpty = attachedFiles.length === 0 && messages.length === 0 && !streamingText;

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f8fafc] dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100 overflow-hidden transition-colors">
      {isEmpty ? (
        /* ================= PURPOSE-BUILT EMPTY STATE ================= */
        <div className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col items-center justify-center">
          <div className="max-w-2xl w-full mx-auto text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-50 dark:bg-teal-950/40 border border-teal-200/80 dark:border-teal-500/30 text-teal-700 dark:text-teal-300 text-xs font-semibold shadow-sm">
              <Sparkles size={14} className="text-teal-500" />
              <span>Data Intelligence & Study Lab</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">Statistical Grounding</span>
            </div>

            <div className="flex justify-center">
              <FeatureVisual featureId="data-study" size={72} />
            </div>

            <div>
              <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Data & Study Lab
              </h2>
              <p className="text-sm md:text-base text-slate-600 dark:text-slate-400 mt-2 max-w-lg mx-auto leading-relaxed">
                Upload CSV tables, spreadsheets, research datasets, or syllabus notes. Explore statistical trends, step-by-step formula explanations, and interactive flashcards.
              </p>
            </div>

            <div className="w-full">
              <FileUpload
                onFileUpload={onFileUpload}
                featureTitle="Data & Study Lab"
                isUploading={isLoading}
              />
              <div className="flex items-center justify-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 mt-2.5">
                <span className="px-2 py-0.5 rounded-md bg-slate-200/60 dark:bg-slate-800 font-mono">CSV</span>
                <span className="px-2 py-0.5 rounded-md bg-slate-200/60 dark:bg-slate-800 font-mono">XLSX</span>
                <span className="px-2 py-0.5 rounded-md bg-slate-200/60 dark:bg-slate-800 font-mono">JSON</span>
                <span className="px-2 py-0.5 rounded-md bg-slate-200/60 dark:bg-slate-800 font-mono">TSV</span>
                <span>• Full Tabular Analytics</span>
              </div>
            </div>

            <div className="pt-2 text-left">
              <div className="text-xs font-bold font-mono text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Sparkles size={13} className="text-teal-500" />
                <span>Instant Data & Study Starters</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {studyActions.slice(0, 4).map((action, idx) => (
                  <button
                    key={idx}
                    onClick={() => onSendMessage(action.prompt)}
                    className="p-3.5 rounded-2xl bg-white dark:bg-slate-900/80 hover:bg-teal-50/50 dark:hover:bg-slate-850 border border-slate-200/80 dark:border-slate-800 hover:border-teal-300 dark:hover:border-teal-500/50 text-left transition-all shadow-sm group cursor-pointer"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {action.icon}
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-teal-600 dark:group-hover:text-teal-300">
                        {action.title}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                      {action.desc}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ================= PURPOSE-BUILT ACTIVE 2-COLUMN DATA LAB ================= */
        <div className="flex-1 flex flex-col lg:flex-row h-full overflow-hidden">
          {/* LEFT / CENTER COLUMN: Tabular Preview & Analytical Discussion */}
          <div className="flex-1 flex flex-col h-full min-w-0 border-r border-slate-200/70 dark:border-slate-800/80 overflow-hidden">
            {/* Interactive Data Table Preview (if CSV/tabular) */}
            {tableData && (
              <div className="p-3 md:p-4 bg-slate-100/70 dark:bg-slate-950/60 border-b border-slate-200/80 dark:border-slate-800/80 shrink-0">
                <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-3 shadow-sm space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200">
                      <Table size={15} className="text-teal-500" />
                      <span>Data Preview: {activeDataFile?.filename}</span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 font-semibold">
                      Sample First Rows
                    </span>
                  </div>

                  <div className="overflow-x-auto max-h-36 rounded-lg border border-slate-100 dark:border-slate-800">
                    <table className="w-full text-[11px] text-left">
                      <thead className="bg-slate-50 dark:bg-slate-800/80 font-bold text-slate-700 dark:text-slate-300">
                        <tr>
                          {tableData.headers.map((h, i) => (
                            <th key={i} className="px-2.5 py-1.5 border-b border-slate-200 dark:border-slate-700">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-slate-600 dark:text-slate-400">
                        {tableData.rows.map((row, rIdx) => (
                          <tr key={rIdx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                            {row.map((cell, cIdx) => (
                              <td key={cIdx} className="px-2.5 py-1 truncate max-w-[140px]">
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Conversation Stream */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
              {messages.map((msg) => {
                const isUser = msg.role === 'user';
                return (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-3 animate-fadeIn ${
                      isUser ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    {!isUser && (
                      <div className="w-8 h-8 rounded-xl bg-teal-600/10 dark:bg-teal-600/20 border border-teal-500/30 flex items-center justify-center text-teal-600 dark:text-teal-400 shrink-0 mt-0.5 shadow-sm">
                        <Bot size={17} />
                      </div>
                    )}

                    <div
                      className={`group relative max-w-[85%] md:max-w-[78%] px-4 py-3 rounded-2xl leading-relaxed whitespace-pre-wrap ${
                        isUser
                          ? 'bg-teal-600 text-white rounded-tr-none shadow-md shadow-teal-600/20 font-medium'
                          : 'bg-white dark:bg-slate-900/90 text-slate-800 dark:text-slate-100 border border-slate-200/90 dark:border-slate-800 rounded-tl-none shadow-sm text-sm'
                      }`}
                    >
                      {msg.content}

                      {!isUser && (
                        <div className="flex items-center gap-2 mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/60 text-slate-400 dark:text-slate-500 text-xs">
                          <button
                            onClick={() => handleCopy(msg.content, msg.id)}
                            className="flex items-center gap-1 px-2 py-0.5 rounded hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                            title="Copy response"
                          >
                            {copiedId === msg.id ? (
                              <Check size={12} className="text-emerald-500" />
                            ) : (
                              <Copy size={12} />
                            )}
                            <span>{copiedId === msg.id ? 'Copied' : 'Copy'}</span>
                          </button>

                          <button
                            onClick={() => handleSpeak(msg.content, msg.id)}
                            className={`flex items-center gap-1 px-2 py-0.5 rounded hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors ${
                              speakingId === msg.id ? 'text-teal-600 dark:text-teal-400 font-semibold' : ''
                            }`}
                            title="Read aloud"
                          >
                            <Volume2
                              size={12}
                              className={speakingId === msg.id ? 'animate-pulse' : ''}
                            />
                            <span>{speakingId === msg.id ? 'Stop Speaking' : 'Read Aloud'}</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {isUser && (
                      <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300 shrink-0 mt-0.5">
                        <User size={16} />
                      </div>
                    )}
                  </div>
                );
              })}

              {streamingText && (
                <div className="flex items-start gap-3 animate-fadeIn justify-start">
                  <div className="w-8 h-8 rounded-xl bg-teal-600/10 dark:bg-teal-600/20 border border-teal-500/30 flex items-center justify-center text-teal-600 dark:text-teal-400 shrink-0 mt-0.5">
                    <Bot size={17} />
                  </div>
                  <div className="max-w-[85%] md:max-w-[78%] px-4 py-3 rounded-2xl bg-white dark:bg-slate-900/90 text-slate-800 dark:text-slate-100 border border-slate-200/90 dark:border-slate-800 rounded-tl-none shadow-sm leading-relaxed whitespace-pre-wrap text-sm">
                    {streamingText}
                    <span className="inline-block w-2 h-4 ml-1 bg-teal-500 rounded animate-pulse" />
                  </div>
                </div>
              )}

              {isLoading && !streamingText && (
                <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400 pl-2">
                  <div className="w-8 h-8 rounded-xl bg-teal-600/10 dark:bg-teal-600/20 border border-teal-500/30 flex items-center justify-center text-teal-600 dark:text-teal-400 shrink-0 animate-pulse">
                    <Sparkles size={16} />
                  </div>
                  <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900/80 px-3 py-1.5 rounded-full border border-slate-200/80 dark:border-slate-800 text-xs font-mono shadow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-ping" />
                    <span>Gemini 2.5 analyzing dataset & computing metrics...</span>
                  </div>
                </div>
              )}

              {error && (
                <div className="p-3 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
                  <AlertCircle size={15} className="shrink-0 text-red-500" />
                  <span>{error}</span>
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* Bottom Composer */}
            <div className="p-3 md:p-4 bg-white/70 dark:bg-slate-900/70 border-t border-slate-200/80 dark:border-slate-800/80 backdrop-blur-sm shrink-0">
              <ChatComposer
                onSendMessage={onSendMessage}
                onTriggerFileUpload={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = '.csv,.xlsx,.xls,.tsv,.json,.txt,.pdf';
                  input.onchange = (e: any) => {
                    if (e.target.files && e.target.files[0]) {
                      onFileUpload(e.target.files[0]);
                    }
                  };
                  input.click();
                }}
                onOpenVoice={onOpenVoice}
                selectedLanguage={selectedLanguage}
                onSelectLanguage={onSelectLanguage}
                isLoading={isLoading}
                hasAttachedFiles={dataFiles.length > 0}
                placeholder="Ask about this dataset, request formulas, or create flashcards..."
                isVoiceOutputEnabled={isVoiceOutputEnabled}
                onToggleVoiceOutput={toggleVoiceOutput}
              />
            </div>
          </div>

          {/* RIGHT SIDEBAR: Data & Study Companion */}
          <div className="w-full lg:w-80 xl:w-88 bg-slate-50/70 dark:bg-[#0e1322]/70 border-t lg:border-t-0 lg:border-l border-slate-200/80 dark:border-slate-800/80 flex flex-col h-auto lg:h-full overflow-y-auto p-4 space-y-4 shrink-0 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
            {/* Quick Study Actions */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 font-mono">
                <span className="flex items-center gap-1.5">
                  <Sparkles size={13} className="text-teal-500" />
                  <span>Analytical Tools</span>
                </span>
                <span className="text-[10px] text-slate-400 font-normal">1-Click</span>
              </div>

              {studyActions.map((action, idx) => (
                <button
                  key={idx}
                  onClick={() => onSendMessage(action.prompt)}
                  disabled={isLoading}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-50 hover:bg-teal-50/60 dark:bg-slate-800/60 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 text-left transition-all group cursor-pointer disabled:opacity-50"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-700/70 shrink-0">
                      {action.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-teal-600 dark:group-hover:text-teal-300 truncate">
                        {action.title}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                        {action.desc}
                      </div>
                    </div>
                  </div>
                  <ChevronRight size={13} className="text-slate-400 group-hover:text-teal-500 shrink-0 ml-1 transition-transform group-hover:translate-x-0.5" />
                </button>
              ))}
            </div>

            {/* Grounding Assurance */}
            <div className="p-3.5 rounded-2xl bg-teal-50/50 dark:bg-teal-950/20 border border-teal-200/60 dark:border-teal-500/20 text-xs text-slate-700 dark:text-slate-300">
              <div className="flex items-center gap-2 text-teal-700 dark:text-teal-300 font-bold mb-1">
                <ShieldCheck size={15} />
                <span>Deterministic Data Verification</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                Calculations and trend discoveries are computed directly against the uploaded numbers with verifiable precision.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
