import { BEHAVIORAL_CASES, CASE_IDS } from "../src/persona/behavioral-cases.js";
import { VOICE_SCENES } from "../src/persona/voice-scenes.js";

// The editorial analysis may change, but a source anchor must never silently
// drift to another speaker or an invented quotation.
export function createBehaviorLibrary(records) {
  const byAnchor = new Map(records.map((record) => [record.file + ":" + record.line, record]));
  const sceneIds = new Set(VOICE_SCENES.map((scene) => scene.id));
  const cases = BEHAVIORAL_CASES.map((pattern) => {
    if (pattern.scene && !sceneIds.has(pattern.scene)) {
      throw Error("Behavioral case refers to a missing voice scene: " + pattern.id);
    }
    if (!pattern.sources.length || !pattern.sources.some((source) => source.quote)) {
      throw Error("Behavioral case has no primary evidence: " + pattern.id);
    }
    const sources = pattern.sources.map((source) => {
      const record = byAnchor.get(source.file + ":" + source.line);
      if (!record || record.speaker !== "whiteeye" || !record.text.includes(source.quote)) {
        throw Error(
          "Behavioral source changed or misattributed: " + pattern.id + " " +
            source.file + ":" + source.line,
        );
      }
      return { file: source.file, line: source.line, quote: source.quote };
    });
    return { ...pattern, sources };
  });
  if (new Set(cases.map((pattern) => pattern.id)).size !== cases.length) {
    throw Error("Duplicate behavioral case id.");
  }
  const byId = new Map(cases.map((pattern) => [pattern.id, pattern]));
  return Object.freeze({
    descriptors: () =>
      cases.map(({ id, situations, concepts, notice, premise, move }) => ({
        id,
        situations,
        concepts,
        notice,
        premise,
        move,
      })),
    select: (ids = []) =>
      [...new Set(ids)].filter((id) => CASE_IDS.has(id)).slice(0, 3)
        .map((id) => byId.get(id)),
    ids: () => [...byId.keys()],
  });
}
