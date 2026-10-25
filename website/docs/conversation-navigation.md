# Conversation navigation

The existing engraved-room references in the local `whiteeye-app/docs/visual-redesign.md` informed
this functional update: retain the eye mark, blackletter masthead, dark ink surfaces, ivory message
text and fine wine rules. Ornament stays outside the transcript and the composer remains visible.
The sidebar disappears fully when collapsed; message text keeps its established reading width.
The 40px navigation rail aligns with the message viewport and leaves the composer full width.

Activity timestamps are migrated from saved message dates. Opening a chat, changing its settings,
editing a draft, sending a prompt or completing a reply moves it to the top of history. The device
sidebar preference is independent of the active chat and the mobile modal drawer.

Markers are virtualized in a separately scrollable chronological list. Transcript positions are
cached on layout changes and found with a binary search during scrolling. A long tick identifies a
prompt; a short tick identifies a response. The selected visible message has an accent tick and dot.
The two footer controls jump instantly to the latest prompt or response. Marker activation uses
smooth scrolling unless either device reduced motion or the app motion preference disables it.
Arrow keys, Home and End traverse all messages, including those outside the rendered marker window.

## Verification

Deno lint, format and all 70 tests pass. Isolated Playwright CLI checks used a synthetic 1,200-message
history and mocked replies, with no paid provider calls. Checked legacy sorting, latest-message
jumps, keyboard movement, tall-message tracking, virtualized marker counts, sidebar width recovery
and persistence, starred protection, draft ordering, mobile drawer focus/isolation, widths down to
320px and reduced motion. A delayed mocked stream verified that navigation to older messages is not
interrupted by reply updates, stopping preserves partial replies, retry refreshes markers, and rapid
chat switching preserves drafts before the debounce expires. Browser screenshots were compared with
the established room reference and are saved in local `whiteeye-app/artifacts/navigation-*.png`.
