import { isCourseTwo, courseBase, courseApi, courseDataPath, courseHref, courseIdentity } from './course-config.js';
import { buildConnections } from './course-connections.js';
import { chapterArt, lessonJourney, relatedDiagram, graphInvitation } from './course-visuals.js';
import { createCourseGraph } from './course-graph.js';
import { animateSearchResults, closeCourseDrawer, confirmMotion, enhanceDisclosure, openCourseDrawer, preparePageMotion, revealFeedback, selectionMotion, setDisclosure, transitionPage, updateAnimatedText } from './course-motion.js';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const main = $('#course-main');
const scroll = $('#course-scroll');
const dialog = $('#contents-dialog');
const controls = $('#lesson-controls');
const announcement = $('#course-announcement');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const state = { data: null, completed: new Set(), lastLesson: null, ready: false, saving: 0, pending: null, page: null };
let writeQueue = Promise.resolve();
let sectionObserver;
let graphView;
let connections;
let refreshInFlight = null;
const drafts = new Map();
const journalCache = new Map();

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
function anchor(href, text, className = '') {
  const node = element('a', className, text);
  node.href = courseHref(href);
  return node;
}
function button(text, className, action) {
  const node = element('button', className, text);
  node.type = 'button';
  node.addEventListener('click', action);
  return node;
}
function noteLabel() { return element('span', 'course-note-label', 'Course note:'); }
function urlFor(note) { return `${courseBase}/${note.kind}/${note.id}`; }
function displayId(note) { return note.displayId || note.id; }
function lesson(id) { return state.data.lessons.find(note => note.id === id); }
function moduleFor(id) { return state.data.modules.find(note => note.id === id); }
function completedLessons(ids = state.data.lessons.map(l => l.id)) { return ids.filter(id => state.completed.has(`lesson:${id}`)).length; }
function resumeLesson() {
  const previous = lesson(state.lastLesson);
  if (previous) return state.completed.has(`lesson:${previous.id}`) && previous.next ? lesson(previous.next) : previous;
  return state.data.lessons.find(l => !state.completed.has(`lesson:${l.id}`)) || state.data.lessons[0];
}
function progressTrack(scope = 'all') {
  const track = element('div', 'progress-track');
  track.setAttribute('aria-hidden', 'true');
  const fill = element('span', 'progress-fill');
  fill.dataset.progress = scope;
  track.append(fill);
  return track;
}
function courseText(text) {
  const fragment = document.createDocumentFragment();
  const cleaned = text.replace(/^Course note:\s*/, '');
  const pattern = /\[\[([^\]]+)\]\]/g;
  let offset = 0;
  for (const match of cleaned.matchAll(pattern)) {
    fragment.append(document.createTextNode(cleaned.slice(offset, match.index)));
    const [target, label] = match[1].split('|');
    const [name, heading] = target.split('#');
    const href = state.data.references[name];
    fragment.append(href ? anchor(href + (heading ? `#${slug(heading)}` : ''), label || name) : document.createTextNode(label || name));
    offset = match.index + match[0].length;
  }
  fragment.append(document.createTextNode(cleaned.slice(offset)));
  return fragment;
}
function paragraph(text, className = 'course-paragraph') {
  const node = element('p', className);
  node.append(noteLabel(), courseText(text));
  return node;
}
function slug(text) { return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
function notify(text, retry) {
  const notice = $('#course-notice');
  notice.replaceChildren(element('span', '', text));
  if (retry) notice.append(button('Try again', '', retry));
  notice.hidden = false;
  revealFeedback(notice);
}
function clearNotice() { $('#course-notice').hidden = true; }
async function requestProgress(method = 'GET', body) {
  const response = await fetch(`${courseApi}/progress`, {
    method, credentials: 'same-origin', cache: 'no-store',
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`Progress request failed: ${response.status}`);
  return response.json();
}
function enqueueWrite(action) {
  const next = writeQueue.then(action, action);
  writeQueue = next.catch(() => {});
  return next;
}
async function loadProgress() {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    try {
      await writeQueue;
      const saved = await requestProgress();
      state.completed = new Set(saved.completed);
      state.lastLesson = lesson(saved.lastLesson) ? saved.lastLesson : null;
      state.ready = true;
      clearNotice();
      updateProgress();
      if (state.page?.kind === 'lesson') checkpoint(state.page.id);
    } catch {
      if (!state.ready) updateProgress();
      notify('Progress is unavailable right now. You can keep reading; try again to load and save your place.', loadProgress);
    } finally { refreshInFlight = null; }
  })();
  return refreshInFlight;
}
function checkpoint(id) {
  if (!state.ready || state.lastLesson === id) return;
  enqueueWrite(async () => {
    try {
      await requestProgress('PATCH', { lastLesson: id });
      state.lastLesson = id;
      updateProgress();
    } catch {
      notify('Your latest reading position was not saved. You can keep reading and retry.', loadProgress);
    }
  });
}
async function setCompleted(id, completed) {
  if (!state.ready || state.saving) return;
  state.saving += 1;
  state.pending = { id, completed };
  updateProgress();
  try {
    await enqueueWrite(() => requestProgress('POST', { itemId: id, completed }));
    if (completed) state.completed.add(id); else state.completed.delete(id);
    clearNotice();
    announcement.textContent = completed ? 'Completed. Your progress is saved.' : 'Marked incomplete. Your progress is saved.';
    const matchingTask = $$('input[data-task]').find(input => input.dataset.task === id);
    confirmMotion(id.startsWith('lesson:')
      ? [$('.completion-box'), $('.lesson-state')]
      : [matchingTask]);
  } catch {
    notify('That change was not saved. Please try again.', () => setCompleted(id, completed));
  } finally {
    state.saving -= 1;
    state.pending = null;
    updateProgress();
  }
}

function makeRail(host, prefix) {
  host.replaceChildren();
  const top = element('div', 'rail-top');
  const switcher = element('nav', 'course-switcher'); switcher.setAttribute('aria-label', 'Choose a course');
  for (const [number, href, text] of [[1, '/course/', 'I · WhiteEye'], [2, '/course-2/', 'II · Integrated']]) {
    const a = element('a', '', text); a.href = href;
    if (number === courseIdentity.number) a.setAttribute('aria-current', 'page');
    switcher.append(a);
  }
  top.append(switcher);
  const title = anchor('/course/', '', 'rail-title');
  title.append(element('span', '', courseIdentity.shortTitle));
  const eye = element('img'); eye.src = '/assets/eye.svg'; eye.alt = ''; eye.width = 24; eye.height = 24;
  title.append(eye);
  top.append(title, element('p', 'rail-caption', `${state.data.modules.length} modules · ${state.data.lessons.length} lessons`));
  const progressCopy = element('div', 'rail-progress-copy');
  const count = element('span', '', 'Loading progress…'); count.dataset.completedCount = '';
  const percent = element('span', '', '—'); percent.dataset.percent = '';
  progressCopy.append(count, percent);
  top.append(progressCopy, progressTrack());
  const search = element('div', 'rail-search');
  search.append(element('span', '', '⌕'));
  const input = element('input');
  input.type = 'search'; input.id = `${prefix}-search`; input.placeholder = 'Find a lesson…'; input.autocomplete = 'off';
  input.setAttribute('aria-label', 'Search course lessons');
  search.append(input);
  const railScroll = element('div', 'rail-scroll');
  const results = element('div', 'rail-search-results'); results.hidden = true;
  const resultsCount = element('p'); resultsCount.setAttribute('role', 'status');
  const found = element('div'); results.append(resultsCount, found);
  const chapters = element('nav'); chapters.setAttribute('aria-label', 'Modules and lessons');
  const overview = anchor('/course/', '↗  Course overview', 'rail-overview');
  chapters.append(overview, anchor('/course/graph', '◈  Knowledge map', 'rail-graph'));
  for (const module of state.data.modules) {
    const details = element('details', 'rail-module'); details.dataset.module = module.id;
    const summary = element('summary');
    summary.append(element('small', '', module.id), element('span', '', module.title));
    details.append(summary, anchor(urlFor(module), 'Module overview ↗', 'rail-module-link'));
    const list = element('ul', 'rail-lessons');
    for (const id of module.lessonIds) {
      const li = element('li'); li.append(railLesson(lesson(id))); list.append(li);
    }
    details.append(list); enhanceDisclosure(details); chapters.append(details);
  }
  railScroll.append(results, chapters);
  const bottom = element('div', 'rail-bottom');
  bottom.append(anchor('/course/resource/weekly-review-template', 'Weekly review ↗'), anchor('/course/resource/glossary', 'Glossary ↗'));
  host.append(top, search, railScroll, bottom);
  input.addEventListener('input', () => {
    const query = input.value.trim().toLowerCase();
    results.hidden = !query; chapters.hidden = !!query;
    if (!query) return;
    const words = query.split(/\s+/);
    const matches = state.data.lessons.filter(note => {
      const text = `${note.id} ${displayId(note)} ${note.title} ${note.blocks.find(b => b.type === 'question')?.text || ''}`.toLowerCase();
      return words.every(word => text.includes(word));
    });
    resultsCount.textContent = matches.length ? `${matches.length} matching lesson${matches.length === 1 ? '' : 's'}` : 'No lessons match. Try a shorter phrase.';
    found.replaceChildren(...matches.map(note => railLesson(note, true)));
    syncRail();
    updateProgress();
    animateSearchResults(found);
  });
}
function railLesson(note, fullNumber = false) {
  const a = anchor(urlFor(note), '', 'rail-lesson'); a.dataset.lesson = note.id;
  a.append(element('span', 'lesson-digit', fullNumber ? displayId(note) : displayId(note).split('.')[1]), element('span', '', note.title));
  const check = element('span', 'lesson-check'); check.setAttribute('aria-label', 'Completed'); check.hidden = true;
  check.textContent = '✓'; a.append(check);
  return a;
}
function syncRail() {
  for (const rail of [$('#course-sidebar'), $('#mobile-contents')]) {
    if (!rail.firstChild) continue;
    const isOverview = !state.page;
    const graphLink = $('.rail-graph', rail);
    if (state.page?.kind === 'graph') graphLink.setAttribute('aria-current', 'page'); else graphLink.removeAttribute('aria-current');
    const overview = $('.rail-overview', rail);
    if (isOverview) overview.setAttribute('aria-current', 'page'); else overview.removeAttribute('aria-current');
    for (const module of $$('.rail-module', rail)) {
      const active = state.page?.module === module.dataset.module || (state.page?.kind === 'module' && state.page.id === module.dataset.module);
      module.classList.toggle('active-module', active);
      if (active) setDisclosure(module, true);
    }
    for (const a of $$('[data-lesson]', rail)) {
      if (state.page?.kind === 'lesson' && state.page.id === a.dataset.lesson) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    }
    requestAnimationFrame(() => {
      const current = $('[data-lesson][aria-current]', rail);
      const railScroll = $('.rail-scroll', rail);
      if (current && railScroll && current.getClientRects().length) {
        const item = current.getBoundingClientRect(), bounds = railScroll.getBoundingClientRect();
        if (item.top < bounds.top || item.bottom > bounds.bottom) railScroll.scrollTop += item.top - bounds.top - bounds.height / 3;
      }
      selectionMotion(rail);
    });
  }
}
function updateProgress() {
  if (!state.data) return;
  graphView?.update();
  const done = completedLessons();
  const percent = Math.round(done / state.data.lessons.length * 100);
  for (const node of $$('[data-completed-count]')) updateAnimatedText(node, state.ready ? `${done} of ${state.data.lessons.length} completed` : 'Loading progress…');
  for (const node of $$('[data-percent]')) updateAnimatedText(node, state.ready ? `${percent}%` : '—');
  for (const node of $$('[data-progress]')) {
    const ids = node.dataset.progress === 'all' ? state.data.lessons.map(l => l.id) : moduleFor(node.dataset.progress).lessonIds;
    node.style.transform = `scaleX(${state.ready ? completedLessons(ids) / ids.length : 0})`;
  }
  for (const node of $$('.ring-value')) node.style.strokeDashoffset = String(164 * (1 - (state.ready ? done / state.data.lessons.length : 0)));
  for (const node of $$('[data-module-count]')) {
    const ids = moduleFor(node.dataset.moduleCount).lessonIds;
    node.textContent = state.ready ? `${completedLessons(ids)} / ${ids.length} completed` : `${ids.length} lessons`;
  }
  for (const node of $$('[data-lesson]')) {
    const complete = state.completed.has(`lesson:${node.dataset.lesson}`);
    node.dataset.complete = String(complete);
    const check = $('.lesson-check', node); if (check) check.hidden = !complete;
    const label = $('.module-lesson-status', node); if (label) label.textContent = complete ? 'Completed' : 'Read lesson';
  }
  for (const input of $$('input[data-task]')) {
    const pending = state.pending?.id === input.dataset.task;
    input.checked = pending ? state.pending.completed : state.completed.has(input.dataset.task);
    input.closest('.practice-item').dataset.saving = String(pending);
    input.disabled = !state.ready || !!state.saving;
  }
  const completeButton = $('.complete-button');
  if (completeButton && state.page?.kind === 'lesson') {
    const complete = state.completed.has(`lesson:${state.page.id}`);
    completeButton.disabled = !state.ready || !!state.saving;
    completeButton.setAttribute('aria-pressed', String(complete));
    $('.completion-box', completeButton).textContent = complete ? '✓' : '';
    $('.completion-label', completeButton).textContent = state.saving ? 'Saving…' : complete ? 'Completed' : 'Mark complete';
    const label = $('.lesson-state', main);
    label.textContent = complete ? '✓ Completed' : 'In progress';
    label.classList.toggle('completed', complete);
  }
  for (const a of $$('[data-resume]')) {
    const next = resumeLesson(); a.href = urlFor(next);
    const text = $('[data-resume-label]', a);
    if (text) text.textContent = state.lastLesson || done ? 'Continue learning' : 'Begin the course';
  }
  for (const node of $$('[data-journey-copy]')) node.textContent = state.ready
    ? done === state.data.lessons.length ? 'Every lesson is complete. Return to any chapter, or bring your work together in the capstone.'
      : state.lastLesson ? `Return to lesson ${displayId(resumeLesson())} · ${resumeLesson().title}`
      : `Start with ${state.data.modules[0].title}. Your place and completed lessons are saved as you go.`
    : 'Read at your own pace. Your saved progress will appear here.';
}

function overview() {
  const page = element('div', 'course-overview');
  const hero = element('section', 'overview-hero');
  const art = element('div', 'hero-art'); art.setAttribute('aria-hidden', 'true');
  const img = element('img');
  img.dataset.bloodSrc = '/assets/illustrations/moonlit-sea.webp';
  img.dataset.celestialSrc = '/assets/celestial/upscaled-plate-1-10cb647088eb.webp';
  img.dataset.parchmentSrc = '/assets/illustrations/moonlit-sea.webp';
  img.src = document.documentElement.dataset.appearance === 'celestial' ? img.dataset.celestialSrc : img.dataset.bloodSrc;
  img.alt = ''; img.width = 1680; img.height = 767; art.append(img);
  const ornament = element('div', 'hero-ornament'); ornament.setAttribute('aria-hidden', 'true');
  const copy = element('div', 'hero-copy');
  copy.append(noteLabel(), element('div', 'eyebrow-course', courseIdentity.title));
  const title = element('h1'); title.append(courseIdentity.headline[0], element('br'), element('em', '', courseIdentity.headline[1]));
  const description = element('p', 'hero-description', courseIdentity.description);
  const actions = element('div', 'hero-actions');
  const start = anchor('/course/lesson/01.01', '', 'course-button'); start.dataset.resume = '';
  const label = element('span', '', 'Begin the course'); label.dataset.resumeLabel = '';
  start.append(label, element('span', '', '→'));
  actions.append(start, anchor('/course/resource/00-start-here', 'How to use the course ↗', 'text-link'));
  const stats = element('div', 'course-stats');
  for (const [count, label] of [[String(state.data.modules.length), 'modules'], [String(state.data.lessons.length), 'lessons'], ['Your', 'own pace']]) {
    const item = element('span'); item.append(element('strong', '', count), label); stats.append(item);
  }
  copy.append(title, description, actions, stats); hero.append(art, ornament, copy);
  const journey = element('section', 'journey-strip');
  const ring = element('div', 'journey-ring');
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('viewBox', '0 0 60 60'); svg.setAttribute('aria-hidden', 'true');
  for (const className of ['', 'ring-value']) {
    const circle = document.createElementNS(svg.namespaceURI, 'circle');
    for (const [key, value] of Object.entries({ cx: '30', cy: '30', r: '26', class: className })) circle.setAttribute(key, value);
    svg.append(circle);
  }
  const percent = element('strong', '', '—'); percent.dataset.percent = ''; ring.append(svg, percent);
  const journeyCopy = element('div', 'journey-copy');
  const detail = element('p'); detail.dataset.journeyCopy = '';
  journeyCopy.append(element('h2', '', 'Your path through the course'), detail);
  journey.append(ring, journeyCopy, anchor('/course/resource/progress-tracker', 'View progress ↗', 'text-link'));
  const heading = element('div', 'chapter-heading');
  heading.append(element('h2', '', isCourseTwo ? 'One curriculum. Connected ideas.' : 'Sixteen chapters. Your own path.'), element('p', '', 'Course note: Follow the learning order'));
  const chapters = element('div', 'chapter-grid');
  for (const [index, module] of state.data.modules.entries()) {
    if (index % 4 === 0 && state.data.phases?.[index / 4]) {
      const phase = state.data.phases[index / 4];
      const divider = element('div', 'phase-divider');
      divider.append(element('span', 'eyebrow-course', `Course note: Phase ${index / 4 + 1}`), element('h3', '', phase.title), element('p', '', phase.description));
      chapters.append(divider);
    }
    const card = anchor(urlFor(module), '', 'chapter-card');
    card.append(chapterArt(module.id, true), element('span', 'chapter-number', module.id));
    const body = element('div');
    body.append(element('h3', '', module.title), element('p', '', module.description));
    const meta = element('div', 'chapter-meta');
    const count = element('span', '', `${module.lessonIds.length} lessons`); count.dataset.moduleCount = module.id;
    meta.append(count, element('span', '', '3 practices'), element('span', 'arrow', '↗'));
    body.append(meta, progressTrack(module.id)); card.append(body); chapters.append(card);
  }
  const resources = element('section', 'resources-section');
  resources.append(noteLabel(), element('div', 'eyebrow-course', 'Keep the work close'), element('h2', '', 'Practice, reflect, return.'), element('p', '', 'Use these companions as you move through the lessons. Bring your work together in the final capstone.'));
  const links = element('div', 'resource-links');
  const order = ['daily-practice-log','weekly-review-template','final-capstone','glossary','flashcards','question-map','connections-and-tensions','gaps-and-questions','my-notes'];
  for (const id of order) {
    const resource = state.data.resources.find(r => r.id === id);
    const link = anchor(urlFor(resource), ''); link.append(resource.title, element('span', '', '↗')); links.append(link);
  }
  resources.append(links); page.append(hero, journey, graphInvitation(state.data), heading, chapters, resources);
  return page;
}

function sectionHeading(text, number, depth = 2) {
  const wrap = element('div', 'reader-section-heading'); wrap.id = slug(text);
  if (number) wrap.append(element('span', 'section-number', String(number).padStart(2, '0')));
  const content = element('div'); content.append(noteLabel(), element(depth > 2 ? 'h3' : 'h2', '', text)); wrap.append(content);
  return wrap;
}
function quoteHeading() {
  const wrap = element('div', 'quote-heading'); wrap.id = 'whiteeye';
  const image = element('img'); image.src = '/assets/eye.svg'; image.alt = ''; image.width = 27; image.height = 27;
  wrap.append(image, element('span', '', 'WhiteEye'));
  return wrap;
}
function renderBlocks(note, container, blocks = note.blocks) {
  let section = 0;
  let startedQuotes = false;
  for (const block of blocks) {
    if (block.type === 'question') {
      const question = element('section', 'reader-question'); question.id = 'learning-question';
      question.append(noteLabel(), element('h2', '', block.text)); container.append(question);
    } else if (block.type === 'concept' || block.type === 'example') {
      const body = element(block.type === 'example' ? 'aside' : 'div', block.type === 'example' ? 'course-example' : 'course-concept');
      body.append(noteLabel());
      if (block.title) body.append(element('h3', '', block.title));
      for (const text of block.text.split('\n\n')) body.append(element('p', '', text));
      container.append(body);
    } else if (block.type === 'model') {
      const model = element('figure', 'course-model');
      const caption = element('figcaption'); caption.append(noteLabel(), element('h3', '', block.title));
      const steps = element('ol', 'course-model-steps');
      for (const [index, step] of block.steps.entries()) {
        const item = element('li'); item.append(element('span', 'model-number', String(index + 1).padStart(2, '0')), element('strong', '', step.label), element('p', '', step.text)); steps.append(item);
      }
      model.append(caption, steps); container.append(model);
    } else if (block.type === 'quote') {
      if (!startedQuotes) { container.append(quoteHeading()); startedQuotes = true; }
      // Deliberately use textContent: preserve spelling, punctuation, whitespace,
      // source line breaks, and literal Markdown without parsing or rewriting it.
      container.append(element('blockquote', 'whiteeye-quote', block.text));
    } else if (block.type === 'heading') {
      container.append(sectionHeading(block.text, ++section, block.depth));
    } else if (block.type === 'task') {
      const item = element('div', 'practice-item');
      const input = element('input'); input.type = 'checkbox'; input.dataset.task = block.id;
      input.id = block.id.replaceAll(':', '-').replaceAll('.', '-');
      const label = element('label', 'practice-label'); label.htmlFor = input.id;
      label.append(noteLabel(), courseText(block.text));
      input.addEventListener('change', () => {
        const next = input.checked;
        setCompleted(block.id, next);
      });
      item.append(input, label); container.append(item);
    } else if (block.type === 'flashcard') {
      const card = element('details', 'flashcard');
      const summary = element('summary'); summary.append(noteLabel(), block.question);
      if (isCourseTwo) {
        const answer = element('div', 'course-answer');
        answer.append(noteLabel(), element('span', '', block.text));
        card.append(summary, answer);
      } else card.append(summary, element('blockquote', 'whiteeye-quote', block.text));
      container.append(card);
    } else if (block.type === 'table') {
      const wrap = element('div', 'course-table-wrap'); const table = element('table', 'course-table');
      block.rows.forEach((row, index) => {
        const tr = element('tr');
        for (const cell of row) { const td = element(index === 0 ? 'th' : 'td'); td.append(courseText(cell)); tr.append(td); }
        table.append(tr);
      });
      wrap.append(table); container.append(wrap);
    } else if (block.type === 'template') {
      container.append(element('pre', 'course-template', block.text));
    } else {
      container.append(paragraph(block.text, block.type === 'list' ? 'course-list-item' : 'course-paragraph'));
    }
  }
}
function renderModuleLessons(module, reader) {
  reader.append(sectionHeading('Lesson path', null));
  const list = element('ol', 'module-lessons');
  for (const id of module.lessonIds) {
    const note = lesson(id);
    const li = element('li'); const a = anchor(urlFor(note), '', 'module-lesson-link'); a.dataset.lesson = id;
    a.append(element('span', 'lesson-digit', displayId(note).split('.')[1]), element('span', 'module-lesson-title', note.title), element('small', 'module-lesson-status', 'Read lesson'), element('span', 'arrow', '→'));
    li.append(a); list.append(li);
  }
  reader.append(list);
}
function websiteBlocks(note) {
  // Adapt only authored instructions that refer to Obsidian controls. Quotes and
  // flashcard answers always come through unchanged from the verified import.
  return note.blocks.map(block => {
    if (block.type === 'quote' || block.type === 'flashcard') return block;
    const copy = { ...block };
    if (note.id === '00-start-here' && block.text?.startsWith('Course note: Keep [[My Notes]] in an editable pane')) copy.text = 'Course note: Use [[My Notes]] for your ongoing reflections, or open “Write a reflection” inside a lesson. Save your notes before leaving the website. The chapter menu takes you back to any passage.';
    if (note.id === '00-start-here' && block.text === 'Keep your notes beside the course') copy.text = 'Keep your reflections with the course';
    if (note.id === 'my-notes' && block.text?.startsWith('Course note: Write your notes here')) copy.text = 'Course note: Write your reflections in the notebook below. Include lesson numbers or links when you want to return to a passage.';
    if (note.id === 'weekly-review-template' && block.text?.startsWith('Course note: Duplicate this note')) copy.text = 'Course note: Add a dated weekly review to your notebook below. Use the headings to record your observations, then save your notes.';
    if (note.id === 'daily-practice-log' && block.text?.startsWith('Course note: Copy this entry')) copy.text = 'Course note: Add a dated entry to your notebook below. A brief record of an actual attempt is enough; include the lesson you used.';
    if (note.id === 'progress-tracker' && block.text?.startsWith('Course note: Use the module checkboxes')) copy.text = 'Course note: Mark lessons complete using the control beneath each lesson. Use the module checkboxes below after reading its lessons, carrying out its three practices, and writing its reflection. Your lesson totals update automatically.';
    return copy;
  });
}
function journalEditor(note) {
  const id = `${note.kind}-${note.id}`;
  const editor = element('details', 'journal-editor'); editor.id = 'your-notes';
  const summary = element('summary');
  const heading = element('span'); heading.append(noteLabel(), note.kind === 'lesson' ? 'Write a reflection' : 'Your notebook'); summary.append(heading);
  const label = element('label', '', 'Your own words'); label.htmlFor = `journal-${id}`;
  const input = element('textarea'); input.id = label.htmlFor; input.maxLength = 20000;
  input.placeholder = note.kind === 'lesson' ? 'What do you notice in your own life? What will you try?' : 'Write your observations, questions, and actual attempts here…';
  input.disabled = true;
  const actions = element('div', 'journal-actions');
  const status = element('span', 'journal-status', 'Opening your notes…'); status.setAttribute('role', 'status');
  let loaded = false;
  let saving = false;
  const save = button('Save notes', 'course-button', async () => {
    if (!loaded || saving) return;
    saving = true; save.disabled = true;
    const body = input.value; status.textContent = 'Saving…';
    try {
      const response = await fetch(`${courseApi}/notes/${id}`, { method: 'PUT', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ body }), signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw new Error('Save failed');
      journalCache.set(id, body);
      if (input.value === body) { drafts.delete(id); status.textContent = 'Notes saved'; confirmMotion([status, save]); }
      else status.textContent = 'Unsaved changes';
    } catch { status.textContent = 'Could not save. Your draft is still here; try Save notes again.'; }
    finally { saving = false; save.disabled = false; }
  });
  save.disabled = true;
  const retry = button('Retry opening notes', 'course-button secondary', () => open()); retry.hidden = true;
  actions.append(save);
  if (['daily-practice-log','weekly-review-template'].includes(note.id)) {
    const add = button(note.id === 'weekly-review-template' ? 'Add weekly review +' : 'Add daily entry +', 'text-link', () => {
      if (!loaded) return;
      const day = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
      const headings = note.blocks.filter(b => b.type === 'heading' && !b.text.startsWith('Date:')).map(b => `${b.text}\n\n`).join('\n');
      const entry = `${input.value ? '\n\n——————————\n\n' : ''}${day}\n\n${headings}`;
      if ((input.value + entry).length > 20000) { status.textContent = 'This notebook is full. Copy your notes before starting another entry.'; return; }
      input.value += entry; input.dispatchEvent(new Event('input')); input.focus(); input.setSelectionRange(input.value.length, input.value.length);
    });
    actions.append(add);
  }
  actions.append(retry, status);
  editor.append(summary, paragraph('Course note: Your saved notes return when you reopen the course in this browser.'), label, input, actions);
  input.addEventListener('input', () => {
    if (input.value === (journalCache.get(id) || '')) drafts.delete(id); else drafts.set(id, input.value);
    status.textContent = drafts.has(id) ? 'Unsaved changes' : 'Notes saved';
  });
  async function open() {
    if (loaded) return;
    retry.hidden = true; status.textContent = 'Opening your notes…';
    try {
      if (!state.ready) await loadProgress();
      if (!state.ready) throw new Error('Progress not ready');
      const response = await fetch(`${courseApi}/notes/${id}`, { credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw new Error('Notes unavailable');
      const result = await response.json();
      journalCache.set(id, result.body);
      input.value = drafts.has(id) ? drafts.get(id) : result.body;
      loaded = true; input.disabled = false; save.disabled = false;
      status.textContent = drafts.has(id) ? 'Unsaved changes' : result.updatedAt ? 'Notes saved' : 'Ready for your notes';
    } catch { status.textContent = 'Your notes could not open.'; retry.hidden = false; }
  }
  editor.addEventListener('toggle', () => { if (editor.open) open(); });
  if (note.kind === 'resource') editor.open = true;
  return editor;
}
function readerPage(note) {
  const shell = element('div', 'reader-shell');
  const crumbs = element('nav', 'breadcrumbs'); crumbs.setAttribute('aria-label', 'Breadcrumb');
  crumbs.append(anchor('/course/', 'Course overview'));
  const module = note.module ? moduleFor(note.module) : null;
  if (note.kind === 'lesson') crumbs.append(element('span', 'crumb-separator', '/'), anchor(urlFor(module), module.title));
  crumbs.append(element('span', 'crumb-separator', '/'), element('span', '', note.kind === 'lesson' ? `Lesson ${displayId(note)}` : note.title));
  const layout = element('div', 'reader-layout'); const reader = element('article', 'reader');
  const header = element('header', 'reader-header');
  const kicker = element('div', 'reader-kicker');
  kicker.append(element('span', 'eyebrow-course', note.kind === 'lesson' ? `Module ${note.module} · Lesson ${displayId(note).split('.')[1]}` : note.kind === 'module' ? `Module ${note.id} / ${state.data.modules.length}` : 'Course companion'));
  if (note.kind === 'lesson') kicker.append(element('span', 'lesson-state', 'In progress'));
  header.append(kicker, noteLabel(), element('h1', '', note.title));
  if (note.kind === 'module') header.append(element('p', '', note.description));
  const meta = element('div', 'reader-submeta');
  if (note.kind === 'lesson') {
    meta.append(element('span', '', `Lesson ${note.position} of ${state.data.lessons.length}`), anchor(urlFor(module), `${module.lessonIds.length} lessons in this module ↗`));
    header.append(meta, progressTrack(module.id));
  } else if (note.kind === 'module') {
    const count = element('span', '', `${note.lessonIds.length} lessons`); count.dataset.moduleCount = note.id;
    meta.append(count, element('span', '', 'Three practices · One reflection'));
    header.append(meta, progressTrack(note.id));
  }
  if (note.module || note.kind === 'module') header.prepend(chapterArt(note.module || note.id));
  reader.append(header);
  if (note.kind === 'lesson') reader.append(lessonJourney(note));
  if (note.kind === 'module') {
    const actions = element('div', 'resource-actions');
    const next = note.lessonIds.find(id => !state.completed.has(`lesson:${id}`)) || note.lessonIds[0];
    actions.append(anchor(`/course/lesson/${next}`, 'Enter this module →', 'course-button'), anchor(`/course/graph?module=${note.id}`, 'Explore this module’s map ↗', 'text-link'));
    reader.append(actions);
    renderModuleLessons(note, reader);
    let inLessonPath = false;
    let firstDescription = true;
    const blocks = note.blocks.filter(block => {
      if (block.type === 'heading' && block.text === 'Lesson path') { inLessonPath = true; return false; }
      if (block.type === 'heading' && block.text === 'Practice') inLessonPath = false;
      if (inLessonPath) return false;
      if (block.type === 'note' && firstDescription) { firstDescription = false; return false; }
      return true;
    });
    renderBlocks(note, reader, blocks);
    const nextModule = moduleFor(String(Number(note.id) + 1).padStart(2, '0'));
    const actionsEnd = element('div', 'resource-actions');
    actionsEnd.append(anchor(nextModule ? urlFor(nextModule) : '/course/resource/final-capstone', nextModule ? `Next module · ${nextModule.title} →` : 'Continue to the capstone →', 'course-button'));
    reader.append(actionsEnd);
  } else {
    if (note.id === 'progress-tracker') {
      const p = element('p', 'course-paragraph'); const count = element('strong'); count.dataset.completedCount = ''; p.append(count); reader.append(p, progressTrack());
    }
    renderBlocks(note, reader, websiteBlocks(note));
    if (note.kind === 'lesson') reader.append(relatedDiagram(note, connections, state.data));
    if (note.kind === 'lesson' || ['my-notes','daily-practice-log','weekly-review-template','final-capstone','gaps-and-questions'].includes(note.id)) reader.append(journalEditor(note));
    if (['daily-practice-log','weekly-review-template','my-notes'].includes(note.id)) {
      const actions = element('div', 'resource-actions');
      actions.append(button('Copy writing template ↗', 'course-button secondary', async (event) => {
        const trigger = event.currentTarget;
        try {
          const text = note.blocks.filter(b => b.type !== 'quote').map(b => b.type === 'table' ? b.rows.map(row => row.join(' | ')).join('\n') : b.text || '').join('\n\n');
          await navigator.clipboard.writeText(text);
          trigger.textContent = 'Template copied ✓'; confirmMotion([trigger]);
          announcement.textContent = 'Writing template copied.';
        } catch { notify('Your browser could not copy the template. Select its text to copy it.'); }
      }));
      reader.append(actions);
    }
  }
  const toc = element('nav', 'reader-toc'); toc.setAttribute('aria-label', 'On this page');
  toc.append(element('p', '', 'On this page'));
  if (note.kind === 'lesson') {
    if ($('.reader-question', reader)) toc.append(anchor('#learning-question', 'The question'));
    if ($('#whiteeye', reader)) toc.append(anchor('#whiteeye', 'WhiteEye’s words'));
  }
  const headings = $$('.reader-section-heading', reader);
  for (const heading of headings.slice(0, 10)) toc.append(anchor(`#${heading.id}`, $('h2,h3', heading).textContent));
  if ($('#your-notes', reader)) toc.append(anchor('#your-notes', 'Your notes'));
  toc.append(anchor(`/course/graph${note.kind === 'lesson' ? '?lesson=' + note.id : ''}`, '◈ Knowledge map', 'toc-map'));
  toc.append(anchor(note.kind === 'lesson' ? urlFor(module) : '/course/', note.kind === 'lesson' ? '← Module overview' : '← Course overview', 'toc-module'));
  layout.append(reader, toc); shell.append(crumbs, layout);
  return shell;
}
function buildLessonControls(note) {
  controls.replaceChildren(); controls.hidden = note?.kind !== 'lesson';
  document.body.classList.toggle('reading-lesson', !controls.hidden);
  if (controls.hidden) return;
  const previous = anchor(note.previous ? `/course/lesson/${note.previous}` : `/course/module/${note.module}`, note.previous ? '← Previous' : '← Overview', 'previous-button text-link');
  const complete = button('', 'complete-button', () => setCompleted(`lesson:${note.id}`, !state.completed.has(`lesson:${note.id}`)));
  complete.setAttribute('aria-pressed', 'false');
  complete.append(element('span', 'completion-box', ''), element('span', 'completion-label', 'Mark complete'));
  const next = anchor(note.next ? `/course/lesson/${note.next}` : '/course/resource/final-capstone', '', 'course-button next-button');
  next.append(element('span', '', note.next ? 'Next lesson' : 'Final capstone'), element('span', '', '→'));
  controls.append(previous, complete, next);
}
function resolvePage(pathname = location.pathname) {
  const path = pathname.replace(/\/$/, '');
  if (path === courseBase) return null;
  if (path === `${courseBase}/graph`) return { id: 'graph', kind: 'graph', title: 'The knowledge map' };
  const [, , kind, id] = path.split('/');
  const collection = kind === 'lesson' ? state.data.lessons : kind === 'module' ? state.data.modules : kind === 'resource' ? state.data.resources : [];
  return collection.find(note => note.id === id) || false;
}
function render({ focus = false } = {}) {
  sectionObserver?.disconnect();
  graphView?.destroy(); graphView = null;
  const note = resolvePage(); state.page = note || null;
  if (note === false) {
    const error = element('div', 'course-error'); error.append(element('h1', '', 'This lesson could not be found.'), anchor('/course/', 'Return to the course →', 'course-button')); main.replaceChildren(error);
  } else if (note?.kind === 'graph') {
    graphView = createCourseGraph(state.data, connections, () => state.completed);
    main.replaceChildren(graphView.node);
  } else main.replaceChildren(note ? readerPage(note) : overview());
  main.setAttribute('aria-busy', 'false');
  globalThis.dispatchEvent(new Event('whiteeye:courseview'));
  buildLessonControls(note); syncRail(); updateProgress();
  document.title = note ? `${note.kind === 'lesson' ? displayId(note) + ' · ' : ''}${note.title} — WhiteEye` : `${courseIdentity.shortTitle} — WhiteEye`;
  scroll.scrollTop = 0;
  if (focus) {
    const heading = $('h1', main); heading.tabIndex = -1; heading.focus({ preventScroll: true });
  }
  if (note?.kind === 'lesson') checkpoint(note.id);
  requestAnimationFrame(() => {
    if (location.hash) scrollToSection(location.hash);
    const sections = $$('[id]', $('.reader', main) || element('div'));
    sectionObserver = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) {
        for (const a of $$('.reader-toc a[href^="#"], .journey-step[href^="#"]')) {
          if (a.hash === `#${entry.target.id}`) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current');
        }
      }
    }, { root: scroll, rootMargin: '-5% 0px -65% 0px', threshold: 0 });
    sections.forEach(section => sectionObserver.observe(section));
  });
}
function navigateCourse(url, { fromHistory = false } = {}) {
  const next = resolvePage(url.pathname);
  const position = note => !note ? 0 : note.kind === 'lesson' ? note.position
    : note.kind === 'module' ? lesson(note.lessonIds[0]).position - .5
    : note.id === '00-start-here' ? -1 : state.data.lessons.length + 1;
  const previousPosition = position(state.page);
  const nextPosition = position(next);
  const direction = nextPosition < previousPosition ? -1 : 1;
  transitionPage(() => {
    if (!fromHistory) history.pushState(null, '', url);
    render({ focus: true });
  }, { direction, main, scroll });
}
function scrollToSection(hash) {
  const target = document.getElementById(decodeURIComponent(hash.slice(1)));
  if (target && main.contains(target)) {
    target.scrollIntoView({ behavior: reduced.matches || document.documentElement.dataset.motion === 'paused' ? 'instant' : 'smooth', block: 'start' });
    target.tabIndex = -1; target.focus({ preventScroll: true });
  }
}
document.addEventListener('click', event => {
  const a = event.target.closest('a');
  if (!a || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || a.target || a.hasAttribute('download')) return;
  const url = new URL(a.href);
  if (url.origin !== location.origin || !(url.pathname === courseBase || url.pathname.startsWith(courseBase + '/'))) return;
  event.preventDefault();
  if (!state.data) return;
  if (dialog.open) closeCourseDrawer(dialog, { immediate: true, restoreFocus: false });
  if (url.pathname === location.pathname && url.hash) {
    history.pushState(null, '', url); scrollToSection(url.hash); return;
  }
  if (url.pathname === location.pathname && url.search === location.search && !url.hash) {
    scroll.scrollTo({ top: 0, behavior: reduced.matches || document.documentElement.dataset.motion === 'paused' ? 'instant' : 'smooth' });
    return;
  }
  navigateCourse(url);
});
window.addEventListener('popstate', () => { if (state.data) navigateCourse(new URL(location.href), { fromHistory: true }); });
$('#open-contents').addEventListener('click', () => {
  if (!state.data) return;
  makeRail($('#mobile-contents'), 'mobile'); syncRail(); updateProgress(); openCourseDrawer(dialog);
});
$('#close-contents').addEventListener('click', () => closeCourseDrawer(dialog));
dialog.addEventListener('cancel', event => { event.preventDefault(); closeCourseDrawer(dialog); });
dialog.addEventListener('click', event => {
  if (event.target !== dialog) return;
  const rect = dialog.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeCourseDrawer(dialog);
});
dialog.addEventListener('close', () => {
  if (dialog.dataset.restoreFocus !== 'false') $('#open-contents').focus({ preventScroll: true });
  delete dialog.dataset.restoreFocus;
});
matchMedia('(min-width: 761px)').addEventListener('change', event => { if (event.matches && dialog.open) closeCourseDrawer(dialog, { immediate: true, restoreFocus: false }); });
document.addEventListener('visibilitychange', () => { if (!document.hidden && state.data && state.ready) loadProgress(); });
window.addEventListener('beforeunload', event => {
  if (drafts.size) { event.preventDefault(); event.returnValue = ''; }
});

async function boot() {
  try {
    const response = await fetch(courseDataPath, { signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw new Error('Course unavailable');
    state.data = await response.json();
    document.body.classList.toggle('integrated-course', isCourseTwo);
    connections = buildConnections(state.data);
    makeRail($('#course-sidebar'), 'desktop');
    render();
    preparePageMotion(main, scroll, { enter: true });
    loadProgress();
  } catch {
    main.setAttribute('aria-busy', 'false');
  globalThis.dispatchEvent(new Event('whiteeye:courseview'));
    const error = element('div', 'course-error');
    error.append(element('h1', '', 'The course could not open.'), element('p', '', 'Please check your connection and try again.'), button('Try again →', 'course-button', boot));
    main.replaceChildren(error);
  }
}
boot();
