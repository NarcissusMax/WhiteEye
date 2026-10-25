# Conversation library

This update applies the UI Skills Root routing workflow, Baseline UI and Fixing Accessibility to the
existing Deno/vanilla interface. The established engraved-room screenshot and DESIGN.md govern the
ink, ivory, serif, wine and fine-rule language. The library uses native controls and the existing
native dialog. No new runtime dependencies or generated artwork are needed for these interactions.

Named folders are stored alongside device-local conversation history. Older histories migrate to
Unfiled without changing messages, stars, recall choices or model selections. Folder names can be
created or renamed, and conversation options allow naming, moving and recall management. Removing
a folder returns its chats to Unfiled; it never deletes their messages. A new conversation inherits
the selected folder. Recent activity ordering applies within each folder and across all chats.

The sidebar has title search, folder counts and compact conversation rows with always-visible star
and options controls. Library settings group prior-chat memory and bulk clearing. The compact footer
retains the established quote and local-save reminder. Main content has its own stacking context so
the model picker cannot cover the mobile history drawer. Dialogs restore focus and show field or
storage errors inline; destructive confirmations use alert-dialog semantics and focus safe actions.

Verification: all 74 Deno tests pass. Playwright CLI checked folder creation, naming validation,
duplicates, renaming, moving, search, refresh persistence, new-chat folder inheritance, starred/recall
preservation, removal/cancellation, literal HTML-like names, mobile dialog focus, widths down to
320px, short screens, 35 folders, long names and inline storage failure rollback. Chat requests were
mocked. Screenshots in local `whiteeye-app/artifacts/folders-*.png` were compared with the existing
room reference. Folder organization remains device-local, like conversation history.
