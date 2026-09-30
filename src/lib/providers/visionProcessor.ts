import { FileType, UploadedFile } from '../types';

export function classifyFile(filename: string, mimeType: string): FileType {
  const ext = filename.split('.').pop()?.toLowerCase() || '';

  if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'svg'].includes(ext) || mimeType.startsWith('image/')) {
    return 'image';
  }
  if (ext === 'pdf' || mimeType.includes('pdf')) {
    return 'pdf';
  }
  if (['docx', 'doc', 'txt', 'md', 'json', 'rtf', 'log'].includes(ext) || mimeType.includes('word') || mimeType.startsWith('text/')) {
    return 'document';
  }
  if (['xlsx', 'xls', 'csv'].includes(ext) || mimeType.includes('sheet') || mimeType.includes('csv')) {
    return 'data';
  }
  if (['mp3', 'wav', 'm4a', 'ogg', 'aac', 'webm'].includes(ext) && (mimeType.startsWith('audio/') || ['mp3', 'wav', 'm4a'].includes(ext))) {
    return 'audio';
  }
  if (['mp4', 'mov', 'webm', 'avi', 'mkv'].includes(ext) || mimeType.startsWith('video/')) {
    return 'video';
  }

  return 'document';
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function prepareGeminiInlinePart(file: UploadedFile): { inlineData: { mimeType: string; data: string } } | null {
  if (!file.base64Data) return null;

  // Extract pure base64 from data url if present
  let base64 = file.base64Data;
  if (base64.includes(';base64,')) {
    base64 = base64.split(';base64,')[1];
  }

  return {
    inlineData: {
      mimeType: file.mimeType || 'image/jpeg',
      data: base64,
    },
  };
}
