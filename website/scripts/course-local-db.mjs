// Local preview/test adapter. Production uses the managed D1 binding.
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';

export function localCourseDatabase(path = ':memory:') {
  const sqlite = new DatabaseSync(path);
  sqlite.exec('PRAGMA foreign_keys = ON');
  sqlite.exec('CREATE TABLE IF NOT EXISTS local_migrations (name TEXT PRIMARY KEY)');
  for (const file of readdirSync(new URL('../drizzle/', import.meta.url)).filter(name => name.endsWith('.sql')).sort()) {
    if (!sqlite.prepare('SELECT name FROM local_migrations WHERE name = ?').get(file)) {
      sqlite.exec('BEGIN');
      try {
        sqlite.exec(readFileSync(new URL(`../drizzle/${file}`, import.meta.url), 'utf8'));
        sqlite.prepare('INSERT INTO local_migrations (name) VALUES (?)').run(file);
        sqlite.exec('COMMIT');
      } catch (error) { sqlite.exec('ROLLBACK'); throw error; }
    }
  }
  const prepare = (sql, args = []) => ({
    bind(...values) { return prepare(sql, values); },
    async first(column) { const row = sqlite.prepare(sql).get(...args); return column ? row?.[column] ?? null : row ?? null; },
    async all() { return this.execute(); },
    async run() { return this.execute(); },
    execute() { return { success: true, results: sqlite.prepare(sql).all(...args) }; },
  });
  return {
    prepare,
    async batch(statements) {
      sqlite.exec('BEGIN');
      try { const results = statements.map(statement => statement.execute()); sqlite.exec('COMMIT'); return results; }
      catch (error) { sqlite.exec('ROLLBACK'); throw error; }
    },
    close() { sqlite.close(); },
  };
}
