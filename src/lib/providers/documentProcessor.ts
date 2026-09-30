import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';

export interface ParsedDocumentResult {
  text: string;
  pageCount?: number;
  metadata?: Record<string, unknown>;
  summary?: string;
  rowCount?: number;
}

export async function processDocumentBuffer(
  buffer: Buffer,
  filename: string,
  mimeType: string
): Promise<ParsedDocumentResult> {
  const ext = filename.split('.').pop()?.toLowerCase() || '';

  try {
    // 1. PDF
    if (ext === 'pdf' || mimeType.includes('pdf')) {
      const data = await pdfParse(buffer);
      const text = data.text ? data.text.trim() : '';
      return {
        text: text.slice(0, 100000), // reasonable context budget
        pageCount: data.numpages || 1,
        metadata: {
          info: data.info,
          version: data.version,
        },
      };
    }

    // 2. DOCX
    if (ext === 'docx' || mimeType.includes('wordprocessingml')) {
      const result = await mammoth.extractRawText({ buffer });
      return {
        text: result.value.trim().slice(0, 100000),
        metadata: {
          messages: result.messages,
        },
      };
    }

    // 3. Spreadsheet (XLSX, XLS, CSV)
    if (ext === 'xlsx' || ext === 'xls' || ext === 'csv' || mimeType.includes('spreadsheet') || mimeType.includes('csv')) {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      let fullCsv = '';
      let totalRows = 0;
      
      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        const csv = XLSX.utils.sheet_to_csv(sheet);
        const rows = csv.split('\n').filter(Boolean);
        totalRows += rows.length;
        fullCsv += `--- Sheet: ${sheetName} (${rows.length} rows) ---\n` + csv + '\n\n';
      }

      return {
        text: fullCsv.trim().slice(0, 80000),
        rowCount: totalRows,
        metadata: {
          sheets: workbook.SheetNames,
        },
      };
    }

    // 4. Plain Text, Markdown, JSON, Code files
    const text = buffer.toString('utf-8');
    return {
      text: text.trim().slice(0, 100000),
      metadata: {
        charCount: text.length,
      },
    };
  } catch (error: unknown) {
    console.error('Document processing error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown document parsing error';
    throw new Error(`Failed to read document "${filename}": ${msg}`);
  }
}
