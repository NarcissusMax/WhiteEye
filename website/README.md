# WhiteEye

This directory is the public source export of the current local website,
updated on 25 October 2026. Run commands below from this directory. Local paths
and running-service descriptions document the original installation; adapt them
for another machine. Start by installing dependencies with `npm ci`, restoring
the required [private source indexes](private/README.md), and configuring your
own ignored `.env` file from `.env.example`. Credentials, private generated
indexes, learner databases and runtime/build output are outside this export.

Andrew Tate is available in **Speaking with**, using the supplied transcript collection and edited
Tate Bible. Source answers combine verified excerpts from matching documents, with file and line
references; new replies are labeled AI continuation. Rebuild this separate index with
`deno task index:tate`. See [the source and fidelity notes](docs/andrew-tate.md).

A private, source-grounded conversation application with WhiteEye, Griffith, IMP and other
interpreted personas, local conversation history, a reading room, and streamed replies from an
OpenAI-compatible model.

IMP replaces the individual Johan Liebert, Yuichi Katagiri and Ayanokoji Kiyotaka choices. It
combines their mindsets with seven published Robert Greene books in one original voice. Existing
individual conversations remain readable, and the COTE PDFs still inform IMP. See
[IMP's scope and sources](docs/imp.md) and [COTE indexing](docs/ayanokoji.md).

## Run locally

The current website is running at **http://127.0.0.1:8000/** using this checkout. Its enabled
`whiteeye.service` starts when you log in. All three appearances and both courses are available.

```sh
systemctl --user start whiteeye.service
systemctl --user stop whiteeye.service
systemctl --user restart whiteeye.service
systemctl --user status whiteeye.service
```

To run it in a terminal instead, stop the service first:

```sh
systemctl --user stop whiteeye.service
cd /home/narmexis/Projects/WhiteEye/website
npm start
```

Keep the terminal open; Ctrl+C stops that manual copy. `npm start` rebuilds the current site and
starts the Node server. The installed Node.js and dependencies are already sufficient. For a
fresh checkout, install the dependencies with `npm ci` before starting. The private source index
files in `private/` must also be present to build this source-based application.

Local course progress and notes persist in `/home/narmexis/Projects/WhiteEye/data/local/course.sqlite`. Chats and
appearance preferences remain in the browser at this address. The local copy and hosted website
have separate browser storage and course progress. See [the full local hosting guide](docs/local-hosting.md)
for configuration, alternate ports, backups, logs and the preserved previous launcher.

## Connect the model

A private `.env` file is already present. Edit it locally:

```dotenv
MODEL_BASE_URL=https://api.openai.com/v1
MODEL_NAME=your-available-model-name
MODEL_API_KEY=your-api-key
```

For another OpenAI-compatible provider, use its `/v1`-style base URL and model identifier. The
server appends `/chat/completions`. Restart the server after editing. Do not paste credentials into
the browser or commit `.env`.

The current local launcher reuses your existing model configuration from `.env`; no credentials
need to be entered again. The selected model and available choices are shown in the interface.
The adapter sends streamed chat-completion requests to the configured provider. Configuration
status is checked locally; a successful chat reply is the live provider check.

Without credentials the interface, reading room, saved history and exports work. Sending a message
returns a visible connection error; it does **not** use the preserved canned responder. The
Connection dialog explains setup. “Model ready” indicates configuration is present; a successful
reply is the live provider check.

## Persona architecture

The conversation toolbar selects who replies. WhiteEye remains the default. It also lets the visitor
choose whether WhiteEye is speaking with a guest (the default) or SNMX, the person identified as
Griffith across the three DM exports. The choice and active persona are saved with each
conversation. Switching voices keeps the visible transcript, while model context and prior-chat
recall include only messages addressed to the active voice. A new chat inherits the current voice
and starts with A guest selected.

- `src/persona/griffith.js` and `personas.js`: separate source-anchored Griffith model and bounded
  fictional character specifications. The supplied folder has no primary Johan/Yuichi fiction; those
  voices are based on the owner's character brief, without invented plot memories.
- `server/answer-memory.js`: builds a historical question–answer index from curated exchanges,
  explicit reply links, and cautiously labeled nearby replies. The generation prompt asks the model
  to decide which candidates really answer the current question and to preserve distinct prior
  versions. Nearby turns remain unverified, and semantic lookup is limited by the local term/concept
  index.
- `server/retrieval.js`: indexes WhiteEye and Griffith statements separately; dated Griffith
  statements can inform WhiteEye's relationship memory only when the participant is Griffith.

- `src/persona/ANALYSIS.md` and `BEHAVIORAL_MODEL.md`: source audit, evidence classes, decision
  paths, contradictions and limits.
- `src/persona/behavioral-cases.js`: 20 situation → notice → premise → move → emotional register →
  would/would-not cases, each with exact WhiteEye quotations.
- `server/behavior-retrieval.js`: checks every case quotation against the indexed file, line, and
  speaker at startup; invalid provenance prevents startup.
- `server/situation.js`: bounded model-based selection of analogous behavioral cases for each
  nontrivial turn, with a local availability fallback. Greetings skip this extra provider call.
- `src/persona/canon.js` and `canon-retrieval.js`: dated supported facts retrieved separately from
  behavioral analogies, without invented autobiographical details.
- `src/persona/relationship.js`: familiar-DM guidance for a guest; with Griffith selected, the
  server uses their documented relationship from the archive.
- `src/persona/knowledge-guard.js`: narrow factual boundaries for recent real-world experiences and
  unsupported favorite music/book claims.
- `src/persona/voice-scenes.js`: manually paired, two-sided historical exchanges, selected only when
  their behavioral case applies.
- `src/persona/system-prompt.js`: server-owned WhiteEye generation layer that distinguishes
  historical answers, Griffith's dated words, analogy, factual canon, and prior app memory.
- `public/js/memory.js`: optional, bounded recall of exact exchanges from other undeleted chats on
  this browser; no model-written summary or server-side memory store.
- `scripts/index-sources.js`: reads all five local files, extracts PDFs and attributes messages with
  original line numbers.
- `private/corpus.json`: generated complete corpus, never served publicly or committed.
- `server/app.js`: validated requests, access control, rate limits, provider streaming, errors,
  timeout and an explicit public asset allowlist.
- `public/`: modular browser JavaScript and responsive CSS, accessible dialogs, keyboard controls
  and reduced-motion styles.

The footer offers direct playback for Blind Spots by C418 (the default) and lit(var) by Kensuke
Ushio from A Silent Voice, alongside three original synthesized instrumental loops. Recordings
use the browser's native audio player and footer controls, with no YouTube embeds or requests.
Choose your audio file in music options; it is kept in this browser's IndexedDB, independent of
chat history. These device-local files do not reach other visitors. Supplying authorized audio
files for the public asset bundle is still needed for a shared, ready-to-play soundtrack.
Track, volume and an explicit stop choice stay on this device. Autoplay can require a click.

Conversations can be dragged by their sidebar grip to reorder them or move them into folders.
Alt + Up/Down reorders with the keyboard; the Organize dialog's Sidebar position selector offers
the same control on mobile. Manual order survives new replies, chat switching and refresh.
The welcome uses locally bundled Three.js to render the cathedral engraving as a shallow relief,
with gentle pointer-led depth, moonlight and etched-water motion in the artwork itself.
The cursor uses a slightly larger eye with no trailing dots; motion controls and reduced motion apply.
Prior-chat selection shares the server's total recall budget, including legacy timestamp handling.


The older `behavior.js`, `profile.js`, legacy prompt export and `src/lib` scaffold remain for
reference but are not the runtime behavioral engine. The runtime uses source-checked cases and
selected historical exchanges, not a flat list of adjectives or a keyword responder. A nontrivial
turn normally makes a small semantic-selection call and then a streamed generation call; this adds
provider cost and latency. The selector's output is restricted to known case IDs and state labels,
not executable instructions.

To regenerate after editing the source files:

```sh
deno task index
# Or use a different source directory:
deno run --allow-read --allow-write=private --allow-run=pdftotext scripts/index-sources.js /path/to/WhiteEye
```

Griffith's own messages are not treated as WhiteEye’s biography. When speaking with Griffith,
WhiteEye can draw on relevant archived interactions without pretending a dated situation is still
current. The Claude-authored retrospective is indexed for audit but excluded from automatic
retrieval. It is not a medical authority. Links and unavailable attachments are not treated as
inspected source content. See the analysis for manual-review scope.

Questions about a recent real-world activity, such as what he ate last night, receive a brief
unknown answer when the archive cannot support a fact. The same applies to an all-time favorite
album or book that is not documented. Ordinary greetings and documented preferences still go through
the model. This avoids turning a known food preference into an invented meal—or missing music
evidence into a fabricated taste. These are deliberately narrow guards, not a promise that every
unknown fact can be detected.

## Interaction and storage

Enter sends on desktop; Shift+Enter adds a line. Mobile keyboards keep Enter as a newline; the arrow
sends. Ctrl/Cmd+K starts a fresh thread. Escape closes mobile history. Stop cancels a reply; retry
replaces an interrupted reply. Conversations and drafts survive refresh on the same browser profile.
Export produces Markdown. Each conversation has a Delete control in the history sidebar; deletion
asks for confirmation. There is no app-side message-character or conversation-length cap. The latest
message is always sent in full, while older turns may be omitted from the model context with a
visible notice. Providers still have finite context windows, and browser storage still has a
device-dependent quota.

The black-and-crimson opening animation plays once per tab session. Enter conversation or Escape
skips it immediately; the footer replay button shows it again. The conversation view uses a subtle
engraved welcome with dimensional architecture and a softly lit cursor eye that sharpens over
interactive controls without trailing dots. The native cursor remains visible. The
effect is omitted on touch devices. Reduced motion disables the automatic entrance, cursor motion,
and ambient movement; manual replay shows a static title. Gothic display typography is locally
bundled under the license in `public/assets/unifraktur-LICENSE.txt`. Chat text stays in readable
body type.

Messages are rendered as plain text to prevent HTML injection. The browser stores conversations
locally, up to its storage quota. If storage is corrupt it is left intact with a visible recovery
warning; if full, export remains available. Familiarity of tone persists across every new chat: a
new thread does not trigger an introduction or relationship reset. By default, up to three relevant,
exact exchanges from other saved chats on this device may also be sent as context, scoped to the
active persona and participant. Turn **Prior-chat memory** off in the sidebar (or in **About this
space**) to disable all cross-chat recall. Each saved chat also has a **Recall on/off** control:
switching it off keeps the conversation in local history but excludes it from future cross-chat
recall. Deleting a chat removes it from both local history and recall. The app does not sync between
devices or store a generated memory summary. Very long model context preserves the opening and
recent messages and displays an omission notice. The complete browser transcript remains exportable.

## Checks

```sh
deno task test
deno task check
```

Tests exercise source attribution, case-provenance validation, semantic selection and fallback,
fact/behavior separation, prior-chat recall, unsupported-fact boundaries, prompt ownership,
private-file isolation, request validation, rate limiting, provider errors and streaming
interruption. `tests/behavior-cases.json` supplies twelve held-out behavioral evaluation cases,
including novel situations. The criteria require human review against source evidence, not exact
wording or an automatic fidelity score.

`scripts/browser-check.js` uses Chromium DevTools on port 9222 and an isolated browser profile to
test the real UI. It clears only that test profile’s origin storage. Run it only against a
disposable browser profile, with the application running:

```sh
deno run --allow-net=127.0.0.1:9222 --allow-write=artifacts scripts/browser-check.js artifacts/overhaul
```

It captures desktop, mobile, conversation, reading-room and error screenshots in
`artifacts/overhaul/`. Streamed responses in browser tests are explicitly synthetic transport
fixtures; no live persona fidelity result is implied.

For an opt-in live voice review (six test conversations; **uses provider credits**):

```sh
deno run --allow-net=127.0.0.1 --allow-write=artifacts scripts/persona-check.js --live
```

Use `--only=greeting,food-canon` to select cases. Outputs are saved to
`artifacts/persona-review.json`; judge them against primary evidence, not just slang or length. The
extended review includes twelve held-out, source-backed cases and three fresh-thread relationship
cases. Each suite is opt-in, makes at most twelve requests without automatic retries, and saves
partial results if a request fails. `--output=NAME` gives an alternate artifact basename for
comparisons.

```sh
deno run --allow-read=tests/fidelity-cases.json --allow-net=127.0.0.1 --allow-write=artifacts scripts/persona-check.js --live --suite=fidelity
deno run --allow-read=tests/relationship-cases.json --allow-net=127.0.0.1 --allow-write=artifacts scripts/persona-check.js --live --suite=relationship
deno run --allow-read=tests/behavior-cases.json --allow-net=127.0.0.1 --allow-write=artifacts scripts/persona-check.js --live --suite=behavior
deno run --allow-read=tests/personas-cases.json --allow-net=127.0.0.1 --allow-write=artifacts scripts/persona-check.js --live --suite=personas
```

Outputs include the review criteria and separate transport success from personality judgment. The
behavioral suite includes advice, disagreement, venting, success, relationship uncertainty, unknown
preferences and situations not stated verbatim in the archive. `artifacts/fidelity-before.json` and
subsequent review artifacts preserve iterations, including failures; see `VERIFICATION.md` for what
was actually checked. Offline tests never make paid calls. This is source-backed prompting and
retrieval, not fine-tuning or a claim of identical personality. The current provider remains the
locally configured Grok 4.5 connection; this overhaul did not change it.

## Hosting and privacy

Default binding is loopback. Before binding a public interface, set `WHITEEYE_ACCESS_TOKEN` to a
random value of at least 24 characters and use HTTPS through a reverse proxy. The application
refuses an exposed binding without this guard. Users enter the access code in Connection; it stays
in tab memory until refresh. Keep the source material on private storage.

The configured provider receives conversation context, selected primary-source excerpts, and—when
enabled—relevant excerpts from other local chats. `store: false` is not a promise of zero provider
retention; verify the provider’s terms. This server writes no chat logs. Do not serve the repository
with a generic file server. The public asset allowlist is intentional.

The in-memory rate limiter is appropriate for a single private instance. Multi-instance deployment
would need shared quotas and proper per-user authentication. The app is not a claim that an AI is
identical to the source person. Fidelity depends on model capability, the available evidence, and
review against the supplied cases.

## Patrick Jane and Vesper

Patrick Jane is available in the persona selector. His detailed interpretation draws on 51 original
research notes from scenes in 47 transcript files, a production script and three creator/cast
interviews. The research searched a 150-file collection spanning all seven seasons. Replies expose
research references and use the label AI interpretation. Ask for a season or episode to set the
timeline. See [the research scope and limits](docs/patrick-jane-research.md).

Vesper combines WhiteEye, Griffith, IMP, Andrew Tate and Patrick Jane into one original voice. It
uses their existing characterizations and bounded source context, with its own conversation memory
and the label Original synthesis. See [the combination and source boundaries](docs/vesper.md).
