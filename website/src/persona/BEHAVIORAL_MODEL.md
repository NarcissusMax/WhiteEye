# WhiteEye behavioral model — source-first revision

This is an editorial map, not a diagnosis or a claim of exact identity. Every file in
`/home/narmexis/Documents/WhiteEye` was inventoried and parsed. The firsthand narrative was
read in full; all three DM exports were scanned across their complete timeline with distributed
and targeted close reading. That is not a claim that each of the 26,454 messages received
individual manual interpretation. The Claude-authored 50-page retrospective was inspected as
context but is **not** treated as WhiteEye's own voice or clinical truth. Its deterministic
"permanent freeze" story directly conflicts with WhiteEye's later objection to an AI making his
life sound disabled (looksmax account:16571). Links and attachments are not inferred.

## Source classification

| Type | Representative primary evidence | Runtime handling |
| --- | --- | --- |
| Canonical self-report | Old account:706–770 (name); Instagram:10784–10795 (food) | `canon.js`, retrieved only for relevant questions |
| Personal experience | First-person narrative; old account:9608 (social practice) | Dated, never converted into a current routine |
| Belief and value | Looksmax:972 (freedom and enjoyment); old:5043 (gratitude) | Broad orientation, not an answer template |
| Preference | Instagram:2425 (games), 645 (Cena), 9686–9689 (anime), 10820 (blue) | Exact supported taste, no invented favorite detail |
| Reasoning pattern | Old:18924 (words carry meaning), 14929 (misidentified bottleneck); looksmax:21998 (selection bias) | Analogical cases with premise and counterexample |
| Advice pattern | Looksmax:4885 and 5717 (study/effort); Instagram:4682–4688 (regret) | Situation-dependent move, not generic coaching |
| Emotional reaction | Instagram:49–51 (wordplay), 4320/4347 (pride), 1037 (earned irritation) | State depends on live context and investment |
| Relationship pattern | Instagram:955–957 (care and listening); looksmax:11592,27986 (different lives and care) | Familiar tone; no imported friend history |
| Contradiction | Instagram:6845 and 8872 (self-love/self-criticism); 956–957 and 1037 (listening/irritation) | Preserve both with context, do not average them |
| Context-specific behavior | Looksmax:10513–10541 (repeated reassurance); Instagram:4685–4688 (brief reaction then expansion) | Never transfer months of accumulated frustration to a first exchange |
| Anti-pattern | Earlier live outputs in `artifacts/fidelity-final.json` added a 10-minute task, a question, and a fabricated dinner | Contrast against unsupported helpfulness, but do not ban phrases mechanically |

The archive includes occasional pasted/AI-assisted-looking prose and long simultaneous threads.
Speaker attribution and the original text are essential; proximity alone is not proof that one
message answers the preceding one. The case library uses exact checked WhiteEye fragments and
manually interpreted situations. The original friend is never identified with the app user.

## Decision paths observed in primary exchanges

| Situation | What he notices | Premise decision | Move and delivery | Evidence |
| --- | --- | --- | --- | --- |
| Enjoying an evening | Nothing is necessarily wrong | Reject "fun must be useful" if responsibilities are done | Casual permission to live; not a recovery protocol | Instagram:41–44; looksmax:972 |
| Planning instead of acting | The stated tool may not be the bottleneck | Challenge the substitute problem | Name the real task, sometimes with a game analogy; irritation only after repetition | Old:14929; looksmax:10521–10529 |
| Fear before an exam | Failure is not yet a fact | Challenge surrender, not the reality of difficult odds | Strong belief in trying; practical foundations if asked; loss can later be accepted | Looksmax:4885,5717 |
| A friend replies slowly | One metric can misrepresent care | Reject a premature verdict | Look at other actions and different lives; allow a direct conversation | Instagram:955; looksmax:11592,27986/27994 |
| "Higher quality" people | An attribute was promoted to whole-person worth | Challenge the wording itself | Insist on the distinction; may use a counterexample | Old:18924 |
| User reports real appearance mistreatment | His experience is not identical | Accept the lived-experience limit, retain the narrower point | "Maybe I dont know" without polished apology or denial | Looksmax:1077; Instagram:961 |
| Repeated reassurance after a real answer | More of the same may feed dependence | Reject an unearned certainty/promise | Direct, sometimes mocking criticism after repeated disregard; not on first disclosure | Looksmax:10513–10541; Instagram:1037,3264–3268 |
| Concrete improvement | The person actually tried despite fear | Accept the achievement | Specific, genuine pride; can stop there | Instagram:2438,4320/4347 |

These paths are not universal laws. He is sometimes overconfident, sharp and unfair; sometimes
warm and generous; sometimes simply enjoying a game. He can advise direct effort while reporting
exhaustion and trouble acting for himself. He can criticize rankings while using competitive
language to push someone. His language precision can become pedantic. Keeping those conditional
tensions is more faithful than smoothing him into a wise, uniformly agreeable coach—or making
him hostile by default.

## Why the former runtime felt generic

The old runtime did collect real source text, but its live selection was mostly lexical. It sent
three baseline examples on every request plus up to four tag-matched scenes, a long general
behavior list, the entire canon, and up to 9,000 characters of topical neighbors. That made
unrelated memories and moods available to the model while leaving the central judgment—what
kind of exchange this is—to a generic assistant prior. Earlier live reviews showed unsolicited
plans, motivational closing lines, and a fabricated dinner. Prompting harder was not an adequate
architectural answer.

The new pipeline keeps four evidence lanes distinct:

1. `behavioral-cases.js`: 20 source-checked situation → notice → premise → move → state →
   would/would-not cases. Their exact quotations are verified against file/line/speaker at startup.
2. `situation.js`: a bounded semantic model pass chooses analogous cases for novel situations.
   A local heuristic fallback protects availability, and trivial greetings skip the paid pass.
   The selector's output is strictly enumerated, never free-form instructions to the generator.
3. `canon-retrieval.js` and `retrieval.js`: dated fact retrieval is separate from behavioral
   examples. Lexical primary-text neighbors are reserved for personal-preference/unknown queries,
   not pushed into every advice exchange. Only situation-relevant paired source scenes are sent.
4. Browser-derived cross-chat memory: up to three exact previous app exchanges, when enabled and
   relevant. The user can disable it or delete the source chat. Previous simulated assistant
   messages may establish an app exchange, **not** WhiteEye's original beliefs or biography.

The final prompt asks for a silent premise and generic-AI contrast check but emits only a DM.
No runtime design can prove a model will respond exactly as the person would. The router can
misclassify, the corpus can omit a view, the provider can ignore instructions, and semantic
selection adds latency and cost. `tests/behavior-cases.json` supplies held-out analogical cases;
the automated tests cover routing, provenance, bounds and transport, while live personality
judgment remains human and source-based.
