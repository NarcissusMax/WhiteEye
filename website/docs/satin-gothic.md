# Satin gothic refinement — October 10, 2026

## Request and scope

The user requested a middle ground between the previous heavy dimensional presentation and the
flat folio, specifically calling out grayscale course artwork and a lack of shine. This refinement
keeps the readable folio geometry, dark Blood gothic default, saved Parchment option and finite
opening. It adds restrained surface light rather than reviving the relief renderer.

## Implementation

- `public/styles/quiet.css` and `themes.css` stop converting course and perspective illustrations
  to grayscale, inverting them or multiplying them into the ground. Source images retain their
  actual burgundy, candlelight, olive and warm stone colors at full opacity.
- `public/styles/satin.css` is the final shared stylesheet on the conversation and both course
  entrypoints. Semantic tokens define the fine pewter edge, inset highlight, shallow shadow,
  satin face and same-hue button gloss separately for each theme.
- Primary actions have a finite reflection sweep on pointer hover; course cards lift 2px, with
  a small image scale. Course art reveals once per mounted view with a 900ms opacity/scale change.
  There are no continuous decorative loops or pointer-tracking 3D transforms.
- Module cards integrate their existing illustration into a fine bordered surface. Journey,
  question, practice, flashcard and journal surfaces gain a faint highlight and consistent corners.
  Menus and dialogs retain their native behavior with a stronger separation from the page.
- Course hero edge fades leave more of the original moon and water visible. Long quotations,
  course data and authored scaffolding are untouched.

The existing local typography and real product controls remain authoritative. Generated reference
copy does not replace headings, lesson numbers, module selection, menus, labels or data. Metal is
normalized to warm pewter on UI chrome; the artwork may retain its natural gold and red tones.
The source preference, cross-tab synchronization, load-gated wordmarks, image fallbacks, notes,
progress, knowledge maps, personas, model configuration and lazy corpus startup fix are preserved.

## References and closeout

Selected 12ui candidate **A**, with continuous site references for the overview and lesson 09.01,
in `/home/narmexis/Projects/WhiteEye/design/kits/whiteeye-satin-design-kit`. Candidate B was inspected and rejected because its
frames, gold and bright sky were heavier than the requested middle ground. Original reference
images and LayerDocs are retained unchanged. The root image conversion succeeded. Its responsive HTML export
`337e6523-1657-43bd-b091-2813b01f4ca0` failed with a service-unavailable response; the service
reported no charge for that export. The original root LayerDoc was recovered from the existing
conversion, and fixed HTML derived for free as `ba121b08-2415-4ab1-b313-c79b9fcf82c0`. No root
image conversion was repurchased. The two already-generated page targets were converted directly
to LayerDocs once each. The initial site kit remains honestly incomplete, so its site-plan and
site recheck were unavailable; three free original-target closeouts replace that verification.

## Restore

Version 32 / commit `e93891cde41d0e4409d86ce917ed7801c5758d1c` preserves the complete dual-theme
folio before this enhancement. Version 31 preserves parchment; version 30 preserves the dimensional
chamber. Restore presentation selectively, retaining current course data, learner work, personas
and the version 28 lazy corpus Worker startup fix.

### Original targets

| Surface | LayerDoc SHA-256 | Closeout kit | DOM / target coverage |
| --- | --- | --- | --- |
| Main, candidate A | `8a57f576fa9f69abfc4a0bb55c8ce0b1c823906a91c2ec1cc169547be599b70d` | `/home/narmexis/Projects/WhiteEye/design/kits/whiteeye-satin-root-final` | 57.9% / 67.4% |
| Course overview | `963df2caff0ea3c09c61dc0cbf40eec0ce48278e2813f3ddf38be3693c669617` | `/home/narmexis/Projects/WhiteEye/design/kits/whiteeye-satin-overview-closeout` | 45.7% / 79.4% |
| Lesson 09.01 | `80e23568b78ce3067f1f03583c310ff38c2c52eeef0fcee7e25db185398e7f3e` | `/home/narmexis/Projects/WhiteEye/design/kits/whiteeye-satin-lesson-closeout` | 26.9% / 75.4% |

All three return `emitted-low-overlap`, below the 60% DOM anchor threshold. These are usable
selector plans, not a full fidelity pass. The extractor includes expanded/hidden course rail
content, and the generated lesson reference highlights Foundations despite showing lesson 09.01.
The real module 09 selection and all existing lesson navigation remain authoritative. The first
lesson closeout scrolled to the footer while disabling motion; it was recaptured at the actual
artwork using the unchanged target. The root was captured again after the final branding/assets.
Rendered overview, reader, module cards, lower lesson content and mobile states were inspected
independently. No new conversion was bought to chase a coverage score.

### Adaptations to the selector plans

- Proposed font replacement, gold UI colors, wholesale text-size changes and changed wording were
  not applied: retain the user's liked local typography, one action family and original content.
  Repeated style deltas are normalized once into semantic satin tokens, rather than adding a
  parallel set of unused generated token names.
- Keep native selects, theme button, dialogs, functional SVG/glyph controls and existing dividers.
  Raster/mockup progress, duplicated arrows, rules and panels do not replace live data or controls.
  Header, footer and control geometry remain responsive rather than using canvas percentages.
- The root's ten raster layers are shipped as actual extracted WebPs; backgrounds are cropped to
  texture and artwork regions. The cathedral appears once in the welcome, with a light edge mask;
  there is no heavy scrim and no generated whole-screen mockup in the product.
- Keep the original course engravings in full color. The overview branch's bright orange storm
  sky would reintroduce the fiery look the user rejected. Its course logos, progress ring, map
  marker and ornaments are represented by the existing live shared components; their extracted
  reference files are retained in the local target kit. The lesson branch's book is represented
  by the original colored practice engraving, with the same semantic placement and satin edge.
- On screens up to 980px, overview artwork occupies a separate panel below the copy; this corrects
  the observed overlap between bright wave detail and text. Welcome illustration remains hidden
  on mobile; the texture-only crop adapts by viewport height to avoid large corner ornaments.

### Purchase record

| Identity | Stage / result | Returned stage ceiling |
| --- | --- | --- |
| `crt-1bb733515e96055e9d2767c8aae8abf316f1f248` | Two main drafts | $0.061 |
| `crt-bb772a9a0ee29c5c74085baee9e97a9de43de901` | Two site branch images | $0.00 |
| `f15ff5cf-6cc6-4c19-810f-c2a738b5cea0` | Original root conversion | $0.55 |
| `1bbac6cf-2906-4b43-89c4-49dc86f8a52d` | Original overview conversion, standard | Not reported by direct CLI |
| `b46b10f2-ca3b-4bca-bce4-24584bfb6734` | Original lesson conversion, standard | Not reported by direct CLI |

Five purchase identities; no repurchased target. Free fixed derivation and original-LayerDoc
closeouts add no purchases. Exact account spend evidence is retained in ignored
`artifacts/satin/spend.json` and `spend-overview.json`; returned rows are sponsored and charged
amounts are zero. Provider costs are withheld, not assumed zero.

### Shipped root rasters

Ten WebPs in `public/assets/satin`, compressed from actual extracted PNGs with Pillow quality 88,
method 6; original stems retained. Combined size: **384,920 bytes**. Original PNGs and extracted
page reference assets remain in their local kits.

| Stem | Role |
| --- | --- |
| `clean-0-07750a237c5e` | Texture-only middle-left crop |
| `clean-2-c3522b655c64` | Colored welcome cathedral, moon and roses |
| `cutout-65-050a4483956b` | Satin ivory welcome signature |
| `cutout-8-a79a001e5a6c` | Header signature, load gated |
| `cutout-7-e56444a85567` | Header eye, theme swapped |
| `cutout-64-0d5961c2c0cd` | Welcome eye |
| `cutout-48-74ee5794f722` | Conversation bar eye |
| `cutout-83-18cafbe94377` | Footer signature, load gated |
| `crop-6-7efd86393f52` | Sidebar control, with glyph fallback |
| `cutout-91-7c1e131a189a` | Opening replay emblem |

## Verification

**159 browser checks passed**: 49 application regressions, 49 theme/navigation/responsive checks,
28 color/finish/motion checks, 16 opening checks, 9 storage/asset/race checks and 8 overview layout
checks at 360, 390, 768 and 980px. Theme and resilience checks were rerun after the new header
assets. Browser artifacts/reports are in ignored `artifacts/satin/`. Model calls were mocked.
Both complete knowledge maps, sequential/direct lesson navigation, completion persistence,
mobile drawers, keyboard focus, opening entry/replay and paused/system-reduced motion were checked.

The opening check caught a new generic position rule moving Enter off-screen. The shared rule
was narrowed to preserve its absolute layout; all 16 opening checks then passed. A finite image
reveal was changed to release its transform after completion so hover zoom actually works.
Asset failure retains real readable branding; storage failure still permits theme switching.

Source review confirms no course datasets, source passages, private corpora, persona prompts,
backend or build logic were changed. JavaScript syntax and whitespace checks passed. The existing
packaged Worker validator also verifies the new stylesheet on all entrypoints and all ten served
assets, alongside its existing runtime/persona/private-source checks.
