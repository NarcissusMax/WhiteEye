import { readFile, readdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const root = new URL('../', import.meta.url);
const directory = new URL('content/integrated-course/modules/', root);
const expansionDirectory = new URL('content/integrated-course/expansions/', root);
const refinementDirectory = new URL('content/integrated-course/refinements/', root);
const excludedSources = new Set(JSON.parse(await readFile(new URL('content/integrated-course/excluded-source-ids.json', root), 'utf8')).ids);
const files = (await readdir(directory)).filter(f => /^\d{2}\.md$/.test(f)).sort();
const draft = process.argv.includes('--draft');
if (!draft) assert.equal(files.length, 40, 'All 40 integrated modules must be authored before release');
const phases = [
 ['Know your starting point','Self-knowledge, values, emotions, and agency give the later techniques a purpose.'],
 ['Build a practice','Habits, attention, learning, and performance turn intentions into repeatable work.'],
 ['Improve your judgment','Observation, logic, evidence, and systems help you evaluate what you learn.'],
 ['Relate with care','Language, listening, relationships, and development put understanding into contact with other people.'],
 ['Work with other people','Influence, resistance to manipulation, leadership, and strategy add responsibility to social skill.'],
 ['Solve, create, and deliver','Problem solving and coordinated delivery turn sound judgment into useful work.'],
 ['Manage resources and capacity','Money, economics, physical training, and sport connect decisions to real constraints.'],
 ['Protect and understand','Safety, digital literacy, mind, and ethics deepen your ability to act thoughtfully.'],
 ['Widen the frame','Philosophy, traditions, science, and literature expose assumptions and alternative perspectives.'],
 ['Bring the course into life','Health literacy, craft, institutions, and the capstone turn broad understanding into an accountable personal practice.'],
].map(([title,description])=>({title,description}));
const modules=[], lessons=[], lineage=[];
const note = text => ({type:'note', text:`Course note: ${text}`});
const heading = text => ({type:'heading',depth:2,text});
const task = (id,text)=>({type:'task',id,text:`Course note: ${text}`});
for (const file of files) {
 const baseSource = await readFile(new URL(file,directory),'utf8');
 async function optionalSource(directory) {
  try { return await readFile(new URL(file,directory),'utf8'); }
  catch(error) { if(error.code==='ENOENT')return ''; throw error; }
 }
 const expansionSource = await optionalSource(expansionDirectory);
 const refinementSource = await optionalSource(refinementDirectory);
 const baseLessons = (baseSource.match(/^## /gm)||[]).length;
 const expansionLessons = (expansionSource.match(/^## /gm)||[]).length;
 const source = [baseSource, expansionSource, refinementSource].join('\n');
 const id=file.slice(0,2); const parts=source.split(/^## /m); const intro=parts.shift();
 const title=intro.match(/^# (.+)$/m)?.[1]; const description=intro.match(/^DESCRIPTION: (.+)$/m)?.[1];
 const books=intro.match(/^BOOKS: (.+)$/m)?.[1].split(/\s+/) || [];
 assert(title && description && books.length,`Missing module metadata in ${file}`);
 const replacedModule = id==='21' || id==='22';
 const module={id,kind:'module',module:id,title,name:`${id} ${title}`,description,lessonIds:[],blocks:[note(description)]};
 for(const [index,part] of parts.entries()) {
  const [title,...lines]=part.trim().split('\n'); const fields={};
  for(const line of lines) {if(!line.trim())continue;const match=line.match(/^([A-Z]+): (.*)$/);assert(match,`Unknown line in ${file}: ${line}`);assert(!fields[match[1]],`Repeated field ${match[1]} in ${file}`);fields[match[1]]=match[2];}
  for(const key of ['QUESTION','CORE','CONNECT','EXAMPLE','DO','TRY','REFLECT','CHECK','MODEL'])assert(fields[key],`Missing ${key}: ${file} ${title}`);
  const lid=`${id}.${String(index+1+(replacedModule?10:0)).padStart(2,'0')}`;
  const displayId=`${id}.${String(index+1).padStart(2,'0')}`;
  const [question,...answer]=fields.CHECK.split('::');assert(answer.length===1,`Bad recall check ${lid}`);
  const steps=fields.MODEL.split('|').map(step=>{const [label,...text]=step.split('~');assert(text.length,`Bad diagram ${lid}`);return {label,text:text.join('~')};});
  const blocks=[{type:'question',text:fields.QUESTION},heading('Core idea'),{type:'concept',text:fields.CORE},
   {type:'concept',title:'Connect the ideas',text:fields.CONNECT},{type:'example',title:'A worked example',text:fields.EXAMPLE},
   {type:'model',title:'Put the idea to work',steps},heading('Practice'),task(`task:lesson-${lid}-1`,fields.DO),task(`task:lesson-${lid}-2`,fields.TRY),
   heading('Reflection'),note(fields.REFLECT),heading('Recall check'),{type:'flashcard',question,text:answer[0]}];
  if(fields.LINKS)blocks.push(heading('Related lessons'),note(fields.LINKS));
  const lesson={id:lid,...(replacedModule?{displayId}:{}),kind:'lesson',module:id,title,name:`${displayId} ${title}`,position:lessons.length+1,blocks,previous:null,next:null};
  const authoringFile=index<baseLessons?`modules/${file}`:index<baseLessons+expansionLessons?`expansions/${file}`:`refinements/${file}`;
  lessons.push(lesson);module.lessonIds.push(lid);lineage.push({id:lid,title,bookIds:(fields.BOOKS?.split(/\s+/)||books),authoringFile,lineageLevel:fields.BOOKS?'lesson':'module thematic pool'});
 }
 const taskPrefix=replacedModule?`module-${id}-r2`:`module-${id}`;
 module.blocks.push(heading('Module practice'),task(`task:${taskPrefix}-1`,`Choose one lesson from this module and complete both practices. Record the situation, action, and result in [[Daily Practice Log]].`),task(`task:${taskPrefix}-2`,`Apply a second lesson to the same situation. Explain where the two ideas support each other and where their limits differ.`),task(`task:${taskPrefix}-3`,`Create a one-page field note: useful distinction, worked application, evidence, remaining question, and your next action.`),heading('Reflection'),note(`What can you now do or distinguish that was unclear before this module? Use an actual attempt as evidence.`),note('Use [[Weekly Review Template]] and update [[Progress Tracker]].'));
 modules.push(module);
}
lessons.forEach((l,i)=>{l.previous=lessons[i-1]?.id||null;l.next=lessons[i+1]?.id||null;});
const resources=[];
function resource(id,title,blocks){const r={id,kind:'resource',module:null,title,name:title,blocks};resources.push(r);return r;}
resource('00-start-here','Start Here',[
 note('This is one integrated course built around abilities and prerequisites. Ideas from the collection meet inside shared lessons; the path is not divided into separate book courses. All explanations, examples, questions, and diagrams here are authored Course notes. WhiteEye’s original course remains separate.'),
 heading('Choose a sustainable pace'),note('Begin with the starting-point module. Work through two or three lessons in a study session, then use one idea in a real situation. A module per week is a starting suggestion, not a deadline. Technical and reflective modules may need more time. Reading every page quickly is not the objective.'),
 heading('Read, connect, practice, reflect'),note('Each lesson has a learning question, a developed idea, a connection or distinction, an example, a visual sequence, two practices, and a recall check. Try answering the recall question before revealing its answer. Use Previous and Next to follow the sequence; the chapter menu and knowledge map let you revisit connected ideas.'),
 heading('Keep a record'),note('Your lesson position, completion, practice checkboxes, and saved reflections persist for this browser. Course 1 and Course 2 have separate records. Save reflections with the notebook control; use [[Daily Practice Log]] and [[Weekly Review Template]] for longer records. This browser identity is not an account shared across devices.'),
 heading('Read critically'),note('The collection mixes practical methods, philosophy, memoir, fiction, older technical references, religious claims, and disputed ideas. The course distinguishes their roles. A compelling story is not proof; a diagram is not a clinical diagnosis; a general framework is not specialist certification. Use [[Connections and Tensions]] and [[Gaps and Questions]] when approaches disagree.'),
 note('Begin with [['+modules[0].name+']]. Bring your work together in [[Final Capstone]].')]);
const tensions=resource('connections-and-tensions','Connections and Tensions',[note('Compare approaches by their aims, assumptions, evidence, and consequences. Preserve a disagreement when it cannot be settled from the material. The links below also create comparison paths in the knowledge map.')]);
resource('daily-practice-log','Daily Practice Log',[note('Record actual attempts rather than intentions. Keep entries short enough to maintain and specific enough to learn from.'),{type:'template',text:'Course note: Daily practice\nDate:\nLesson:\nSituation and baseline:\nAction tried:\nObserved result:\nInterpretation and uncertainty:\nWhat to repeat or change:\nNext step:'}]);
resource('weekly-review-template','Weekly Review Template',[note('Add a dated review to your notebook. Compare the week with your starting brief; retain strengths as well as identifying changes.'),{type:'template',text:'Course note: Weekly review\nWeek beginning:\nLessons studied:\nPractices actually attempted:\nWhat changed? Evidence:\nWhat worked and should continue?\nWhat did not work? Conditions:\nWhich ideas disagreed?\nWhat remains uncertain?\nOne change for next week:\nOne commitment or limit to protect:\nNext review date:'}]);
resource('my-notes','My Notes',[note('Use this notebook for your own synthesis, questions, and links between lessons. Distinguish what you observed from what you inferred. Do not paste sensitive information you would not want stored with this browser’s course record.')]);
resource('progress-tracker','Progress Tracker',[note('Completion records study and practice; it does not certify expertise. Mark a lesson when you have read it, attempted its practices, and considered the recall check. Revisit ideas when later experience changes your understanding.'),...modules.map(m=>task(['21','22'].includes(m.id)?`module:${m.id}:r2`:`module:${m.id}`,`Complete [[${m.name}]] and its module field note.`))]);
resource('question-map','Question Map',[note('Use the questions to find the skill you want to practice. Follow the full order when the prerequisites are unfamiliar.'),...modules.flatMap(m=>[heading(m.title),...m.lessonIds.map(id=>{const l=lessons.find(x=>x.id===id);return {type:'list',text:`Course note: [[${l.name}|${l.blocks[0].text}]]`};})])]);
resource('flashcards','Flashcards',[note('Answer before opening each card. These answers are Course notes, not quotations or claims of perfect certainty. Return to the full lesson when the distinction is unclear.'),...modules.flatMap(m=>[heading(m.title),...m.lessonIds.map(id=>lessons.find(l=>l.id===id).blocks.find(b=>b.type==='flashcard'))])]);
resource('glossary','Glossary',[note('Use these distinctions as working definitions in this course. Each entry links to the lesson where the idea is explained and applied.'),...lessons.filter(l=>['01','02','04','05','09','10','11','12','17','20','21','25','26','31','32','33','35'].includes(l.module)).map(l=>({type:'list',text:`Course note: [[${l.name}|${l.title}]] — ${l.blocks.find(b=>b.type==='flashcard').text}`}))]);
resource('gaps-and-questions','Gaps and Questions',[note('The collection is broad but uneven. A filename is not proof that a complete edition is present, and repeated editions do not add independent evidence. Some scans contain difficult text or image-only diagrams. This course integrates the collection’s teachable themes; it does not reproduce every page, catalog entry, game variation, drill, recipe, or professional procedure.'),heading('Questions to keep open'),note('Which advice transfers to your circumstances? Which claims rest on anecdotes or older evidence? Which accounts disagree about agency, competition, faith, intimacy, and success? What would change your judgment?'),heading('Where the course has limits'),note('Specialist medical interpretation, individualized treatment, current legal and tax rules, investment selection, unsupervised combat techniques, and unauthorized access to computer systems are not established by completing a reading course. Technical material is used for literacy, critical evaluation, supervised learning, and defensive understanding. Religious and paranormal claims are examined as claims and traditions rather than converted into scientific facts.'),heading('Your unanswered questions'),note('Record the question, why it matters, what the supplied material actually supports, what remains missing, and the kind of evidence or qualified help that would resolve it. Do not fill a gap with certainty merely to make the course feel complete.')]);
resource('final-capstone','Final Capstone',[note('Build a personal practice portfolio around one worthwhile, bounded improvement project. Use ideas from several modules in the same project and show what happened.'),heading('The brief'),task('task:capstone-1','Define the situation, baseline, value, desired outcome, constraints, stakeholders, and review date. Explain why the project matters.'),heading('The design'),task('task:capstone-2','Connect at least four lessons from different modules. Give each a specific job in the plan. Include one tension or limit rather than claiming every method agrees.'),heading('The experiment'),task('task:capstone-3','Run a feasible trial. Record actions, observations, unintended effects, and changes. Protect consent, commitments, and appropriate limits.'),heading('The review'),task('task:capstone-4','Compare the result with the baseline. Distinguish outcome quality from decision quality, name uncertainty, and revise your explanation.'),heading('The next cycle'),task('task:capstone-5','Present a concise field guide: what to keep, what to stop, what to test next, and when to review again. Include evidence from your own attempts.'),note('A strong capstone is specific, honest about limits, and useful for the next decision. It is not a performance of having perfected your life.')]);
// Explicit authored relationships only; no similarity guesses are presented as knowledge links.
const connectionsPath=new URL('content/integrated-course/connections.json',root);
let connections=[];try{connections=JSON.parse(await readFile(connectionsPath,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
for(const group of connections){const ids=group.ids.filter(id=>lessons.some(l=>l.id===id));if(!draft)assert.equal(ids.length,group.ids.length,`Unknown relationship in ${group.title}`);if(ids.length<2)continue;tensions.blocks.push(heading(group.title),note(group.description),...ids.map(id=>({type:'list',text:`Course note: [[${lessons.find(l=>l.id===id).name}]]`})));
 for(const id of ids){const l=lessons.find(l=>l.id===id);l.blocks.push(note(`${group.title}: ${ids.filter(x=>x!==id).map(x=>`[[${lessons.find(l=>l.id===x).name}]]`).join(' · ')}.`));}}
const references={};for(const n of [...modules,...lessons,...resources]) references[n.name]=`/course-2/${n.kind}/${n.id}`;
references['Course Index']='/course-2/';
for(const n of [...modules,...lessons,...resources])n.blocks.push(note('Return to [[Course Index]].'));
for(const n of [...modules,...lessons,...resources])for(const b of n.blocks)for(const match of (b.text||'').matchAll(/\[\[([^\]|#]+)/g))assert(references[match[1]],`Unresolved link ${match[1]} in ${n.id}`);
const data={version:1,course:2,title:'The integrated course',totals:{modules:modules.length,lessons:lessons.length,quotations:0},phases:phases.slice(0,Math.ceil(modules.length/4)),modules,lessons,resources,references};
for(const entry of lineage)for(const id of entry.bookIds)assert(!excludedSources.has(id),`Excluded source ${id} in ${entry.id}`);
await writeFile(new URL('public/data/course-2.json',root),JSON.stringify(data));
const all=[...modules,...lessons,...resources];
const items=[...lessons.map(l=>`lesson:${l.id}`),...modules.map(m=>['21','22'].includes(m.id)?`module:${m.id}:r2`:`module:${m.id}`),...new Set(all.flatMap(n=>n.blocks.filter(b=>b.type==='task').map(b=>b.id)))];
await writeFile(new URL('worker/course-2-manifest.json',root),JSON.stringify({lessons:lessons.map(l=>l.id),items:[...new Set(items)]}));
await writeFile(new URL('content/integrated-course/lineage.json',root),JSON.stringify({note:'Internal thematic lineage; module pools do not mean each lesson uses every listed source. See private coverage audit for review depth and limitations.',lessons:lineage},null,2));
console.log(`Compiled integrated course: ${modules.length} modules, ${lessons.length} lessons, ${resources.length} companions${draft?' (local draft)':''}.`);
