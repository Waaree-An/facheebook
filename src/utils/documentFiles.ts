import type { FileAttachment } from '../types';

const TEXT_FILE_FORMATS = new Set([
  'txt', 'md', 'markdown', 'csv', 'tsv', 'json', 'xml', 'html', 'css',
  'js', 'jsx', 'ts', 'tsx', 'py', 'sql', 'yml', 'yaml', 'log',
]);

export function getAttachmentFormat(file: FileAttachment): string {
  return (file.format || file.name.split('.').pop() || '').toLowerCase();
}

export function isTextAttachment(file: FileAttachment): boolean {
  return TEXT_FILE_FORMATS.has(getAttachmentFormat(file));
}
