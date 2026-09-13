import crypto from 'crypto';
import mammoth from 'mammoth';
import { logger } from '../utils/logger.js';

export interface ParsedDocument {
  text: string;
  hash: string; 
  charCount: number; 
}

/**
 * Extracts plain text from an uploaded PDF or DOCX buffer in memory.
 */
export async function extractTextFromBuffer(
  buffer: Buffer,
  mimeType: string,
  originalName: string
): Promise<ParsedDocument> {
  const extension = originalName.toLowerCase().split('.').pop();
  let rawText = '';

  logger.info(`Parsing file: ${originalName} (MIME: ${mimeType}, Ext: ${extension}, Size: ${buffer.length} bytes)`);

  if (extension === 'pdf' || mimeType === 'application/pdf') {
        try {
      // Dynamic import to avoid pdf-parse test-file side-effect that crashes serverless environments.
      // pdf-parse's main index.js reads a test PDF from disk on require(), which doesn't exist on Vercel.
      const pdfParseModule = await import('pdf-parse/lib/pdf-parse.js');
      const pdfParse = pdfParseModule.default || pdfParseModule;
      const pdfData = await pdfParse(buffer);
      rawText = pdfData.text || '';
    } catch (err: any) {
      logger.error('Failed to parse PDF document:', err);
      throw new Error(`Failed to parse PDF: ${err.message || 'Invalid or corrupted PDF file'}`);
    }
  } else if (
    extension === 'docx' ||
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    try {
      const result = await mammoth.extractRawText({ buffer });
      rawText = result.value || '';
    } catch (err: any) {
      logger.error('Failed to parse DOCX document:', err);
      throw new Error(`Failed to parse DOCX: ${err.message || 'Invalid or corrupted DOCX file'}`);
    }
  } else {
    throw new Error('Unsupported file format. Please upload a .pdf or .docx file.');
  }

  // Clean and normalize text
  const cleanText = rawText
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // remove control characters
    .trim();

  if (!cleanText || cleanText.length < 50) {
    throw new Error('Could not extract sufficient text from resume. Ensure the file contains readable text and is not an image-only scan.');
  }

  const hash = crypto.createHash('sha256').update(cleanText).digest('hex');

  return {
    text: cleanText,
    hash,
    charCount: cleanText.length,
  };
}
