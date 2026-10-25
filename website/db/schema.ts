import { integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const courseLearners = sqliteTable('course_learners', {
  id: text('id').primaryKey(),
  lastLesson: text('last_lesson'),
  updatedAt: integer('updated_at').notNull(),
});

export const courseProgress = sqliteTable('course_progress', {
  learnerId: text('learner_id').notNull().references(() => courseLearners.id, { onDelete: 'cascade' }),
  itemId: text('item_id').notNull(),
  updatedAt: integer('updated_at').notNull(),
}, (table) => [primaryKey({ columns: [table.learnerId, table.itemId] })]);

export const courseNotes = sqliteTable('course_notes', {
  learnerId: text('learner_id').notNull().references(() => courseLearners.id, { onDelete: 'cascade' }),
  noteId: text('note_id').notNull(),
  body: text('body').notNull(),
  updatedAt: integer('updated_at').notNull(),
}, (table) => [primaryKey({ columns: [table.learnerId, table.noteId] })]);
