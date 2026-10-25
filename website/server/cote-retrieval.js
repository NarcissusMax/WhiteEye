import { createSourceRetriever } from "./tate-retrieval.js";

const families = [
  ["equality", "equal", "inequality", "ability", "talent", "merit"],
  ["friendship", "friend", "friends", "trust", "relationships"],
  ["freedom", "free", "independence", "escape"],
  ["strategy", "plan", "planning", "tactics", "exam", "competition"],
  ["emotion", "emotions", "feelings", "feel", "love"],
  ["defeat", "lose", "loss", "winning", "win", "victory"],
];

export function createCoteRetriever(corpus, options = {}) {
  // Source-checked scenes, excluding other characters' opening monologues.
  const anchors = [
    ["cote_1.pdf", "Are people equal or not?"],
    ["cote_1.pdf", "Nice to meet you. I’m Ayanokouji Kiyotaka."],
    ["cote_1.pdf", "What is friendship?"],
    ["cote_y2_9-5.pdf", "Irreplaceable Daily Life"],
  ];
  const styleIds = anchors.map(([file, phrase]) => {
    const doc = corpus.documents.find((source) => source.file === file);
    const offset = doc?.text.indexOf(phrase) ?? -1;
    return corpus.records.find((row) =>
      row.document === doc?.id && offset >= row.start && offset < row.end
    )?.id;
  }).filter(Boolean);
  return createSourceRetriever(corpus, { families, styleIds, ...options });
}
