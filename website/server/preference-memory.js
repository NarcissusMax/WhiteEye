// Broad preference questions need the complete relevant self-reports. A
// relevance-ranked search can drop a second list or an unpaired DM answer.
const LOOKSMAX = "Whiteye DMS (txt file looksmax account).txt";
const INSTAGRAM = "WhiteEye Instagram Dms.txt";
const OLD = "Whiteye DMS (txt file old account).txt";

const GAME_SOURCES = [
  {
    file: LOOKSMAX,
    line: 12277,
    mustContain: ["Minecraft, Skyrim, and fallout", "Skyrim is obviously in first"],
  },
  {
    file: LOOKSMAX,
    line: 13144,
    mustContain: [
      "Telltale walking dead",
      "Beyond two souls",
      "Life is strange",
      "Metro",
      "Uncharted",
      "Telltale the wolf among us",
      "Yakuza",
      "Detroit become human",
      "Until dawn",
      "Outcast",
      "Dead space",
      "Silent hill",
    ],
  },
  { file: LOOKSMAX, line: 13159, mustContain: ["Heavy rain"] },
  { file: LOOKSMAX, line: 13179, mustContain: ["Witcher 3", "mass effect people say is good"] },
  {
    file: LOOKSMAX,
    line: 13207,
    mustContain: [
      "yakuza 0",
      "my favorite series",
      "my 100% favorite",
      "telltale the walking dead",
    ],
  },
  { file: LOOKSMAX, line: 32106, mustContain: ["Modern warfare 3", "favorite cod campaign"] },
  {
    file: INSTAGRAM,
    line: 2425,
    mustContain: [
      "COD MW 2 or 3",
      "BO2",
      "Titanfall 1 & 2",
      "doom",
      "cyberpunk",
      "fallout series",
      "Dying light 1",
      "Metro series",
    ],
  },
  { file: OLD, line: 26075, mustContain: ["rougebook", "you should try it out"] },
];

const COMPLETE_GAMES_REPLY =
  "Telltale The Walking Dead is my 100% favorite story game, and Yakuza is my favorite series. " +
  "I'd start with Yakuza 0. " +
  "Fallout would be my favorite FPS if you count it as one. For modded games my top 3 is " +
  "Minecraft, Skyrim, and Fallout, with Skyrim obviously first. MW3 is still my favorite COD campaign.\n\n" +
  "Other story games I named: Beyond Two Souls, Life Is Strange, Metro, Uncharted, " +
  "Telltale The Wolf Among Us, Detroit Become Human, Until Dawn, Outcast, Dead Space, " +
  "Silent Hill, Heavy Rain, and The Witcher 3. For FPS campaigns I brought up MW2, MW3, " +
  "BO2, Titanfall 1 and 2, Doom, Cyberpunk, Dying Light 1, and Metro too. " +
  "I also recommended Roguebook. Mass Effect was only something I said people say is good; " +
  "I didn't call that one a favorite.";

export function isCompleteGameQuestion(messages) {
  const latest = messages.at(-1)?.content?.trim() || "";
  if (!latest || latest.length > 280 || /\n/.test(latest)) return false;
  const text = latest.toLowerCase();
  // Keep single-title and subgenre questions in the ordinary conversation path.
  if (
    /\b(?:fps|cod|campaign|souls|story games|modded games|doom|skyrim|fallout|yakuza)\b/.test(text)
  ) {
    return false;
  }
  if (/^(?:favou?rite|fave|top) games?\??$/.test(text)) return true;
  const broad = /\b(?:games?|gaming|video games?|titles?)\b/.test(text) &&
    /\b(?:your|you|whiteeye|his)\b/.test(text) &&
    /\b(?:favou?rites?|faves?|like|liked|love|enjoy|top|best|list|recommend)\b/
      .test(text) &&
    /\b(?:what|which|name|list|tell|all|every|favorite|favourite|fave|top)\b/.test(text);
  if (broad) return true;
  const followup =
    /^(?:(?:you (?:missed|forgot|left out)\b)|(?:(?:name|list|tell me)\s+(?:all|every|everything|the rest)\b)|(?:what else\??$)|(?:all of them\??$))/i
      .test(latest);
  return followup &&
    messages.slice(0, -1).some((message) =>
      message.role === "user" && isCompleteGameQuestion([message])
    );
}

export function createPreferenceMemory(records) {
  const bySource = new Map(
    records.filter((record) => record.speaker === "whiteeye")
      .map((record) => [`${record.file}:${record.line}`, record]),
  );
  const gameEvidence = GAME_SOURCES.map((source) => {
    const record = bySource.get(`${source.file}:${source.line}`);
    if (
      !record ||
      !source.mustContain.every((part) => record.text.toLowerCase().includes(part.toLowerCase()))
    ) return null;
    return { file: record.file, line: record.line, date: record.date, text: record.text };
  });
  // An incomplete or changed archive cannot silently certify a complete list.
  const complete = gameEvidence.every(Boolean);
  return Object.freeze({
    find(messages) {
      if (!complete || !isCompleteGameQuestion(messages)) return null;
      return { domain: "games", evidence: gameEvidence, reply: COMPLETE_GAMES_REPLY };
    },
  });
}
