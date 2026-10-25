const stop = new Set(
  "about after again also been could from have into just more much only really should some than that their them there these this those what when where which while with would your"
    .split(" "),
);
const words = (value) =>
  (value.toLowerCase().match(/[a-z0-9]+/g) || []).filter((word) =>
    word.length > 2 && !stop.has(word)
  );

const families = [
  ["pride", "rank", "elite", "saiyan", "royal", "strength", "power"],
  ["goku", "kakarot", "rivalry", "competition", "sparring", "defeat"],
  ["trunks", "bulla", "bulma", "father", "son", "daughter", "family", "love"],
  ["training", "discipline", "effort", "whis", "beerus", "mentor", "teach"],
  ["frieza", "namek", "granolah", "past", "guilt", "accountability", "regret"],
  ["fear", "failure", "loss", "shame", "humiliation", "setback"],
  ["cell", "mistake", "arrogance", "consequence", "reckless"],
  ["buu", "majin", "babadi", "babidi", "sacrifice", "protect"],
  ["cabba", "student", "sadala", "saiyans"],
  ["moro", "galactic", "patrol", "earth"],
  ["ultra", "ego", "destruction", "instinct", "independence"],
];

const eras = {
  saiyan: { branch: "main", through: 1, label: "Saiyan arc; Earth invasion" },
  namek: { branch: "main", through: 2, label: "Namek and Frieza arc" },
  cell: { branch: "main", through: 3, label: "Android and Cell arc" },
  majin: {
    branch: "main",
    through: 4,
    phase: "majin-before-sacrifice",
    label: "Majin Vegeta during the duel with Goku",
  },
  buu: { branch: "main", through: 4, label: "Majin Buu arc" },
  earlySuper: { branch: "main", through: 5, label: "Early Dragon Ball Super" },
  future: { branch: "main", through: 6, label: "Future Trunks arc in Dragon Ball Super" },
  tournament: { branch: "main", through: 7, label: "Tournament of Power and Broly era" },
  moro: { branch: "main", through: 8, label: "Moro arc in the Super manga" },
  granolah: { branch: "main", through: 9, label: "Granolah arc in the Super manga" },
  latest: { branch: "main", through: 10, label: "Latest established Super manga era" },
  daima: { branch: "daima", through: 5, label: "Dragon Ball DAIMA continuity" },
  gt: { branch: "gt", through: 5, label: "Dragon Ball GT continuity" },
};

// Only a user can change the playing era. Discussion of an arc or an assistant's
// own description cannot quietly change it on a later turn.
export function resolveVegetaEra(messages = []) {
  const users = typeof messages === "string"
    ? [messages]
    : messages.filter((message) => message.role === "user").map((message) => message.content);
  for (const message of users.toReversed()) {
    const text = message.toLowerCase();
    if (
      /\b(?:latest|current|present[- ]day|modern|full[- ]series|all[- ]arcs)\s+(?:vegeta|era|version)\b|\b(?:back to|switch to|use|play|portray)\s+(?:the\s+)?(?:latest|current|modern)(?:\s+vegeta)?\b/
        .test(text)
    ) return { ...eras.latest, explicit: true };
    const setting =
      /\b(?:as|during|in|from|through|switch to|roleplay|play|portray|use|be|on)\b.{0,45}\b(?:era|arc|saga|vegeta|gt|daima|super|namek|cell|buu|tournament|moro|granolah)\b|\b(?:gt|daima|saiyan[- ]arc|namek[- ]arc|cell[- ]arc|buu[- ]arc)\s+vegeta\b/
        .test(text);
    if (!setting) continue;
    if (/\b(?:dragon ball )?gt\b/.test(text)) return { ...eras.gt, explicit: true };
    if (/\bdaima\b/.test(text)) return { ...eras.daima, explicit: true };
    if (
      /\b(?:saiyan|earth invasion|nappa)\s+(?:arc|saga|era|invasion)\b|\bearly villain vegeta\b/
        .test(text)
    ) return { ...eras.saiyan, explicit: true };
    if (/\b(?:namek|frieza)\s+(?:arc|saga|era)\b|\bvegeta on namek\b/.test(text)) {
      return { ...eras.namek, explicit: true };
    }
    if (/\b(?:android|cell)\s+(?:arc|saga|era)\b/.test(text)) {
      return { ...eras.cell, explicit: true };
    }
    if (/\bmajin vegeta\b/.test(text)) {
      return /\bafter (?:his |the )?sacrifice\b/.test(text)
        ? { ...eras.buu, explicit: true }
        : { ...eras.majin, explicit: true };
    }
    if (/\b(?:majin|buu)\s+(?:arc|saga|era|vegeta)\b/.test(text)) {
      return { ...eras.buu, explicit: true };
    }
    if (/\b(?:battle of gods|resurrection f|universe 6|cabba|early super)\b/.test(text)) {
      return { ...eras.earlySuper, explicit: true };
    }
    if (/\b(?:future trunks|goku black|zamasu)\s*(?:arc|saga|era)?\b/.test(text)) {
      return { ...eras.future, explicit: true };
    }
    if (/\b(?:tournament of power|universe survival|broly)\s*(?:arc|saga|era)?\b/.test(text)) {
      return { ...eras.tournament, explicit: true };
    }
    if (/\bmoro\s*(?:arc|saga|era)?\b/.test(text)) return { ...eras.moro, explicit: true };
    if (/\b(?:granolah|cereal)\s*(?:arc|saga|era)?\b/.test(text)) {
      return { ...eras.granolah, explicit: true };
    }
    if (/\b(?:super hero|superhero|latest super)\s*(?:arc|saga|era)?\b/.test(text)) {
      return { ...eras.latest, explicit: true };
    }
  }
  return { ...eras.latest, explicit: false };
}

const anchors = new Set([
  "01-arrival",
  "03-cruelty",
  "07-namek-harm",
  "09-cell-pride",
  "11-cell-loss",
  "13-majin",
  "14-sacrifice",
  "14-family-farewell",
  "15-cooperation",
  "15-recognition",
  "17-beerus-fear",
  "18-cabba",
  "23-different-path",
  "24-granolah",
  "26-black-frieza",
  "27-superhero",
  "28-daima",
  "30-gt",
  "31-gt-fusion",
]);

export function createVegetaLibrary(corpus) {
  const sources = new Map(corpus.inventory.map((source) => [source.id, source]));
  const notes = corpus.notes.map((note) => {
    if (!sources.has(note.source)) throw Error(`Missing Vegeta source: ${note.source}`);
    return note;
  });
  return {
    find(query, { era = resolveVegetaEra(), limit = 7 } = {}) {
      const latest = typeof query === "string" ? query : query.latest || "";
      const prior = typeof query === "string" ? "" : query.prior || "";
      const wanted = new Map(words(latest).map((word) => [word, 1]));
      for (const word of words(prior)) if (!wanted.has(word)) wanted.set(word, 0.25);
      for (const family of families) {
        if (family.some((word) => wanted.has(word))) {
          for (const word of family) if (!wanted.has(word)) wanted.set(word, 0.18);
        }
      }
      const eligible = notes.filter((note) =>
        note.stage <= era.through &&
        (!note.branch ? era.branch === "main" || note.stage <= 4 : note.branch === era.branch) &&
        (era.phase !== "majin-before-sacrifice" || note.stage < 4 ||
          ["12-young-trunks", "13-majin"].includes(note.id))
      );
      const score = (note) => {
        const terms = words(
          `${note.topic} ${note.tags.join(" ")} ${note.observation} ${note.behavior}`,
        );
        let total = 0;
        for (const word of terms) total += wanted.get(word) || 0;
        for (const tag of note.tags) {
          if (latest.toLowerCase().includes(tag)) total += 2;
        }
        return total / Math.sqrt(Math.max(1, terms.length));
      };
      const ranked = eligible.map((note) => ({ note, score: score(note) }))
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score || a.note.stage - b.note.stage);
      const selected = ranked.slice(0, limit).map(({ note }) => note);
      const timeline = eligible.filter((note) => anchors.has(note.id));
      const context = [
        ...new Map([...timeline, ...selected].map((note) => [note.id, note])).values(),
      ];
      const hydrate = (note) => ({ ...note, sourceTitle: sources.get(note.source).title });
      const references = [...new Set(context.map((note) => note.source))].map((id) => ({
        ...sources.get(id),
        topics: context.filter((note) => note.source === id).map((note) => note.topic),
      }));
      return {
        era,
        timeline: timeline.map(hydrate),
        evidence: selected.map(hydrate),
        references,
        coverage: {
          era: era.label,
          branch: era.branch,
          researchNotes: notes.length,
          eligibleNotes: eligible.length,
          matchedNotes: ranked.length,
          includedNotes: selected.length,
        },
      };
    },
  };
}
