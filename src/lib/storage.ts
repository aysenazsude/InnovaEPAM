import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';

const MIME_TO_EXTENSION: Record<string, string> = {
  'application/pdf': '.pdf',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'image/png': '.png',
  'image/jpeg': '.jpg',
};

/**
 * Writes a file buffer to disk using a UUID-based filename.
 * Returns the relative filename (e.g. "abc-123.pdf") to store in the DB.
 * Pure function with no DB coupling.
 */
export function saveFile(buffer: Buffer, mimeType: string, uploadDir: string): string {
  const extension = MIME_TO_EXTENSION[mimeType] ?? '.bin';
  const fileName = `${randomUUID()}${extension}`;
  const fullPath = path.join(uploadDir, fileName);
  fs.writeFileSync(fullPath, buffer);
  return fileName;
}

/**
 * Deletes a file from disk by its storage path (relative to uploadDir).
 * Pure function with no DB coupling.
 */
export function deleteFile(storagePath: string, uploadDir: string): void {
  const fullPath = path.join(uploadDir, storagePath);
  fs.unlinkSync(fullPath);
}
