import { tokens } from "./retrieval.js";

const families = [
  ["persuasion", "influence", "offer", "audience", "credibility", "negotiation", "bargaining"],
  ["trust", "friendship", "friends", "loyalty", "alliance", "team", "betrayal", "relationship"],
  ["information", "evidence", "secrets", "disclosure", "uncertainty", "assumptions", "motive"],
  ["strategy", "plan", "preparation", "reversal", "counterplay", "fallback", "failure", "limits"],
  ["power", "authority", "reputation", "status", "framing", "identity", "recognition"],
  ["emotion", "memory", "fear", "resentment", "history", "detachment", "desire"],
  ["money", "debt", "gambling", "chance", "luck", "scarcity", "resources"],
  ["coercion", "threat", "isolation", "pressure", "danger", "boundaries", "control"],
];
const anchors = [
  "johan-v04-trust-and-emotion",
  "yuichi-friends-and-ruthlessness",
  "johan-v08-detachment-is-not-care",
  "yuichi-v11-skill-has-limits",
];
const terms = (text) => tokens(text).map((term) => term.replace(/s$/, ""));

// This library contains original research from descriptions, not primary manga
// text. Coverage of every volume's description never implies reading its pages.
export function createImpLibrary(corpus, { tomodachiLibrary = null } = {}) {
  const sources = new Map(corpus.inventory.map((source) => [source.id, source]));
  const ids = new Set();
  const rows = corpus.notes.map((note) => {
    if (!sources.has(note.source) || ids.has(note.id)) {
      throw Error(`Invalid IMP research note: ${note.id}`);
    }
    ids.add(note.id);
    const counts = new Map();
    for (
      const term of terms(
        [note.topic, ...note.tags, note.observation, note.interpretation].join(" "),
      )
    ) {
      counts.set(term, (counts.get(term) || 0) + 1);
    }
    return { note, counts, length: [...counts.values()].reduce((sum, count) => sum + count, 0) };
  });
  const frequencies = new Map();
  for (const row of rows) {
    for (const term of row.counts.keys()) frequencies.set(term, (frequencies.get(term) || 0) + 1);
  }
  const average = rows.reduce((sum, row) => sum + row.length, 0) / Math.max(1, rows.length);
  const countSources = (work, kind) =>
    corpus.inventory.filter((source) => source.work === work && source.kind === kind).length;
  return {
    find(query, { budget = 8000, limit = 10, primaryBudget = 10000, primaryLimit = 5 } = {}) {
      const latest = typeof query === "string" ? query : query.latest || "";
      const prior = typeof query === "string" ? "" : query.prior || "";
      const weights = new Map(terms(latest).map((term) => [term, 1]));
      for (const term of terms(prior)) if (!weights.has(term)) weights.set(term, 0.25);
      for (const family of families) {
        const related = terms(family.join(" "));
        if (related.some((term) => weights.has(term))) {
          for (const term of related) if (!weights.has(term)) weights.set(term, 0.12);
        }
      }
      const namedMonster = /\bjohan\b|\bmonster\b/i.test(latest);
      const namedTomodachi = /\byu+ichi\b|\bkatagiri\b|\btomodachi\b/i.test(latest);
      const ranked = rows.map(({ note, counts, length }) => {
        let score = 0;
        for (const [term, weight] of weights) {
          const count = counts.get(term) || 0;
          if (!count) continue;
          const frequency = frequencies.get(term);
          const idf = Math.log(1 + (rows.length - frequency + 0.5) / (frequency + 0.5));
          score += weight * idf * count * 2.2 /
            (count + 1.2 * (0.25 + 0.75 * length / Math.max(1, average)));
        }
        const source = sources.get(note.source);
        if (
          (namedMonster && source.work === "Monster") ||
          (namedTomodachi && source.work === "Tomodachi Game")
        ) score *= 1.5;
        const volume = latest.match(/\b(?:vol(?:ume)?\.?|v)\s*(\d{1,2})\b/i);
        if (
          volume && source.volume === Number(volume[1]) &&
          ((namedMonster && source.work === "Monster") ||
            (namedTomodachi && source.work === "Tomodachi Game"))
        ) score += 20;
        return { note, score };
      }).filter((row) => row.score > 0)
        .sort((a, b) => b.score - a.score || a.note.id.localeCompare(b.note.id));
      const matches = ranked.filter((row) => row.score >= (ranked[0]?.score || 0) * 0.2);
      const hydrate = (note) => {
        const source = sources.get(note.source);
        return {
          id: note.id,
          topic: note.topic,
          work: source.work,
          character: source.character,
          source: source.id,
          sourceKind: source.kind,
          sourceTitle: source.title,
          observation: note.observation,
          interpretation: note.interpretation,
        };
      };
      const context = [];
      let used = 2;
      const add = (note) => {
        if (!note || context.length >= limit || context.some((item) => item.id === note.id)) return;
        const item = hydrate(note);
        const size = JSON.stringify(item).length + (context.length ? 1 : 0);
        if (used + size > budget) return;
        context.push(item);
        used += size;
      };
      // Relevant evidence gets first claim on space; alternate the stable
      // character anchors so neither work disappears on a small context budget.
      add(matches[0]?.note);
      for (const id of anchors) add(rows.find(({ note }) => note.id === id)?.note);
      for (const { note } of matches) add(note);
      const references = [...new Set(context.map((note) => note.source))].map((id) => {
        const source = sources.get(id);
        return {
          id,
          title: source.title,
          url: source.url,
          kind: source.kind,
          topics: context.filter((note) => note.source === id).map((note) => note.topic),
        };
      });
      const primary = tomodachiLibrary?.find(query, { budget: primaryBudget, limit: primaryLimit });
      return {
        context,
        primary,
        references: [...references, ...(primary?.references || [])],
        coverage: {
          ...corpus.coverage,
          completeTexts: false,
          primaryMangaVolumesIndexed: 0,
          monsterVolumeDescriptionsReviewed: countSources("Monster", "official-volume-description"),
          tomodachiVolumeDescriptionsReviewed: countSources(
            "Tomodachi Game",
            "official-volume-description",
          ),
          tomodachiAnimeSynopsesReviewed: countSources("Tomodachi Game", "official-anime-synopsis"),
          researchNotes: rows.length,
          ...(primary
            ? {
              tomodachiPrimary: primary.coverage,
              primaryMangaChapterFilesIndexed: primary.coverage.sourceFiles,
              primaryMangaPagesIndexed: primary.coverage.primaryPagesIndexed,
            }
            : {}),
          matchingNotes: matches.length,
          includedNotes: context.length,
          omittedMatchingNotes:
            matches.filter(({ note }) => !context.some((item) => item.id === note.id)).length,
        },
      };
    },
  };
}
