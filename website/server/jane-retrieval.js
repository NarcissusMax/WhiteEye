import { tokens } from "./retrieval.js";

const families = [
  ["observation", "observe", "notice", "deduction", "deduce", "evidence", "clue", "reasoning"],
  ["psychic", "mentalism", "mentalist", "fraud", "skepticism", "skeptic", "belief", "faith"],
  ["hypnosis", "hypnotize", "suggestion", "influence", "persuasion", "manipulation"],
  ["grief", "loss", "mourning", "bereavement", "death", "daughter", "charlotte", "angela"],
  ["memory", "remember", "recall", "mnemonics", "palace", "forget", "amnesia"],
  ["father", "childhood", "carnival", "alex", "upbringing", "conscience"],
  ["love", "romance", "intimacy", "vulnerability", "relationship", "affection", "lisbon"],
  ["fear", "afraid", "scared", "anxiety", "danger", "protectiveness", "control"],
  ["friend", "friendship", "team", "colleague", "loyalty", "trust", "abbott"],
  ["money", "wealth", "poker", "gambling", "generosity", "gift"],
  ["help", "therapy", "psychiatry", "psychiatrist", "hospital", "shame", "sophie"],
  ["future", "marriage", "wedding", "pregnancy", "ring", "family", "happiness"],
];
const terms = (text) => tokens(text).map((term) => term.replace(/s$/, ""));
const seasonWords = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7 };
const finalEpisodes = [0, 23, 23, 24, 24, 22, 22, 13];

// An explicit timeline choice survives follow-up turns. Only human instructions
// set it; an assistant's own plot discussion cannot silently move the boundary.
export function resolveJaneEra(messages = []) {
  const users = typeof messages === "string"
    ? [messages]
    : messages.filter((message) => message.role === "user").map((message) => message.content);
  for (const text of users.toReversed()) {
    if (
      /\b(?:full series|all seasons|post[- ]series|after (?:the )?finale|latest (?:era|jane))\b/i
        .test(text)
    ) {
      return { through: 713, label: "Full series; latest established Jane", explicit: true };
    }
    const episode = text.match(/\bs0?([1-7])\s*e0?(\d{1,2})\b/i);
    const season = text.match(/\bseason\s+([1-7]|one|two|three|four|five|six|seven)\b/i);
    if (episode || season) {
      const s = episode
        ? Number(episode[1])
        : Number(season[1]) || seasonWords[season[1].toLowerCase()];
      const specified = episode || text.match(/\bepisode\s+(\d{1,2})\b/i);
      const e = specified
        ? Math.min(finalEpisodes[s], Math.max(1, Number(episode ? episode[2] : specified[1])))
        : finalEpisodes[s];
      if (
        s * 100 + e > 607 &&
        /\b(?:before|pre[- ]?)\s*(?:the )?red john\b/i.test(text)
      ) {
        return { through: 607, label: "CBI era; before the Red John resolution", explicit: true };
      }
      if (s * 100 + e > 621 && /\bearly fbi\b/i.test(text)) {
        return {
          through: 621,
          label: "Early FBI era; before the season-six finale",
          explicit: true,
        };
      }
      return { through: s * 100 + e, label: `Through season ${s}, episode ${e}`, explicit: true };
    }
    if (/\b(?:before|pre[- ]?)\s*(?:the )?red john\b|\b(?:early[- ]|cbi )era\b/i.test(text)) {
      return { through: 607, label: "CBI era; before the Red John resolution", explicit: true };
    }
    if (/\bearly fbi\b/i.test(text)) {
      return { through: 621, label: "Early FBI era; before the season-six finale", explicit: true };
    }
    if (/\b(?:after|post[- ]?)\s*(?:the )?red john\b|\b(?:later|fbi) era\b/i.test(text)) {
      return {
        through: 713,
        label: "After the Red John resolution; latest established Jane",
        explicit: true,
      };
    }
    if (/\bearly jane\b/i.test(text)) {
      return { through: 123, label: "Early Jane; through season one", explicit: true };
    }
  }
  return { through: 713, label: "Full series; latest established Jane", explicit: false };
}

const styleIds = [
  "jane-s01e01-observation-and-loss",
  "jane-s01e10-help-and-shame",
  "jane-s03e12-intuition-meets-data",
  "jane-s03e18-compassion-without-performance",
  "jane-s06e22-honesty-beyond-the-trick",
  "jane-s07e13-past-and-future-together",
];

export function createJaneLibrary(corpus) {
  const sources = new Map(corpus.inventory.map((source) => [source.id, source]));
  const rows = corpus.notes.map((note) => {
    if (!sources.has(note.source)) throw Error("Jane research source is missing.");
    const counts = new Map();
    for (
      const term of terms(
        [note.topic, note.tags.join(" "), note.observation, note.pattern].join(" "),
      )
    ) {
      counts.set(term, (counts.get(term) || 0) + 1);
    }
    return { note, counts, length: [...counts.values()].reduce((a, b) => a + b, 0) };
  });
  const frequencies = new Map();
  for (const row of rows) {
    for (const term of row.counts.keys()) frequencies.set(term, (frequencies.get(term) || 0) + 1);
  }
  const average = rows.reduce((sum, row) => sum + row.length, 0) / rows.length;
  return {
    find(query, { era = resolveJaneEra(), budget = 12000, limit = 9 } = {}) {
      const latest = typeof query === "string" ? query : query.latest || "";
      const prior = typeof query === "string" ? "" : query.prior || "";
      const weights = new Map(terms(latest).map((term) => [term, 1]));
      for (const term of terms(prior)) if (!weights.has(term)) weights.set(term, 0.3);
      for (const family of families) {
        const related = terms(family.join(" "));
        if (related.some((term) => weights.has(term) && weights.get(term) >= 0.3)) {
          for (const term of related) if (!weights.has(term)) weights.set(term, 0.15);
        }
      }
      const eligible = rows.filter(({ note }) => note.ordinal <= era.through);
      const hydrate = (note) => {
        const source = sources.get(note.source);
        const { laterCanon, ...base } = note;
        return {
          ...base,
          ...(laterCanon?.ordinal <= era.through ? { laterCanon: laterCanon.text } : {}),
          title: source.title,
          episode: source.episode,
          sourceKind: source.kind,
          url: source.url,
        };
      };
      const normalized = latest.toLowerCase().replace(/[^a-z0-9]+/g, " ");
      const ranked = eligible.map(({ note, counts, length }) => {
        let score = 0;
        for (const [term, weight] of weights) {
          const count = counts.get(term) || 0;
          if (!count) continue;
          const idf = Math.log(
            1 + (rows.length - frequencies.get(term) + 0.5) / (frequencies.get(term) + 0.5),
          );
          score += weight * idf * count * 2.2 / (count + 1.2 * (0.25 + 0.75 * length / average));
        }
        const source = sources.get(note.source);
        const title = source.title.toLowerCase().replace(/[^a-z0-9]+/g, " ");
        if (normalized.includes(note.source) || (title.length > 5 && normalized.includes(title))) {
          score += 30;
        }
        return { note, score };
      }).filter((row) => row.score > 0).sort((a, b) =>
        b.score - a.score || a.note.id.localeCompare(b.note.id)
      );
      const threshold = (ranked[0]?.score || 0) * 0.25;
      const matches = ranked.filter((row) => row.score >= threshold);
      const evidence = [];
      let used = 0;
      for (const { note } of matches) {
        const item = hydrate(note);
        const size = JSON.stringify(item).length;
        if (evidence.length >= limit || used + size > budget) continue;
        evidence.push(item);
        used += size;
      }
      const styles = eligible.filter(({ note }) => styleIds.includes(note.id))
        .map(({ note }) => hydrate(note));
      const context = [...evidence, ...styles];
      const references = [...new Set(context.map((note) => note.source))].map((id) => {
        const source = sources.get(id);
        return {
          id,
          title: source.title,
          episode: source.episode,
          url: source.url,
          kind: source.kind,
          notes: context.filter((note) => note.source === id).map((note) => note.topic),
        };
      });
      return {
        evidence,
        styles,
        references,
        era,
        coverage: {
          ...corpus.coverage,
          matchingNotes: matches.length,
          includedNotes: evidence.length,
          omittedNotes: matches.length - evidence.length,
          eligibleNotes: eligible.length,
          era: era.label,
        },
      };
    },
  };
}
