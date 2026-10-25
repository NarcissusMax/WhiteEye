import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash, randomInt } from 'node:crypto';
import { localCourseDatabase } from './course-local-db.mjs';
import { courseProgress } from '../worker/course-progress.js';
import worker from '../dist/server/index.js';
import { buildConnections } from '../public/js/course-connections.js';

const data = JSON.parse(await readFile(new URL('../public/data/course.json', import.meta.url), 'utf8'));
const fidelity = JSON.parse(await readFile(new URL('../tests/course-fidelity.json', import.meta.url), 'utf8'));
const notes = [...data.modules, ...data.lessons, ...data.resources];
const quotes = notes.flatMap(note => note.blocks.filter(block => ['quote', 'flashcard'].includes(block.type)).map(block => ({ note: note.id, text: block.text })));
const sha = text => createHash('sha256').update(text).digest('hex');
assert.equal(data.lessons.length, 575);
assert.equal(data.modules.length, 16);
assert.equal(quotes.length, 1568);
assert.deepEqual(quotes.map(q => sha(q.text)).sort(), fidelity.hashes);
const random = new Set(); while (random.size < 10) random.add(randomInt(quotes.length));
assert([...random].every(index => fidelity.hashes.includes(sha(quotes[index].text))));
for (const [index, note] of data.lessons.entries()) {
  assert.equal(note.previous, data.lessons[index - 1]?.id || null);
  assert.equal(note.next, data.lessons[index + 1]?.id || null);
  assert(data.modules.some(m => m.id === note.module && m.lessonIds.includes(note.id)));
  assert(note.blocks.some(b => b.type === 'question'));
  assert(note.blocks.some(b => b.type === 'quote'));
}
const knownRoutes = new Set(['/course/', ...notes.map(n => `/course/${n.kind}/${n.id}`)]);
assert(Object.values(data.references).every(route => knownRoutes.has(route)));
for (const note of notes) for (const block of note.blocks) {
  if (['quote','flashcard'].includes(block.type)) continue;
  for (const match of (block.text || '').matchAll(/\[\[([^\]|#]+)/g)) assert(data.references[match[1]], `Unresolved course link: ${match[1]}`);
}
const db = localCourseDatabase();
const origin = 'https://whiteeye.example';
const call = (method, cookie, body, overrides = {}) => courseProgress(new Request(`${origin}/api/course/progress`, {
  method, headers: { origin, ...(cookie ? { cookie } : {}), ...(body !== undefined ? { 'content-type': 'application/json' } : {}), ...overrides },
  ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
}), { DB: db });
const first = await call('GET'); assert.equal(first.status, 200);
const cookie = first.headers.get('set-cookie').split(';')[0];
assert.match(first.headers.get('set-cookie'), /HttpOnly; SameSite=Strict; Secure/);
assert.equal((await first.json()).completed.length, 0);
assert.equal((await call('POST', cookie, { itemId: 'lesson:01.01', completed: true })).status, 200);
assert.equal((await call('PATCH', cookie, { lastLesson: '01.02' })).status, 200);
const saved = await (await call('GET', cookie)).json(); assert.deepEqual(saved.completed, ['lesson:01.01']); assert.equal(saved.lastLesson, '01.02');
assert.equal((await (await call('GET')).json()).completed.length, 0);
assert.equal((await call('POST', cookie, { itemId: 'lesson:99.99', completed: true })).status, 400);
assert.equal((await call('POST', cookie, { itemId: 'lesson:01.01', completed: true }, { origin: 'https://elsewhere.example' })).status, 403);
assert.equal((await call('POST', null, { itemId: 'lesson:01.01', completed: true })).status, 401);
assert.equal((await call('DELETE', cookie)).status, 405);
assert.equal((await call('POST', cookie, { itemId: 'lesson:01.01', completed: false })).status, 200);
assert.equal((await (await call('GET', cookie)).json()).completed.length, 0);
assert.equal((await courseProgress(new Request(`${origin}/api/course/progress`), {})).status, 503);
const notesCall = (method, body, cookieValue = cookie, source = origin) => courseProgress(new Request(`${origin}/api/course/notes/lesson-01.01`, {
  method, headers: { cookie: cookieValue, origin: source, 'content-type': 'application/json' },
  ...(body !== undefined ? { body: JSON.stringify({ body }) } : {}),
}), { DB: db });
const reflection = 'A reflection, with an original line break.\n<script>plain text</script>';
assert.equal((await notesCall('PUT', reflection)).status, 200);
assert.equal((await (await notesCall('GET')).json()).body, reflection);
const otherLearner = await call('GET');
const otherCookie = otherLearner.headers.get('set-cookie').split(';')[0];
assert.equal((await (await notesCall('GET', undefined, otherCookie)).json()).body, '');
assert.equal((await notesCall('PUT', 'x', cookie, 'https://elsewhere.example')).status, 403);
assert.equal((await notesCall('PUT', 'x'.repeat(20001))).status, 400);
assert.equal((await notesCall('PUT', '')).status, 200);
assert.equal((await (await notesCall('GET')).json()).body, '');
for (const route of ['/course/', '/course/lesson/01.01', '/course/module/16', '/course/resource/flashcards', '/course/graph', '/course/graph?lesson=07.03']) {
  const response = await worker.fetch(new Request(origin + route), {}, {});
  assert.equal(response.status, 200); assert.match(await response.text(), /id="course-main"/);
}
const json = await worker.fetch(new Request(origin + '/data/course.json'), {}, {});
assert.match(json.headers.get('content-type'), /application\/json/);
assert.equal((await json.json()).lessons.length, 575);
const home = await worker.fetch(new Request(origin), {}, {});
assert.match(await home.text(), /class="nav-link course-entry" href="\/course\/"/);
db.close();
console.log('Course checks passed: 575 lessons, 16 modules, 1,568 exact quotations, 10 random samples, valid links and lesson sequence.');
console.log('Progress and journal checks passed: persistence, independent learners, undo, checkpoints, exact note text, validation, failed storage, and dedicated routes.');

const graph = buildConnections(data);
assert.equal(graph.nodes.filter(n => n.kind === 'lesson').length, 575);
assert.equal(graph.nodes.filter(n => n.kind === 'module').length, 16);
const graphIds = new Set(graph.nodes.map(n => n.id));
assert.equal(graphIds.size, graph.nodes.length);
for (const edge of graph.edges) {
  assert(graphIds.has(edge.source) && graphIds.has(edge.target));
  assert.notEqual(edge.source, edge.target);
  if (edge.type === 'module') {
    const hub = [edge.source, edge.target].find(id => id.startsWith('module:'));
    const child = [edge.source, edge.target].find(id => !id.startsWith('module:'));
    assert(data.modules.find(m => 'module:' + m.id === hub).lessonIds.includes(child));
  } else if (edge.type === 'comparison') {
    assert(edge.labels.length);
    for (const label of edge.labels) assert(graph.groups.some(g => g.title === label && g.ids.includes(edge.source) && g.ids.includes(edge.target)));
  } else {
    const linksTo = (from, to) => data.lessons.find(n => n.id === from).blocks.some(b => b.type !== 'quote' && b.type !== 'flashcard' && [...(b.text || '').matchAll(/\[\[([^\]]+)\]\]/g)].some(m => data.references[m[1].split('|')[0].split('#')[0]] === '/course/lesson/' + to));
    assert(linksTo(edge.source, edge.target) || linksTo(edge.target, edge.source));
  }
}
assert.equal(graph.edges.filter(e => e.type === 'module').length, 575);
assert(graph.neighbors.get('07.03').some(n => n.id === '08.01' && n.edge.type === 'comparison'));
console.log(`Knowledge map checks passed: ${graph.nodes.length} nodes, ${graph.edges.length} valid relationships, ${graph.groups.length} comparison groups.`);
