# Portal redesign · October 2026

The website is now Portal. WhiteEye remains a conversation persona and the author of Course I.
Conversation histories, folders, model choices, course identifiers and progress storage retain their
existing keys.

## Visual direction and assets

- Cinematic gothic architecture with midnight navy, teal, ivory, aged gold and muted violet. Shared
  final styles: `public/styles/portal.css`.
- Original generated cathedral doorway and moonlit library scenes, optimized as same-origin WebP
  images. Originals and prompts are retained in `/home/narmexis/Projects/WhiteEye/design/assets/portal-design-assets/`.
- Self-hosted Cormorant Garamond normal/italic variable fonts, optimized to WOFF2 without
  subsetting. Combined font size fell from 1,911,204 to 353,188 bytes; the supplied OFL license is
  bundled.
- Header, welcome, conversation library, composer, menus, dialogs, perspective view, both course
  overviews, lessons, module cards and knowledge maps share the new design. Existing content and all
  seven persona engines are preserved.

Superdesign canvas:
https://superdesign.dev/teams/18042623-6ae1-4b63-b39e-f1a646a3ba7f/projects/a3b116c6-c0d9-4d3b-a17c-74f2859af207

Draft `b81dee3a-bc60-4631-ab0e-3df90d9f20cd` retains version 1 as the layout reproduction and
version 2 as the Portal direction. Production preserves real controls, connection state, copy and
quotations instead of the draft's invented example labels. The generated direction and
implementation screenshots were visually compared. Design source context and resume metadata live in
`.superdesign/`; its original temporary context was moved to `context/` without changing its bytes
for durable reuse.

12ui was installed and its capture prerequisites repaired, but hosted design required account
sign-in. Superdesign was authenticated and supplied the visual design; no paid 12ui generation was
started.

## Motion

`public/js/portal-motion.js` adds coordinated conversation changes, persona reveals, sidebar
movement and activation feedback. Native discrete transitions animate menus and dialog entry/exit.
The doorway responds gently to the pointer; moonlight and atmospheric illumination use composited
opacity and transforms.

The existing course engine continues to own directional Next/Previous/direct lesson transitions,
completion feedback, flashcards, disclosures, notes and graph interaction. Native document
transitions extend the motion between the conversation and course destinations where supported.

All motion follows the existing persistent switch and system reduced-motion preference. Inactive
tabs pause ambience and settle transient motion. Streaming messages and original quotation strings
are not split into animated text.

## Verification

- All 132 existing Deno tests passed.
- Packaged Worker validation passed for the seven personas and private corpora.
- Course validation passed: 575 lessons, 16 modules and all 1,568 original quote hashes, including
  10 random samples; no mismatches.
- Course II validation passed: 550 lessons, 40 modules, separate progress and notes, valid routes
  and graph connections.
- Browser checks covered chat submission with a mocked model, persona/model selection, saved
  conversations, folders, sidebar animation, dialogs and focus return, Next/Previous/direct lesson
  navigation, completion persistence, both courses, map search and mobile drawers. No paid model
  calls were made.
- Responsive checks passed at 360, 390, 768 and 1440px. A mobile lesson-bar offset inherited from
  the desktop rail was corrected. The compact course header was also adjusted to keep course labels
  on one line.
- Motion off, persistence across reload and system reduced-motion precedence passed. No browser
  runtime errors or missing page assets were observed.
- The preview's first progress-write failure was due to testing a localhost server through a
  different origin. Retesting its declared localhost address passed without changing production
  progress behavior.

Review evidence is in ignored `artifacts/portal/`. Source corpus and course JSON files were not
changed by this redesign.

## Restore

See `portal-restore.md`. The complete prior design is preserved as a Git tag, independent complete
Git bundle and published Sites version 26.
