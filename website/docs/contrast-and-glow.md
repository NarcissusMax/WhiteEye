# Contrast and glow refinement — October 11, 2026

The user requested more UI contrast and glow, with less saturation and contrast in chatbot
background imagery. This is a focused refinement of the existing satin gothic design.

## Changes

- Blood gothic panels and inputs have distinct plum charcoal surfaces, brighter pewter boundaries,
  clearer secondary text and a pale ruby accent. Inputs and the composer have opaque surfaces.
- Primary buttons retain their same-hue gloss and finite reflection. A static ruby halo strengthens
  on hover. Focused inputs gain a crisp border, a 3px translucent ring and a small halo. Selected
  navigation uses pale text, a brighter marker and a wine wash. Progress light is no longer clipped.
- The chatbot welcome image uses `saturate(.58) contrast(.87) brightness(.9)` through CSS. Its
  moon, cathedral and roses remain colored. The decorative grain uses `saturate(.35) contrast(.72)`
  at .28 opacity. Neither treatment filters UI text or course images.
- Parchment keeps its palette and illustration; its action/focus light uses a restrained wine tint.
  All geometry, opening behavior, motion preferences, native controls and source content remain.

Only the two shared stylesheets change product code. No new imagery, JavaScript, dependency,
backend, persona prompt, source passage or course dataset is introduced or rewritten.

## Verification

47 focused browser checks passed. Core text was measured against the brightest part of the
raised panel gradient, including its 9% pale highlight:

| Sample | Contrast |
| --- | --- |
| Primary text | 10.42:1 |
| Secondary text | 7.33:1 |
| Metadata | 5.39:1 |
| Accent text | 5.82:1 |
| Primary action text, brightest gradient stop | 5.20:1 |
| Composer boundary, brightest input face | 3.12:1 |

These samples are not an exhaustive accessibility audit. Desktop and mobile screenshots were
inspected for the welcome, focused composer, active conversation, Parchment, both overviews,
module cards and lesson reader. Checks cover chat with mocked model replies, original course image
colors, selected navigation, forward/backward lesson transitions, completion surviving reload,
360/390/768/1024px layouts, artwork/copy separation, paused/reduced motion and browser errors.
Evidence lives in ignored `artifacts/glow/`; the existing packaged Worker validator is also required.

## Reference review

12ui compared the current implementation against the three unchanged original satin LayerDocs:

| Surface | Original SHA-256 | New closeout | DOM / target coverage |
| --- | --- | --- | --- |
| Main | `8a57f576fa9f69abfc4a0bb55c8ce0b1c823906a91c2ec1cc169547be599b70d` | `/home/narmexis/Projects/WhiteEye/design/kits/whiteeye-glow-root-closeout` | 55.1% / 64.1% |
| Overview | `963df2caff0ea3c09c61dc0cbf40eec0ce48278e2813f3ddf38be3693c669617` | `/home/narmexis/Projects/WhiteEye/design/kits/whiteeye-glow-overview-closeout` | 52.5% / 79.4% |
| Lesson 09.01 | `80e23568b78ce3067f1f03583c310ff38c2c52eeef0fcee7e25db185398e7f3e` | `/home/narmexis/Projects/WhiteEye/design/kits/whiteeye-glow-lesson-closeout` | 28.7% / 76.3% |

All kits settled with `emitted-low-overlap`; no full fidelity pass is claimed. No design conversion
or draft was purchased. The original extracted raster assets remain shipped from version 33;
their recovery/provenance is in `docs/satin-gothic.md`. The root LayerDoc has its assets retained
alongside the recovered fixed HTML rather than duplicated in the new kit.

The selector plans were reviewed as reference evidence. Keep their satin button finish, fine
corners, illustrated composition and native product hierarchy. The user's latest contrast,
glow and artwork request supersedes the older reference colors. Font replacements, gold frames,
generated copy, removed controls and misidentified lesson selection are not applied. The slightly
brighter final input edge was chosen from measured contrast after the closeout; final screenshots
and browser checks cover it. No unsafe automatic selector patch was applied.

## Restore

Version 33 / commit `92ee93773f6bcee112856475138e5e0530a3c3d7` preserves the full satin presentation
before this refinement. Version 32 preserves the prior dual-theme folio. Restore presentation
selectively while retaining current courses, learner work and the lazy corpus startup fix.

## Follow-up: darker reds and grays

The user asked for slightly darker red and gray shades. Blood gothic now uses surface #1b161d,
raised surface #231c24, accent #d98295 and filled action #82182c. Button gloss runs from #9b2c44
to #540d1f, with darker ruby halos. Neutral borders, inset light and secondary text are slightly
subdued. The soft chatbot artwork, existing glow behavior, geometry and Parchment tokens remain.

Rendered desktop home, overview and reader plus 390px home and overview were inspected. No
horizontal overflow or browser errors were observed. Original course color and Parchment surface
preference were checked. Contrast over the brightest raised face: primary 11.77:1, secondary
7.30:1, metadata 5.23:1, accent 5.05:1. Primary button text is 6.70:1 at its brightest gradient
stop; the composer boundary is 3.01:1 against its brightest face. Evidence: artifacts/shade/.
This is a small token adjustment; the existing approved design references remain authoritative
for composition, with no new design generation or full fidelity claim.

Version 34 / commit cfa1551df4f8920af224ba49b19d640231559477 preserves the brighter contrast
refinement before this adjustment. The packaged site validator remains the publication gate.
