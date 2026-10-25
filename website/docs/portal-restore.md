# Restore the pre-Portal design

The complete working WhiteEye site was preserved before the Portal redesign.

- Git tag: `whiteeye-design-before-portal-2026-10-09`
- Commit: `58834cae6ab4bf4d1867e32307a2c1b802d87e50`
- Published Sites version: 26
- Version ID: `appgprj_6aae6a7f39d08191a173883215385712~appgver_0c9f1c8b7614819195f6f87ee0023a08`
- Independent complete Git bundle: `/home/narmexis/Projects/WhiteEye/archive/source-backups/whiteeye-before-portal-2026-10-09.bundle`

For an immediate whole-site rollback, redeploy that saved version on the same Site. It includes the
Tomodachi expansion to IMP and Vesper. Existing browser conversation data and server course progress
are not part of a design rollback.

For a visual-only restoration after subsequent feature work, restore the public HTML, CSS and
presentation modules from the tag, review the diff against newer features, then build and publish.
Preserve current persona/server changes and saved data. Portal retains the existing storage keys and
course identifiers so the rebrand does not reset user work.
