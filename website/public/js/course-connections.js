// Relationships come from the approved course. Titles and groups are Course notes.
export function buildConnections(data) {
  const nodes = data.lessons.map(note => ({ id: note.id, module: note.module, title: note.title, note, kind: 'lesson' }));
  const byId = new Map(nodes.map(node => [node.id, node]));
  const edges = new Map();
  const references = text => [...(text || '').matchAll(/\[\[([^\]]+)\]\]/g)].flatMap(match => {
    const name = match[1].split('|')[0].split('#')[0];
    const path = data.references[name];
    const id = path?.match(/^\/course(?:-2)?\/lesson\/(\d{2}\.\d{2})$/)?.[1];
    return id && byId.has(id) ? [id] : [];
  });
  function connect(a, b, type, label = '') {
    if (a === b) return;
    const [source, target] = [a, b].sort();
    const key = `${type}:${source}:${target}`;
    if (!edges.has(key)) edges.set(key, { source, target, type, labels: [] });
    if (label && !edges.get(key).labels.includes(label)) edges.get(key).labels.push(label);
  }
  for (const module of data.modules) {
    nodes.push({ id: `module:${module.id}`, module: module.id, title: module.title, note: module, kind: 'module' });
    for (const id of module.lessonIds) connect(`module:${module.id}`, id, 'module');
  }
  for (const note of data.lessons) {
    for (const block of note.blocks) {
      if (block.type === 'quote' || block.type === 'flashcard') continue;
      for (const id of references(block.text)) connect(note.id, id, 'reference');
    }
  }
  const groups = [];
  let group;
  for (const block of data.resources.find(r => r.id === 'connections-and-tensions')?.blocks || []) {
    if (block.type === 'heading') { group = { title: block.text, ids: [] }; groups.push(group); }
    else if (group && block.type === 'list') group.ids.push(...references(block.text));
  }
  for (const item of groups) {
    item.ids = [...new Set(item.ids)];
    item.ids.forEach((a, index) => item.ids.slice(index + 1).forEach(b => connect(a, b, 'comparison', item.title)));
  }
  const links = [...edges.values()];
  const neighbors = new Map(nodes.map(node => [node.id, []]));
  for (const edge of links) {
    neighbors.get(edge.source).push({ id: edge.target, edge });
    neighbors.get(edge.target).push({ id: edge.source, edge });
  }
  return { nodes, edges: links, neighbors, groups };
}
