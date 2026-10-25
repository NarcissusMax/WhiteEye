"""Import the approved Obsidian course. Quote contents are never normalized."""
from pathlib import Path
import re, json, hashlib, sys

root = Path(__file__).resolve().parents[1]
vault = Path(sys.argv[1]) if len(sys.argv) > 1 else Path('/home/narmexis/Projects/WhiteEye/courses/whiteeye course')
audit_path = Path('/home/narmexis/Projects/WhiteEye/data/course-work/whiteeye-course/expanded-audit/quotation-manifest.json')
files = sorted(vault.rglob('*.md'))
references = {}
notes = []

def clean(text):
    text = re.sub(r'<[^>]+>', '', text)
    return re.sub(r'\s*#whiteeye/[\w/-]+', '', text).strip()

for path in files:
    raw = path.read_text()
    body = re.sub(r'^---\n.*?\n---\n', '', raw, count=1, flags=re.S)
    lesson = re.match(r'(\d{2}\.\d{2}) ', path.stem)
    mod = re.match(r'(\d{2}) ', path.parent.name) if path.parent != vault else None
    kind = 'lesson' if lesson else 'module' if mod else 'resource'
    ident = lesson[1] if lesson else mod[1] if mod else re.sub(r'[^a-z0-9]+', '-', path.stem.lower()).strip('-')
    url = '/course/' if path.stem == 'Course Index' else f'/course/{kind}/{ident}'
    references[path.stem] = url
    alias = re.search(r'^aliases: \[(.*?)\]', raw, re.M)
    if alias:
        for value in json.loads('[' + alias[1] + ']'): references[value] = url
    title_line = re.search(r'^# (.*)', body, re.M)
    title = clean(title_line[1]).removeprefix('Course note: ').strip() if title_line else path.stem
    notes.append(dict(id=ident, kind=kind, module=mod[1] if mod else None, title=title, body=body, name=path.stem))

all_quotes = []
task_ids = []
for note in notes:
    lines = note.pop('body').split('\n')
    blocks = []
    i = 0
    task = 0
    while i < len(lines):
        line = lines[i]
        if not line.strip() or line.startswith('# ') or line.startswith('<div '):
            i += 1; continue
        if line.startswith('>'):
            chunk = []
            while i < len(lines) and lines[i].startswith('>'):
                chunk.append(lines[i][2:] if lines[i].startswith('> ') else lines[i][1:])
                i += 1
            text = '\n'.join(chunk)
            if text.startswith('[!'):
                if text.startswith('[!question]'):
                    blocks.append(dict(type='question', text=clean('\n'.join(chunk[1:])).removeprefix('Course note: ')))
                elif not any(x in text for x in ['[!we-route]', '```dataview', '```tasks']):
                    blocks.append(dict(type='note', text=clean('\n'.join(chunk[1:]))))
                continue
            if note['name'] == 'Flashcards' and text.startswith('Course note: ') and '::' in text:
                question, answer = text.removeprefix('Course note: ').split('::', 1)
                blocks.append(dict(type='flashcard', question=question, text=answer))
                all_quotes.append(answer)
            else:
                blocks.append(dict(type='quote', text=text))
                all_quotes.append(text)
            continue
        heading = re.match(r'^(#{2,6}) (.*)', line)
        if heading:
            blocks.append(dict(type='heading', depth=len(heading[1]), text=clean(heading[2]).removeprefix('Course note: ')))
            i += 1; continue
        checkbox = re.match(r'^- \[[ xX]\] (.*)', line)
        if checkbox:
            task += 1
            ident = f'task:{note["kind"]}-{note["id"]}-{task}'
            task_ids.append(ident)
            blocks.append(dict(type='task', id=ident, text=clean(checkbox[1])))
            i += 1; continue
        if line.startswith('```'):
            code = []
            i += 1
            while i < len(lines) and not lines[i].startswith('```'):
                code.append(lines[i]); i += 1
            i += 1
            blocks.append(dict(type='template', text='\n'.join(code)))
            continue
        # Navigation is expressed through native course controls and breadcrumbs.
        text = clean(line)
        if re.match(r'^Course note: (Previous|Next)( module)?:', text):
            i += 1; continue
        if line.startswith('|'):
            rows = []
            while i < len(lines) and lines[i].startswith('|'):
                row = [clean(c) for c in lines[i].strip('|').split('|')]
                if not all(re.fullmatch(r'[\s:-]+', c or '-') for c in row): rows.append(row)
                i += 1
            blocks.append(dict(type='table', rows=rows))
            continue
        if text and text != '---': blocks.append(dict(type='list' if line.startswith('- ') else 'note', text=text.removeprefix('- ')))
        i += 1
    note['blocks'] = blocks

modules = sorted([n for n in notes if n['kind']=='module'], key=lambda n:n['id'])
lessons = sorted([n for n in notes if n['kind']=='lesson'], key=lambda n:tuple(map(int,n['id'].split('.'))))
resources = [n for n in notes if n['kind']=='resource' and n['name'] != 'Course Index']
index = next(n for n in notes if n['name'] == 'Course Index')
phases = []
for block in index['blocks']:
    if block['type'] == 'heading' and len(phases) < 4:
        phases.append(dict(title=block['text'], description=''))
    elif block['type'] == 'note' and phases and not phases[-1]['description']:
        phases[-1]['description'] = block['text'].removeprefix('Course note: ')
for module in modules:
    module['lessonIds'] = [l['id'] for l in lessons if l['module'] == module['id']]
    module['description'] = next((b['text'].removeprefix('Course note: ') for b in module['blocks'] if b['type']=='note'), '')
for idx, lesson in enumerate(lessons):
    lesson['previous'] = lessons[idx-1]['id'] if idx else None
    lesson['next'] = lessons[idx+1]['id'] if idx+1<len(lessons) else None
    lesson['position'] = idx+1

def digest(text): return hashlib.sha256(text.encode()).hexdigest()
audit = json.loads(audit_path.read_text())
expected = sorted(digest(m['quote'].split('::',1)[1] if m.get('flash') and m['quote'].startswith('Course note: ') else m['quote']) for m in audit['manifest'])
actual = sorted(digest(q) for q in all_quotes)
if actual != expected:
    from collections import Counter
    missing = Counter(expected)-Counter(actual)
    extra = Counter(actual)-Counter(expected)
    raise SystemExit(f'Quote fidelity failed: {sum(missing.values())} missing; {sum(extra.values())} extra')
assert len(lessons)==575 and len(modules)==16
data = dict(version=1, modules=modules, lessons=lessons, resources=resources, references=references, phases=phases,
            totals=dict(modules=len(modules),lessons=len(lessons),quotations=len(all_quotes)))
(root/'public/data').mkdir(parents=True, exist_ok=True)
(root/'public/data/course.json').write_text(json.dumps(data, ensure_ascii=False, separators=(',',':'))+'\n')
(root/'worker/course-manifest.json').write_text(json.dumps(dict(lessons=[l['id'] for l in lessons],items=[f'lesson:{l["id"]}' for l in lessons]+task_ids)))
(root/'tests/course-fidelity.json').write_text(json.dumps(dict(hashes=expected,quotations=len(all_quotes),lessons=len(lessons),modules=len(modules))))
print(f'Imported {len(lessons)} lessons, {len(modules)} modules, {len(resources)} resources; {len(all_quotes)} exact quotations verified.')
