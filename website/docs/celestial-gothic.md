# Celestial gothic implementation

Implemented 16 October 2026, following the request for a “spacial gothic design” and subsequent
instructions to continue. The stated interpretation was celestial gothic. The selected direction
uses midnight ink, silver lettering, sparse stars, a muted rose eclipse and cathedral silhouettes.

## Restore

The complete previous presentation remains in Sites version **36**, source commit
`f4cd904f94158b46f991d9f06184aeca881201c9` and `/tmp/whiteeye-folio-v36.tar.gz`.
Saved version: `appgprj_6aae6a7f39d08191a173883215385712~appgver_709a9f3940e88191b7a76b892e54d036`.
Restore through the supported Sites workflow, retaining later content and user data if any changes
have occurred. Do not replace the lazy-corpus Worker startup fix from version 28.

## Design evidence

The complete 12ui site kit is `/home/narmexis/Projects/WhiteEye/design/kits/whiteeye-celestial-20261015`.
All four real candidates were inspected; **C** was selected. Branch produced distinct course
overview and lesson targets. All three original responsive exports completed successfully.
No whole-screen image replaces the working application.

Original targets are unchanged:

| Surface | Target relative to the kit | SHA-256 |
| --- | --- | --- |
| Conversation | `target/winner.layerdoc.json` | `11d1dd95cea1120396fb1472115e967070d7cc7c464e4b890faf09b560e23c36` |
| Course overview | `pages/course/target/polished.layerdoc.json` | `1f220f2f716b1faa932d4abe6417a77ac9868f765b393782ea0b8efb25615d10` |
| Lesson 09.01 | `pages/course-lesson-09-01/target/polished.layerdoc.json` | `f110e1b8e5ec87a793a14c8f6a85e99f07109bfde2ec24b83e107bbb771f8a13` |

The original root winner PNG SHA-256 is
`5b50e66383fec0cbc30b697bd37f70bec9abf41b6ecd7fcf83440ab60d40ea09`.

## Integration

- `public/styles/celestial.css` follows the existing shared styles. The new dark rules use the
  established `blood` preference value so saved preferences continue to work. The visible control
  says “Celestial gothic”; Parchment remains available.
- The opening uses the new scene and silver wordmark with the existing finite eye trace, Enter,
  Escape, automatic completion, replay and focus handling. New scene reveals animate only opacity
  and transforms. Motion-off and system reduced-motion preferences settle them immediately.
- The two courses share the new visual system. Each overview gets the course-specific scene and
  engraved map invitation; readers get the lesson-specific background and a subtle navigation star.
  The optional 3D knowledge map and all its existing controls are preserved.
- Theme image refresh now also handles client-side course navigation. Wordmarks remain load gated
  with readable real-text fallbacks. A failed decorative image cannot hide the brand text.
- Tablet navigation is kept on one line. Mobile overview artwork occupies its own panel beneath
  the copy. Reading passages retain the existing 18px/1.95 serif setting, 17px on mobile, with
  original characters and pre-wrapped line breaks.

## Assets and deliberate adaptations

17 optimized WebP assets total **385,306 bytes**. Source PNGs remain in the kit; one resolution
per layer ships. Scene plates are 1680px wide. Wordmarks, eyes, star rules, the progress rim and
map nodes are actual extracted assets. The map card uses its extracted ornamental crop, sized
to exclude the crop's extra bottom strip. Nothing is redrawn from the scene in CSS.

The root wordmark is shared across all routes for consistent branding. Existing native select
glyphs, live progress, correct lesson selection, real course counts and local typefaces take
precedence over generated inconsistencies. Lesson 09.01 keeps module 09 selected; the generated
Foundations selection and malformed lesson number are not copied. The existing colored book
and module illustrations are preserved. The native knowledge-map diamond is kept once, without
an additional duplicate raster glyph. The image of connected nodes decorates the invitation;
the working knowledge graph remains a canvas with real lesson data.

The right reader contents panel has a **20% ink scrim** to retain label readability over the moon
and clouds. Other scene plates are displayed at full strength. Opaque practice and note surfaces
keep controls clear. No broad heavy scrim, fire effect, global 3D scene or decorative loop is added.

## Original-target closeout

Fresh post-implementation kits use the original unchanged LayerDocs:

| Kit | DOM / target coverage | Result |
| --- | --- | --- |
| `/home/narmexis/Projects/WhiteEye/design/kits/whiteeye-celestial-final-home` | 61.3% / 67.0% | Anchor gate passed |
| `/home/narmexis/Projects/WhiteEye/design/kits/whiteeye-celestial-final-overview` | 38.4% / 71.6% | Plan emitted with low overlap; capture identity matched |
| `/home/narmexis/Projects/WhiteEye/design/kits/whiteeye-celestial-final-lesson` | 28.2% / 82.4% | Plan emitted with low overlap; capture identity matched |

Read the plans and carried the relevant raster layers, palette, controls, type sizing and spacing.
Final focused refinements increased the progress label, course title, contents-link and completion
label readability while preserving native controls and source content. Desktop and mobile captures
were compared with the original targets and the actual reading, conversation and opening states.

The required site recheck is in `recheck/1/report.md`. The root passed; both course mappings were
blocked with the tool's “capture identity: unrecorded” limitation and low overlap. Independent
page closeouts record the correct URLs and provide the plans above. No capture metadata was
altered, and no full-site fidelity pass or exhaustive accessibility certification is claimed.

## Verification

Local Playwright checks: **125 passed** — 49 application, 49 theme and 27 focused celestial checks.
Evidence is in ignored `artifacts/celestial/`. The chat request in UI tests was mocked; this verifies
UI behavior and request selection, not a production language-model response.

Coverage includes seven personas, conversation persistence, folders, dialogs and focus, both
courses, next/previous transitions, direct selection, completion persistence, the 550-lesson
Course II map, 2D/3D graph controls, mobile drawers, cross-tab theme preference, image switching
after client navigation, loading failures, finite opening/replay/keyboard exit and motion controls.
Layouts were checked at 360, 390, 768px and desktop; focused header checks covered 761, 820, 980,
1100 and 1280px. No browser runtime errors or unexpected asset failures were found.

Measured text contrast on solid surfaces: secondary 9.66:1, metadata 7.93:1, primary action 11.08:1,
and contents text 12.89:1. These are token checks, not an exhaustive pixel-by-pixel image audit.

Both course datasets remain byte-for-byte unchanged:

- `course.json`: `907cefa12f4b65c84ee9272aace9d2114b752253768eecc61acaf05dcc8b8906`
- `course-2.json`: `d239161453db487040e8ae2f0da5a7fc48780d149704fb4b095fd7b9b7e19a44`

The user's browser could not be opened through the available browser handoff; local browser QA
was available. Publish using the native Sites result as deployment evidence and return the literal
URL so it can also be copied into the user's browser.

## 12ui purchase record

Total recorded price ceiling is **$1.911**, not an asserted final charge. Eight purchases settled,
none were abandoned, and all target-based closeouts and the recheck purchased nothing.

| Work | Purchase ID |
| --- | --- |
| Draft, ceiling $0.121 | `crt-c5b364b89ce1cdb4b277f96110b5bbeffe05570d` |
| Branch, ceiling $0.140 | `crt-c41840f4340c322c5c5e3f8dbcb46ab0e8638cc3` |
| Root conversion | `5ed1dccd-7c41-4f5f-a2d5-555ecfd22c6f` |
| Root responsive export | `2d4cb7dc-3ae1-4814-b6ac-188921da2f7b` |
| Overview conversion | `bcb55aff-d933-4b6f-849e-e53625650573` |
| Overview responsive export | `d57abb9a-7abf-4cc4-b379-8aa63bc15a09` |
| Lesson conversion | `6e5c483d-e2a6-4586-94de-95d24b4c2bfb` |
| Lesson responsive export | `7fbe30f0-62e2-4612-9ed6-0aa67b97161a` |

The six conversion/export purchases share a $1.650 stage ceiling; it is not multiplied per row.
