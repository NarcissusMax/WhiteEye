import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { localCourseDatabase } from './course-local-db.mjs';
import { courseProgress } from '../worker/course-progress.js';
import { buildConnections } from '../public/js/course-connections.js';
import worker from '../dist/server/index.js';

const data = JSON.parse(await readFile(new URL('../public/data/course-2.json', import.meta.url), 'utf8'));
const manifest = JSON.parse(await readFile(new URL('../worker/course-2-manifest.json', import.meta.url), 'utf8'));
const lineage = JSON.parse(await readFile(new URL('../content/integrated-course/lineage.json', import.meta.url), 'utf8')).lessons;
const excludedSources = new Set(JSON.parse(await readFile(new URL('../content/integrated-course/excluded-source-ids.json', import.meta.url), 'utf8')).ids);
const notes = [...data.modules, ...data.lessons, ...data.resources];
assert.equal(data.modules.length, 40);
assert.equal(data.lessons.length, 550);
assert.equal(lineage.length, data.lessons.length);
assert(lineage.every(entry => entry.bookIds.every(id => !excludedSources.has(id))), 'Retired chess source returned to Course 2 lineage');
assert.equal(lineage.filter(entry => entry.authoringFile.startsWith('refinements/')).length, 50);
assert.equal(data.resources.length, 11);
assert.equal(data.totals.quotations, 0);
assert.equal(data.phases.length, 10);
assert(!/\b(?:chess|rook|pawn|grandmaster)\b/i.test(JSON.stringify(data)), 'Course 2 still includes chess content');
for (const id of ['21.01', '21.09', '22.01', '22.10']) {
  assert(!data.lessons.some(l => l.id === id), `Retired lesson ID ${id} was reused`);
  assert(!manifest.items.includes(`lesson:${id}`), `Retired progress ID ${id} was reused`);
}
assert.equal(data.lessons.find(l => l.id === '21.11')?.displayId, '21.01');
assert.equal(data.lessons.find(l => l.id === '22.11')?.displayId, '22.01');
assert.deepEqual(manifest.lessons, data.lessons.map(l => l.id));
assert.equal(new Set(notes.map(n => `${n.kind}:${n.id}`)).size, notes.length);
for (const [index, lesson] of data.lessons.entries()) {
  assert.equal(lesson.previous, data.lessons[index - 1]?.id || null);
  assert.equal(lesson.next, data.lessons[index + 1]?.id || null);
  assert(data.modules.some(m => m.id === lesson.module && m.lessonIds.includes(lesson.id)));
  for (const type of ['question', 'concept', 'example', 'model', 'flashcard']) assert(lesson.blocks.some(b => b.type === type), `${lesson.id} lacks ${type}`);
  assert.equal(lesson.blocks.filter(b => b.type === 'task').length, 2, `${lesson.id} needs two practices`);
  assert.equal(lesson.blocks.find(b => b.type === 'model').steps.length, 3);
  assert(lesson.blocks.every(b => b.type !== 'quote'), `${lesson.id} contains a mislabeled quotation`);
  assert(lesson.blocks.find(b => b.type === 'flashcard').text.trim());
}
for (const module of data.modules) assert(module.lessonIds.length >= 3, `${module.id} is too thin`);
const knownRoutes = new Set(['/course-2/', ...notes.map(n => `/course-2/${n.kind}/${n.id}`)]);
assert(Object.values(data.references).every(route => knownRoutes.has(route)));
for (const note of notes) for (const block of note.blocks) {
  for (const match of (block.text || '').matchAll(/\[\[([^\]|#]+)/g)) assert(data.references[match[1]], `Unresolved link: ${note.id} → ${match[1]}`);
  if (block.type === 'note' || block.type === 'task' || block.type === 'list') assert(block.text.startsWith('Course note:'), `${note.id} has unlabeled prose`);
}
const graph = buildConnections(data);
assert.equal(graph.nodes.length, 590);
assert.equal(graph.edges.filter(e => e.type === 'module').length, 550);
assert.equal(graph.groups.length, 39);
const graphIds = new Set(graph.nodes.map(n => n.id));
for (const edge of graph.edges) assert(graphIds.has(edge.source) && graphIds.has(edge.target) && edge.source !== edge.target);
assert(graph.edges.some(e => e.type === 'comparison'));

const origin = 'https://whiteeye.example';
const db = localCourseDatabase();
const call = (api, method, cookie, body, path = '/progress') => courseProgress(new Request(origin + api + path, {
  method,
  headers: { origin, ...(cookie ? { cookie } : {}), ...(body !== undefined ? { 'content-type': 'application/json' } : {}) },
  ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
}), { DB: db });
const c1 = await call('/api/course', 'GET');
const c2 = await call('/api/course2', 'GET');
assert.equal(c1.status, 200); assert.equal(c2.status, 200);
const c1Cookie = c1.headers.get('set-cookie').split(';')[0];
const c2Cookie = c2.headers.get('set-cookie').split(';')[0];
assert.match(c1Cookie, /^whiteeye_course=/);
assert.match(c2Cookie, /^whiteeye_course2=/);
assert.equal((await call('/api/course2', 'POST', c2Cookie, { itemId: 'lesson:01.01', completed: true })).status, 200);
assert.equal((await call('/api/course2', 'PATCH', c2Cookie, { lastLesson: '40.01' })).status, 200);
assert.deepEqual((await (await call('/api/course2', 'GET', c2Cookie)).json()).completed, ['lesson:01.01']);
assert.equal((await (await call('/api/course', 'GET', c1Cookie)).json()).completed.length, 0);
assert.equal((await call('/api/course2', 'POST', c2Cookie, { itemId: 'lesson:99.99', completed: true })).status, 400);
assert.equal((await call('/api/course2', 'POST', c2Cookie, { itemId: 'lesson:21.01', completed: true })).status, 400);
assert.equal((await call('/api/course2', 'POST', c2Cookie, { itemId: 'lesson:21.11', completed: true })).status, 200);
assert.equal((await call('/api/course2', 'GET', c2Cookie, undefined, '/notes/lesson-21.01')).status, 404);
assert.equal((await call('/api/course2', 'PUT', c2Cookie, { body: 'New lesson' }, '/notes/lesson-21.11')).status, 200);
assert.equal((await call('/api/course', 'POST', c1Cookie, { itemId: 'lesson:01.01', completed: true })).status, 200);
assert.equal((await (await call('/api/course2', 'GET', c2Cookie)).json()).completed.length, 2);
const reflection = 'Course 2 note\nexactly as saved';
assert.equal((await call('/api/course2', 'PUT', c2Cookie, { body: reflection }, '/notes/lesson-01.01')).status, 200);
assert.equal((await (await call('/api/course2', 'GET', c2Cookie, undefined, '/notes/lesson-01.01')).json()).body, reflection);
assert.equal((await (await call('/api/course', 'GET', c1Cookie, undefined, '/notes/lesson-01.01')).json()).body, '');
for (const route of ['/course-2/', '/course-2/lesson/01.01', '/course-2/lesson/21.11', '/course-2/lesson/40.01', '/course-2/module/40', '/course-2/resource/final-capstone', '/course-2/graph']) {
  const response = await worker.fetch(new Request(origin + route), {}, {});
  assert.equal(response.status, 200, route);
  const body = await response.text();
  assert.match(body, /id="course-main"/);
  assert.match(body, /Course II · The Integrated Course/);
}
const home = await worker.fetch(new Request(origin), {}, {});
assert.match(await home.text(), /href="\/course-2\/"/);
const json = await worker.fetch(new Request(origin + '/data/course-2.json'), {}, {});
assert.equal((await json.json()).lessons.length, 550);
db.close();
console.log(`Integrated course checks passed: ${data.modules.length} modules, ${data.lessons.length} lessons, ${graph.nodes.length} map nodes, ${graph.edges.length} valid links, ${graph.groups.length} comparison groups.`);
console.log('Separate progress, notes, checkpoints, metadata, and dedicated routes passed.');
