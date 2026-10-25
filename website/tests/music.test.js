import { getSoundtrack, SOUNDTRACKS } from "../public/js/soundtracks.js";

const assert = (condition, message = "Assertion failed") => {
  if (!condition) throw Error(message);
};

Deno.test("soundtrack catalog has distinct, playable instrumental arrangements", () => {
  assert(SOUNDTRACKS.length === 5);
  assert(SOUNDTRACKS[0].id === "blind-spots");
  assert(SOUNDTRACKS.some((track) => track.id === "lit-var"));
  assert(new Set(SOUNDTRACKS.map((track) => track.id)).size === SOUNDTRACKS.length);
  for (const track of SOUNDTRACKS) {
    assert(track.title && track.description);
    if (track.recording) {
      assert(!Object.hasOwn(track, "videoId"));
      assert(getSoundtrack(track.id) === track);
      continue;
    }
    assert(track.bpm >= 50 && track.bpm <= 100);
    assert(track.chords.length === track.lead.length);
    assert(track.chords.length >= 8);
    assert(track.pattern.length >= track.beats);
    assert(
      track.chords.every((chord) =>
        chord.length === 4 && chord.every((note) => note >= 40 && note <= 80)
      ),
    );
    assert(track.pattern.every((index) => index >= 0 && index < 4));
    assert(
      track.lead.every((bar) =>
        bar.every(([beat, note, duration]) =>
          beat >= 0 && beat < track.beats && duration > 0 && beat + duration <= track.beats + .1 &&
          note >= 60 && note <= 84
        )
      ),
    );
    assert(getSoundtrack(track.id) === track);
  }
  assert(getSoundtrack("unknown") === SOUNDTRACKS[0]);
});
