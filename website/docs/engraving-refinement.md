# WhiteEye engraving refinement, October 3, 2026

## Visual evidence and direction

The previous browser capture (`whiteeye-app/artifacts/blend-before.png`) showed a bright, metallic
rose floating over an intricate cathedral engraving. Its smooth curves, highlights and independent
rotation competed with the stone crosshatching and moon. The artwork also ended abruptly above a
composer surrounded by several borders. This conflicted with the app's engraved-book identity.

The built-in image generator produced a desktop reference, saved in the local app as
`artifacts/engraving-reference.png`. It retains the app shell and clearly separates an ivory
blackletter welcome on the left from etched architecture and a wine-red moon on the right. The
reference uses a roughly 3:2 image-to-copy spread; the name is about three times the subtitle's
height. Fine grey rules and square, dark controls organise the page. Its surrounding chrome stays
near-black and its composer has one border. These relationships, rather than generated sample
text or extra boxed prompt rows, guide the implementation. Existing starter rows stay unboxed.

Design read: a conversation app for a small personal audience, in WhiteEye's gothic manuscript
language. Design variance stays 7 and visual density 3; motion intensity drops from 6 to 4. Motion
belongs inside the illustration and responds gently to the visitor. It does not add a second focal
object or move text while it is being read.

## Translation into the app

- One shared artwork frame contains the still engraving and its Three.js canvas. Only one is
  visible at a time. Both receive the same left, top and bottom feathering into the page.
- A subdivided textured plane gives stone and ivy shallow relief against the distant window.
  The source illustration's palette and crosshatching remain the material; sRGB colour handling
  preserves its appearance. Small camera offsets create pointer-led depth. Slow moonlight and
  subpixel movement stay within the etched scene. There are no floating rings or particles.
- Frame rate and pixel density are capped. The render loop contains no layout reads and changes
  DOM state only on transitions. Three.js loads on welcome interaction, in an idle callback, so
  its renderer and library do not block the first paint. The scene settles and stops redrawing
  after the pointer rests. Hidden welcomes, inactive tabs and motion preferences stop
  rendering. Reduced motion and manual pause render a still image; lost or unavailable WebGL
  restores the original image. The active transcript has no animated artwork behind it.
- Header, sidebar and footer share an ink surface; dialogs and the music menu share a raised
  surface and consistent border treatment. The composer uses one border with a clear focused
  state. The new-chat action is quieter, and library/music controls use more legible type.
- The engraving supplies the texture. Removed the unrelated full-screen noise filter and drifting
  dust, and made the room's outer light static. This leaves one coherent motion source and avoids
  expensive background rendering. Accessible names include the controls' visible labels.
- Long persona headings use a smaller, balanced scale. Mobile art has lower opacity and a
  stronger fade behind the heading. The composer and controls remain reachable.
- The 42 × 30 cursor eye remains without trailing dots. Its unused inherited colour/motion
  variables were removed so cursor movement does not force page-wide style updates.

## Reference prompt

Built-in image generation edited the existing browser capture using the cathedral engraving as
the art reference. The prompt requested: preserve the WhiteEye shell, gothic name, ivory serif
hierarchy, personal history sidebar, persona/model controls, starter rows and composer; remove
the floating metallic rose; use the original etched cathedral, moon and sea as one illustration;
fade the image to near-black at its edges; unify ink surfaces, wine actions and fine grey rules;
retain existing copy and functions; add no badges, sections, glass, particles or extra slogans.

The generated reference is design evidence, not a deployed screenshot or a new production asset.
The production artwork remains the original same-origin WebP.
