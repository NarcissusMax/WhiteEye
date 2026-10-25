import { courseBase, courseHref, isCourseTwo } from './course-config.js';
import { motionEnabled, revealFeedback, animateSearchResults } from './course-motion.js';
import { chapterArt } from './course-visuals.js';

const make = (tag, cls, text) => { const n = document.createElement(tag); n.className = cls; if (text !== undefined) n.textContent = text; return n; };
const link = (href, text, cls = '') => { const n = make('a', cls, text); n.href = courseHref(href); return n; };
const button = (text, action, cls = '') => { const n = make('button', cls, text); n.type = 'button'; n.addEventListener('click', action); return n; };
function graphPalette() {
  const style = getComputedStyle(document.documentElement);
  const value = (name, fallback) => style.getPropertyValue(name).trim() || fallback;
  return {
    node: value('--graph-node', '#69655e'), edge: value('--graph-edge', '#8c857b'),
    active: value('--accent', '#773249'), label: value('--ivory', '#242428'),
    ground: value('--graph-label-bg', '#f0ebe0ee'),
  };
}

export function createCourseGraph(data, connections, completed) {
  let palette = graphPalette();
  const page = make('section', 'graph-page');
  const heading = make('header', 'graph-header');
  const copy = make('div'); copy.append(make('span', 'course-note-label', 'Course note: Explore the course'), make('h1', '', 'The knowledge map'), make('p', '', 'Every lesson, connected. Choose a point to follow its ideas.'));
  heading.append(copy, link('/course/', '← Course overview', 'text-link')); page.append(heading);
  const toolbar = make('div', 'graph-toolbar');
  const searchLabel = make('label', 'graph-search', 'Find a lesson');
  const search = make('input'); search.type = 'search'; search.placeholder = 'Search titles or questions…'; search.autocomplete = 'off'; searchLabel.append(search);
  const filterLabel = make('label', 'graph-filter', 'Explore a module');
  const filter = make('select'); filter.append(new Option(`All ${data.modules.length} modules`, 'all'));
  for (const module of data.modules) filter.append(new Option(`${module.id} · ${module.title}`, module.id));
  filterLabel.append(filter);
  const focusLabel = make('label', 'graph-focus'); const focus = make('input'); focus.type = 'checkbox';
  focusLabel.append(focus, isCourseTwo ? 'Nearby lessons only' : 'Connected lessons only');
  toolbar.append(searchLabel, filterLabel, focusLabel); page.append(toolbar);
  const body = make('div', 'graph-body'); const stage = make('div', 'graph-stage');
  const canvas = make('canvas', 'knowledge-canvas'); canvas.tabIndex = 0; canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Course knowledge graph. Drag to pan, use plus and minus to zoom, arrow keys to pan. Select lessons with the lesson list beside or below the map.');
  stage.append(canvas);
  const tools = make('div', 'graph-tools'); tools.setAttribute('aria-label', 'Map controls');
  const plus = button('+', () => zoomAt(width / 2, height / 2, 1.35)); plus.setAttribute('aria-label', 'Zoom in');
  const minus = button('−', () => zoomAt(width / 2, height / 2, 1 / 1.35)); minus.setAttribute('aria-label', 'Zoom out');
  const fit = button('Fit map', () => fitNodes(visibleNodes()));
  const reset = button('Reset', () => { search.value = ''; filter.value = 'all'; focus.checked = false; selected = null; hover = null; yaw = -.18; pitch = .3; refreshFilters(); renderInspector(); fitNodes(nodes); history.replaceState(null, '', `${courseBase}/graph`); });
  const dimension = button('3D', () => { spatial = !spatial; updateMode(); fitNodes(visibleNodes()); }, 'graph-dimension');
  const gesture = button('Orbit', () => { orbit = !orbit; updateMode(); }, 'graph-gesture');
  tools.append(plus, minus, dimension, gesture, fit, reset); stage.append(tools);
  const status = make('div', 'graph-status'); status.setAttribute('role', 'status'); stage.append(status);
  const hint = make('p', 'graph-hint', 'Drag to explore · Scroll or pinch to zoom · Select a point'); stage.append(hint);
  const tooltip = make('div', 'graph-tooltip'); tooltip.hidden = true; stage.append(tooltip);
  const inspector = make('aside', 'graph-inspector'); inspector.setAttribute('aria-label', 'Selected lesson and lesson list');
  const detail = make('div', 'graph-detail');
  const listDetails = make('details', 'graph-directory'); listDetails.open = true;
  const summary = make('summary', '', 'Browse lessons'); const listStatus = make('p', 'graph-list-status'); listStatus.setAttribute('role', 'status');
  const list = make('div', 'graph-results'); listDetails.append(summary, listStatus, list); inspector.append(detail, listDetails);
  body.append(stage, inspector); page.append(body);
  const legend = make('div', 'graph-legend');
  for (const [cls, text] of [['module', 'Within a module'], ['reference', 'Cross-reference'], ['comparison', isCourseTwo ? 'Compare lessons' : 'Compare passages'], ['completed', 'Completed lesson']]) {
    const item = make('span', `legend-${cls}`); item.append(make('i'), text); legend.append(item);
  }
  page.append(legend, make('p', 'graph-explanation', isCourseTwo ? 'Course note: Lines show module membership and cross-links between lessons. Dashed lines connect approaches in Connections and Tensions; compare their aims and limits.' : 'Course note: Lines show module membership and existing links in the course. Dashed lines connect passages grouped in Connections and Tensions; they invite comparison without merging the statements.'));

  let destroyed = false, frame = 0, visible = true, width = 800, height = 620, pixelRatio = 1;
  let selected = null, hover = null, matches = new Set(), matchWords = [], lastPaint = 0;
  let spatial = false, orbit = true, yaw = -.18, pitch = .3;
  const center = { x: 825, y: (Math.ceil(data.modules.length / 4) - 1) * 190 + 205 };
  let camera = { x: 0, y: 0, scale: .4 }, targetCamera = { ...camera }, cameraMoving = false;
  let settled = !motionEnabled(), introStart = performance.now(), activeUntil = introStart + 2200;
  const nodes = connections.nodes.map(node => ({ ...node, x: 0, y: 0, z: 0, cx: 0, cy: 0, color: palette.node }));
  const byId = new Map(nodes.map(n => [n.id, n]));
  for (const [index, module] of data.modules.entries()) {
    const cx = (index % 4) * 410 + 210, cy = Math.floor(index / 4) * 380 + 205;
    const hub = byId.get(`module:${module.id}`); Object.assign(hub, { x: cx, y: cy, z: Math.sin(index * 2.4) * 130, cx, cy });
    module.lessonIds.forEach((id, i) => {
      const angle = i * Math.PI * (3 - Math.sqrt(5));
      const radius = 45 + Math.sqrt((i + 1) / module.lessonIds.length) * 113;
      Object.assign(byId.get(id), { x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius, z: hub.z + Math.sin(angle * .7) * 110, cx, cy });
    });
  }
  const edges = connections.edges.map(e => ({ ...e, a: byId.get(e.source), b: byId.get(e.target) }));
  let allowed = new Set(nodes.map(n => n.id));
  const context = canvas.getContext('2d');
  const query = new URLSearchParams(location.search);
  selected = byId.get(query.get('lesson')) || null;
  if (query.has('module') && data.modules.some(m => m.id === query.get('module'))) filter.value = query.get('module');
  if (selected) focus.checked = true;

  function connectedIds() {
    const ids = new Set([selected?.id, ...(connections.neighbors.get(selected?.id) || []).map(n => n.id)]);
    if (isCourseTwo && selected) {
      const module = data.modules.find(m => m.id === selected.module);
      for (const id of module?.lessonIds || []) ids.add(id);
    }
    return ids;
  }
  function visibleNodes() { return nodes.filter(n => allowed.has(n.id)); }
  function refreshFilters() {
    matchWords = search.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
    matches = new Set(nodes.filter(n => n.kind === 'lesson' && matchWords.every(word => `${n.title} ${n.id} ${n.note.displayId || ''} ${n.note.blocks.find(b => b.type === 'question')?.text || ''}`.toLowerCase().includes(word))).map(n => n.id));
    const neighborhood = connectedIds();
    allowed = new Set(nodes.filter(n => (filter.value === 'all' || n.module === filter.value)
      && (!focus.checked || !selected || neighborhood.has(n.id))
      && (!matchWords.length || matches.has(n.id) || n.kind === 'module' && data.modules.find(m => m.id === n.module).lessonIds.some(id => matches.has(id)))).map(n => n.id));
    const lessons = nodes.filter(n => n.kind === 'lesson' && allowed.has(n.id));
    status.textContent = `${lessons.length} / ${data.lessons.length} lessons`;
    listStatus.textContent = lessons.length ? `${lessons.length} lessons · Select to inspect` : 'No matching lessons. Try another word or reset the map.';
    list.replaceChildren(...lessons.map(n => {
      const row = button('', () => select(n, true), 'graph-result'); row.dataset.graphLesson = n.id;
      row.setAttribute('aria-pressed', String(selected?.id === n.id));
      row.append(make('span', 'graph-result-id', n.note.displayId || n.id), make('span', '', n.title));
      if (completed().has(`lesson:${n.id}`)) row.append(make('span', 'graph-result-done', '✓'));
      return row;
    }));
    if (!lessons.length) list.append(button('Reset filters', () => reset.click(), 'text-link'));
    animateSearchResults(list); wake();
  }
  function renderInspector() {
    detail.replaceChildren();
    if (!selected) {
      detail.append(make('span', 'course-note-label', 'Course note: Your constellation'), make('h2', '', `${data.modules.length} starting points.`), make('p', '', 'Large points are modules. Small points are lessons. Select a lesson to see its question and connections.'));
      const phases = make('div', 'graph-phases');
      data.phases.forEach((phase, i) => { const p = make('div'); const dot = make('i'); dot.style.background = palette.node; p.append(dot, make('span', '', phase.title)); phases.append(p); });
      detail.append(phases); return;
    }
    const n = selected;
    detail.append(chapterArt(n.module, true), make('span', 'course-note-label', `Course note: ${n.kind === 'lesson' ? 'Lesson' : 'Module'} ${n.note.displayId || n.note.id}`), make('h2', '', n.title));
    if (n.kind === 'module') {
      detail.append(make('p', '', `${n.note.lessonIds.length} lessons in this module.`), link(`/course/module/${n.note.id}`, 'Open module →', 'course-button'));
    } else {
      const question = n.note.blocks.find(b => b.type === 'question')?.text;
      if (question) detail.append(make('p', '', question));
      if (completed().has(`lesson:${n.id}`)) detail.append(make('span', 'graph-completed-label', '✓ Completed'));
      detail.append(link(`/course/lesson/${n.id}`, 'Open lesson →', 'course-button'));
      const related = (connections.neighbors.get(n.id) || []).filter(item => item.edge.type !== 'module');
      if (related.length) {
        detail.append(make('h3', '', isCourseTwo ? 'Connected lessons' : 'Connected passages'));
        const grouped = new Map();
        for (const item of related) {
          if (!grouped.has(item.id)) grouped.set(item.id, { types: new Set(), labels: new Set() });
          grouped.get(item.id).types.add(item.edge.type);
          item.edge.labels.forEach(label => grouped.get(item.id).labels.add(label));
        }
        for (const [id, info] of grouped) {
          const other = byId.get(id); const choice = button('', () => select(other, true), 'graph-related');
          choice.append(make('small', '', info.types.has('comparison') ? isCourseTwo ? 'Compare lessons' : 'Compare passages' : 'Cross-reference'), make('span', '', `${other.note.displayId || id} · ${other.title}`));
          detail.append(choice);
        }
        if (related.some(item => item.edge.type === 'comparison')) detail.append(link('/course/resource/connections-and-tensions', 'Read the comparison questions ↗', 'text-link'));
      } else detail.append(make('p', 'graph-no-links', 'Course note: This lesson is connected through its module; no separate cross-reference is recorded.'));
    }
    revealFeedback(detail);
  }
  function select(node, pan = false) {
    selected = node; tooltip.hidden = true;
    if (node.kind === 'lesson') { search.value = ''; if (focus.checked || filter.value !== 'all' && filter.value !== node.module) filter.value = 'all'; }
    if (node.kind === 'module') { filter.value = node.module; focus.checked = false; search.value = ''; }
    renderInspector(); refreshFilters();
    if (node.kind === 'module') fitNodes(visibleNodes());
    else if (pan) {
      const neighborhood = connectedIds(); const neighbors = nodes.filter(n => neighborhood.has(n.id));
      if (focus.checked) fitNodes(neighbors); else { const p = project(node); moveCamera(width / 2 - p.x * 1.3, height / 2 - p.y * 1.3, 1.3); }
    }
    const url = new URL(location.href); url.search = '';
    url.searchParams.set(node.kind === 'lesson' ? 'lesson' : 'module', node.note.id); history.replaceState(null, '', url);
    wake(2200);
  }
  function moveCamera(x, y, scale) {
    targetCamera = { x, y, scale }; cameraMoving = motionEnabled();
    if (!cameraMoving) camera = { ...targetCamera };
    wake(800);
  }
  function fitNodes(items = nodes, immediate = false) {
    if (!items.length) items = nodes;
    const pad = 50;
    const positions = items.map(n => project(n));
    const minX = Math.min(...positions.map(n => n.x)) - pad, maxX = Math.max(...positions.map(n => n.x)) + pad;
    const minY = Math.min(...positions.map(n => n.y)) - pad, maxY = Math.max(...positions.map(n => n.y)) + pad;
    const scale = Math.min(2, Math.max(.12, Math.min((width - 50) / (maxX - minX), (height - 70) / (maxY - minY))));
    const x = width / 2 - (minX + maxX) / 2 * scale, y = height / 2 - (minY + maxY) / 2 * scale;
    if (immediate) { camera = { x, y, scale }; targetCamera = { ...camera }; cameraMoving = false; wake(); }
    else moveCamera(x, y, scale);
  }
  function zoomAt(x, y, factor) {
    const start = targetCamera, scale = Math.min(4, Math.max(.12, start.scale * factor));
    moveCamera(x - (x - start.x) * scale / start.scale, y - (y - start.y) * scale / start.scale, scale);
  }
  function updateMode() {
    stage.dataset.dimension = spatial ? '3d' : '2d';
    dimension.setAttribute('aria-pressed', String(spatial));
    dimension.setAttribute('aria-label', spatial ? '3D view. Switch to 2D map' : '2D view. Switch to 3D map');
    dimension.textContent = spatial ? '3D' : '2D';
    gesture.disabled = !spatial;
    gesture.textContent = orbit && spatial ? 'Orbit' : 'Pan';
    gesture.setAttribute('aria-pressed', String(orbit && spatial));
    gesture.setAttribute('aria-label', orbit ? 'Orbit mode. Switch to pan' : 'Pan mode. Switch to orbit');
    hint.textContent = spatial && orbit ? 'Drag to orbit · Shift + drag to pan · Scroll or pinch to zoom' : 'Drag to pan · Scroll or pinch to zoom · Select a point';
    canvas.setAttribute('aria-label', `Course knowledge map in ${spatial ? '3D' : '2D'}. ${hint.textContent}. Arrow keys pan, Shift and arrow keys orbit, plus and minus zoom, Home fits the map. Select lessons with the lesson list beside or below the map.`);
    wake();
  }
  function project(node, expansion = 1) {
    const x = node.cx + (node.x - node.cx) * expansion, y = node.cy + (node.y - node.cy) * expansion;
    if (!spatial) return { x, y, z: 0, depth: 1 };
    const dx = x - center.x, dy = y - center.y, z = node.z * expansion;
    const rx = dx * Math.cos(yaw) + z * Math.sin(yaw), rz = z * Math.cos(yaw) - dx * Math.sin(yaw);
    const ry = dy * Math.cos(pitch) - rz * Math.sin(pitch), depthZ = dy * Math.sin(pitch) + rz * Math.cos(pitch);
    const depth = 4200 / (4200 + depthZ);
    return { x: rx * depth + center.x, y: ry * depth + center.y, z: depthZ, depth };
  }
  function point(node, expansion = 1) {
    const p = project(node, expansion);
    return { ...p, x: p.x * camera.scale + camera.x, y: p.y * camera.scale + camera.y };
  }
  function startDrag(p, event, moved = false) {
    const items = visibleNodes();
    const pivot = selected || { x: items.reduce((v, n) => v + n.x, 0) / Math.max(1, items.length), y: items.reduce((v, n) => v + n.y, 0) / Math.max(1, items.length), z: 0 };
    if (pivot.cx === undefined) { pivot.cx = pivot.x; pivot.cy = pivot.y; }
    return { x: p.x, y: p.y, startX: camera.x, startY: camera.y, yaw, pitch, orbit: spatial && orbit && !event.shiftKey, pivot, anchor: point(pivot), moved };
  }
  function hit(x, y) {
    let best = null, distance = Infinity;
    for (const node of nodes) {
      if (!allowed.has(node.id)) continue;
      const p = point(node), d = Math.hypot(x - p.x, y - p.y);
      const radius = node.kind === 'module' ? 16 : 10;
      if (d < radius && d < distance) { best = node; distance = d; }
    }
    return best;
  }
  function wake(duration = 0) {
    activeUntil = Math.max(activeUntil, performance.now() + duration);
    if (!frame && !destroyed && visible && !document.hidden) frame = requestAnimationFrame(draw);
  }
  function draw(now) {
    frame = 0;
    if (destroyed || !visible || document.hidden || !context) return;
    const moving = motionEnabled();
    const elapsed = now - introStart;
    if (!moving) { settled = true; camera = { ...targetCamera }; cameraMoving = false; }
    if (cameraMoving) {
      const smoothing = 1 - Math.exp(-Math.min(50, now - (lastPaint || now - 16)) / 90);
      for (const key of ['x', 'y', 'scale']) camera[key] += (targetCamera[key] - camera[key]) * smoothing;
      if (Math.abs(camera.x - targetCamera.x) + Math.abs(camera.y - targetCamera.y) + Math.abs(camera.scale - targetCamera.scale) < .08) { camera = { ...targetCamera }; cameraMoving = false; }
    }
    lastPaint = now;
    const expansion = settled ? 1 : 1 - Math.pow(1 - Math.min(1, elapsed / 1200), 3);
    if (elapsed >= 1200) settled = true;
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0); context.clearRect(0, 0, width, height);
    const related = selected ? connectedIds() : null;
    context.lineWidth = 1;
    for (const edge of edges) {
      if (!allowed.has(edge.a.id) || !allowed.has(edge.b.id)) continue;
      const a = point(edge.a, expansion), b = point(edge.b, expansion);
      const active = selected && (edge.source === selected.id || edge.target === selected.id);
      context.globalAlpha = selected && !active ? .1 : active ? .85 : edge.type === 'module' ? .21 : .48;
      context.strokeStyle = active ? palette.active : palette.edge;
      context.lineWidth = active ? 1.5 : .8;
      context.setLineDash(edge.type === 'comparison' ? [4,5] : []);
      context.beginPath(); context.moveTo(a.x, a.y); context.lineTo(b.x, b.y); context.stroke();
      if (active && moving && now < activeUntil && edge.type !== 'module') {
        const t = (now % 2000) / 2000; context.setLineDash([]); context.fillStyle = palette.label;
        context.beginPath(); context.arc(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, 2, 0, Math.PI * 2); context.fill();
      }
    }
    context.setLineDash([]);
    const depthOrder = nodes.map(node => ({ node, p: point(node, expansion) })).sort((a, b) => b.p.z - a.p.z);
    const done = completed();
    for (const { node, p } of depthOrder) {
      const inScope = allowed.has(node.id), important = node.kind === 'module' || node === selected || node === hover;
      if (p.x < -180 || p.x > width + 180 || p.y < -50 || p.y > height + 70) continue;
      const r = (node.kind === 'module' ? Math.max(7, 12 * Math.min(camera.scale, 1.3)) : node === selected ? 6 : Math.max(2.2, 3.6 * camera.scale)) * Math.min(1.4, Math.max(.7, p.depth));
      context.globalAlpha = !inScope ? .06 : related && !related.has(node.id) && node.kind !== 'module' ? .22 : 1;
      context.fillStyle = node === selected ? palette.active : node.color;
      if (spatial && important && inScope) {
        const halo = context.createRadialGradient(p.x, p.y, r, p.x, p.y, r * 4); halo.addColorStop(0, `${node.color}35`); halo.addColorStop(1, `${node.color}00`);
        context.fillStyle = halo; context.beginPath(); context.arc(p.x, p.y, r * 4, 0, Math.PI * 2); context.fill();
        context.fillStyle = node === selected ? palette.active : node.color;
      }
      context.beginPath(); context.arc(p.x, p.y, r, 0, Math.PI * 2); context.fill();
      if (spatial && inScope) { context.fillStyle = palette.label; context.beginPath(); context.arc(p.x - r * .25, p.y - r * .25, r * .27, 0, Math.PI * 2); context.fill(); }
      if (node === selected || node === hover || node.kind === 'lesson' && done.has(`lesson:${node.id}`)) {
        context.strokeStyle = node === selected ? palette.active : node.color; context.lineWidth = 1;
        context.beginPath(); context.arc(p.x, p.y, r + 4, 0, Math.PI * 2); context.stroke();
      }
      if (node === selected && moving && now < activeUntil) {
        const pulse = (now % 1800) / 1800;
        context.globalAlpha = (1 - pulse) * .5; context.strokeStyle = node.color;
        context.beginPath(); context.arc(p.x, p.y, r + 8 + pulse * 22, 0, Math.PI * 2); context.stroke(); context.globalAlpha = 1;
      }
      if (inScope && important) {
        const text = node.kind === 'module' ? `${node.module}  ${node.title}` : `${node.note.displayId || node.id}  ${node.title}`;
        const maxWidth = node.kind === 'module' ? Math.max(125, 360 * camera.scale) : Math.min(width - 30, 300);
        context.font = `${node.kind === 'module' ? 13 : 12}px "Fira Sans", sans-serif`;
        const words = text.split(' '), lines = []; let line = '';
        for (const word of words) { const next = `${line} ${word}`.trim(); if (context.measureText(next).width > maxWidth && line) { lines.push(line); line = word; } else line = next; }
        if (line) lines.push(line);
        context.textAlign = 'center'; context.textBaseline = 'top';
        const labelX = Math.max(maxWidth / 2 + 5, Math.min(width - maxWidth / 2 - 5, p.x));
        const top = p.y + r + 9;
        lines.forEach((line, i) => {
          const measure = context.measureText(line).width;
          context.fillStyle = palette.ground; context.fillRect(labelX - measure / 2 - 4, top + i * 16 - 2, measure + 8, 16);
          context.fillStyle = node === selected ? palette.label : node.color; context.fillText(line, labelX, top + i * 16);
        });
      }
    }
    context.globalAlpha = 1;
    if (moving && (!settled || cameraMoving || selected && now < activeUntil)) frame = requestAnimationFrame(draw);
  }
  const pointers = new Map(); let drag = null, pinch = null;
  function coordinates(event) { const rect = canvas.getBoundingClientRect(); return { x: event.clientX - rect.left, y: event.clientY - rect.top }; }
  canvas.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    canvas.setPointerCapture(event.pointerId); const p = coordinates(event); pointers.set(event.pointerId, p);
    drag = startDrag(p, event); cameraMoving = false; targetCamera = { ...camera };
    if (pointers.size === 2) { const [a,b] = [...pointers.values()]; pinch = { distance: Math.hypot(a.x-b.x,a.y-b.y), camera: { ...camera }, center: { x: (a.x+b.x)/2, y: (a.y+b.y)/2 } }; }
  });
  canvas.addEventListener('pointermove', event => {
    const p = coordinates(event);
    if (pointers.has(event.pointerId)) {
      pointers.set(event.pointerId, p);
      if (pinch && pointers.size === 2) {
        const [a,b] = [...pointers.values()], distance = Math.hypot(a.x-b.x,a.y-b.y);
        const scale = Math.min(4, Math.max(.12, pinch.camera.scale * distance / Math.max(1, pinch.distance)));
        const center = { x: (a.x+b.x)/2, y: (a.y+b.y)/2 };
        camera = { x: center.x - (pinch.center.x-pinch.camera.x)*scale/pinch.camera.scale, y: center.y - (pinch.center.y-pinch.camera.y)*scale/pinch.camera.scale, scale };
        drag.moved = true;
      } else if (drag) {
        const dx=p.x-drag.x, dy=p.y-drag.y; if (Math.hypot(dx,dy)>4) drag.moved = true;
        if (drag.orbit) {
          yaw = drag.yaw + dx * .004; pitch = Math.min(1.05, Math.max(-1.05, drag.pitch + dy * .003));
          const pivot = project(drag.pivot); camera.x = drag.anchor.x - pivot.x * camera.scale; camera.y = drag.anchor.y - pivot.y * camera.scale;
        } else { camera.x=drag.startX+dx; camera.y=drag.startY+dy; }
      }
      targetCamera = { ...camera }; tooltip.hidden = true; wake(); return;
    }
    const node = hit(p.x, p.y);
    if (hover !== node) { hover = node; canvas.style.cursor = node ? 'pointer' : 'grab'; wake(); }
    tooltip.hidden = !node;
    if (node) { tooltip.textContent = `${node.note.displayId || node.note.id} · ${node.title}`; tooltip.style.left = `${Math.min(width - 260, Math.max(8, p.x + 14))}px`; tooltip.style.top = `${Math.max(8,p.y - 48)}px`; }
  });
  function release(event) {
    const canceled = event.type === 'pointercancel'; const p = coordinates(event), moved = drag?.moved;
    pointers.delete(event.pointerId); pinch = null;
    if (!pointers.size) { if (!canceled && !moved) { const node = hit(p.x,p.y); if (node) select(node); } drag = null; }
    else { const other = [...pointers.values()][0]; drag = startDrag(other, event, true); }
  }
  canvas.addEventListener('pointerup', release); canvas.addEventListener('pointercancel', release);
  canvas.addEventListener('pointerleave', () => { hover = null; tooltip.hidden = true; wake(); });
  canvas.addEventListener('wheel', event => { event.preventDefault(); const p=coordinates(event); zoomAt(p.x,p.y,Math.exp(-Math.max(-100,Math.min(100,event.deltaY))*.005)); }, { passive:false });
  canvas.addEventListener('keydown', event => {
    const keys = { ArrowLeft:[65,0],ArrowRight:[-65,0],ArrowUp:[0,65],ArrowDown:[0,-65] };
    if (keys[event.key] && event.shiftKey && spatial) { event.preventDefault(); const [x,y]=keys[event.key]; yaw += x * -.002; pitch = Math.max(-1.05, Math.min(1.05, pitch + y * -.002)); fitNodes(visibleNodes()); }
    else if (keys[event.key]) { event.preventDefault(); const [x,y]=keys[event.key]; moveCamera(targetCamera.x+x,targetCamera.y+y,targetCamera.scale); }
    else if (['+','=','-'].includes(event.key)) { event.preventDefault(); zoomAt(width/2,height/2,event.key==='-'?1/1.3:1.3); }
    else if (event.key==='Home') { event.preventDefault(); fitNodes(visibleNodes()); }
  });
  search.addEventListener('input', () => { refreshFilters(); fitNodes(visibleNodes()); });
  filter.addEventListener('change', () => { focus.checked = false; selected = null; refreshFilters(); renderInspector(); fitNodes(visibleNodes()); history.replaceState(null, '', filter.value === 'all' ? `${courseBase}/graph` : `${courseBase}/graph?module=${filter.value}`); });
  focus.addEventListener('change', () => { refreshFilters(); fitNodes(visibleNodes()); });
  function resize() {
    const rect = stage.getBoundingClientRect(); if (!rect.width || !rect.height) return;
    width = rect.width; height = rect.height; pixelRatio = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * pixelRatio); canvas.height = Math.round(height * pixelRatio);
    fitNodes(visibleNodes(), true);
  }
  const resizeObserver = new ResizeObserver(resize); resizeObserver.observe(stage);
  const observer = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; if (visible) wake(); else { cancelAnimationFrame(frame); frame=0; } }); observer.observe(stage);
  function preferenceChanged() { if (!motionEnabled()) { settled=true; camera={...targetCamera};cameraMoving=false; } wake(); }
  function themeChanged() {
    palette = graphPalette();
    nodes.forEach(node => { node.color = palette.node; });
    page.querySelectorAll('.graph-phases i').forEach(dot => { dot.style.background = palette.node; });
    wake();
  }
  window.addEventListener('whiteeye:themechange', themeChanged);
  document.addEventListener('visibilitychange', preferenceChanged);
  window.addEventListener('whiteeye:motionchange', preferenceChanged);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)'); reduced.addEventListener('change', preferenceChanged);
  updateMode(); refreshFilters(); renderInspector();
  return {
    node: page,
    update() { refreshFilters(); renderInspector(); },
    destroy() { destroyed=true; window.removeEventListener('whiteeye:themechange',themeChanged); cancelAnimationFrame(frame); resizeObserver.disconnect(); observer.disconnect(); document.removeEventListener('visibilitychange',preferenceChanged); window.removeEventListener('whiteeye:motionchange',preferenceChanged); reduced.removeEventListener('change',preferenceChanged); },
  };
}
