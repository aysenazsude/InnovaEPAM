import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text, uniqueIndex, index } from 'drizzle-orm/sqlite-core';

// ── Users ──────────────────────────────────────────────────────────────────────

export const users = sqliteTable(
  'users',
  {
    id: text('id').primaryKey(),
    displayName: text('display_name').notNull(),
    email: text('email').notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    role: text('role', { enum: ['submitter', 'admin'] })
      .notNull()
      .default('submitter'),
    failedLoginCount: integer('failed_login_count').notNull().default(0),
    lockedUntil: integer('locked_until'),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [uniqueIndex('idx_users_email').on(table.email)]
);

// ── Idea Categories ───────────────────────────────────────────────────────────

export const ideaCategories = sqliteTable('idea_categories', {
  slug: text('slug').primaryKey(),
  displayName: text('display_name').notNull(),
});

// ── Ideas ─────────────────────────────────────────────────────────────────────

export const ideas = sqliteTable(
  'ideas',
  {
    id: text('id').primaryKey(),
    numericId: integer('numeric_id').notNull().unique(),
    title: text('title').notNull(),
    description: text('description').notNull(),
    category: text('category').notNull(),
    status: text('status', {
      enum: ['submitted', 'under_review', 'accepted', 'rejected'],
    })
      .notNull()
      .default('submitted'),
    submitterId: text('submitter_id')
      .notNull()
      .references(() => users.id),
    submittedAt: integer('submitted_at').notNull(),
    adminComment: text('admin_comment'),
    evaluatingAdminId: text('evaluating_admin_id').references(() => users.id),
    evaluatedAt: integer('evaluated_at'),
  },
  (table) => [
    index('idx_ideas_submitter_id').on(table.submitterId),
    index('idx_ideas_status').on(table.status),
    index('idx_ideas_submitted_at').on(sql`${table.submittedAt} DESC`),
  ]
);

// ── Attachments ───────────────────────────────────────────────────────────────

export const attachments = sqliteTable(
  'attachments',
  {
    id: text('id').primaryKey(),
    ideaId: text('idea_id')
      .notNull()
      .references(() => ideas.id, { onDelete: 'cascade' }),
    fileName: text('file_name').notNull(),
    fileType: text('file_type').notNull(),
    fileSize: integer('file_size').notNull(),
    storagePath: text('storage_path').notNull().unique(),
    uploadOrderIndex: integer('upload_order_index').notNull().default(0),
    uploadedAt: integer('uploaded_at').notNull(),
  },
  (table) => [index('idx_attachments_idea_id').on(table.ideaId)]
);

// ── Idea Category Data ────────────────────────────────────────────────────────

export const ideaCategoryData = sqliteTable('idea_category_data', {
  ideaId: text('idea_id')
    .primaryKey()
    .references(() => ideas.id, { onDelete: 'cascade' }),
  category: text('category').notNull(),
  fields: text('fields', { mode: 'json' })
    .$type<Record<string, string | null>>()
    .notNull(),
  createdAt: integer('created_at').notNull(),
});

// ── TypeScript types ──────────────────────────────────────────────────────────

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Idea = typeof ideas.$inferSelect;
export type NewIdea = typeof ideas.$inferInsert;
export type Attachment = typeof attachments.$inferSelect;
export type NewAttachment = typeof attachments.$inferInsert;
export type IdeaCategory = typeof ideaCategories.$inferSelect;
export type IdeaCategoryData = typeof ideaCategoryData.$inferSelect;
export type NewIdeaCategoryData = typeof ideaCategoryData.$inferInsert;

export type UserRole = 'submitter' | 'admin';
export type IdeaStatus = 'submitted' | 'under_review' | 'accepted' | 'rejected';
