import { UploadedFile } from '@/lib/types';

// Server-side file cache to preserve actual multimodal buffers across conversation turns
const fileCache = new Map<string, UploadedFile>();

export function registerUploadedFile(file: UploadedFile): void {
  if (!file || !file.id) return;
  fileCache.set(file.id, {
    ...file,
  });

  // Limit memory: keep latest 100 files
  if (fileCache.size > 100) {
    const oldestKey = fileCache.keys().next().value;
    if (oldestKey) fileCache.delete(oldestKey);
  }
}

export function getRegisteredFile(id: string): UploadedFile | undefined {
  return fileCache.get(id);
}

export function hydrateFiles(files: UploadedFile[] = []): UploadedFile[] {
  return files.map((file) => {
    // If base64Data is already present, return as is
    if (file.base64Data && file.base64Data.length > 100) {
      // Also ensure it is registered in cache
      registerUploadedFile(file);
      return file;
    }

    // Try to restore from server cache
    const cached = fileCache.get(file.id);
    if (cached) {
      return {
        ...file,
        base64Data: cached.base64Data || file.base64Data,
        extractedText: cached.extractedText || file.extractedText,
        mimeType: cached.mimeType || file.mimeType,
        size: cached.size || file.size,
        type: cached.type || file.type,
      };
    }

    return file;
  });
}
