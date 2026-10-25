import { courseHref, isCourseTwo } from './course-config.js';
const create = (tag, cls, text) => { const n = document.createElement(tag); n.className = cls; if (text !== undefined) n.textContent = text; return n; };
const link = (href, text, cls = '') => { const n = create('a', cls, text); n.href = courseHref(href); return n; };
export const phaseArt = [
  { src: 'moonlit-sea.webp', caption: 'I · Understand yourself', position: '50% 47%' },
  { src: 'course-connection.webp', caption: 'II · Take part in life with others', position: '50% 50%' },
  { src: 'course-practice.webp', caption: 'III · Turn reflection into action', position: '50% 58%' },
  { src: 'course-direction.webp', caption: 'IV · Choose direction and keep learning', position: '50% 55%' },
];
export function chapterArt(moduleId, compact = false) {
  const phase = Math.floor((Number(moduleId) - 1) / 4);
  const art = phaseArt[phase % phaseArt.length];
  const figure = create('figure', compact ? 'chapter-art compact-art' : 'chapter-art');
  const frame = create('div', 'chapter-art-frame');
  const img = create('img', 'chapter-image'); img.src = `/assets/illustrations/${art.src}`; img.alt = ''; img.width = 1536; img.height = 1024;
  img.loading = compact ? 'lazy' : 'eager'; img.decoding = 'async'; img.style.objectPosition = art.position;
  frame.append(img); figure.append(frame);
  if (!compact) figure.append(create('figcaption', '', isCourseTwo ? `Course note: Module ${moduleId} · Integrated learning` : `Course note: ${art.caption}`));
  return figure;
}
export function lessonJourney(note) {
  const figure = create('nav', 'lesson-journey'); figure.setAttribute('aria-label', 'Lesson diagram');
  figure.append(create('span', 'course-note-label', 'Course note: Your path through this lesson'));
  const steps = create('div', 'journey-steps');
  const candidates = [
    ['01', 'Question', 'learning-question', note.blocks.some(b => b.type === 'question')],
    ['02', 'Read', isCourseTwo ? 'core-idea' : 'whiteeye', note.blocks.some(b => b.type === 'quote' || b.type === 'concept')],
    ['03', 'Practice', isCourseTwo ? 'practice' : 'work-with-this-lesson', note.blocks.some(b => b.type === 'heading' && b.text === (isCourseTwo ? 'Practice' : 'Work with this lesson'))],
    ['04', 'Reflect', 'reflection', note.blocks.some(b => b.type === 'heading' && b.text === 'Reflection')],
  ];
  for (const [number, title, target, available] of candidates) {
    if (!available) continue;
    const step = link(`#${target}`, '', 'journey-step');
    step.append(create('span', 'journey-step-number', number), create('span', '', title)); steps.append(step);
  }
  figure.append(steps); return figure;
}
export function relatedDiagram(note, connections, data) {
  const connected = connections.neighbors.get(note.id)?.filter(n => n.edge.type !== 'module') || [];
  const unique = [...new Set(connected.map(n => n.id))];
  const figure = create('section', 'lesson-connections');
  figure.append(create('span', 'course-note-label', 'Course note: Connections'), create('h2', '', unique.length ? 'Follow an idea further.' : 'Your place in the course.'));
  const diagram = create('div', 'connection-diagram');
  const origin = create('div', 'connection-origin'); origin.append(create('span', '', note.displayId || note.id), create('strong', '', note.title));
  const branches = create('div', 'connection-branches');
  const targets = unique.length ? unique.slice(0, 5) : [note.previous, note.next].filter(Boolean);
  for (const id of targets) {
    const target = data.lessons.find(l => l.id === id);
    const edge = connected.find(n => n.id === id)?.edge;
    const type = edge?.type === 'comparison' ? isCourseTwo ? 'Compare lessons' : 'Compare passages' : edge ? 'Cross-reference' : id === note.next ? 'Next lesson' : 'Previous lesson';
    const a = link(`/course/lesson/${id}`, '', 'connection-branch');
    a.append(create('small', '', type), create('span', '', `${target.displayId || id} · ${target.title}`)); branches.append(a);
  }
  diagram.append(origin, branches); figure.append(diagram);
  if (connected.some(n => n.edge.type === 'comparison')) figure.append(create('p', '', isCourseTwo ? 'Course note: Comparison links connect approaches that support or challenge each other. Read each lesson in its own context.' : 'Course note: Comparison links keep the passages separate. Read each in its own context.'));
  figure.append(link(`/course/graph?lesson=${note.id}`, unique.length > 5 ? `Explore all ${unique.length} connections ↗` : 'See this lesson on the knowledge map ↗', 'text-link'));
  return figure;
}
export function graphInvitation(data) {
  const a = link('/course/graph', '', 'graph-invitation');
  const diagram = create('div', 'map-emblem'); diagram.setAttribute('aria-hidden', 'true');
  // A functional preview of module clusters, rather than illustrative artwork.
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('viewBox', '0 0 260 140');
  const centers = [[56,44],[145,32],[206,85],[103,102]];
  for (const [i, [x,y]] of centers.entries()) {
    const [nx,ny] = centers[(i+1)%4];
    const line = document.createElementNS(svg.namespaceURI, 'path'); line.setAttribute('d', `M${x} ${y}L${nx} ${ny}`); svg.append(line);
    for (let n=0;n<8;n++) {
      const angle=n*Math.PI/4+i, xx=x+Math.cos(angle)*23, yy=y+Math.sin(angle)*23;
      const ray=document.createElementNS(svg.namespaceURI,'path');ray.setAttribute('d',`M${x} ${y}L${xx} ${yy}`);svg.append(ray);
      const dot=document.createElementNS(svg.namespaceURI,'circle');dot.setAttribute('cx',xx);dot.setAttribute('cy',yy);dot.setAttribute('r','2');svg.append(dot);
    }
    const node=document.createElementNS(svg.namespaceURI,'circle');node.setAttribute('cx',x);node.setAttribute('cy',y);node.setAttribute('r','5');svg.append(node);
  }
  diagram.append(svg);
  const copy = create('div', 'graph-invitation-copy'); copy.append(create('span', 'course-note-label', 'Course note: An interconnected course'), create('h2', '', 'The knowledge map'), create('p', '', `Explore all ${data.lessons.length} lessons. Follow connections across the ${data.modules.length} modules.`), create('span', 'text-link', 'Open the map →'));
  a.append(diagram, copy); return a;
}
