# Patrick Jane research and implementation

Research date: 2 October 2026. This is an AI interpretation of Patrick Jane from _The Mentalist_.
The implementation uses original characterization notes, not a redistributed script collection.

## Scope and evidence

- Searched 150 episode transcript files across all seven seasons, comprising roughly 753,000 words.
- Closely reviewed the scene ranges cited in notes for 47 of those files.
- Examined the 54-page _Scarlett Fever_ production draft and three creator/cast interviews.
- Created 51 original scene and performance notes. Each records its source, locator, observation,
  transferable behavior, and a limitation or counterexample.

The full inventory and original notes are in `private/jane-research.json`. Entries distinguish
`collection-searched` from `scene-reviewed`. This does not mean every scene was closely read, every
episode was watched, or every line was assigned a verified speaker.

The transcript collection is
[Springfield Springfield's episode index](https://www.springfieldspringfield.co.uk/episode_scripts.php?tv-show=the-mentalist).
It contains combined multipart material, including the season-three finale, and inconsistent speaker
labels. Extracted line locators refer to the cached text with HTML breaks preserved; they are
research locators, not official scene or subtitle numbers. Source hashes document the version
searched. Runtime retrieval searches the original notes; it does not search or reproduce all raw
transcripts during each reply.

The [Scarlett Fever draft](https://thescriptsavant.com/tv/The_Mentalist_1x15_-_Scarlett_Fever.pdf)
helps establish speaker attribution, staging, concrete deduction and procedural objections. Draft
details are distinguished from aired canon. The interviews cover
[anger, revenge and life after the mission](https://www.tvguide.com/news/mentalist-bruno-heller-season-6-premiere-1071429/),
[the risk of emotional disclosure](https://www.tvguide.com/news/mentalist-finale-robin-tunney-simon-baker-jane-lisbon-1081949/),
and
[the sincere ending](https://www.tvguide.com/news/the-mentalist-series-finale-recap-jane-lisbon-wedding/).
Creator/cast interpretation informs performance; actors' real biographies are not character canon.

## Characterization

The prompt covers observation versus inference, hypothesis testing, attention and misdirection,
learned performance, memory, skepticism, generosity, dry humor, social flexibility, grief, shame,
gratitude, intimacy, fear of loss, loyalty, autonomy, arrogance, failure and consequences. The notes
include times Jane needs help, is countered, guesses, apologizes, accepts another investigator's
insight, or makes a technically successful choice that damages a relationship.

The timeline distinguishes the CBI investigation, the Red John resolution, the period abroad, FBI
work, the open relationship and the finale. Explicit season/episode instructions persist through
follow-ups and filter later notes and canon. Later corrections to an early scene are stored
separately and withheld until their point in the story. Flashbacks, hallucinations, amnesia and
performed breakdowns are not interchangeable with his ordinary state.

## Runtime behavior

The server chooses relevant original notes using weighted term and topic matching. It adds a small
set of contrasting voice/behavior notes appropriate to the active timeline, within a bounded
context. The persona writes original conversational replies. A native expandable source detail shows
the supplied research context and its public links. This is labeled **AI interpretation**; there is
no claim of exact dialogue or sentence-by-sentence verification.

Existing transcript-copying behavior for owner-supplied Tate and COTE sources remains separate. Live
turns and saved recall remain isolated by persona. Jane does not see private messages told to
another persona. A text chat provides no visual or physiological evidence about the visitor.

## Limits

Transcripts omit gestures, delivery, timing and sometimes speaker attribution. Search and close
review are incomplete coverage of the entire performance. The model may still misinterpret a note or
generate an unsupported inference. The prompt instructs it to keep uncertainty visible and decline
to invent an unestablished quote, preference or later event. No claim of perfect replication is
made. No externally researched raw transcript corpus is shipped with the site.
