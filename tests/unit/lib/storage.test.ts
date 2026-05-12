import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Hoist the mock before imports — jest.mock is hoisted automatically
jest.mock('fs', () => ({
  writeFileSync: jest.fn(),
  unlinkSync: jest.fn(),
}));

// eslint-disable-next-line import/order
import * as fs from 'fs';
import { saveFile, deleteFile } from '@/lib/storage';

const writeFileSyncMock = fs.writeFileSync as jest.Mock;
const unlinkSyncMock = fs.unlinkSync as jest.Mock;

describe('saveFile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should write buffer to a UUID-named file and return the relative path', () => {
    const buffer = Buffer.from('test-content');
    const uploadDir = '/tmp/uploads';

    const result = saveFile(buffer, 'application/pdf', uploadDir);

    expect(writeFileSyncMock).toHaveBeenCalledTimes(1);
    const calledPath = writeFileSyncMock.mock.calls[0][0] as string;
    expect(calledPath).toContain(uploadDir);
    expect(result).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\./i);
  });

  it('should use the correct file extension for application/pdf', () => {
    const result = saveFile(Buffer.from('pdf'), 'application/pdf', '/tmp/uploads');
    expect(result).toMatch(/\.pdf$/);
  });

  it('should use the correct file extension for image/png', () => {
    const result = saveFile(Buffer.from('png'), 'image/png', '/tmp/uploads');
    expect(result).toMatch(/\.png$/);
  });

  it('should use the correct file extension for image/jpeg', () => {
    const result = saveFile(Buffer.from('jpeg'), 'image/jpeg', '/tmp/uploads');
    expect(result).toMatch(/\.jpg$/);
  });

  it('should have no DB coupling — only fs.writeFileSync is called', () => {
    saveFile(Buffer.from('test'), 'application/pdf', '/tmp/uploads');
    expect(writeFileSyncMock).toHaveBeenCalledTimes(1);
  });
});

describe('deleteFile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call fs.unlinkSync with the full path to remove the file', () => {
    const storagePath = 'abc-123.pdf';
    const uploadDir = '/tmp/uploads';

    deleteFile(storagePath, uploadDir);

    expect(unlinkSyncMock).toHaveBeenCalledTimes(1);
    const calledPath = unlinkSyncMock.mock.calls[0][0] as string;
    expect(calledPath).toContain(uploadDir);
    expect(calledPath).toContain(storagePath);
  });

  it('should have no DB coupling — only fs operations used', () => {
    deleteFile('some-file.pdf', '/tmp/uploads');
    expect(unlinkSyncMock).toHaveBeenCalledTimes(1);
  });
});
