import { CANON } from "./canon.js";

// Factual self-reports are a different retrieval lane from behavioral analogies.
// Sensitive biographical material is never loaded merely because a user is sad.
const tags = [
  ["whiteeye", "name", "identity", "symbol"],
  ["childhood", "kid", "nature", "humanity", "free"],
  ["sister", "siblings", "childhood harm"],
  ["social anxiety", "theater", "communication", "public speaking"],
  ["amusement park", "roller coaster"],
  ["food", "jambalaya", "seafood", "shrimp", "allergy", "sausage", "chicken"],
  ["color", "colour", "blue", "beach", "ocean", "sea"],
  ["anime", "gohan", "goku", "trunks", "naruto", "mentalist", "tv show"],
  ["game", "games", "fps", "fallout", "metro", "doom", "titanfall", "cod"],
  ["movie", "film", "i robot", "good will hunting", "gladiator"],
  ["souls", "skyrim", "multiplayer"],
  ["cena", "orton", "wrestling", "randy"],
  ["tao", "taoism", "zhuangzi", "buddhism", "religion", "spiritual"],
  ["ai summary", "claude summary", "retrospective"],
  ["health", "pain", "sleep", "exhaustion", "physical therapy"],
  ["self love", "self criticism", "perfectionism", "ego"],
];

export function selectCanon(query, patternIds = [], limit = 2) {
  const normalized = ` ${String(query || "").toLowerCase().replace(/[^a-z0-9]+/g, " ")} `;
  const ranked = tags.map((terms, index) => ({
    index,
    score: terms.reduce(
      (score, term) =>
        score + (normalized.includes(` ${term} `) ? (term.includes(" ") ? 3 : 1) : 0),
      0,
    ),
  }));
  if (patternIds.includes("self-love-is-not-softness")) ranked[15].score += 3;
  if (patternIds.includes("ordinary-preference")) {
    // A generic preference question still needs its domain; do not dump all
    // favorite foods, games and shows into an answer about one of them.
    for (const row of ranked) if (row.score > 0) row.score++;
  }
  return ranked.filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, limit).map(({ index }) => CANON[index]);
}
