# WhiteEye visual system

The current direction is **celestial gothic**: midnight ink, an eclipsed moon, cathedral silhouettes,
silver typography and restrained dark rose actions. **Blood gothic is the default**, restoring the
complete version 36 appearance. Celestial gothic remains selectable; **Parchment** retains its paper,
ink and muted wine palette. Keep the existing WhiteEye name, eye mark and routes.

Style order: component styles, `quiet.css`, `themes.css`, `opening.css` on the conversation page,
`satin.css`, then `celestial.css`. The last file owns the new dark palette and composition.
See [the celestial implementation record](docs/celestial-gothic.md) for original design targets,
asset provenance, verification limits and the version 36 restore point. Earlier folio, satin and
chamber documents describe historical designs.

## Identity and hierarchy

Keep WhiteEye's eye mark, blackletter signature, literary headings and engraving imagery. Use
one accent family: dark rose on midnight ink, muted wine on parchment. The reading order is the conversation or lesson,
its primary action, navigation and progress, then illustration. Give content space. Ornament is
contained and absent from active conversations. Use shallow satin highlights, a fine pewter edge,
a faint inset lip and soft shadows. Muted rose halos identify primary actions, active navigation and keyboard focus.
Keep chatbot artwork softer than the controls; course illustrations retain their original colors.
No carved frames, heavy bevels, fiery glow, 3D card tilts or perspective page turns.

## Colors

| Role | Token | Celestial gothic | Parchment |
| --- | --- | --- | --- |
| Ground | `--bg`, `--chrome` | `#01060d` | `#f0ebe0` |
| Quiet surface | `--surface` | `#0b0e17` | `#ebe5d9` |
| Menu and dialog | `--surface-raised` | `#121521` | `#f5f1e8` |
| Primary text | `--ivory` | `#eee9e6` | `#242428` |
| Secondary text | `--muted` | `#bcb5c2` | `#57534f` |
| Metadata | `--dim` | `#aaa4af` | `#706b64` |
| Fine divider | `--line` | `#4d4c59` | `#c7c0b5` |
| Readable links and selection | `--accent`, `--wine` | `#d78ca7` | `#773249` |
| Filled primary action | `--action-fill` | `#451027` | `#773249` |
| Primary action text | `--on-accent` | `#faeaf0` | `#f8f3e9` |
| Neutral detail | `--brass` | `#b4afba` | `#706b64` |

Legacy token names remain compatible with existing components. `--ivory` means primary text;
`--brass` is neutral. Filled buttons use pale text and a same-hue gloss, while secondary controls use a faint satin face.
Convey completion, selection and errors through labels, markers and semantics as well as color.
Do not introduce additional accent families or fiery glow.
Use `--satin-glow` and `--satin-focus` for static rose light; hover raises the primary action halo.
Keep neutral control edges at `#62606f` and larger course panel edges at `#817c8c`. Inputs and the composer have an
opaque quiet surface, so decoration cannot reduce the contrast of their contents.

## Type and composition

Retain the existing local blackletter, serif and sans serif font system. Blackletter belongs to
branding and the welcome title. Serif carries editorial headings and excerpts. Sans serif carries
messages, controls and utility copy. Keep source quotations readable, with their existing line
breaks and characters. Do not change lesson wording to fit a layout.

The conversation shell uses a 76px masthead, a ruled history sidebar and a central scroll region
with a composer below. The sidebar width adapts between 260px and 372px. The welcome copy is on
the left, a cathedral and eclipse scene on the right. Three unboxed starter rows sit below the
copy. Active messages hide the welcome illustration and retain a comfortable reading width.
Use fine rules and spacing for navigation; course module cards have a fine illuminated edge, shallow
shadow and integrated artwork. Avoid thick frames and heavy material textures.

At narrow widths, retain the existing history drawer, safe areas and `100dvh` layout. Remove the
welcome illustration so the title, prompts and composer fit. The course uses a native contents
dialog on mobile. All controls and long lessons must work at 360px without horizontal overflow.

## Controls and navigation

Preserve seven personas, interlocutor selection, model selection, conversation persistence,
folders, stars, rename/delete dialogs, prior-chat recall, the message navigation rail and keyboard
shortcuts. Keep native select and dialog semantics. Visible labels, focus rings, disabled states,
loading and error feedback are required. Restore focus when menus, dialogs or mobile drawers close.

Use 7px corners for celestial controls, 8px for dialogs, and 11–12px for larger course panels. Selects and model controls use
44px targets and readable 14px local serif text. A single configured model is presented as a
readable, fixed selection. The unconfigured model field says "Not connected"; the header owns
the connection action. Model menu options retain a selected marker and native keyboard behavior.
On mobile, the footer's music, motion and replay controls and lesson completion have 44px targets.

Course navigation uses 12–13px utility text with more breathing room. Source passages use 18px
serif text, 17px on mobile, with a 70ch maximum measure and unchanged pre-wrapped source content.
The sticky table of contents has a visible active-section wash. Practice, notes and resources
share the same spacing and control finish. The course overview map invitation uses an extracted illustration of connected rose nodes; the actual map stays interactive.

The model connection dialog explains ready, unconfigured and offline states in product language.
Retry displays a busy state, prevents duplicate checks, and returns a persistent status message.
Status requests time out after eight seconds; course access remains available in the dialog.

The message rail remains a compact prompt/response index with keyboard arrows, Home and End.
The existing conversation and folder storage keys remain unchanged. Surface changes must not
rewrite the persona engine, backend initialization or source libraries.

Music and motion controls remain in the footer. Preserve track, volume and explicit stop choices.
Listener-supplied recordings remain local through IndexedDB. Report blocked autoplay, missing
recordings and playback errors in the existing control; the new palette also applies to that menu.

## Theme preference

Use the appearance menu in the conversation and both course headers. Its native details/summary
control offers Celestial gothic, Blood gothic and Parchment with selected states, swatches and check
marks. Escape and selection return focus to the trigger; clicking outside dismisses the menu.
`public/js/theme.js` applies the preference before styled paint. `whiteeye:theme:v2` stores the
explicit appearance, follows navigation/reloads and synchronizes tabs. A legacy v1 parchment value
remains Parchment; legacy blood remains Celestial, preserving the presentation selected before
this feature. New visits and unavailable storage default to Blood gothic. Storage failure leaves session switching usable.

`data-theme` selects the shared dark/light foundation (`blood` or `parchment`), while
`data-appearance` selects `celestial`, `blood` or `parchment`. Only Celestial loads the celestial
CSS overrides. The Blood option uses the original version 36 colors, assets and opening.
Theme-color metadata, selected labels and load-gated artwork must agree. Maps repaint without
losing selection or camera state. See [the appearance options record](docs/appearance-options.md).

## Motion

Frequent motion confirms a real action. Use finite opacity and small 2D position changes, usually 160–260ms.
Lesson navigation retains forward/backward direction with a 300ms slide and dissolve; avoid
perspective, rotation and simulated book depth. Progress, disclosures, saved notes, flashcards,
search and completion retain restrained feedback. Keep text stable after a transition.

`public/js/interface-motion.js` replaces the dimensional shell controller. Do not load the relief
scene, depth controller or cursor glow. The celestial scene reveals once with a 1400ms opacity/2D-transform change, then remains still. Module art reveals once with a 900ms opacity/scale change;
module cards lift 2px and their images scale gently on pointer hover. Buttons have a finite 650ms
reflection sweep. Decorative loops and breathing map invitations are disabled. The footer motion preference persists and
`prefers-reduced-motion` takes precedence. Disabling motion settles active effects immediately.

The opening is a finite, occasional title sequence: trace the original eye, reveal the actual
wordmark, draw a short rule, introduce the caption and engraving, then dissolve into the page.
The complete sequence lasts about 3.55 seconds and runs once per session. The entry button is
available immediately; Escape dismisses instantly. The footer replay control remains. Manual
replay with motion disabled shows a still opening. Automatic opening yields focus to the main
region without invoking a mobile keyboard; manual entry returns focus to replay. Reduced motion,
paused motion and page visibility changes settle an active opening. No looping intro effects.

## Courses and knowledge maps

Keep the dedicated overview, module directory, lesson rail, long-form reader, progress indicators,
Previous/Next bar, completion, reflection notebooks, glossary and weekly review in both courses.
Authored scaffolding retains its Course note labels; source passages and course datasets remain
unchanged. Learner completion and notes continue to use the existing cookie/D1 implementation,
with clear failure feedback and reading available independently of a progress save.

Both knowledge maps open in 2D. Nodes and ordinary links are neutral; the selected lesson and its
connections use the active theme accent. Keep search, real lesson connections, filters, keyboard controls and direct
lesson navigation. The existing optional 3D control remains available when explicitly selected.

## Assets and fallbacks

Use the 17 actual extracted WebP assets in `public/assets/celestial/` for the dark presentation.
The root is 12ui candidate C; the overview and lesson each have their own unchanged branch target.
Original PNGs and LayerDocs remain in the external design kit. Use one resolution per layer.
The conversation, course overview and reader use separate eclipse/cathedral plates at full opacity.
No generated screenshot is used as the UI. Existing chapter and perspective artwork retains its
original color. Parchment assets remain in `public/assets/quiet/` and the earlier folders.

The overview illustration moves below its copy at 980px. The conversation and opening scene are
hidden on mobile to keep controls and copy clear. Reader scenery is omitted below 1201px; the
right contents panel uses a 20% ink scrim above that width to keep labels readable. The star rule
in lesson navigation disappears at narrower widths. Do not animate blur, background-position,
layout or a perpetual decorative particle field.

Raster wordmarks enhance real text after loading successfully. If an asset fails, the original
accessible text and local display font remain visible. Decorative art has empty alternative text,
explicit dimensions, same-origin URLs and no pointer interception.

## Saved designs

Version 36 / `f4cd904f94158b46f991d9f06184aeca881201c9` preserves the complete design before celestial gothic.
Version 35 / `44390eb0c664491278412c0e4b1c44e955548036` preserves the darker palette before this polish.
Version 33 / `92ee93773f6bcee112856475138e5e0530a3c3d7` preserves satin before the contrast refinement.
Version 32 preserves the complete dual-theme folio before the satin enhancement.
Version 31 preserves the complete parchment presentation before the dual-theme change.
Version 30 and earlier Sites versions preserve the dimensional chamber. Git restore points include
`whiteeye-design-before-3d-2026-10-10` and `whiteeye-design-before-portal-2026-10-09`.
Restore presentation selectively: retain the version 28 lazy-corpus Worker startup fix and current
course data, personas, storage and user work.
