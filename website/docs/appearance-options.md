# Appearance options

Added 16 October 2026. The header appearance menu now offers Celestial gothic, Blood gothic and
Parchment on the conversation page and both courses. Blood gothic restores the design from Sites
version 36, commit `f4cd904f94158b46f991d9f06184aeca881201c9`, before the celestial changes.
Blood gothic is the default for new visits. Saved explicit appearances remain selected. No new
artwork or design purchase was needed.

The original styles and assets were already retained. Celestial overrides now use the explicit
`data-appearance='celestial'` selector. Both dark appearances share `data-theme='blood'` as their
foundation, so existing components, canvas graphs and motion settings continue to work. Each
appearance chooses its own wordmarks, scene, decorative images and opening artwork. The original
course overview illustration returns in Blood gothic. Dynamic course navigation refreshes images.

The native details/summary menu uses ordinary buttons with selected states and a visible check.
It supports keyboard activation, Tab, Escape, focus restoration after selection and outside dismissal.
All three options remain named in the mobile menu even when the header trigger is compact.

`whiteeye:theme:v2` saves the explicit choice and synchronizes open tabs. Legacy v1 parchment maps
to Parchment; legacy v1 blood maps to Celestial, preserving the design already shown to those users.
Storage failures still allow theme selection for the current page. Other storage keys are untouched.

59 focused local browser checks passed. Evidence is in ignored `artifacts/theme-options/`:

- Restored Blood colors, composer surface, wordmarks, illustration, image filter, ambient background
  and opening image were compared with a rendered version 36 baseline and matched exactly.
- All three themes and menus fit 360, 390, 820 and 1440px on the conversation, course overview and
  Course II lesson surfaces. Desktop and mobile screenshots were visually inspected.
- Selection, reload, cross-course and client navigation, cross-tab synchronization, legacy preference
  migration and blocked storage were verified. Knowledge maps repaint between the dark themes.
- Keyboard opening, Tab access, Escape, selection focus and outside dismissal were verified.
- Both source course datasets retain their existing SHA-256 hashes. No runtime errors or unexpected
  asset failures occurred. This is focused verification, not an exhaustive accessibility audit.

Version 37, commit `aaadd02f1469c41ebdfffed18c7ea5a192150924`, remains the restore point before this
menu addition. Course content, learner data and backend behavior are outside this presentation change.
