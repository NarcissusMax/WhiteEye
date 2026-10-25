# Blood gothic and parchment — October 10, 2026

Historical version 32 record. The current satin enhancement is documented in
[satin-gothic.md](satin-gothic.md); course artwork now retains its original color.

## Delivered feature

Blood gothic is the default theme on the conversation page, perspective view, both courses,
lesson readers, knowledge maps and existing menus/dialogs. Near-black ground, ivory type and one
blood-red action family retain the flat gothic folio. The liked light design remains available as
**Parchment** through the moon/sun button in every main header.

The preference persists in `whiteeye:theme:v1` across pages and visits, and synchronizes open tabs.
A same-origin classic script applies it before styles paint, within the existing CSP. Missing,
invalid or unavailable storage defaults to blood; the button still works when storage is blocked.
Native pressed state, accessible label, browser theme-color and decorative assets change together.
Canvas knowledge maps read the palette once per theme change, keeping current selection/camera.

The opening is now a finite title sequence: original eye tracing, actual wordmark reveal, short
red rule, caption and engraving reveal, then a 350ms dissolve. It runs once per session and lasts
about 3.55 seconds. Entry is immediately available; Escape closes instantly. The footer replay
button works in both themes. Reduced motion skips automatic playback; explicit replay offers a
still opening. Motion/visibility changes interrupt an active opening. Automatic completion focuses
the main region without opening a mobile keyboard; manual entry restores replay focus.

## References

Two real alternatives were inspected for each surface. Main candidate **B** and opening candidate
**A** were selected. Their responsive conversions settled successfully. The original reference
LayerDocs were kept unchanged for closeout:

| Surface | Local kit | Original LayerDoc SHA-256 |
| --- | --- | --- |
| Main interface, B | `/home/narmexis/Projects/WhiteEye/design/kits/whiteeye-blood-design-kit` | `eb839c60748aef867b88369cf7138577532f56873fc5fb104dae18506bd89a1a` |
| Opening, A | `/home/narmexis/Projects/WhiteEye/design/kits/whiteeye-blood-opening-kit` | `48634b0c0ca7d0c053a7a547e5a8b0e09f353942bb7da355d78a623a81e6c31b` |

Each kit retains `winner.png`, `target/winner.layerdoc.json`, `target/winner.html` and extracted
assets. The existing Superdesign version 3 canvas is historical; no new canvas version is claimed.
`.superdesign/resume.json` records the current references and retains earlier ones.

### Purchase record

These are returned stage ceilings, not settled charges. The exact kit ledgers are reproduced:

| purchase | stage | invocation | price ceiling |
| --- | --- | --- | --- |
| `crt-e9a2f4d67c9c954ee93d81f10bd3d64288e406fd` | draft | `improve` pid 27829, started 2026-10-10T09:44:39.372Z | $0.06 (stage ceiling) |
| `4c5c9f15-bbc6-486c-826e-64a9e031344e` | convert | `improve` pid 28244, started 2026-10-10T09:46:43.548Z | $0.55 (stage ceiling, shared by 2 purchases) |
| `c08b5847-1da5-484d-a7bb-0d6e5643ab32` | convert | `improve` pid 28244, started 2026-10-10T09:46:43.548Z | $0.55 (stage ceiling, shared by 2 purchases) |
| `crt-c9b0e02242db83435d89cd39d8e796bf12aaf02f` | draft | `improve` pid 28329, started 2026-10-10T09:47:44.799Z | $0.06 (stage ceiling) |
| `b89f6a38-5f78-4978-a625-7a9770e0d5ec` | convert | `improve` pid 28439, started 2026-10-10T09:50:29.520Z | $0.55 (stage ceiling, shared by 2 purchases) |
| `fc845855-71fe-48aa-bfb4-1ec3ba086758` | convert | `improve` pid 28439, started 2026-10-10T09:50:29.520Z | $0.55 (stage ceiling, shared by 2 purchases) |

Six purchases across four invocations. Distinct stage ceilings total $1.22. The target-based
closeouts reused the original LayerDocs and purchased nothing. No additional conversion was
bought to chase a coverage threshold.

## Implementation and adaptations

- `public/js/theme.js`: early preference bootstrap, native button, tab synchronization and image swap.
- `public/styles/quiet.css`: shared flat layout and original parchment defaults, with semantic
  aliases replacing fixed light-only colors. `public/styles/themes.css`: blood palette and controls.
- `public/styles/opening.css` and `public/js/entrance.js`: finite, interruptible native-dialog opening.
- `public/js/interface-motion.js`: theme-specific load-gated raster wordmarks, cached loads and
  generation guards. Real accessible text remains readable when images fail.
- `public/js/course-graph.js`: theme-aware canvas colors and listener cleanup; maps still start in 2D.

Existing local fonts are retained instead of introducing the proposed Libre Baskerville. Existing
native selects/dialogs, real copy, library disclosure, functional icons and dynamic status labels
are retained; the reference's flat image fragments do not replace their behavior. The theme button
names the actual mode and uses one click, rather than adding an unnecessary dropdown. Existing
border rules supply the reference dividers; extra duplicated divider elements were not inserted.
The reference's pale text and action colors are normalized into the site's semantic tokens for
readable links and consistent buttons. No old 3D surfaces, relief renderer or fiery glow returns.

The two extracted clean plates contain the foreground cathedral despite their labels. Their left
texture-only regions are cropped as backgrounds, at full strength, with luminosity blending to
keep the ground neutral; each actual cathedral cutout is placed once in its own region. No heavy
scrim or full mockup screenshot is used. The opening cutout retains the reference's distant small
spire. Its final eye uses the actual raster, with the original native SVG eye geometry used only
for the brief trace-to-raster animation. Artwork is hidden on mobile for readable type and entry.
The light opening uses an ink rendering through CSS; the existing parchment welcome is preserved.
The final opening text position was lifted after comparing it with the original reference.

### Shipped raster assets

Fifteen actual extracted assets in `public/assets/blood/`, compressed to WebP with Pillow quality
88/method 6, retaining filename stems. Total: **849,040 bytes**. Original PNGs stay in the local kits.

| File | Role |
| --- | --- |
| `clean-0-6e3216c741ed.webp` | Main texture-only ground crop |
| `cutout-4-8b441033111b.webp` | Main cathedral |
| `cutout-70-962ff1556b4b.webp` | Main ivory wordmark |
| `cutout-6-dd61a97d78c3.webp` | Header eye and wordmark |
| `cutout-87-ba727e3cd350.webp` | Footer wordmark |
| `cutout-69-764012435546.webp` | Welcome eye |
| `cutout-52-5c178fbfc5a1.webp` | Conversation eye |
| `cutout-5-53d18347bc78.webp` | History menu glyph |
| `cutout-94-cfb4d571df7f.webp` | Opening replay glyph |
| `cutout-29-acdc5427a057.webp` | Unfiled folder glyph |
| `cutout-65-0a964f7dffec.webp` | Delete glyph |
| `clean-0-d03917981a47.webp` | Opening texture-only ground crop |
| `cutout-1-9b382c2bdf41.webp` | Opening cathedral |
| `cutout-3-66706a613915.webp` | Opening ivory wordmark |
| `cutout-2-3b62caa060df.webp` | Opening eye |

## Comparison and limits

Required closeouts used the matching unchanged original LayerDocs and working URL:

- Main: `/home/narmexis/Projects/WhiteEye/design/kits/whiteeye-blood-closeout-settled/`, **62.9% DOM / 69.5% target** overlap;
  the 60% DOM anchor gate passed. An earlier free capture during entry dismissal had backdrop blur;
  the settled capture used the existing motion control after dismissal and was visually reviewed.
- Opening: `/home/narmexis/Projects/WhiteEye/design/kits/whiteeye-blood-opening-closeout/`, **5.4% DOM / 75.0% target** overlap.
  This is a low-overlap result, not a complete pixel-fidelity pass. The extractor includes the
  underlying application's DOM together with the eight-element opening target. The opening was
  captured in its real motion-off replay state so automatic dismissal would not race capture.

The README, proposed tokens and relevant implementation plans were read and adapted in the
existing components. Rendered desktop/mobile and intermediate/settled opening images were compared
with the real reference images. Fonts, native controls and responsive geometry intentionally differ
from the mockup; anchor coverage alone does not establish pixel perfection.

## Verification

The local browser checks passed **123 checks**:

- 49 theme checks: dark default, button semantics, exact ground colors, reload/navigation
  persistence across both courses, map repaint without losing selection, cross-tab synchronization,
  and usable conversation/lesson/map controls at 360, 390 and 768px in both modes.
- 16 opening checks: actual eye/art animations, immediate focused entry, once-per-session behavior,
  replay/entry focus, Escape, live reduced-motion interruption, still replay, no reduced-motion
  effects, mobile title/entry fit and no runtime errors.
- 49 existing UI regression checks: personas and model selection in a mocked chat, conversations
  and folders, reload persistence, dialogs/drawers, Previous/Next/direct lessons and completion,
  both maps/search/selection/keyboard/optional 3D, responsive layout and motion preferences.
- 9 resilience checks: blocked/invalid storage, actual text fallbacks when new assets are blocked,
  1024px header overlap and rapid theme toggles settling in the correct mode.

One initial opening test checked animation state after expensive screenshot encoding, by which
time the short animation could have finished. Measuring the running animation before capturing
fixed that timing race; all final assertions passed. No runtime defect was hidden by that change.
Chat responses/status are mocked for browser checks; they do not establish model-response quality.
Screenshots/reports are ignored local artifacts under `artifacts/blood/`. The standard build and
artifact validator also check served theme JS/CSS, both entrypoints and primary shipped artwork.

Course datasets, exact source quotations, personas, storage/backend logic and the lazy-corpus
Worker startup fix are unchanged. No lesson wording was altered in this presentation update.

## Restore

The previous complete parchment design remains in Sites version 31 at commit
`1eb6fa1c5ebedbdc7dd0ddb12699a7d849b02608`, plus the current Parchment option. Version 30 and older
versions preserve earlier dimensional designs. Existing Git tags and the before-3D bundle remain.
Restore presentation selectively; retain current content, user work and the lazy-corpus startup fix.
