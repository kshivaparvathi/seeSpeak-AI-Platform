import React, { useRef, useState } from 'react';
import { UploadCloud, Loader2 } from 'lucide-react';

interface FileUploadProps {
  onFileUpload: (file: File) => Promise<void>;
  supportedMimeTypes?: string[];
  featureTitle?: string;
  isUploading?: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onFileUpload,
  supportedMimeTypes = [],
  featureTitle = 'Workspace',
  isUploading = false,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      await onFileUpload(file);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      await onFileUpload(file);
      e.target.value = ''; // Reset input so same file can be reselected
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`relative w-full border-2 border-dashed rounded-3xl p-6 md:p-8 text-center cursor-pointer transition-all duration-300 select-none ${
        isDragOver
          ? 'border-indigo-500 bg-indigo-500/10 scale-[1.01] shadow-lg shadow-indigo-500/10'
          : 'border-slate-300/80 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500/60 bg-white/70 dark:bg-slate-900/50 hover:bg-indigo-50/30 dark:hover:bg-slate-900/80 shadow-sm'
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={handleFileChange}
        disabled={isUploading}
      />

      <div className="flex flex-col items-center justify-center space-y-3">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-500/15 to-purple-500/15 border border-indigo-500/25 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm transition-transform group-hover:scale-105">
          {isUploading ? (
            <Loader2 className="animate-spin" size={26} />
          ) : (
            <UploadCloud size={26} />
          )}
        </div>
        <div>
          <span className="text-sm md:text-base font-semibold text-slate-800 dark:text-slate-100">
            {isUploading ? 'Uploading & Analyzing Grounded Context...' : `Upload file to ${featureTitle}`}
          </span>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            Drag & drop or click to browse files from your computer
          </p>
        </div>
      </div>
    </div>
  );
};
