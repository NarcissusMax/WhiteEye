# Verification — 17 September 2026

## Passed

- 14 Deno tests: public-file allowlist, blocked private paths, origin/access enforcement, forged roles, message/body limits, missing model behavior, server-owned prompt and credentials, stream completion/interruption, provider errors, rate limits, corpus attribution, actual preference retrieval, context selection, behavioral configuration, every voice-scene anchor, missing-scene handling, labeled dialogue windows and latest-turn scene selection.
- 43 isolated Brave/Chromium assertions passed: landing, simulated unconfigured-provider failure, refresh persistence, connection dialog, synthetic streaming, loading, history, new conversation, deletion confirmation/cancellation/completion, reading room, mobile drawer, hidden drawer keyboard exclusion, no horizontal overflow at 320/390/768/1440px, composer visibility, long input, safe text rendering, cancellation, retry without duplicate user messages, 100-message history, long paragraph, draft persistence, short mobile viewport and direct navigation. Added opening/replay timing, skip focus, immediate skip, Escape, focus restoration, once-per-session behavior, locally loaded gothic font and reduced-motion entrance checks. Browser checks intercept model requests, so they cannot spend API credits.
- Lint and formatting checks.
- Visual inspection of desktop and mobile screenshots. Corrected initial scroll clipping and captured the settled opening animation.
- Complete-source inventory: five files, 8,644 WhiteEye message records. Retrieval regression caught and corrected short personal answers being underweighted against longer general passages.
- Six live conversations through the existing AICredits GPT-5 connection, after a first iteration revealed unwanted menus, lists and invented personal details. That run completed all six without provider errors or length-limit notices; measured request times approximately 3–28 seconds. See `artifacts/persona-review.json` for the actual outputs. Greetings, game banter, regret, seafood allergy, friendship advice and multi-turn exam disagreement were reviewed. A later audit still found that the model treated a chicken suggestion as his recurring cooking habit, which prompted the 17 September correction below.

## Persona review limits

The new output is more conversational, direct and source-grounded, but still sometimes smoother
than the uneven rhythm of the original DMs. Six examples are not proof of identical behavior,
complete coverage of the behavioral suite, or immunity from hallucination. The original human's
current thoughts and unrecorded experiences cannot be recovered from this archive. No fine-tuning
or provider-side model identity audit was performed. The configured model was not changed.

## Not yet verified

- Exact token usage, per-request billing, provider-side routing and long-run behavior. Local live tests verify successful replies, not the provider's internal accounting or model implementation.
- Exact behavioral equivalence to the original person. `tests/persona-cases.json` is a review suite to run against the configured model; prompt/plumbing tests cannot prove it.
- Native Safari/iOS behavior or a physical mobile keyboard. Responsive checks used Chromium emulation, including small viewport heights.
- Multi-user or multi-instance production load. This is a private single-instance application with an exposed-host access guard, not a hosted account service.

Screenshots in `artifacts/`: `entrance.png`, `desktop.png`, `mobile.png`, `conversation.png`, `perspective.png`, `connection-error.png`. The conversation screenshot uses an explicit test transport, not a live model result. User conversations and credentials were not cleared or modified; browser checks used an isolated temporary profile.

## 17 September: expanded fidelity pass

- All five source files remain indexed. New source review covered distributed dialogue windows and targeted close reading; it did not manually read every one of the 26,454 DM records. The model now receives 27 manually paired, speaker-checked examples containing 162 exact turn selectors. Four excerpts are explicitly anchored and labeled.
- The user selected WhiteEye's familiar DM tone for every new chat. The server applies that default independently of thread history. Offline checks verify that new threads get the same tone instructions and cannot inject a different relationship state through request fields.
- Retrieval now favors direct topical evidence. In corpus-backed regressions, the casual *I, Robot* prompt finds his actual old-account favorite film message at line 12928; a broad gaming remark returns no unrelated childhood, exercise or spending anecdote. A friendship texting question retrieves the relevant looksmax account line 27986. Explicit topic switches drop the previous topic; dependent follow-ups keep bounded prior context.
- 43 Deno tests pass, including transport/error cases, source attribution, title retrieval, recent-fact boundary, relationship defaults and message routing. Lint and formatting pass. The 43 isolated Brave checks still pass; they use mock model replies and do not charge the provider. The only browser-facing copy change is the privacy dialog explaining that tone persists while cross-thread memory does not.
- Two twelve-case held-out live passes (`artifacts/fidelity-after.json`, `artifacts/fidelity-final.json`) completed through the configured provider. They are actual outputs, not a claimed fidelity score. The later pass improved source alignment on Cena/Randy, friendship evidence, topic changes and concise responses, but still sometimes produced polished coach language, unsolicited plans, and an invented first-person dinner routine. A seemingly stray Luffy aside in the topic-change response was actually grounded in WhiteEye's next Instagram message at line 9689; it is an example of his associative conversation, not a hallucinated new favorite.
- The final source boundary stops the dinner invention: `artifacts/fidelity-post-boundary.json` shows a direct “Idk” without a model call. The same partial pass shows a shorter gaming reply and a shorter film reaction. Its fourth case failed because the provider could not be reached; the artifact retains that error rather than counting it as a personality failure. `artifacts/topic-change-retry.json` records the separate one-case retry.
- Three fresh-thread live cases in `artifacts/relationship-final.json` answered “Sup,” continued familiar game banter, and honestly said it could not see another chat. No case introduced WhiteEye to the user or claimed a shared event that was absent from the request.

The remaining limitation at that stage was behavioral, not transport alone: a general model could still sound smoother and more helpful than the original DMs, and infer unsupported small preferences. The next source-first revision below supersedes the prior runtime architecture. The app remains an interpretation, not proof of identical thoughts or exact future replies.

## 17 September: source-first persona-engine overhaul

- Re-audited the five-file source inventory and the previous runtime before coding. The firsthand narrative was read in full, and the three DM exports were scanned across their timelines with distributed and targeted close reading. This is not a claim that every one of the 26,454 messages was individually interpreted. The AI-authored retrospective remains excluded from runtime evidence.
- Identified the main prior failure: lexical lookup plus three unconditional baseline scenes, a full canon dump and long general trait instructions allowed the model to choose generic assistant moves before relevant behavioral evidence mattered. The new engine keeps 20 exact-quote-validated decision cases, bounded semantic analogy selection, relevant paired historical exchanges, topical factual lookup and prior-app memory in separate lanes. See [BEHAVIORAL_MODEL.md](src/persona/BEHAVIORAL_MODEL.md) for source-specific decision paths and contradictions.
- A fresh chat retains the familiar DM default. Optional local cross-chat recall uses up to three exact snippets from undeleted conversations; the privacy dialog lets the user disable it. It does not claim the original person shared those exchanges. There is no cross-device sync or provider-side fine-tuning.
- `deno task check` passes. `deno task test` passes **52 tests**, including provenance failure, semantic routing, memory bounds, factual boundaries and server prompt composition. The isolated Brave run passes **45 browser assertions**, including 320/390/768/1440px layouts, long history, refresh, loading, errors, cancellation, opening motion and memory-toggle persistence. Screenshots are in `artifacts/overhaul/`; browser model replies are synthetic fixtures.
- Twelve source-backed, held-out live cases completed with the configured AICredits `x-ai/grok-4.5` provider (`artifacts/behavior-first-live.json` and `behavior-second-live.json`). Two problem cases were retested in `behavior-post-fixes.json`: the planner reply stopped adding an arbitrary ten-minute technique, and an undocumented favorite album now receives “Idk” without a paid provider request. Transport completion is recorded separately from manual personality review; these artifacts are not a numerical fidelity score.
- The actual held-out outputs preserve important distinctions: first worry versus repeated reassurance, listening versus fixing, earned pride, conceding an experience gap, challenging a reductive human ranking, and retaining self-love alongside self-criticism. Some outputs still contain polished aphorisms or a generic advice list in an unseen roommate scenario. The editorial “scoreboard” label was removed from the friendship case after it visibly leaked into a response; `artifacts/friendship-post-label.json` confirms the label no longer appeared, though the reply remains smoother than some original DMs.

Exact future behavior cannot be recovered from a finite archive. The semantic selector can choose an imperfect analogy, the provider can still revert to fluent assistant prose, and each nontrivial chat turn now normally costs an additional small model call. The local fact guards cover known failure modes, not every possible unsupported personal detail. Source fidelity and actual voice remain matters for ongoing, side-by-side human review rather than a claim of impersonation certainty.

## 17 September: message-length fix

- Removed the textarea's 12,000-character `maxlength`, the matching server per-message cap, the 1,200-message and 480,000-character conversation caps, the 600,000-byte request cap, and the browser's 470,000-character send check. The length counter now shows a count, not a false maximum.
- Long histories still use a bounded model context, but the newest message is never discarded, even if it alone exceeds that history budget. If the provider itself cannot fit it, the app reports the provider context limit rather than calling the conversation invalid. The full text stays in local history subject to the browser's storage quota.
- `deno task check` and **53 tests** pass. A no-credit local route accepted 13,000- and 620,000-character user messages with HTTP 200. **47 isolated browser checks** pass, including a simulated paste beyond the previous limit. These checks do not establish that the configured model provider will accept arbitrarily long input; model context windows are finite.

## 17 September: immersive interface and history controls

- Reworked the conversation view with a code-native rose-window seal, restrained architectural motion, pointer-reactive ambient light, refined typography, message/composer treatments and responsive history drawer. Reduced-motion users receive a still interface. The persona engine and model connection were not changed.
- Added a visible global prior-chat memory switch in the sidebar, synchronized with the existing About control. Each saved conversation has its own Recall on/off switch and a confirmed Delete action. A chat excluded from recall remains locally readable; a deleted chat is removed from local history and future recall.
- `deno task check` and **53 Deno tests** pass, including cross-chat memory exclusion. **52 isolated Brave assertions** pass across 320/390/768/1440px, mobile drawer hit-testing, memory-control persistence, deletion, long messages, history, loading and error states, and reduced motion. Browser replies were synthetic and did not use provider credits. Screenshots are in `artifacts/immersive-ui/`.
- Browser verification used an isolated test profile. Native Safari/iOS and physical mobile-keyboard behavior remain unverified.

## 18 September: long-prompt unknown-answer fix

- Reproduced an unconditional “Idk” from the server when a long request merely contained an earlier phrase such as “what did you eat yesterday?” or “your favorite album.” The user's concrete example exposed the same cross-paragraph failure: “right now” and “are you” appeared in different parts of an account of an argument, while the actual question was whether to text someone. The deterministic unknown-fact boundary now applies only to short, clear standalone fact questions, not a long message or a separate request following one. Direct unsupported biographical questions still avoid fabricated answers.
- The behavioral-routing call now preserves both the beginning and end of a long latest message, so a concluding request is not lost to its previous first-2,500-character slice. The actual generation call continues to receive the full latest message.
- `deno task check` and **55 offline Deno tests** pass, including two long-prompt integration regressions and a final-question routing regression. These mocked checks use no provider credits; they do not guarantee that every provider response will be useful.

## 19 September: cursor illumination

- Added a fine-pointer-only burgundy light with a pooled, 620 ms afterglow and a restrained diamond response over interactive elements. It does not replace the native cursor or intercept pointer input. Touch/coarse-pointer and reduced-motion environments omit the effect.
- `deno task check` and **55 offline Deno tests** pass. **56 isolated Brave assertions** pass, including cursor installation, afterglow, interactive response, reduced-motion removal, desktop/mobile overflow, conversation history and error/loading states. Browser model responses were mocked and did not use provider credits. A visual capture is at `artifacts/cursor-review/cursor-light.png`.

## Andrew Tate persona — 2 October 2026

The new index inventories all 74 supplied files, preserves 68 unique extracted documents and six
duplicate aliases, and tags non-Andrew sources, mixed transcripts, edited book material and the
empty transcript. Source answers copy verified original line spans; independent speaker review and
targeted correction use the selected provider. Generated continuations are visibly labeled.

Deno lint/format and 82 offline tests pass, including source provenance, cross-document coverage,
exact text/range verification, correction reference integrity and server transport. Isolated
Playwright CLI checks at 1440px, 390px and 320px passed persona switching, separate request history,
source disclosure with the keyboard, saved persona and citations after refresh, generated-reply
labels, composer visibility and horizontal overflow checks. Browser chats used synthetic responses
and no paid provider.

Early live fidelity samples exposed a 90-second timeout, copied boundary errors, invalid source line
numbers and interview-host speech in broad ranges. These led to numbered line selections, a
four-minute source timeout and a separate speaker/correction pass. Exact substring checks are
structural evidence of original wording, not proof of source speaker, relevance or complete
personality replication. Artifacts remain in the local app under `artifacts/tate-live-*.json`.
Hosted artifact validation uses a stubbed provider and checks the packaged corpus, persona routing
and private-file restrictions.

The final configured-Hermes fidelity sample completed in 40.8 seconds and returned 23 selected ranges from 18 distinct files after reviewing evidence from all 28 matching documents. Every returned character matched the indexed source spans. The previously identified host football anecdote was removed. This is one inspected example, not a general speaker-attribution or coverage guarantee.


## Ayanokoji Kiyotaka — 2026-10-02

- Indexed all 20 supplied COTE PDFs: 4,300 physical pages and 1,676 overlapping windows.
  Year 2 10.25 requires 300 dpi OCR; recognized words are labeled accordingly.
- Source-only index, offsets, multi-volume retrieval, missing-index failure, narration labels,
  page references, mandatory speaker review, malformed-response rejection and saved persona
  are covered by eight new offline tests. All 90 tests and lint/format checks pass.
- Named Playwright session cote-qa passed desktop 1440 px and mobile 390/320 px checks with
  mocked chat: selector, persona transport, composer/speaker labels, keyboard citation details,
  refresh persistence, continuation disclosure and isolation from WhiteEye. No browser errors;
  the existing AudioContext autoplay warning remains. Screenshots are in artifacts/cote-*.png.
- Bundled worker checks pass for both Tate and COTE exact source transport; private corpus URLs
  return 404. Source attribution in those transport tests is mocked, not a model fidelity score.
- One live Hermes 4 405B source check for “Are people equal or not?” returned the original
  Volume 1 lines 48–64 and 80–83 as inner narration, including the qualification that inequality
  is not acceptable. It used one source file, appropriate to that exact opening question.
- Broader equality and new-situation checks were rejected by the provider for insufficient
  balance (HTTP 402). No automatic retries or model substitution were added. The UI now
  identifies credit exhaustion correctly. Broader live characterization remains unverified.
- Speaker review is probabilistic. The app cannot guarantee perfect replication, exhaustive
  coverage of a bounded prompt, or an error-free transcription of scanned pages.

## October 3, 2026 — Recall, atmosphere, soundtrack and library ordering

- `deno task check` passed. `deno task test`: 108 passed, zero failed.
- Recall regression covers three long exchanges, the combined 5,200-character budget,
  legacy/invalid timestamps and a fresh chat reaching the actual request handler and streamed
  fixture provider. No saved message is edited by recall selection.
- Isolated Playwright browser checks exercised recall through the actual request handler with
  an offline provider, keyboard and pointer ordering, folder drops, persistence across chat
  switches/reload, the position dialog at 390px and 320px, and system/user motion controls.
- The real locally vendored Three.js scene rendered in Chromium; WebGL fallback, hidden-tab
  suspension, reduced motion and bounded pixel density are implemented.
- Blind Spots and lit(var) use their official YouTube recordings. The embedded provider reports
  these recordings playable for the production Site origin; it refuses the local test origin.
  Provider availability and audible autoplay remain external/browser-dependent. No audio is
  copied into the project, and no paid model calls were made for browser smoke tests.
- Vesper's prompt now gives the five other personas primary influence, WhiteEye close secondary
  influence and Griffith the least. This is prompt guidance, not a live fidelity evaluation.

## October 3, 2026 — Direct audio and cursor refinement

- Removed the pointer's trailing dots and increased the engraved eye from 34 × 24 to 42 × 30
  pixels. The time-based follow motion, touch exclusion and reduced-motion behavior remain.
- Removed YouTube playback, embeds and provider network permissions. The two recording
  options now use native audio with files selected by the visitor, saved in device-local
  IndexedDB. Blind Spots remains the default choice. No recordings have been downloaded or
  bundled; shared playback requires supplied recordings or authorized download sources.
- `deno task check` passed and all 108 offline Deno tests passed. Isolated Chromium checks used
  an original test tone to verify real Blob-backed audio playback, volume, looping, switching,
  stop, refresh persistence, invalid-file feedback, decode-error recovery and Escape focus.
  The test tone is not either requested recording and is not included in the deployed assets.
- The enlarged cursor and absence of dots were checked in the browser. Reduced motion removes
  the effect and restoring motion restores it. At 390px and 320px the audio-file control stays
  visible without horizontal page overflow. No YouTube requests, iframes or page errors were
  observed; no paid chat requests were made. Desktop and mobile captures are in the local app's
  `artifacts/direct-audio-*.png`. Safari/iOS and audible autoplay on other browsers remain
  unverified.

## October 4, 2026 — Blended engraving and interface

- Replaced the independent metallic rose with a Three.js relief of the original cathedral
  engraving. The canvas and fallback illustration share their crop and edge fades. Header,
  sidebar, footer, menus and composer now share restrained surface and border treatments.
- Three.js loads on welcome interaction, then settles without continuous redraws. Removed the
  full-screen noise filter and dust. Frame rate and pixel density are bounded; hidden views,
  motion preferences and WebGL failure retain a readable still interface.
- `deno task check` passed and all 108 offline Deno tests passed. An isolated Chromium suite
  passed 35 assertions covering real shader rendering and pointer response, pause, reduced
  motion, context loss/restoration, conversation controls, native music controls, keyboard
  focus, all eight persona headings and layouts at 1440/1024/768/390/320 pixels.
- Separate touch and idle-render checks passed: no cursor or overflow on a touch device,
  capped canvas resolution, visible fallback without WebGL, no initial Three.js load, no
  redraws after settling and restart on pointer movement. Chats used mocked responses and
  no paid provider requests; existing user histories were not modified.
- Final desktop Lighthouse audit: performance 70, accessibility 100, first contentful paint
  2.3 seconds, largest contentful paint 3.0 seconds, total blocking time 10 milliseconds and
  layout shift 0.005. No accessibility findings remained. This local headless Chromium run
  used software WebGL; it is not a physical-device performance guarantee. Safari/iOS remain
  unverified. Screenshots, browser scripts and the audit report are in the local app's
  `artifacts/engraving-*` files.
