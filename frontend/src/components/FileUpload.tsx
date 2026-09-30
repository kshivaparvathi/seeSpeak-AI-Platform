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
      className={`relative w-full border-2 border-dashed rounded-2xl p-5 md:p-6 text-center cursor-pointer transition-all duration-200 select-none ${
        isDragOver
          ? 'border-indigo-400 bg-indigo-500/10 scale-[1.01]'
          : 'border-slate-800 hover:border-slate-700 bg-slate-900/40 hover:bg-slate-900/70'
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={handleFileChange}
        disabled={isUploading}
      />

      <div className="flex flex-col items-center justify-center space-y-2">
        <div className="p-3 rounded-full bg-slate-800/80 border border-slate-700 text-indigo-400 shadow-sm">
          {isUploading ? (
            <Loader2 className="animate-spin" size={24} />
          ) : (
            <UploadCloud size={24} />
          )}
        </div>
        <div>
          <span className="text-sm font-semibold text-slate-200">
            {isUploading ? 'Uploading & Analyzing File...' : 'Upload file to this workspace'}
          </span>
          <p className="text-xs text-slate-400 mt-0.5">
            Drag & drop or click to browse (PDF, Images, CSV, Audio, Video)
          </p>
        </div>
      </div>
    </div>
  );
};
