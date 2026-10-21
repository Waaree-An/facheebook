/**
 * Utility functions for handling and rendering PDF documents
 * using the browser's default native PDF viewer or an iframe.
 */

import { FileAttachment } from '../types';

/**
 * Checks whether an attachment is a PDF document
 */
export function isPdfDocument(doc?: FileAttachment | null): boolean {
  if (!doc) return false;
  if (doc.format?.toLowerCase() === 'pdf') return true;
  if (doc.name?.toLowerCase().endsWith('.pdf')) return true;
  if (doc.dataUrl?.includes('application/pdf')) return true;
  return false;
}

/**
 * Converts a base64 Data URL to a Blob for reliable iframe embedding
 */
export function dataUrlToBlob(dataUrl: string): Blob | null {
  try {
    const parts = dataUrl.split(',');
    if (parts.length < 2) return null;
    const mimeMatch = parts[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'application/pdf';
    const binary = atob(parts[1]);
    const len = binary.length;
    const buffer = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      buffer[i] = binary.charCodeAt(i);
    }
    return new Blob([buffer], { type: mime });
  } catch (e) {
    console.error('Failed to convert dataUrl to Blob:', e);
    return null;
  }
}

/**
 * Generates a valid standard PDF-1.4 Blob from text content.
 * Used for sample materials or text-annotated documents that do not have raw binary blobs yet.
 */
export function createSyntheticPdfBlob(title: string, textContent: string): Blob {
  const cleanTitle = title.replace(/[()\\\\]/g, '').substring(0, 70);
  const lines = textContent
    ? textContent.split('\n')
    : ['(No raw binary attached. This is a generated preview from notes.)'];

  const streamLines: string[] = [
    'BT',
    '/F1 16 Tf',
    '50 740 Td',
    `(${cleanTitle}) Tj`,
    '/F1 10 Tf',
    '0 -24 Td',
    '(FacheeBook Academic Library - PDF Viewer) Tj',
    '0 -20 Td',
  ];

  let currentY = 696;
  for (const rawLine of lines) {
    if (currentY < 60) break; // stay within single-page boundary
    const sanitized = rawLine.replace(/[()\\\\]/g, '').substring(0, 90);
    streamLines.push(`(${sanitized}) Tj`);
    streamLines.push('0 -15 Td');
    currentY -= 15;
  }
  streamLines.push('ET');
  const stream = streamLines.join('\n');

  const header = '%PDF-1.4\n';
  const obj1 = '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n';
  const obj2 = '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n';
  const obj3 = '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n';
  const obj4 = '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n';
  const obj5 = `5 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}\nendstream\nendobj\n`;

  const offset1 = header.length;
  const offset2 = offset1 + obj1.length;
  const offset3 = offset2 + obj2.length;
  const offset4 = offset3 + obj3.length;
  const offset5 = offset4 + obj4.length;
  const xrefOffset = offset5 + obj5.length;

  const pad = (n: number) => String(n).padStart(10, '0') + ' 00000 n \n';

  const xref = 
    'xref\n0 6\n0000000000 65535 f \n' +
    pad(offset1) +
    pad(offset2) +
    pad(offset3) +
    pad(offset4) +
    pad(offset5);

  const trailer = `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  const fullPdf = header + obj1 + obj2 + obj3 + obj4 + obj5 + xref + trailer;
  return new Blob([fullPdf], { type: 'application/pdf' });
}

/**
 * Returns a displayable URL (blob: or data:) for a PDF document
 */
export function getPdfDisplayUrl(doc: FileAttachment): { url: string; isObjectUrl: boolean } | null {
  if (!isPdfDocument(doc)) return null;

  // If already a blob URL or remote http URL
  if (doc.dataUrl?.startsWith('blob:') || doc.dataUrl?.startsWith('http')) {
    return { url: doc.dataUrl, isObjectUrl: false };
  }

  // If it is a base64 Data URL, convert to Blob URL for best browser PDF viewer plugin compatibility
  if (doc.dataUrl?.startsWith('data:')) {
    const blob = dataUrlToBlob(doc.dataUrl);
    if (blob) {
      return { url: URL.createObjectURL(blob), isObjectUrl: true };
    }
    return { url: doc.dataUrl, isObjectUrl: false };
  }

  // If no dataUrl exists, generate a valid synthetic PDF blob from textContent or document title
  const syntheticBlob = createSyntheticPdfBlob(
    doc.name,
    doc.textContent || `Document: ${doc.name}\nSize: ${doc.sizeBytes} bytes\nCreated: ${doc.createdAt}`
  );
  return { url: URL.createObjectURL(syntheticBlob), isObjectUrl: true };
}
