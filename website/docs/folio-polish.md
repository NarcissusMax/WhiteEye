# Folio polish — October 15, 2026

## Scope and availability

The user reported that the website would not open, then confirmed that it was fixed during the
initial investigation. The existing public URL returned HTTP 200 and Sites reported an active
public site. The original failure was not reproduced, so no outage cause is claimed.

The remaining request was to improve the UI as much as possible. Preserve the user's chosen
dark charcoal and burgundy palette, softened chatbot artwork, original colored course images,
local typography, readable flat geometry, Blood gothic default and saved Parchment choice.

## Implementation

- `satin.css` refines the existing finish: consistent 6px corners, clearer select and model
  controls, larger starter text, more legible composer help, and selected menu markers.
- Course navigation has larger utility text and more room. The reader uses 18px source text
  with a 70ch maximum measure, 17px on mobile. Practice, journals and resource links share the
  same spacing; the active section in the contents rail has a visible background.
- Mobile footer, drawer close, folder creation and completion controls have larger touch targets.
  Intermediate-width conversation controls wrap within their toolbar. Cards retain their finite
  lift and image reveal; map preview nodes gain a static ruby halo. No decorative loops are added.
- `app.js` improves the connection UI. Unconfigured and offline states are distinct, a retry
  announces its busy state and prevents duplicate checks, and the dialog links to the course.
  Obsolete local Deno/.env instructions are removed from the hosted product flow. Requests use
  an AbortController with an eight-second timeout. A single model is not announced as a menu.

The course datasets, original source passages, persona prompts, private libraries, storage keys,
backend, build logic and runtime credentials are preserved. All design assets continue to use the
existing optimized originals, including load-gated branding and readable image-failure fallbacks.

## Design process

12ui site kit: `/home/narmexis/Projects/WhiteEye/design/kits/whiteeye-polish-20261015`. Four real candidate images were inspected;
**A** was selected. B moved/duplicated library controls, C added a duplicate navigation underline,
and D introduced warmer framing. A supplies the restrained folio composition and clearer control
hierarchy. Original course overview and lesson 09.01 branch images are retained in the kit.

Draft run: `crt-ffdb23d851261611015a836be16a30e3cc97ce57` (stage ceiling $0.121).
Root conversion: `c718a69d-4bff-42bd-b130-55f8c88e174a`; responsive export:
`0b5632a9-0158-4756-b7f7-5b55122c96c6` (combined root ceiling $0.55).
Exact retained purchase identities and settled spend evidence belong to the local kit, rather
than estimating charged costs from those ceilings. No conversion is repurchased.

The native application remains authoritative for all words, active lesson selection, percentages,
menus and routing. The generated lesson reference highlights Foundations despite showing lesson
09.01; keep the actual module 09 selection. Preserve local font families instead of the suggested
Google font substitutions. Keep the existing original raster art in each matching role to retain
the user's chosen branding and softened welcome treatment. Reference artwork is not used as a
whole-screen background or as a substitute for live progress and interactive diagrams.

## Verification

110 browser checks passed: 49 application checks, 49 theme checks and 12 connection state checks.
They cover chat with mocked replies, seven personas, folders and conversation persistence, both
knowledge maps, direct and sequential navigation, completion persistence, mobile drawers, focus
restoration, theme persistence/cross-tab sync, asset loading and reduced/paused motion. Connection
checks exercise unconfigured, ready, single-model, offline, retry and genuinely stalled requests.

Ten additional layouts at 980, 1100, 1101, 1250 and 1280px were inspected for overflow, header
collisions and overlapping controls. Four mobile footer controls measure 44×44px. Desktop,
mobile, tablet, conversation, course, lesson and connection screenshots are in ignored
`artifacts/polish/`. This is not an exhaustive accessibility audit or a measured fidelity claim.

The existing packaged Worker validator remains the publication gate. Each current page was also
compared with its own unchanged original LayerDoc in a free, settled closeout kit.

| Surface | Original LayerDoc SHA-256 | Closeout | DOM / target coverage |
| --- | --- | --- | --- |
| Main | `7992760f955dda31ec00849b61ca43ab9703a62924d42e1a6853ae11714c5a1b` | `/home/narmexis/Projects/WhiteEye/design/kits/whiteeye-folio-final-home` | 51.4% / 59.1% |
| Overview | `11eb99e09e6d95eb8eea490fd583fd1778a8f16191d7307b7a8554571dc7a9d4` | `/home/narmexis/Projects/WhiteEye/design/kits/whiteeye-folio-final-overview` | 37.7% / 70.1% |
| Lesson 09.01 | `e0775c48b8f6c4eceb409e9c9b068c80d715362b6193abb4b26930c488ac999e` | `/home/narmexis/Projects/WhiteEye/design/kits/whiteeye-folio-final-lesson` | 28.0% / 75.2% |

All three emit low anchor overlap, below the 60% DOM threshold. They are comparison evidence,
not a full fidelity pass. Selector plans were reviewed: control typography, satin faces, shallow
corners and the map preview accent were normalized into the existing shared finish. Unsafe
numbered selectors, changed wording, Google font replacements, inactive navigation and wrong
lesson selection were not applied. The lesson matcher maps one journey number into the sidebar;
that suggested change is discarded. Raster roles use the existing matching optimized art and
native controls, preserving branding and the user-requested softer imagery. The slight final
theme-label and flashcard font refinements retain the same composition. Final publication uses
the complete native application, rather than generated mockup HTML.

## Restore

Version 35 / commit `44390eb0c664491278412c0e4b1c44e955548036` preserves the complete darker
presentation before this refinement. Earlier restore points remain. Restore presentation
selectively, preserving learner work, current source libraries and the lazy corpus startup fix.
