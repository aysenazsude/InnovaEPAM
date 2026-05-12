import { describe, it, expect } from '@jest/globals';
import { getTableConfig } from 'drizzle-orm/sqlite-core';
import { users, ideas, attachments, ideaCategories } from '@/lib/db/schema';

describe('schema', () => {
  describe('users table', () => {
    it('should have table name "users"', () => {
      expect(getTableConfig(users).name).toBe('users');
    });

    it('should define all required columns', () => {
      const colNames = getTableConfig(users).columns.map((c) => c.name);
      expect(colNames).toContain('id');
      expect(colNames).toContain('email');
      expect(colNames).toContain('password_hash');
      expect(colNames).toContain('role');
      expect(colNames).toContain('failed_login_count');
      expect(colNames).toContain('locked_until');
    });

    it('should have a unique index on email', () => {
      const config = getTableConfig(users);
      const hasEmailIndex = config.indexes.some((idx) =>
        idx.config.columns.some((c) => (c as { name: string }).name === 'email')
      );
      expect(hasEmailIndex).toBe(true);
    });
  });

  describe('ideaCategories table', () => {
    it('should have table name "idea_categories"', () => {
      expect(getTableConfig(ideaCategories).name).toBe('idea_categories');
    });

    it('should define slug and display_name columns', () => {
      const colNames = getTableConfig(ideaCategories).columns.map((c) => c.name);
      expect(colNames).toContain('slug');
      expect(colNames).toContain('display_name');
    });
  });

  describe('ideas table', () => {
    it('should have table name "ideas"', () => {
      expect(getTableConfig(ideas).name).toBe('ideas');
    });

    it('should define all required columns', () => {
      const colNames = getTableConfig(ideas).columns.map((c) => c.name);
      expect(colNames).toContain('id');
      expect(colNames).toContain('title');
      expect(colNames).toContain('description');
      expect(colNames).toContain('category');
      expect(colNames).toContain('status');
      expect(colNames).toContain('submitter_id');
      expect(colNames).toContain('admin_comment');
      expect(colNames).toContain('evaluating_admin_id');
    });

    it('should have foreign key references to users (triggers reference callbacks)', () => {
      const config = getTableConfig(ideas);
      const fkTables = config.foreignKeys.map((fk) => getTableConfig(fk.reference().foreignTable).name);
      expect(fkTables).toContain('users');
    });
  });

  describe('attachments table', () => {
    it('should have table name "attachments"', () => {
      expect(getTableConfig(attachments).name).toBe('attachments');
    });

    it('should define all required columns', () => {
      const colNames = getTableConfig(attachments).columns.map((c) => c.name);
      expect(colNames).toContain('id');
      expect(colNames).toContain('idea_id');
      expect(colNames).toContain('file_name');
      expect(colNames).toContain('file_type');
      expect(colNames).toContain('file_size');
      expect(colNames).toContain('storage_path');
      expect(colNames).toContain('uploaded_at');
    });

    it('should have a foreign key reference to ideas (triggers reference callback)', () => {
      const config = getTableConfig(attachments);
      const fkTables = config.foreignKeys.map((fk) => getTableConfig(fk.reference().foreignTable).name);
      expect(fkTables).toContain('ideas');
    });
  });
});
