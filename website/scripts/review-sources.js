import { cleanSource } from "../server/retrieval.js";
const corpus = JSON.parse(
  await Deno.readTextFile(new URL("../private/corpus.json", import.meta.url)),
);
const which = Deno.args[0] || "";
const mode = Deno.args[1] || "overview";
const rows = corpus.records.filter((r) => r.file.includes(which) && r.speaker === "whiteeye");
if (mode === "all") {
  // Exhaustive paginated review: no sampling or length-based exclusion. Includes
  // both speakers so reactions are not mistaken for free-standing beliefs.
  const start = Number(Deno.args[2] || 0);
  const count = Math.min(250, Number(Deno.args[3] || 60));
  const all = corpus.records.filter((r) => r.file.includes(which));
  for (const r of all.slice(start, start + count)) {
    console.log(
      `[${r.file}:${r.line} ${r.date || ""} ${r.speaker}]\n${
        cleanSource(r.text) || "[non-text event]"
      }\n`,
    );
  }
  console.log(`RECORDS ${start}–${Math.min(start + count, all.length)} OF ${all.length}`);
} else if (mode === "overview") {
  // Every message contributes to the corpus statistics; select substantive passages
  // across the whole timeline and preserve exact line references for inspection.
  const words = new Map();
  for (const r of rows) {
    for (const w of r.text.toLowerCase().match(/\b[a-z']{4,}\b/g) || []) {
      words.set(w, (words.get(w) || 0) + 1);
    }
  }
  console.log(
    "MESSAGES",
    rows.length,
    "WORDS",
    JSON.stringify([...words].sort((a, b) => b[1] - a[1]).slice(0, 65)),
  );
  const substantial = rows.filter((r) =>
    r.text.length > 240 && !/^(https?:|\{|\[Clip|\[GIF)/.test(r.text)
  );
  const count = 45;
  for (let i = 0; i < Math.min(count, substantial.length); i++) {
    const r = substantial[Math.floor(i * substantial.length / count)];
    console.log(`\n[${r.file}:${r.line} ${r.date}]\n${r.text}`);
  }
} else {
  const pattern = new RegExp(mode, "i");
  for (const r of rows.filter((r) => pattern.test(r.text)).slice(0, 80)) {
    console.log(`\n[${r.file}:${r.line} ${r.date}]\n${r.text}`);
  }
}
