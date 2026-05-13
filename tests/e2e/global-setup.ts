import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'admin@example.com';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? 'AdminPass1';

async function globalSetup() {
  const dbPath = path.join(process.cwd(), 'data', 'innovatepam.db');
  const db = new Database(dbPath);

  const existing = db
    .prepare<[], { id: string; role: string }>('SELECT id, role FROM users WHERE email = ?')
    .get(ADMIN_EMAIL);

  if (existing) {
    if (existing.role !== 'admin') {
      db.prepare("UPDATE users SET role = 'admin' WHERE email = ?").run(ADMIN_EMAIL);
    }
  } else {
    const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);
    db.prepare(
      `INSERT INTO users (id, display_name, email, password_hash, role, failed_login_count, locked_until, created_at)
       VALUES (?, 'E2E Admin', ?, ?, 'admin', 0, NULL, ?)`
    ).run(randomUUID(), ADMIN_EMAIL, hash, Math.floor(Date.now() / 1000));
  }

  db.close();
}

export default globalSetup;
