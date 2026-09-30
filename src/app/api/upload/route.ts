import { NextRequest, NextResponse } from 'next/server';
import { classifyFile, formatFileSize } from '@/lib/providers/visionProcessor';
import { processDocumentBuffer } from '@/lib/providers/documentProcessor';
import { registerUploadedFile } from '@/services/gemini/geminiFileRegistry';
import { UploadedFile } from '@/lib/types';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided for upload.' }, { status: 400 });
    }

    const processedFiles: UploadedFile[] = [];

    for (const file of files) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const filename = file.name;
      let mimeType = file.type || 'application/octet-stream';
      const fileType = classifyFile(filename, mimeType);
      if (fileType === 'pdf') mimeType = 'application/pdf';

      const id = 'file_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7);

      // Check max file size (e.g. 35MB)
      if (file.size > 35 * 1024 * 1024) {
        processedFiles.push({
          id,
          name: filename,
          size: file.size,
          type: fileType,
          mimeType,
          status: 'error',
          errorMessage: 'This file is larger than the 35MB limit.',
        });
        continue;
      }

      let extractedText = '';
      let metadata: UploadedFile['metadata'] = {};
      let base64Data = '';

      // Prepare base64 for images, audio, video, and PDFs (Gemini native multimodal inputs)
      if (fileType === 'image' || fileType === 'audio' || fileType === 'video' || fileType === 'pdf') {
        base64Data = `data:${mimeType};base64,` + buffer.toString('base64');
      }

      // Extract text for documents, spreadsheets, and supplementary PDF text
      if (fileType === 'pdf' || fileType === 'document' || fileType === 'data') {
        try {
          const docResult = await processDocumentBuffer(buffer, filename, mimeType);
          extractedText = docResult.text;
          metadata = {
            pageCount: docResult.pageCount,
            rowCount: docResult.rowCount,
            topics: [],
          };
        } catch (docErr: unknown) {
          console.warn(`Could not extract text from ${filename}:`, docErr);
          extractedText = `[Document: ${filename} (${formatFileSize(file.size)})]`;
        }
      }

      const uploadedFile: UploadedFile = {
        id,
        name: filename,
        size: file.size,
        type: fileType,
        mimeType,
        base64Data,
        extractedText,
        metadata,
        status: 'ready',
        uploadProgress: 100,
      };

      // Register file in server memory cache for cross-turn context
      registerUploadedFile(uploadedFile);

      processedFiles.push(uploadedFile);
    }

    return NextResponse.json({ files: processedFiles });
  } catch (error: unknown) {
    console.error('File upload route error:', error);
    return NextResponse.json(
      { error: 'Something went wrong while analyzing the file. Please try again.' },
      { status: 500 }
    );
  }
}
