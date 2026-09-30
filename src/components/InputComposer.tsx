'use client';

import React, { useRef, useState } from 'react';
import { 
  Plus, 
  Mic, 
  Send, 
  Square, 
  Image as ImageIcon, 
  FileText, 
  Music, 
  Video, 
  Camera, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  Paperclip,
  Table
} from 'lucide-react';
import { UploadedFile } from '@/lib/types';
import { formatFileSize } from '@/lib/providers/visionProcessor';

interface InputComposerProps {
  inputPrompt: string;
  setInputPrompt: (val: string) => void;
  stagedFiles: UploadedFile[];
  onRemoveStagedFile: (id: string) => void;
  onFilesSelected: (files: FileList | File[]) => void;
  onSendMessage: () => void;
  onStopStreaming: () => void;
  isStreaming: boolean;
  onOpenVoiceMode: () => void;
  onOpenCamera: () => void;
}

export const InputComposer: React.FC<InputComposerProps> = ({
  inputPrompt,
  setInputPrompt,
  stagedFiles,
  onRemoveStagedFile,
  onFilesSelected,
  onSendMessage,
  onStopStreaming,
  isStreaming,
  onOpenVoiceMode,
  onOpenCamera,
}) => {
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentAccept, setCurrentAccept] = useState<string>('*/*');

  const triggerUpload = (acceptType: string) => {
    setCurrentAccept(acceptType);
    setShowPlusMenu(false);
    setTimeout(() => {
      fileInputRef.current?.click();
    }, 50);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isStreaming && (inputPrompt.trim() || stagedFiles.length > 0)) {
        onSendMessage();
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesSelected(e.target.files);
    }
    // reset input so same file can be selected again
    e.target.value = '';
  };

  return (
    <div className="relative max-w-4xl mx-auto w-full px-3 md:px-6 pb-4">
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept={currentAccept}
        multiple
        className="hidden"
      />

      {/* Staged files preview bar */}
      {stagedFiles.length > 0 && (
        <div className="mb-2 p-2.5 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-wrap gap-2 items-center shadow-lg backdrop-blur-sm">
          {stagedFiles.map((file) => (
            <div
              key={file.id}
              className={`flex items-center gap-2 p-1.5 pl-2.5 pr-2 rounded-xl text-xs border transition-all ${
                file.status === 'ready'
                  ? 'bg-slate-800/80 border-slate-700 text-slate-200'
                  : file.status === 'error'
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300'
              }`}
            >
              {file.type === 'image' && file.base64Data ? (
                <img
                  src={file.base64Data}
                  alt={file.name}
                  className="w-7 h-7 object-cover rounded-md border border-slate-700"
                />
              ) : file.type === 'pdf' ? (
                <FileText size={16} className="text-rose-400" />
              ) : file.type === 'audio' ? (
                <Music size={16} className="text-amber-400" />
              ) : file.type === 'video' ? (
                <Video size={16} className="text-emerald-400" />
              ) : (
                <FileText size={16} className="text-blue-400" />
              )}

              <div className="max-w-[120px] sm:max-w-[160px] truncate">
                <p className="truncate font-medium">{file.name}</p>
                <p className="text-[10px] text-slate-400">{formatFileSize(file.size)}</p>
              </div>

              {file.status === 'ready' ? (
                <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
              ) : file.status === 'uploading' || file.status === 'processing' ? (
                <Loader2 size={14} className="text-indigo-400 animate-spin shrink-0" />
              ) : (
                <AlertCircle size={14} className="text-rose-400 shrink-0" />
              )}

              <button
                onClick={() => onRemoveStagedFile(file.id)}
                className="p-1 text-slate-400 hover:text-white hover:bg-slate-700/60 rounded-full transition-colors ml-1"
                title="Remove file"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Main Composer Box */}
      <div className="relative rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl focus-within:border-indigo-500/70 focus-within:ring-1 focus-within:ring-indigo-500/40 transition-all backdrop-blur-md">
        {/* Plus Menu Popup */}
        {showPlusMenu && (
          <div className="absolute bottom-full mb-2 left-2 w-64 p-2 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl z-30 space-y-1 animate-fadeIn">
            <div className="px-2 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Add Multimodal Input
            </div>

            <button
              onClick={() => triggerUpload('image/jpeg,image/png,image/webp,image/gif')}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-slate-200 hover:text-white hover:bg-indigo-600/20 transition-colors text-left"
            >
              <div className="p-1.5 rounded-lg bg-purple-500/20 text-purple-400">
                <ImageIcon size={15} />
              </div>
              <div>
                <p className="font-medium">Upload Image</p>
                <p className="text-[10px] text-slate-400">JPG, PNG, WEBP</p>
              </div>
            </button>

            <button
              onClick={() => triggerUpload('application/pdf')}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-slate-200 hover:text-white hover:bg-indigo-600/20 transition-colors text-left"
            >
              <div className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400">
                <FileText size={15} />
              </div>
              <div>
                <p className="font-medium">Upload PDF</p>
                <p className="text-[10px] text-slate-400">Documents, papers, books</p>
              </div>
            </button>

            <button
              onClick={() => triggerUpload('.docx,.txt,.csv,.xlsx')}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-slate-200 hover:text-white hover:bg-indigo-600/20 transition-colors text-left"
            >
              <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400">
                <Table size={15} />
              </div>
              <div>
                <p className="font-medium">Upload Document / Data</p>
                <p className="text-[10px] text-slate-400">DOCX, TXT, CSV, XLSX</p>
              </div>
            </button>

            <button
              onClick={() => triggerUpload('audio/mp3,audio/wav,audio/m4a,audio/*')}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-slate-200 hover:text-white hover:bg-indigo-600/20 transition-colors text-left"
            >
              <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
                <Music size={15} />
              </div>
              <div>
                <p className="font-medium">Upload Audio</p>
                <p className="text-[10px] text-slate-400">MP3, WAV, M4A</p>
              </div>
            </button>

            <button
              onClick={() => triggerUpload('video/mp4,video/webm,video/quicktime,video/*')}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-slate-200 hover:text-white hover:bg-indigo-600/20 transition-colors text-left"
            >
              <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                <Video size={15} />
              </div>
              <div>
                <p className="font-medium">Upload Video</p>
                <p className="text-[10px] text-slate-400">MP4, MOV, WEBM</p>
              </div>
            </button>

            <button
              onClick={() => {
                setShowPlusMenu(false);
                onOpenCamera();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-slate-200 hover:text-white hover:bg-indigo-600/20 transition-colors text-left"
            >
              <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400">
                <Camera size={15} />
              </div>
              <div>
                <p className="font-medium">Capture Camera</p>
                <p className="text-[10px] text-slate-400">Take snapshot from webcam</p>
              </div>
            </button>
          </div>
        )}

        <div className="flex items-end p-2 gap-2">
          {/* Plus Button */}
          <button
            onClick={() => setShowPlusMenu(!showPlusMenu)}
            title="Attach images, documents, audio, or video"
            className="p-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
          >
            <Plus size={20} className={showPlusMenu ? 'rotate-45 transition-transform' : 'transition-transform'} />
          </button>

          {/* Text Area */}
          <textarea
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message, ask about files, or tap mic..."
            rows={1}
            className="flex-1 bg-transparent text-slate-100 placeholder-slate-500 text-sm md:text-base resize-none focus:outline-none py-2.5 max-h-36 min-h-[44px]"
          />

          {/* Right Action Icons: Microphone + Send/Stop */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Real-time Voice Mode Trigger */}
            <button
              onClick={onOpenVoiceMode}
              title="Launch Real-Time Voice Conversation"
              className="p-2.5 rounded-xl text-slate-300 hover:text-rose-400 hover:bg-rose-500/10 transition-all group"
            >
              <Mic size={20} className="group-hover:scale-110 transition-transform" />
            </button>

            {/* Send or Stop Button */}
            {isStreaming ? (
              <button
                onClick={onStopStreaming}
                title="Stop generation"
                className="p-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/20 transition-all"
              >
                <Square size={18} className="fill-current" />
              </button>
            ) : (
              <button
                onClick={onSendMessage}
                disabled={!inputPrompt.trim() && stagedFiles.length === 0}
                title="Send message"
                className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white shadow-md shadow-indigo-600/20 transition-all disabled:cursor-not-allowed"
              >
                <Send size={18} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
