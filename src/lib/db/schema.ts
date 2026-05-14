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
      enum: [
        'submitted', 'under_review', 'accepted', 'rejected',
        'screening', 'technical_review', 'business_review', 'final_decision',
        'approved', 'awaiting_clarification',
      ],
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
    // Phase 5: pipeline — pointer to the currently open clarification request (NULL when none)
    activeClarificationId: text('active_clarification_id'),
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
// Phase 1 statuses + Phase 5 pipeline statuses (backward-compatible extension)
export type IdeaStatus =
  | 'submitted' | 'under_review' | 'accepted' | 'rejected'
  | 'screening' | 'technical_review' | 'business_review' | 'final_decision'
  | 'approved' | 'awaiting_clarification';

export type PipelineStage = 'screening' | 'technical_review' | 'business_review' | 'final_decision';
export type PipelineAction =
  | 'advanced' | 'rejected' | 'approved'
  | 'awaiting_clarification' | 'clarification_cancelled' | 'clarification_resolved';

// ── Drafts ────────────────────────────────────────────────────────────────────

export const drafts = sqliteTable(
  'drafts',
  {
    id: text('id').primaryKey(),
    submitterId: text('submitter_id')
      .notNull()
      .references(() => users.id),
    title: text('title'),
    description: text('description'),
    category: text('category'),
    version: integer('version').notNull().default(1),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (table) => [
    index('idx_drafts_submitter_id').on(table.submitterId),
    index('idx_drafts_updated_at').on(sql`${table.updatedAt} DESC`),
  ]
);

// ── Draft Category Data ───────────────────────────────────────────────────────

export const draftCategoryData = sqliteTable('draft_category_data', {
  draftId: text('draft_id')
    .primaryKey()
    .references(() => drafts.id, { onDelete: 'cascade' }),
  category: text('category').notNull(),
  fields: text('fields', { mode: 'json' })
    .$type<Record<string, string | null>>()
    .notNull(),
  createdAt: integer('created_at').notNull(),
});

// ── Draft Attachments ─────────────────────────────────────────────────────────

export const draftAttachments = sqliteTable(
  'draft_attachments',
  {
    id: text('id').primaryKey(),
    draftId: text('draft_id')
      .notNull()
      .references(() => drafts.id, { onDelete: 'cascade' }),
    fileName: text('file_name').notNull(),
    fileType: text('file_type').notNull(),
    fileSize: integer('file_size').notNull(),
    storagePath: text('storage_path').notNull().unique(),
    uploadOrderIndex: integer('upload_order_index').notNull().default(0),
    uploadedAt: integer('uploaded_at').notNull(),
  },
  (table) => [index('idx_draft_attachments_draft_id').on(table.draftId)]
);

// ── TypeScript types (draft additions) ───────────────────────────────────────

export type Draft = typeof drafts.$inferSelect;
export type NewDraft = typeof drafts.$inferInsert;
export type DraftCategoryData = typeof draftCategoryData.$inferSelect;
export type NewDraftCategoryData = typeof draftCategoryData.$inferInsert;
export type DraftAttachment = typeof draftAttachments.$inferSelect;
export type NewDraftAttachment = typeof draftAttachments.$inferInsert;

// ── Stage Transitions (Phase 5 — pipeline audit log) ─────────────────────────

export const stageTransitions = sqliteTable(
  'stage_transitions',
  {
    id: text('id').primaryKey(),
    ideaId: text('idea_id')
      .notNull()
      .references(() => ideas.id, { onDelete: 'cascade' }),
    stage: text('stage', {
      enum: ['screening', 'technical_review', 'business_review', 'final_decision'],
    }).notNull(),
    action: text('action', {
      enum: [
        'advanced', 'rejected', 'approved',
        'awaiting_clarification', 'clarification_cancelled', 'clarification_resolved',
      ],
    }).notNull(),
    notes: text('notes').notNull(),
    adminId: text('admin_id')
      .notNull()
      .references(() => users.id),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [
    index('idx_stage_transitions_idea_id').on(table.ideaId),
    index('idx_stage_transitions_idea_created').on(table.ideaId, table.createdAt),
  ]
);

// ── Clarification Requests (Phase 5) ─────────────────────────────────────────

export const clarificationRequests = sqliteTable(
  'clarification_requests',
  {
    id: text('id').primaryKey(),
    ideaId: text('idea_id')
      .notNull()
      .references(() => ideas.id, { onDelete: 'cascade' }),
    stageWhenRequested: text('stage_when_requested').notNull(),
    question: text('question').notNull(),
    questionerId: text('questioner_id')
      .notNull()
      .references(() => users.id),
    requestedAt: integer('requested_at').notNull(),
    response: text('response'),
    responderId: text('responder_id').references(() => users.id),
    respondedAt: integer('responded_at'),
    cancelledAt: integer('cancelled_at'),
    cancelledById: text('cancelled_by_id').references(() => users.id),
  },
  (table) => [index('idx_clarification_requests_idea_id').on(table.ideaId)]
);

// ── TypeScript types (Phase 5 additions) ─────────────────────────────────────

export type StageTransition = typeof stageTransitions.$inferSelect;
export type NewStageTransition = typeof stageTransitions.$inferInsert;
export type ClarificationRequest = typeof clarificationRequests.$inferSelect;
export type NewClarificationRequest = typeof clarificationRequests.$inferInsert;

// ── Evaluation Scores (Phase 7 — scoring system) ──────────────────────────────

export const SCORING_DIMENSION_VALUES = [
  'innovation',
  'feasibility',
  'business_impact',
  'strategic_alignment',
  'technical_soundness',
] as const;

export type ScoringDimension = (typeof SCORING_DIMENSION_VALUES)[number];

export const evaluationScores = sqliteTable(
  'evaluation_scores',
  {
    id: text('id').primaryKey(),
    ideaId: text('idea_id')
      .notNull()
      .references(() => ideas.id, { onDelete: 'cascade' }),
    stageTransitionId: text('stage_transition_id')
      .notNull()
      .references(() => stageTransitions.id, { onDelete: 'cascade' }),
    adminId: text('admin_id')
      .notNull()
      .references(() => users.id),
    dimension: text('dimension', { enum: SCORING_DIMENSION_VALUES }).notNull(),
    score: integer('score').notNull(),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [
    uniqueIndex('idx_evaluation_scores_transition_dimension')
      .on(table.stageTransitionId, table.dimension),
    index('idx_evaluation_scores_idea_id').on(table.ideaId),
    index('idx_evaluation_scores_transition_id').on(table.stageTransitionId),
  ]
);

export type EvaluationScore = typeof evaluationScores.$inferSelect;
export type NewEvaluationScore = typeof evaluationScores.$inferInsert;
