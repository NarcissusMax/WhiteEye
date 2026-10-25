# WhiteEye course

The main navigation opens a dedicated `/course/` reading room. Its four learning phases contain 16 modules and 575 sequential lessons. Module overviews, an expandable chapter menu, lesson search, breadcrumbs, an in-page section rail, and Previous/Next controls provide complementary ways to navigate. Every lesson retains its learning question, original passages, practice, reflection, and related links.

The interface reuses the site's typefaces, colors, engraved artwork, header, and motion preference. The chapter menu becomes a keyboard-accessible native dialog on small screens. Reduced motion and the existing motion toggle stop page and ambient animations.

## Content integrity

`public/data/course.json` is imported from the approved Obsidian course by `scripts/import-course.py`. The authoring import compares all 1,568 quotation hashes against the external course audit before writing the data. `tests/course-fidelity.json` preserves those hashes for subsequent builds. Quotations and flashcard answers are rendered using `textContent` and `white-space: pre-wrap`; they are never parsed as HTML or rewritten. Only authored instructions that refer to Obsidian controls are adapted for the website. Course note labels distinguish authored scaffolding.

The importer is an authoring operation and needs the original vault and external audit. Deployments consume the checked-in data and do not require the user's documents. No original chat exports are added to public assets.

## Progress and reflections

The D1 binding `DB` stores completion, the latest lesson, and reflection notes. A random HttpOnly cookie identifies an anonymous learner; only its SHA-256 digest is stored in the database. Notes and progress return in the same browser. No new account is required, and no cross-device synchronization is implied.

`worker/course-progress.js` owns the prepared queries, identifier allowlists, body limits, same-origin write checks, and private/no-store API responses. `db/schema.ts` and the generated `drizzle/` migrations own the schema. Individual learners' progress and notes remain isolated.

Completion totals update only after a successful save. Failed changes remain visibly unsaved and can be retried. Course reading remains available when progress storage cannot be reached. Reflection drafts remain in memory while navigating the course; the browser warns before leaving with an unsaved draft. Saved reflections, the daily notebook, and reusable weekly reviews use durable storage.

## Development and verification

Run `npm run build`, `node scripts/validate-site.mjs`, and `node scripts/validate-course.mjs`. The course check verifies every quotation hash, ten random samples, links, sequence, persistence, independent learners, undo, notes, validation, and dedicated routes. The existing site check covers its original personas and source behavior.

`node scripts/preview-course.mjs` starts a local preview at port 8787. It uses the built Worker for API routes and a local SQLite adapter for D1. Public assets are read directly for UI iteration. Its preview data lives outside the repository in `/tmp/whiteeye-course-preview.sqlite` and is never published.
