# WhiteEye — dimensional chamber

> Historical version 29/30 design. The current flat presentation is specified in [flat-folio.md](flat-folio.md) and `public/styles/quiet.css`.

October 10, 2026. Enhancement of the restored WhiteEye interface, following the request for an
expressive, decorative 3D experience. The earlier Portal variant remains a separate restore point.
This document supersedes earlier restraint rules for decorative motion and surface depth.

## Design and assets

The primary reference is 12ui candidate C in `/home/narmexis/Projects/WhiteEye/design/kits/whiteeye-depth-design-kit`.
All conversion stages finished. The unchanged original LayerDoc is
`target/winner.layerdoc.json`, conversion `1fdd32f2-a236-49fe-a023-3a6bb552daba`.
The kit and original PNGs remain outside the source repository. Superdesign version 3 supplied a
secondary direction; its screenshot-as-art treatment was not used in the product.

The implementation uses extracted artwork as separate, compressed WebP assets. It never displays
the candidate screenshot as a UI. Four plates provide the cathedral scene, carved sidebar,
welcome panel, and composer. The latter frame also connects the toolbar and lesson controls to the
same material system. The scene keeps its original luminance and relief. Following the later request to reduce the
fiery theme, the display treatment softens its saturation and adds a light cool tint; carved
textures blend in luminosity mode against cool stone. Readability comes from separate panel
surfaces, and no text is filtered. The course retains its original engraved illustrations.
The crest, wordmark, menu, delete emblem and replay flourish are real extracted cutouts.

Deliberate departures from generated specs preserve the existing product:

- Keep WhiteEye in the masthead/footer; omit the generated Portal wordmarks (cutouts 10 and 78).
- Keep the existing eye SVG for the small brand and conversation symbols, rather than cutouts 9/47.
- Keep native selects, labeled buttons, real folder controls, actual models, and all seven personas.
  Proposed icon duplicates, static text and screenshot positions do not replace these controls.
- Keep the existing local type families; do not load Libre Baskerville or its generated token patch.
  The initial token patch contained no deltas. The closeout font substitutions were reviewed and
  declined to retain the existing typography.
- The extracted toolbar clean plate 3 contains the architecture underneath the toolbar, not its
  frame. Reuse the extracted composer frame for that surface; no new CSS imitation of its artwork.
- Use responsive document flow and scrolling for long content, rather than fixed screenshot bounds.
  Long persona names and mobile content retain room to grow.
- The actual WhiteEye heading remains accessible, selectable text. Its raster treatment activates
  only after that image loads; native blackletter is the fallback.

## Spatial behavior

`depth.css` extends the existing stylesheet stack. `depth-motion.js` owns chrome animations and
pointer-driven rotations; it uses the independent CSS `rotate` property so course presses and
entrances retain ownership of `transform`. Bounds are measured on entry, not each pointer frame.

`engraving-scene.js` is a reusable same-origin Three.js relief scene. Recessed windows, raised stone,
camera movement, local lighting, etched-water motion and small motes occupy different depths.
The course overview mounts the original sea engraving in a similar relief. Renderers are disposed
when leaving an overview. Failed shaders, textures or WebGL leave the image fallback visible.
The scene renders at capped pixel density and 20–30 fps during activity, then settles and stops.
Hidden or offscreen scenes stop; reduced motion and the existing saved Motion control govern it.

Course navigation uses interruptible, directional 660 ms perspective turns for Next, Previous and
direct selection, with a Web Animations fallback. Cards, controls, menus, dialogs, disclosures,
completion feedback, diagrams and initial surfaces share the same material and motion vocabulary.
Source quotations are never split into animated words or modified by decorative code.

Both knowledge maps project their actual module/lesson graph through a 3D camera model. Drag orbits;
Shift-drag pans; wheel/pinch zooms. Orbit/Pan and 3D/2D controls expose alternatives. Keyboard arrows
pan, Shift-arrows orbit, +/- zoom, Home fits. The lesson directory remains the accessible selection
path. Projected positions also drive hit testing and selection framing; nodes render in depth order.
These graphs retain the original connections, filters, comparisons and lesson URLs.

## Verification and closeout

- Course validator: 575 lessons, 16 modules, 1,568 exact quotations, ten random source checks,
  valid links, sequence, progress and journals. No quotation mismatch.
- Integrated validator: 550 lessons, 40 modules, 590 map nodes and 1,028 valid links; separate
  progress and journals passed.
- Browser pass: 49 checks covering all seven persona options, mocked model/chat requests, saved
  conversations, folders, dialogs/focus return, perspective view, both courses, Next/Previous/direct
  navigation, saved completion, 3D orbit and keyboard controls, search, mobile drawers, responsive
  layouts at 360/390/768/1440, WebGL rendering, motion toggle persistence and reduced motion.
  No browser runtime errors or failed page assets. Model calls were mocked; no paid reply was made.
- Local screenshot review includes the overview, reader, map, conversation and small-screen variants.
  The final extra checks cover viewport bounds, visible lesson controls and WebGL context loss.
- Required 12ui alignment ran against the unchanged original target in
  `/home/narmexis/Projects/WhiteEye/design/kits/whiteeye-depth-closeout`. It purchased nothing. Its DOM anchor overlap was 57.9%
  (target overlap 72.1%), below the 60% threshold. This is not a pixel-fidelity pass. We reviewed the
  actual screenshots and matched changes, adjusted the welcome spacing and mobile prompt density,
  and preserved product controls and the exceptions above rather than applying unsafe replacements.

Local browser evidence is under ignored `artifacts/depth/`. The final Sites build and validator
run through the source workflow before packaging. The image-loading fix from version 28, including
lazy private-corpus parsing, remains intact.

## Restore points

- Before this enhancement: `whiteeye-design-before-3d-2026-10-10`, commit
  `c0f900385b7bce139b640cad5c3875a6f89e379e`, live version 28.
- Backup bundle: `/home/narmexis/Projects/WhiteEye/archive/source-backups/whiteeye-before-3d-2026-10-10.bundle`.
- Original earlier design: `whiteeye-design-before-portal-2026-10-09`.
- Separate Portal variant: `portal-design-before-image-fix-2026-10-09`.

Restore presentation files selectively; keep the version-28 worker initialization fix, course
content and data storage. Redeploy a saved version only if a complete historical rollback is wanted.

## Design tool spend ledger

Copied from the 12ui kit; values are ceilings, not a claim about the settled charge.

| purchase | stage | invocation | price ceiling |
| --- | --- | --- | --- |
| `crt-d55dabd8a2ce01ff3766b3ab5720c53f1afa92ad` | draft | `improve` pid 108701, started 2026-10-09T20:41:11.225Z | $0.12 (stage ceiling) |
| `1fdd32f2-a236-49fe-a023-3a6bb552daba` | convert | `improve` pid 108912, started 2026-10-09T20:44:09.954Z | $0.55 (stage ceiling, shared by 2 purchases) |
| `687b584a-b0c2-4180-bc69-c48aaec99efb` | convert | `improve` pid 108912, started 2026-10-09T20:44:09.954Z | $0.55 (stage ceiling, shared by 2 purchases) |

3 purchases across 2 runs. Distinct stage ceilings total $0.67. Superdesign separately reported
33 credits for version 3. No additional generation was purchased for closeout.

## October 10 palette refinement

The user found the repeated fiery treatment excessive. The original 12ui geometry and extracted
assets remain the material source; this newer instruction explicitly replaces their copper/orange
palette with charcoal, pewter, ivory and muted wine. It does not restore the earlier Portal design.

- Cathedral and opening: static saturation reduction, with a faint cool color treatment on the
  chamber. Its WebGL canvas and still fallback receive the same treatment. Original assets are
  unchanged; no replacement raster generation was purchased.
- Carved surfaces: luminosity blending removes copper pigments while keeping edge relief and grain.
  This affects background textures only, preserving text and control colors.
- Borders, sheen, dialogs, composer and course chrome use neutral stone/metal colors. Filled primary
  actions and current lesson indicators retain subdued wine.
- The relief shader uses cool moonlight and silver motes. Knowledge map phases retain four distinct
  muted colors, with blue replacing its gold phase and connection tint.
- 3D geometry, pointer response, page turns, reduced motion handling, content, APIs and saved data
  retain their previous behavior. The version-28 asset-loading fix remains in place.

Verification for this refinement: home viewport bounds at 360/390/768/1440/1920 px; visible lesson
controls; WebGL context loss retaining its loaded image; both course overviews and lesson readers,
and Course I map at 390/1440 px; forward/backward lesson transitions at both widths; muted opening
art. These checks passed without browser runtime errors. Screenshots were reviewed for desktop,
mobile, overview, lesson and map surfaces.

The older approved 12ui target still supplies composition and asset evidence. Its warm colors are
not authoritative after this user correction. Target alignment may not undo the requested cool
palette, change the working controls, or replace the existing typography.

Refinement closeout: `/home/narmexis/Projects/WhiteEye/design/kits/whiteeye-cool-closeout` reused the unchanged original LayerDoc
and purchased nothing. Its emitted plan has 58.7% DOM anchor overlap (60% threshold) and 74.4%
target coverage; this is not a pixel-fidelity pass. The kit, token patch and matched changes were
reviewed. Existing extracted plates/cutouts remain in use. Font substitutions, duplicate static
controls, generated Portal labels and warm palette restoration were declined under the product
exceptions above and the user's latest color correction. No geometry change was needed for this
focused material refinement.
