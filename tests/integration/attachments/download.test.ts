import { describe, it, expect, afterEach, jest } from '@jest/globals';
import { createTestDb, loginAs } from '../../helpers/authHelpers';
import { submitIdea } from '../../helpers/ideaHelpers';
import { attachFile } from '../../helpers/attachmentHelpers';
import { GET } from '@/app/api/attachments/[id]/route';
import { NextRequest } from 'next/server';
import { auth } from '@/auth';
import type { PathLike } from 'fs';

jest.mock('@/auth', () => ({ auth: jest.fn() }));

// Mock the DB singleton so the route handler uses our in-memory test DB
jest.mock('@/lib/db', () => {
  return { db: null };
});

// Shared mutable state captured by the node:fs factory.
// Must be declared before jest.mock so the factory closure captures it.
const fsMockCtrl: {
  existsSync: ((p: PathLike) => boolean) | undefined;
  readFileSync: (() => Buffer) | undefined;
} = { existsSync: undefined, readFileSync: undefined };

jest.mock('node:fs', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const actual = jest.requireActual<typeof import('node:fs')>('node:fs');
  return {
    ...actual,
    existsSync: (p: PathLike) =>
      fsMockCtrl.existsSync ? fsMockCtrl.existsSync(p) : actual.existsSync(p),
    readFileSync: (...args: unknown[]) =>
      fsMockCtrl.readFileSync
        ? fsMockCtrl.readFileSync()
        : actual.readFileSync(...(args as [string])),
  };
});

afterEach(() => {
  fsMockCtrl.existsSync = undefined;
  fsMockCtrl.readFileSync = undefined;
});

function makeRequest(attachmentId: string): NextRequest {
  return new NextRequest(`http://localhost/api/attachments/${attachmentId}`);
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe('GET /api/attachments/[id]', () => {
  it('returns 401 when there is no session', async () => {
    (auth as jest.Mock).mockResolvedValue(null);

    const res = await GET(makeRequest('any-id'), makeParams('any-id'));

    expect(res.status).toBe(401);
    const body = await res.json() as { error: string };
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 404 for an unknown attachment ID', async () => {
    const testDb = createTestDb();
    const submitter = await loginAs(testDb, 'submitter');
    (auth as jest.Mock).mockResolvedValue({ user: { id: submitter.id, role: 'submitter' } });

    const dbModule = jest.requireMock<{ db: typeof testDb }>('@/lib/db');
    dbModule.db = testDb;

    const res = await GET(makeRequest('does-not-exist'), makeParams('does-not-exist'));

    expect(res.status).toBe(404);
    const body = await res.json() as { error: string };
    expect(body.error).toBe('Attachment not found');
  });

  it('returns 403 when an unrelated submitter tries to download', async () => {
    const testDb = createTestDb();
    const alice = await loginAs(testDb, 'submitter');
    const bob = await loginAs(testDb, 'submitter');
    (auth as jest.Mock).mockResolvedValue({ user: { id: bob.id, role: 'submitter' } });

    const dbModule = jest.requireMock<{ db: typeof testDb }>('@/lib/db');
    dbModule.db = testDb;

    const aliceIdea = await submitIdea(testDb, alice.id);
    const attachment = await attachFile(testDb, aliceIdea.id);

    const res = await GET(makeRequest(attachment.id), makeParams(attachment.id));

    expect(res.status).toBe(403);
    const body = await res.json() as { error: string };
    expect(body.error).toBe('Forbidden');
  });

  it('returns 410 when attachment row exists but file is missing from disk', async () => {
    const testDb = createTestDb();
    const alice = await loginAs(testDb, 'submitter');
    (auth as jest.Mock).mockResolvedValue({ user: { id: alice.id, role: 'submitter' } });

    const dbModule = jest.requireMock<{ db: typeof testDb }>('@/lib/db');
    dbModule.db = testDb;

    fsMockCtrl.existsSync = () => false; // file is missing

    const idea = await submitIdea(testDb, alice.id);
    const attachment = await attachFile(testDb, idea.id, 'application/pdf', 100, 0);

    const res = await GET(makeRequest(attachment.id), makeParams(attachment.id));

    expect(res.status).toBe(410);
    const body = await res.json() as { error: string };
    expect(body.error).toBe('File unavailable');
  });

  it('returns 200 with binary body when submitter downloads their own file', async () => {
    const testDb = createTestDb();
    const alice = await loginAs(testDb, 'submitter');
    (auth as jest.Mock).mockResolvedValue({ user: { id: alice.id, role: 'submitter' } });

    const dbModule = jest.requireMock<{ db: typeof testDb }>('@/lib/db');
    dbModule.db = testDb;

    const fileContent = Buffer.from('%PDF-1 test content');
    fsMockCtrl.existsSync = () => true;
    fsMockCtrl.readFileSync = () => fileContent;

    const idea = await submitIdea(testDb, alice.id);
    const attachment = await attachFile(testDb, idea.id, 'application/pdf', fileContent.byteLength, 0);

    const res = await GET(makeRequest(attachment.id), makeParams(attachment.id));

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Disposition')).toContain('attachment');
    expect(res.headers.get('Content-Type')).toBe('application/pdf');
    const body = await res.arrayBuffer();
    expect(new Uint8Array(body)).toEqual(new Uint8Array(fileContent));
  });

  it('returns 200 when admin downloads any user\'s file', async () => {
    const testDb = createTestDb();
    const admin = await loginAs(testDb, 'admin');
    const alice = await loginAs(testDb, 'submitter');
    (auth as jest.Mock).mockResolvedValue({ user: { id: admin.id, role: 'admin' } });

    const dbModule = jest.requireMock<{ db: typeof testDb }>('@/lib/db');
    dbModule.db = testDb;

    fsMockCtrl.existsSync = () => true;
    fsMockCtrl.readFileSync = () => Buffer.from('%PDF-admin');

    const idea = await submitIdea(testDb, alice.id);
    const attachment = await attachFile(testDb, idea.id, 'application/pdf', 100, 0);

    const res = await GET(makeRequest(attachment.id), makeParams(attachment.id));

    expect(res.status).toBe(200);
  });
});
