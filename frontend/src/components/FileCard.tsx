import React from 'react';
import { FileText, Image as ImageIcon, Video, Music, FileSpreadsheet, CheckCircle2, X } from 'lucide-react';
import { ConversationFile } from '../types';

interface FileCardProps {
  file: ConversationFile;
  onRemove?: (id: string) => void;
}

export const FileCard: React.FC<FileCardProps> = ({ file, onRemove }) => {
  const getFileIcon = () => {
    const mime = file.mime_type.toLowerCase();
    const name = file.filename.toLowerCase();
    if (mime.includes('pdf') || name.endsWith('.pdf')) {
      return <FileText className="text-rose-400" size={18} />;
    }
    if (mime.startsWith('image/') || name.match(/\.(png|jpg|jpeg|webp)$/)) {
      return <ImageIcon className="text-purple-400" size={18} />;
    }
    if (mime.startsWith('video/') || name.match(/\.(mp4|mov|webm)$/)) {
      return <Video className="text-amber-400" size={18} />;
    }
    if (mime.startsWith('audio/') || name.match(/\.(mp3|wav|ogg)$/)) {
      return <Music className="text-emerald-400" size={18} />;
    }
    if (mime.includes('sheet') || mime.includes('excel') || name.match(/\.(csv|xlsx|xls)$/)) {
      return <FileSpreadsheet className="text-teal-400" size={18} />;
    }
    return <FileText className="text-indigo-400" size={18} />;
  };

  const formatSize = (bytes: number) => {
    if (!bytes || bytes === 0) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-all shadow-sm group">
      <div className="flex items-center gap-3 min-w-0">
        <div className="p-2 rounded-lg bg-slate-800/80 border border-slate-700/60 shrink-0">
          {getFileIcon()}
        </div>
        <div className="min-w-0">
          <div className="text-xs md:text-sm font-medium text-slate-200 truncate group-hover:text-indigo-300 transition-colors">
            {file.filename}
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
            <span className="flex items-center gap-1 text-emerald-400 font-medium">
              <CheckCircle2 size={11} /> Ready for questions
            </span>
            {file.size_bytes > 0 && (
              <>
                <span>•</span>
                <span>{formatSize(file.size_bytes)}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {onRemove && (
        <button
          onClick={() => onRemove(file.id)}
          className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors ml-2"
          title="Remove file"
        >
          <X size={15} />
        </button>
      )}
    </div>
  );
};
