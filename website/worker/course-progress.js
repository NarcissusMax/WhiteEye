import manifest from './course-manifest.json' with { type: 'json' };
import integratedManifest from './course-2-manifest.json' with { type: 'json' };

function courseConfig(manifest, api, cookieName, identityPrefix = '') {
  return { api, cookieName, identityPrefix,
    lessonIds: new Set(manifest.lessons), itemIds: new Set(manifest.items),
    journalIds: new Set([...manifest.lessons.map(id => `lesson-${id}`), 'resource-my-notes', 'resource-daily-practice-log', 'resource-weekly-review-template', 'resource-final-capstone', 'resource-gaps-and-questions']),
  };
}
const original = courseConfig(manifest, '/api/course', 'whiteeye_course');
const integrated = courseConfig(integratedManifest, '/api/course2', 'whiteeye_course2', 'integrated:');
const headers = { 'Cache-Control': 'no-store, private', Vary: 'Cookie' };

function database(env) {
  if (!env.DB?.prepare || !env.DB?.batch) throw new Error('Course database unavailable');
  return env.DB;
}

async function identity(request, config) {
  const { cookieName } = config;
  const cookie = request.headers.get('cookie') || '';
  const token = cookie.split(';').map(s => s.trim()).find(s => s.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1);
  const existing = /^[a-f0-9]{64}$/.test(token || '');
  const value = existing ? token : Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2, '0')).join('');
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(config.identityPrefix + value));
  const id = Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, '0')).join('');
  return { id, value, existing };
}

function sessionCookie(request, value, config) {
  const { cookieName, api } = config;
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  return `${cookieName}=${value}; Path=${api}; Max-Age=31536000; HttpOnly; SameSite=Strict${secure}`;
}

export async function courseProgress(request, env, security = {}) {
  const reply = (body, status = 200, extra = {}) => Response.json(body, { status, headers: { ...security, ...headers, ...extra } });
  const url = new URL(request.url);
  const config = url.pathname.startsWith('/api/course2/') ? integrated : original;
  const { lessonIds, itemIds, api } = config;
  if (url.pathname.startsWith(api + '/notes/')) return courseNotes(request, env, reply, url, config);
  if (url.pathname !== api + '/progress') return reply({ error: 'Not found.' }, 404);
  if (!['GET', 'POST', 'PATCH'].includes(request.method)) return reply({ error: 'Method not allowed.' }, 405, { Allow: 'GET, POST, PATCH' });
  if (request.method !== 'GET' && request.headers.get('origin') !== url.origin) return reply({ error: 'Please save from this website.' }, 403);
  try {
    const db = database(env);
    const session = await identity(request, config);
    const now = Date.now();
    if (request.method === 'GET') {
      const result = await db.batch([
        db.prepare('INSERT INTO course_learners (id, updated_at) VALUES (?, ?) ON CONFLICT(id) DO NOTHING').bind(session.id, now),
        db.prepare('SELECT last_lesson FROM course_learners WHERE id = ?').bind(session.id),
        db.prepare('SELECT item_id FROM course_progress WHERE learner_id = ? ORDER BY item_id').bind(session.id),
      ]);
      return reply({ completed: result[2].results.map(row => row.item_id), lastLesson: result[1].results[0]?.last_lesson || null }, 200, { 'Set-Cookie': sessionCookie(request, session.value, config) });
    }
    if (!session.existing) return reply({ error: 'Reload your progress before saving.' }, 401);
    if (!request.headers.get('content-type')?.startsWith('application/json')) return reply({ error: 'Expected JSON.' }, 415);
    if (Number(request.headers.get('content-length')) > 2048) return reply({ error: 'Request too large.' }, 413);
    const raw = await request.text();
    if (raw.length > 2048) return reply({ error: 'Request too large.' }, 413);
    let input;
    try { input = JSON.parse(raw); } catch { return reply({ error: 'Invalid request.' }, 400); }
    if (!input || Array.isArray(input) || typeof input !== 'object') return reply({ error: 'Invalid request.' }, 400);
    if (input.lastLesson !== undefined && !lessonIds.has(input.lastLesson)) return reply({ error: 'Unknown lesson.' }, 400);
    const learner = await db.prepare('SELECT id FROM course_learners WHERE id = ?').bind(session.id).first();
    if (!learner) return reply({ error: 'Reload your progress before saving.' }, 401);
    const statements = [];
    if (request.method === 'POST') {
      if (!itemIds.has(input.itemId) || typeof input.completed !== 'boolean') return reply({ error: 'Unknown progress item.' }, 400);
      statements.push(input.completed
        ? db.prepare('INSERT INTO course_progress (learner_id, item_id, updated_at) VALUES (?, ?, ?) ON CONFLICT(learner_id, item_id) DO UPDATE SET updated_at = excluded.updated_at').bind(session.id, input.itemId, now)
        : db.prepare('DELETE FROM course_progress WHERE learner_id = ? AND item_id = ?').bind(session.id, input.itemId));
    } else if (!input.lastLesson) return reply({ error: 'Choose a lesson.' }, 400);
    statements.push(input.lastLesson
      ? db.prepare('UPDATE course_learners SET last_lesson = ?, updated_at = ? WHERE id = ?').bind(input.lastLesson, now, session.id)
      : db.prepare('UPDATE course_learners SET updated_at = ? WHERE id = ?').bind(now, session.id));
    await db.batch(statements);
    return reply({ saved: true });
  } catch {
    return reply({ error: 'Your progress could not be saved. Please try again.' }, 503);
  }
}

async function courseNotes(request, env, reply, url, config) {
  const { journalIds } = config;
  const noteId = url.pathname.slice((config.api + '/notes/').length);
  if (!journalIds.has(noteId)) return reply({ error: 'Unknown writing page.' }, 404);
  if (!['GET', 'PUT'].includes(request.method)) return reply({ error: 'Method not allowed.' }, 405, { Allow: 'GET, PUT' });
  if (request.method === 'PUT' && request.headers.get('origin') !== url.origin) return reply({ error: 'Please save from this website.' }, 403);
  try {
    const db = database(env);
    const session = await identity(request, config);
    if (!session.existing) return reply({ error: 'Load your course before saving.' }, 401);
    const learner = await db.prepare('SELECT id FROM course_learners WHERE id = ?').bind(session.id).first();
    if (!learner) return reply({ error: 'Load your course before saving.' }, 401);
    if (request.method === 'GET') {
      const saved = await db.prepare('SELECT body, updated_at FROM course_notes WHERE learner_id = ? AND note_id = ?').bind(session.id, noteId).first();
      return reply({ body: saved?.body || '', updatedAt: saved?.updated_at || null });
    }
    if (!request.headers.get('content-type')?.startsWith('application/json')) return reply({ error: 'Expected JSON.' }, 415);
    if (Number(request.headers.get('content-length')) > 65536) return reply({ error: 'Notes are too long.' }, 413);
    const raw = await request.text();
    if (raw.length > 65536) return reply({ error: 'Notes are too long.' }, 413);
    let input;
    try { input = JSON.parse(raw); } catch { return reply({ error: 'Invalid request.' }, 400); }
    if (typeof input?.body !== 'string' || input.body.length > 20000) return reply({ error: 'Use at most 20,000 characters per writing page.' }, 400);
    const now = Date.now();
    await db.prepare('INSERT INTO course_notes (learner_id, note_id, body, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(learner_id, note_id) DO UPDATE SET body = excluded.body, updated_at = excluded.updated_at').bind(session.id, noteId, input.body, now).run();
    return reply({ saved: true, updatedAt: now });
  } catch { return reply({ error: 'Your notes could not be saved. Please try again.' }, 503); }
}
