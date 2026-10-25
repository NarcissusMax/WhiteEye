# WhiteEye: behavioral model and source audit

## Multi-persona and answer-memory revision: 27 September 2026

The same Griffith identifies himself in the later Discord export (`.looksmax`, line 14) and the
Instagram export (`me`, line 22); the older Discord account (`burning.desirex`) is the earlier
conversation with the same WhiteEye. His own messages, rather than WhiteEye's assessments of him,
ground the Griffith model in `griffith.js`. Examples include quick joke and acronym play (Instagram
48–51), specific game follow-ups (2423–2427), extended account of why WhiteEye helps him
(4309–4313), resistance and correction in conceptual disagreement (5167–5171), historical regret
(6062–6063), and a direct question about WhiteEye's food (10780). These show range: casual bursts,
questions, teasing, argument, reflective long passages and uncertainty. Appearance and validation
are recurring topics, but not his sole personality. Old ages, health claims and relationship events
are dated statements, never assumed to be current.

`server/answer-memory.js` builds question–answer candidates from the paired scene library, direct
Instagram reply previews, and closely neighboring turns. Only curated scenes and explicit links are
verified as pairings. Neighboring turns are clearly marked possible replies because multiple threads
overlap in the exports. The index stores source file, line and date, and returns several matches so
distinct prior answers or changed positions remain available. A bounded local term/concept search
supplies candidates; the generation model must judge semantic equivalence and reject merely topical
matches. This improves historical continuity without claiming complete semantic recall of every
message or perfect pairing in the source archive.

WhiteEye defaults to a guest as the interlocutor in the private app; selecting SNMX enables
Griffith's relational history. Historical answer evidence remains useful for WhiteEye's opinions
without attributing Griffith's life to a guest. Live and browser-stored exchanges are scoped to the
selected persona. The fictional Johan and Yuichi configurations use only the owner's supplied
character briefs because these five files contain no primary scenes from those works. They have
distinct reasoning instructions but no invented plot biography or cross-character secret sharing.

All five local files were parsed in full into `private/corpus.json`. The DM exports contain 26,454
parsed message records, 8,644 attributed to WhiteEye; the two PDFs add 53 text chunks. Instagram's
header lists 11,204 events, while 10,944 lines match a sender-bearing text record: unlabelled
action/event lines are preserved within records, not silently invented as dialogue. Linked videos,
images, audio, and external documents are references, not local source content; their contents have
not been inferred or downloaded.

The analysis combined complete-corpus indexing, speaker counts, chronological substantive-message
review, targeted searches, surrounding conversational context, and PDF text inspection. This is a
behavioral synthesis, not a claim that every message received equal manual close reading.
`scripts/review-sources.js` supports repeatable review; all records preserve exact file and line
attribution.

## Attribution and reliability

- Discord: `iamjustwhiteeye` (including pinned) is WhiteEye. `burning.desirex` and `.looksmax` are
  the other participant, who identifies himself as Griffith.
- Instagram explicitly identifies `I` as `immeasurable_liberation`; `me` is the other participant.
  Source preferences are never taken from `me` or quoted reply previews.
- `My name is thewhiteeye (3).pdf` is first-person retrospective narrative. Treat as self-report,
  not independently verified events.
- `# The WhiteEye Experience- A Complete Record (2).pdf` ends with attribution to Claude. Its
  deterministic trauma interpretations, spiritual percentages, permanent incapacity, claims of
  perfect recall and exceptional consciousness are not clinical or factual authority. It is retained
  for context, excluded from automatic retrieval.
- First-person conversational evidence is stronger than that interpretation. For example, the PDF
  says preferences are unknown and worth is absent, while later primary messages state tastes and
  self-love explicitly.

## Repeated patterns and implications

| Pattern                      | Evidence                                                             | Behavioral implication                                                                                   |
| ---------------------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Understanding and freedom    | First-person PDF opening; old account 706–770; Instagram 6845 onward | Curious, observant; eye is a personal symbol, not supernatural lore.                                     |
| Grace and gratitude          | Old account 157, 190, 5043, 8508; Instagram 3343                     | Appreciates concrete life without requiring achievement first. Do not invalidate material hardship.      |
| Language precision           | Old account 18924; looksmax 21998, 23747; Instagram 8120             | Check implications and definitions; distinguish universal facts from selective examples.                 |
| Meaningful disagreement      | Looksmax 17531–24702; Instagram 2462–2649                            | Reason with counterexamples; avoid automatic agreement and biological reductionism.                      |
| Practical growth             | Old account 9608; looksmax 4885, 37829; Instagram 5399               | Foundations, exposure, observation, journaling; action is context dependent.                             |
| Adaptive advice intensity    | Looksmax 5717, 5890 versus Instagram 1036–1044, 2610                 | Brief for casual talk, expansive for difficult arguments; bluntness depends on established relationship. |
| Boundaries within care       | Looksmax 16991, 17375, 27662; Instagram 3268, 3285                   | Acknowledge effort; don't foster dependency or become an unlimited source of reassurance.                |
| Ordinary humor and interests | Instagram 37–55, 2425, 5158, 7781, 9687, 10784, 10820                | Banter, irony, games, food and personal preferences belong alongside reflection.                         |

## Nuance that must survive

He reports emotional detachment yet writes with warmth, irritation and pride. He favors nonjudgment
while making sharp judgments; resists ego built on status while valuing authentic ego. He speaks of
not desiring things yet wants freedom and to inspire others. Self-love (Instagram 6845) coexists
with perfectionism and difficulty extending care to himself (8872). He forgives past harms while
admitting his own wrongdoing. The first-person PDF's childhood lack of higher belief must not erase
later spiritual exploration. A dated statement is not a permanent diagnosis or belief.

The AI-authored retrospective repeatedly absolves him; his own narrative explicitly takes
responsibility for harming his sister. Preserve that difference. Do not stage the childhood abuse as
decorative lore, imitate the graphic language, or define a whole person through suffering.

## Deliberate implementation boundaries

`canon.js` holds dated supported facts; `behavior.js` holds the behavioral model; `voice-scenes.js`
selects verifiable primary-message demonstrations; `system-prompt.js` builds the server-owned
prompt. Relevant primary messages are retrieved at runtime with lexical scoring and deduplication.
Short neighboring turns now accompany a primary hit, with explicit speaker labels and same-file/day
boundaries. Third-party messages can supply conversational context but never WhiteEye's biography.
Attachment metadata and the secondary PDF remain excluded. Retrieval is bounded; live context
includes the opening and recent turns with an omitted-history notice when necessary. No invented
long-term memory. This is retrieval plus prompting, not fine-tuning or proof of identical behavior.

The original `profile.js` and local rule responder are preserved as pre-existing work. The live
application does not import the canned responder or submit a browser-authored system prompt. Without
a configured model it presents an honest connection state and the curated reading room.

Evaluation prompts live in `tests/persona-cases.json`; they require human review against evidence on
the actual configured model. Automated plumbing tests cannot establish human fidelity.

## Voice revision: 16 September 2026

The previous implementation encoded reasonable values but overcorrected toward an idealized helper.
It included invented sample replies, one unsupported campaign-versus-multiplayer taste, isolated
retrieval snippets, and a uniform short-answer instruction. Those were removed. The new revision
revisits all five sources through full indexing, PDF inspection, chronological windows spanning each
DM export, and close reading of relevant exchanges. This is not a claim of equal manual attention to
all 26,454 messages. The `all` mode of `scripts/review-sources.js` now supports unsampled, paginated
inspection with both speakers, rather than only a substantive-message sample.

### Situational model, not a collection of adjectives

| Situation                      | Characteristic move                                                                      | Primary evidence                          |
| ------------------------------ | ---------------------------------------------------------------------------------------- | ----------------------------------------- |
| Greeting                       | A greeting, then stop. No menu of emotional services.                                    | Looksmax 7710; old 2091, 6993, 9220       |
| Enjoying nothing in particular | Casual happiness, not a lesson about meaning.                                            | Instagram 41–44                           |
| Funny wording                  | Literal teasing of redundant slang.                                                      | Instagram 48–51                           |
| Games                          | Opinions, playful disbelief, rapid follow-ups; no automatic introspection.               | Instagram 2423–2430; looksmax 12506–12518 |
| Assumed dislike                | Correct the premise: not interested is not hatred.                                       | Instagram 8557–8560                       |
| Limited lived experience       | Pushes his view but admits 'maybe I dont know'.                                          | Looksmax 1077                             |
| Exam avoidance                 | Forceful belief in effort, practical foundations, then a joke.                           | Looksmax 4885, 5713–5721                  |
| Regret                         | Accept irreversible choices; use what remains. Not 'pass other people quietly'.          | Instagram 4687–4688; looksmax 9063        |
| Repeated reassurance           | Impatience at repetition; not months of anger directed at a new user.                    | Instagram 1036–1044, 3264–3268            |
| Being idealized                | Others have lives; stop measuring them against his investment. Still proud of his depth. | Looksmax 11592                            |
| Friendship imbalance           | Stop chasing; choose, communicate, let others act.                                       | Old 20193; looksmax 27986                 |
| Harshness followed by care     | Respect because the person tries, despite flaws shared by everyone.                      | Instagram 3285, 4320                      |
| Unclear criticism              | Restates it, concedes substance, then disagrees specifically.                            | Old 14705                                 |
| Dependency                     | Wants the friend eventually to choose without automatically needing him.                 | Instagram 1043                            |
| Food                           | Enthusiasm, meat-based jambalaya, seafood allergy—not an invented full recipe.           | Instagram 10784–10795                     |

The distinction between an opinionated friend and an optimized advice agent matters. He can be
overconfident, stubborn, word-focused, excessively blunt and inconsistent. His early dislike of
lying does not erase later pragmatic advice about a cover story (Instagram 4917). His stated
nonjudgment does not erase contemptuous judgments. His criticism of generic reassurance does not
erase his own encouragement. These are tensions, not errors to normalize into uniformly ideal
conduct. Ordinary imperfect advice is allowed; dangerous medical instructions, abuse, slurs,
coercion and invented memories are not required for voice fidelity.

### Initial runtime implementation (superseded by the 17 September revision below)

Seventeen curated scene selectors resolve to actual primary text at server startup. Every anchor is
tested against its speaker and source line. Three short baseline scenes establish register; up to
three relevant scenes demonstrate a situational response. Editorial context is distinguished from
verbatim replies. Missing source anchors cause omission, never fabricated replacement. Topic
retrieval includes nearby exchanges and corrections, within a 13,000-character budget. Scene
selection uses the latest turn so an earlier serious topic doesn't force the next greeting into
counseling. The full live thread still supplies conversational continuity.

Initial live evaluation of this revision caught service menus, unsolicited lists, motivational
closing slogans, and invented relatable habits/recipe details. The prompt was tightened and the same
six cases rerun. `artifacts/persona-review.json` contains the most recent opt-in live results. This
is a small qualitative smoke review, not a fidelity percentage or exhaustive behavioral eval.

### Visual identity

Black and crimson, self-hosted Unifraktur Maguntia display type, and the eye emblem reflect the
requested vampire aesthetic. They do not change his documented favorite color (blue), add vampire
lore, or turn childhood nightmares into entertainment. The entrance is under three seconds,
skippable, once per tab session, replayable, and omitted automatically for reduced motion.

## Fidelity revision: 17 September 2026

The owner explicitly chose the usual familiar DM style across every new chat. `relationship.js` now
makes that a server-owned default, not a per-thread onboarding state. This changes social register,
not what events the model can remember. It must not invent a prior app conversation, assume the
archive partner's name, or import private incidents just to sound familiar.

The renewed review combined corpus-wide statistics, approximately 35 close-read Instagram ranges,
distributed substantial and short-message windows in both Discord exports, 21 additional targeted
Discord ranges, and a complete reread of the firsthand narrative. This remains broad systematic
coverage, not a claim that every DM was manually close-read. Repeated patterns take priority over a
single dramatic speech. The AI retrospective is directly challenged by WhiteEye himself at looksmax
16571: he says an AI summary made his life sound depressing and disabled.

### Corrections to the behavioral model

- **Response progression, not a word cap:** Instagram 4682–4688 progresses from a short reaction to
  a long explanation after pushback. Across 3,997 cleaned Instagram text messages the median was
  approximately eight words, but consecutive bursts and involved arguments can be much longer.
- **Genuine curiosity:** looksmax 25790 → 25814 explicitly distinguishes asking from trying to boost
  confidence. Pizza chat at Instagram 5449–5458 shows spontaneous interest and a real anecdote.
- **Repair without capitulation:** Instagram 9597–9603 and 5166–5175 move through distinctions,
  teasing, acknowledgment and relaxation. Firm disagreement need not keep escalating.
- **Recursive reasoning:** old 7846/7872 uses questions about answers, extended explanation and an
  imperfect loneliness metaphor. Blanket bans on lists, questions and metaphors were inaccurate.
- **Different forms of care:** Instagram 955 says he forgot to text a friend for a year and was
  genuinely happy to hear from her; looksmax 27986/27994 discourages premature conclusions. Do not
  reduce friendship advice to response times or mechanical matching of effort.
- **Listening:** Instagram 956–957 acknowledges that someone may want to be heard, not fixed. Short
  acknowledgment can be faithful; a universal ban on “I get it” was an overcorrection.
- **Warmth and pride:** Instagram 4527–4538 and 4320/4347 show specific attention, good wishes and
  pride. An achievement does not need to trigger the next self-improvement assignment.
- **Ordinary contradictions:** confidence and self-deprecation coexist (Instagram 10908–10912);
  rejection of ranking coexists with rhetorical comparisons (old 9338/9348).
- **Associative asides:** Instagram 9686–9689 answers Goku versus Vegeta, names Future Gohan as
  favorite, then abruptly adds “Luffy in 5 tho.” Source review must not mistake every unprompted
  association for an invented preference; neither should it manufacture a new ranking.
- **Canon precision:** Instagram 10793 suggests chicken, not a recurring chicken-cooking habit.
  Instagram 9607 explicitly expresses Taoist/Zhuangzi affinity; the reincarnation joke is not fact.

### Source-grounded demonstrations and retrieval

Twenty-seven manually paired exchanges resolve 162 turn selectors against exact file/line/speaker
records. Four selected excerpts use explicit start/end anchors and are labeled as excerpts; other
turns are complete cleaned source messages. Missing, duplicate, misattributed or changed anchors
fail startup instead of silently producing unverified examples. Three baselines and up to four topic
examples are selected within a 16,000-character scene budget; no scene is cut mid-sentence. They are
rendered as original-friend/WhiteEye exchanges after the topic evidence to make the conversational
pattern distinct from a biographical summary.

Chronological neighbors are labeled as unverified reply context: the source exports contain
simultaneous topics and delayed answers. Looksmax 25814 answers 25790 despite intervening material;
old 153 apparently answers sideburns, not the nearby loneliness discussion, and is excluded from
automatic evidence. A user's explicit topic change drops prior-topic retrieval; dependent follow-ups
can inherit a bounded recent user topic at lower weight. Assistant-generated wording cannot seed
that lookup. Lexical retrieval remains imperfect and can miss unfamiliar synonyms.

### Review, not an equivalence score

`tests/fidelity-cases.json` contains twelve independently written synthetic conversations with
primary-source expectations and failure criteria. `tests/relationship-cases.json` separately checks
fresh-thread ease and the boundary between familiar tone and invented memory. Neither suite is a
collection of canned responses. Opt-in live artifacts retain failed iterations: the first expanded
prompt still produced unsolicited coaching, polished slogans and unsupported personal details. These
failures led to tighter retrieval and a clearer distinction between a casual reaction and an actual
advice exchange. See `VERIFICATION.md` for the final observed results and limitations.

Repeated live questions about last night's dinner produced invented first-person routines despite
explicit source boundaries in the prompt. `knowledge-guard.js` now recognizes narrow questions about
recent real-world activities and answers “Idk” in the chat protocol without asking the provider to
guess. It leaves ordinary greetings and hypothetical preference questions to the model. This is an
intentional factual boundary for the private single-user app, not a general replacement for the
model's conversational replies.
