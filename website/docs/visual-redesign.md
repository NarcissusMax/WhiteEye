# WhiteEye engraved-room redesign

## Reference analysis before implementation

The welcome reference (`artifacts/design-v2/welcome-reference.png`) uses a narrow history column and an asymmetrical main spread. The blackletter name dominates the left half, with a 2:1 size contrast over its italic serif subtitle. A tall cathedral engraving occupies the right half. Three plain prompt rows sit beneath the introduction; they are actual entry points, not feature cards. The composer remains visible at the bottom. Thin red/stone rules and small square actions organize the room.

The reading reference (`artifacts/design-v2/reading-reference.png`) uses a wide sea engraving alongside a two-line serif heading, then a flat two-column article spread. Pale type is much brighter than the art. A single rule-and-eye separator connects the illustrated opening to the writing. Article headings have roughly twice the size of body copy; source notes are quiet but readable. The layout becomes one column on mobile.

Project-specific decisions: retain the dark header from the reading reference for a consistent theme; retain the existing eye mark and blackletter font; use the real history and existing source-backed reading copy. Generated sample conversations and invented reference prose are design placeholders, not content. On mobile the illustration recedes behind the opening while prompts become full-width rows. In active chat the welcome artwork disappears and messages gain a clear, narrow reading column.

## Asset provenance

Created with the built-in image generation tool, then encoded as WebP without changing composition. These are atmospheric illustrations, not biographical evidence. Source images remain in the generation directory. Production assets:

- `public/assets/illustrations/cathedral-window.webp` (1024 x 1536)
- `public/assets/illustrations/moonlit-sea.webp` (1536 x 1024)

## Verification

`deno task check` passed and all 55 existing tests passed. Real-browser checks used Playwright CLI in an isolated profile with a mocked chat endpoint: welcome/reading navigation, motion preference persistence, operating-system reduced motion, mobile drawer isolation/focus, memory toggle, long messages, loading/reply/error states, and delete/cancel flows passed. Viewports from 320px to 1440px had no horizontal document overflow and kept the composer visible. Screenshots are in `artifacts/design-v2/`.

The web-design-guidelines audit informed explicit image dimensions, local image MIME support, selected navigation semantics, improved drawer focus, and the motion pause control. The source-backed copy and Deno architecture remain the basis of the app. Lighthouse was attempted twice, but its npm package download timed out; no Lighthouse performance score is claimed.

## Final illustration prompts

### Cathedral window

Use case: stylized-concept. Asset type: standalone illustration for a sophisticated gothic website. Create a portrait 1024x1536 antique copperplate engraving, with the extraordinary intricate crosshatching of a 19th-century book plate. An open pointed gothic cathedral window with slender carved stone columns, tracery, sparse climbing ivy and a hint of dark crimson fabric resting on the stone sill. Through the window, a distant coastal castle silhouette, calm sea, delicate cloud hatching and an unusually large muted wine-red moon, not luminous neon. The architecture fills the right two thirds and upper center, with the left quarter and outer bottom fading organically into almost black #0b090b paper. Ivory and grey fine etched strokes on black; restrained desaturated burgundy #91414b moon/ivy accents. Strong and intricate craft detail, moody, mysterious, premium manuscript illustration. No people, no faces, no skulls, no bats, no crosses as focal symbols. No UI, no frame around the whole image, no text, no letters, no watermark. This must be a finished beautiful illustration, not a screenshot or moodboard. Preserve clean black margins for blending into a website; don't use tan paper as background.

### Moonlit sea

Use case: stylized-concept. Asset type: standalone wide illustration for a gothic editorial reading page. Generate a landscape 1536x1024 antique copperplate engraving of the sea at night viewed through crumbling ornate gothic tracery: a wide opening with stonework tracing the upper corners, low waves breaking on distant rocks, delicate ivory crosshatching describing the water and layered clouds, one muted dark crimson moon above the horizon. Refined 19th-century book illustration on almost-black #0b090b paper. Keep the sea center open and contemplative. Palette only aged ivory #ded0bd, grey, black, restrained burgundy #91414b moon. Elaborate engraving in the stone arches, subtle weathering, faded edge strokes. No people, no text, no calligraphy, no UI, no border around the entire image, no logos, no crosses as focal symbols, no skulls, no neon, no digital gradient blobs. All outer edges gently fade into the black background. Crisp detailed artwork at website scale.
