# Flat gothic folio — October 10, 2026

This is the version 31 design record. Its appearance remains available as **Parchment** in the
header theme control. The default is now Blood gothic; see [the dual-theme record](blood-gothic.md).

## Request and result

The user rejected the fiery dimensional design and the subsequent cooler recoloring, then asked
for less 3D and fewer colors. This implementation replaces the raised surfaces and moving relief
with a flat parchment-and-ink interface. One wine accent identifies important actions and the
current selection. It applies to conversation, perspective, both course overviews, lesson readers,
menus, dialogs and knowledge maps.

The content, seven personas, course datasets, quotations, storage and backend behavior remain
unchanged. Lesson navigation still moves in the correct direction through a short 2D slide/fade.
Both knowledge maps start in 2D; their existing optional 3D control is preserved.

## Design reference and evidence

12ui generated two directions against the working conversation interface at 1440 × 960. Candidate
B was selected: flat paper, ink blackletter, fine rules, a static cathedral and a muted wine action.
The converted reference is stored locally at:

- `/home/narmexis/Projects/WhiteEye/design/kits/whiteeye-flat-design-kit/winner.png`
- `/home/narmexis/Projects/WhiteEye/design/kits/whiteeye-flat-design-kit/target/winner.layerdoc.json`
- `/home/narmexis/Projects/WhiteEye/design/kits/whiteeye-flat-design-kit/target/winner.html`
- `/home/narmexis/Projects/WhiteEye/design/kits/whiteeye-flat-design-kit/target/winner.layerdoc.json.assets/`

Original LayerDoc SHA-256:
`553286a3b701e85cd5be3874d0b9d7703cbc312c6853213e8f56ca6fdd712574`.
It was not modified for comparison. No new Superdesign canvas version was created; the older
version 3 canvas remains a historical reference. The implementation reference in
`.superdesign/resume.json` now points to this 12ui kit.

### Purchase record

Prices below are returned stage ceilings, not claims about settled charges.

| Purchase ID | Stage | Invocation | Returned price ceiling |
| --- | --- | --- | --- |
| `crt-8f943ae667c420fdd1b9a64355e27f97a3fb907f` | Draft | `improve`, PID 24405, 2026-10-10T09:17:23.563Z | $0.06 for the stage |
| `4765c5e4-b729-4c35-90f5-1377acf6e15a` | Convert | `improve`, PID 24663, 2026-10-10T09:19:23.831Z | $0.55 shared conversion-stage ceiling |
| `da220903-08b2-4864-bb7c-ee6e43936dca` | Convert | Same conversion invocation | Same $0.55 stage ceiling |

Three purchases across two invocations; distinct stage ceilings total $0.61. The final comparison
made no purchase.

## Implementation

- `public/styles/quiet.css` is the canonical final stylesheet on all three entrypoints.
- `public/js/interface-motion.js` provides finite feedback and load-gated raster wordmarks.
- `depth.css` and `depth-motion.js` are removed from the source state; previous versions preserve
  them. The homepage no longer loads the relief controller or mounts a 3D scene.
- Heading, body, menu and dialog colors are remapped to readable ink on paper. Existing font files
  are retained rather than introducing a new font family solely to reproduce the reference.
- Course motion is shortened to 300ms and uses 2D translation/opacity. Progress and interactive
  controls continue to work. Continuous artwork and map-invitation motion is disabled.
- The global paused/reduced-motion rules disable CSS animations and transitions, while controllers
  settle their running animations.
- Knowledge-map phase colors are replaced with neutral nodes and edges. Selection alone receives
  the wine accent. Maps keep all real connections and lessons.

### Extracted assets shipped

Eight actual extracted raster assets were converted to WebP with Pillow (quality 88, method 6),
without creative alteration. Total size is 346,318 bytes.

| Asset in `public/assets/quiet/` | Role |
| --- | --- |
| `clean-0-d699c5e4a767.webp` | Cathedral in the welcome artwork region |
| `cutout-1-e93ffb7f1b2b.webp` | Cathedral cutout in the opening folio |
| `cutout-68-c7a9aa07b014.webp` | Wine eye crest above the welcome title |
| `cutout-69-a3f4bd44461c.webp` | Large ink welcome wordmark |
| `cutout-6-13ca93fff4d3.webp` | Eye and wordmark in the masthead |
| `cutout-87-5c1703a161a0.webp` | Footer wordmark |
| `cutout-51-ff68c0d2bc83.webp` | Small eye beside the conversation label |
| `cutout-95-eb28abf2db15.webp` | Opening replay glyph |

The clean plate contains the complete cathedral and fine interface divider remnants around its
edges. It is cropped within the illustration's declared region, excluding those interface edges;
real DOM controls and text remain the interface. The separately extracted cathedral cutout is used
in the opening, where its silhouette is appropriate. It is not stacked over the welcome engraving.
Mobile hides the welcome artwork for usable prompts and composition. Native controls, real model
and persona names, actual lesson totals and existing font behavior are intentionally retained.
Accessible text remains underneath load-gated decorative wordmarks and is visible on image failure.

## Comparison and limits

The required `12ui improve` closeout used the unchanged original LayerDoc with the implemented
page. Reports are in `/home/narmexis/Projects/WhiteEye/design/kits/whiteeye-flat-closeout/`. The comparison measured **58.0% DOM
and 60.4% target overlap**, below the 60% DOM gate, and emitted a low-overlap plan. This is **not a
pixel-fidelity pass**. The README, token patch and implementation plans were read. The implementation
keeps working controls, the site's fonts and responsive behavior rather than replacing them with
static mockup fragments. No additional paid conversion was purchased to chase that threshold.

## Verification

The local browser regression passed all **49 checks**, including:

- All seven personas and existing conversation/folder storage.
- Selected persona/model sent in a mocked chat request, reply rendering and reload persistence.
- Dialog focus, history collapse persistence and mobile drawers.
- Next and Previous directional transitions, direct lesson selection and saved completion.
- Both knowledge maps, Course II's 550 lessons, search, selection, optional 3D and keyboard controls.
- Conversation and lessons without overflow at 360, 390 and 768px.
- Loaded static art, no relief/tilt/sheen mounts, motion preference and system reduced motion.
- No browser runtime errors or failed requested page assets.

Final screenshots were reviewed for conversation, course overview, lesson, perspective and map.
A further visual check passed at 1440px, 390px and 1920px; music/dialog surfaces were reviewed, and native wordmarks remained visible when all new raster assets were blocked.
Reports/screenshots are local ignored artifacts under `artifacts/quiet/`. Chat responses are mocked:
these checks do not purchase model inference or establish model-response quality. No course data
or quote text was edited, so source integrity remains unchanged by this presentation update.

Packaging runs the standard local build and deployment validator before committing the artifact. Sites publication
uses the workflow helper's pushed source commit and matching artifact.

## Restore

The rejected dimensional design remains in Sites version 30 at commit
`4ca72b28809092f3a23c3ef38fa5d6777049210f`. Earlier designs remain in Sites history and the existing
Git tags/bundle. Restore presentation files selectively; preserve the lazy-corpus startup fix,
current course/persona data and user storage.
