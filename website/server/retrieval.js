const stop = new Set(
  [
    "the and that this what with your have you are for how was but not can would about from they just does will who there when think like dont know want all why more",
    "also because been being could did didnt doing done get gets got had has here its let lets made make makes may might much need needed needs never now only our out",
    "really said same say says see seem seems she should some something sometimes somehow still such than their them then these those through too very were which while without",
    "yeah yes yet youre ive ill isnt wasnt wouldnt couldnt shouldnt havent hasnt arent finally putting put tonight today yesterday tomorrow morning afternoon evening saw seen",
    "watching watched finished finish everything anything nothing spent going come came went time thing things good bad simply actually even whatever whenever wherever though thats",
    "myself yourself itself himself herself ourselves themselves someone anyone everyone her his him ours yours hers",
    "old first anymore keep instead thinking useful last night usual spending",
  ].flatMap((line) => line.split(" ")),
);
export function tokens(text) {
  return (text.toLowerCase().match(/[a-z]{3,}/g) || []).filter((w) => !stop.has(w));
}
export function cleanSource(text) {
  return text.split(/\n\{(?:Attachments|Embed|Reactions|Stickers)\}/)[0]
    .replace(/\(re (?:me|I):.*$/s, "").replace(/\[(?:me|I):[^\]]*\]/g, "")
    .replace(/https?:\/\/\S+/g, "").replace(/@[\w.]+/g, "")
    .replace(/\s*\|\s*/g, "\n").trim();
}

function currentTopic(text) {
  // Honor an explicit switch even after a reply to the previous subject. Only
  // retrieval sees the suffix; the actual conversation remains untouched.
  const switches =
    /(?:^|[.!?,;\n]\s*)(?:anyway\b|(?:new|different|unrelated) (?:topic|question)\b|changing (?:the )?subject\b|switching (?:the )?(?:topic|subject)\b|on another note\b|let['’]?s (?:change|switch) (?:the )?(?:topic|subject)\b|let['’]?s talk about\b)[\s,:;—–-]*/gi;
  const matches = [...text.matchAll(switches)];
  const last = matches.at(-1);
  return last
    ? { latest: text.slice(last.index + last[0].length).trim(), switched: true }
    : { latest: text, switched: false };
}

function dependentFollowup(text, previous = "") {
  const value = text.trim().toLowerCase().replace(/[’‘]/g, "'")
    .replace(/^(?:(?:yeah|yes|no|nah|okay|ok|well|hm+|honestly)[,!\s]+)+/, "");
  if (!value) return false;
  // A new greeting, explicit topic change, or self-contained preference question
  // must not drag an earlier distress/argument topic into an ordinary reply.
  if (
    /^(?:hi|hey|hello|yo|sup|wassup|good (?:morning|evening|night))[\s!?.]*$/.test(value) ||
    /^(?:anyway\b|new topic\b|different (?:topic|question)\b|unrelated\b|changing (?:the )?subject\b|on another note\b|let'?s (?:change|switch|talk about)\b)/
      .test(value) ||
    /\b(?:your\s+(?:(?:all[- ]time|current)\s+)?(?:favou?rite|fave)|favou?rite (?:colou?r|food|game|movie|show|song|anime|character))\b/
      .test(value) ||
    /^(?:(?:hey|and|so|but)[,!\s]+)?(?:what|which)\b.{0,100}\b(?:do|did|would) you (?:like|prefer|enjoy|play|watch|eat)\b/
      .test(value)
  ) return false;

  if (
    /^(?:but\s+)?(?:why|why not|how so|how come|really|then what|and then|what now|why is that)[\s!?.]*$/
      .test(value) ||
    /^(?:what (?:do|did) you mean\b|(?:can|could) you (?:explain|expand on|clarify) (?:that|it|this)\b|(?:explain|clarify) (?:that|it|this)\b|tell me more\b|go on[\s!?.]*$)/
      .test(value)
  ) return true;

  // Deliberately small heuristic, not an intent classifier. Connective replies
  // and explicit references can borrow context; standalone statements cannot.
  const words = value.match(/[a-z']+/g) || [];
  if (words.length > 70) return false;
  if (/^(?:but|and|so|then|still|even then|in that case)\b/.test(value)) {
    const previousTerms = new Set(tokens(previous));
    return /\b(?:that|this|it|those|them|he|she|him|her|still|again|only)\b/.test(value) ||
      tokens(value).some((term) => previousTerms.has(term)) ||
      // "Yeah but what if I fail?" can continue an exam conversation without
      // repeating the word exam. Don't inherit it for an unrelated new topic.
      (/\b(?:exam|exams|test|tests|study|studied|studying|syllabus)\b/i.test(previous) &&
        /\b(?:fail|failure|pass|passing|trying|try|days|hours)\b/.test(value));
  }
  return words.length <= 40 &&
    /^(?:what|how|why|does|is|can|could|would|should)\b/.test(value) &&
    /\b(?:that|this|it|those|them)\b/.test(value);
}

// Share this selection with voice scenes and topic evidence. Most turns only
// retrieve against the latest user message. A short follow-up can inherit its
// nearest user-topic anchor, never the model's own wording or an entire history.
export function retrievalQueries(messages) {
  const users = messages.filter((message) => message.role === "user");
  const { latest, switched } = currentTopic(users.at(-1)?.content || "");
  if (
    switched || users.length < 2 ||
    !dependentFollowup(latest, currentTopic(users.at(-2).content).latest)
  ) {
    return { latest, prior: "" };
  }
  const previous = [];
  let budget = 2400;
  for (let i = users.length - 2; i >= Math.max(0, users.length - 4) && budget > 0; i--) {
    const topic = currentTopic(users[i].content);
    const text = topic.latest;
    if (previous.length) budget--;
    const excerpt = text.slice(0, Math.min(1600, budget));
    previous.unshift(excerpt);
    budget -= excerpt.length;
    if (topic.switched || !dependentFollowup(text, users[i - 1]?.content)) break;
  }
  return { latest, prior: previous.join("\n") };
}

function ambiguousOrphan(record) {
  // This delayed reply appears to address sideburns at line 73, NOT the
  // intervening loneliness discussion. Its referent is unsafe to infer from
  // neighboring text. Keep it in the private archive, out of automatic evidence.
  return record.file === "Whiteye DMS (txt file old account).txt" && record.line === 153;
}

const inflections = new Map([
  ["games", "game"],
  ["gaming", "game"],
  ["movies", "movie"],
  ["films", "film"],
  ["animes", "anime"],
  ["colours", "color"],
  ["colour", "color"],
  ["colors", "color"],
  ["favourite", "favorite"],
  ["favorites", "favorite"],
  ["favourites", "favorite"],
  ["studies", "study"],
  ["studied", "study"],
  ["studying", "study"],
  ["exams", "exam"],
  ["friends", "friend"],
  ["friendship", "friend"],
  ["texts", "text"],
  ["texted", "text"],
  ["texting", "text"],
  ["replies", "reply"],
  ["replied", "reply"],
  ["replying", "reply"],
  ["tries", "try"],
  ["tried", "try"],
  ["trying", "try"],
]);
const indexTokens = (text) => tokens(text).map((term) => inflections.get(term) || term);
const phraseText = (text) => text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

function titlePhrases(text) {
  // Retain compound proper-name hints that bag-of-words retrieval loses, such
  // as a one-letter title word. This is general title matching, not a canon map.
  return [...text.matchAll(/\b[A-Z][a-zA-Z0-9']*(?:[,\s]+[A-Z][a-zA-Z0-9']*)+\b/g)]
    .map((match) => phraseText(match[0])).filter((phrase) => indexTokens(phrase).length);
}

export function createRetriever(records, { speaker = "whiteeye", includeNarrative = true } = {}) {
  const seen = new Set();
  const rows = records.flatMap((r, index) => {
    if (
      r.speaker !== speaker &&
        !(includeNarrative && speaker === "whiteeye" && r.speaker === "narrative") ||
      ambiguousOrphan(r)
    ) return [];
    const text = cleanSource(r.text);
    if (text.length < 8 || /^(\[|\{)/.test(text) || seen.has(text)) return [];
    seen.add(text);
    const indexed = indexTokens(text);
    const counts = new Map();
    for (const term of indexed) counts.set(term, (counts.get(term) || 0) + 1);
    return [{
      index,
      file: r.file,
      line: r.line,
      date: r.date,
      speaker: r.speaker,
      text: text.slice(0, 5000),
      terms: new Set(indexed),
      counts,
      length: indexed.length,
      normalized: ` ${phraseText(text)} `,
    }];
  });
  const frequency = new Map();
  for (const r of rows) for (const t of r.terms) frequency.set(t, (frequency.get(t) || 0) + 1);
  const averageLength = rows.reduce((sum, row) => sum + row.length, 0) / (rows.length || 1) || 1;
  const idf = (term) => {
    const count = frequency.get(term) || 0;
    return Math.log(1 + (rows.length - count + 0.5) / (count + 0.5));
  };
  const focusTerms = (terms, queryText) => {
    const known = terms.filter((term) => frequency.has(term));
    // A whole sentence collapsing to a broad tag like "game" is not a close
    // source match. The persona model can handle that ordinary remark without
    // injecting unrelated purchases, sports, or gaming setup details.
    if (
      (queryText.match(/[a-z]+/gi) || []).length > 8 && known.length <= 2 &&
      known.every((term) => frequency.get(term) > Math.max(8, rows.length * 0.005))
    ) return [];
    const strongest = Math.max(0, ...known.map(idf));
    // Prefer missing a loosely associated passage to injecting an unrelated
    // memory. Rare topical terms must actually occur; generic overlap alone is
    // insufficient. Tiny test/source corpora still have useful singleton terms.
    return known.filter((term) =>
      frequency.get(term) <= Math.max(3, rows.length * 0.04) && idf(term) >= strongest * 0.8
    );
  };
  return (query, limit = 4) => {
    const latest = typeof query === "string" ? query : query.latest;
    const prior = typeof query === "string" ? "" : query.prior;
    const longLatest = (latest?.match(/[a-z]+/gi) || []).length > 8;
    const terms = [...new Set(indexTokens(latest || ""))];
    // Broad "friend replies" queries repeatedly matched unrelated archived
    // arguments that merely used both words. The behavioral model and paired
    // scenes already cover this situation; skip unverified lexical context.
    if (terms.includes("friend") && terms.includes("reply") && !terms.includes("text")) {
      return [];
    }
    // Don't count a repeated latest-term twice just because it was also in the
    // inherited context. Earlier topics have only a quarter of the influence.
    const priorTerms = [...new Set(indexTokens(prior || ""))].filter((t) => !terms.includes(t));
    const latestFocus = focusTerms(terms, latest || "");
    const priorFocus = focusTerms(priorTerms, prior || "");
    const latestTitles = titlePhrases(latest || "");
    const priorTitles = titlePhrases(prior || "");
    // For a texting question about a friend, evidence about one word alone
    // (including childhood 'friends' or an unrelated text) is misleading.
    const pairedTopic = terms.includes("friend") && terms.includes("text")
      ? ["friend", "text", ...(terms.includes("try") ? ["try"] : [])]
      : null;
    const relevance = (row, words) =>
      words.reduce(
        (sum, term) => {
          const count = row.counts.get(term) || 0;
          // BM25's saturation and document-length normalization stop enormous
          // autobiography passages winning through many incidental word hits.
          const norm = 1.2 * (0.25 + 0.75 * row.length / averageLength);
          return sum + idf(term) * count * 2.2 / (count + norm);
        },
        0,
      );
    const matches = (row, focus, longQuery, titles) => {
      const overlap =
        focus.filter((term) => row.terms.has(term) && (row.length >= 3 || frequency.get(term) <= 8))
          .length;
      // Long natural remarks contain many incidental words. A single rare word
      // does not establish that the source passage answers the remark. An exact
      // multiword title is a stronger match and may stand alone.
      return overlap >=
        (longQuery && !titles.some((title) => row.normalized.includes(` ${title} `)) ? 2 : 1);
    };
    const titleBonus = (row, titles) =>
      titles.some((title) => row.normalized.includes(` ${title} `)) ? 1.7 : 1;
    const ranked = rows.map((r) => ({
      r,
      latestMatch: matches(r, latestFocus, longLatest, latestTitles),
      priorMatch: matches(r, priorFocus, false, priorTitles),
      score: relevance(r, terms) * titleBonus(r, latestTitles) +
        0.25 * relevance(r, priorTerms) * titleBonus(r, priorTitles),
    })).filter((x) =>
      x.score > 0 && (x.latestMatch || x.priorMatch) &&
      (!pairedTopic || pairedTopic.every((term) => x.r.terms.has(term)))
    )
      .sort((a, b) => b.score - a.score);
    // A limit is a ceiling, not a quota. Weak tail matches are more harmful to
    // this personal-voice task than returning fewer (or no) source excerpts.
    const minimum = (ranked[0]?.score || 0) * 0.58;
    let budget = 9000;
    const covered = new Set();
    const result = [];
    for (const { r, score } of ranked) {
      if (result.length >= limit || budget <= 0) break;
      if (score < minimum) break;
      if (covered.has(r.index)) continue;
      const text = r.text.slice(0, Math.min(2200, budget));
      budget -= text.length;
      const context = [];
      // Nearby actual turns preserve questions, corrections, jokes and short
      // follow-up bursts. Never cross a file/date boundary or import secondary text.
      if (r.speaker === speaker) {
        for (
          let i = Math.max(0, r.index - 3);
          i <= Math.min(records.length - 1, r.index + 5);
          i++
        ) {
          const neighbor = records[i];
          if (
            i === r.index || neighbor.file !== r.file || !r.date ||
            neighbor.date?.slice(0, 10) !== r.date.slice(0, 10) ||
            !["whiteeye", "other"].includes(neighbor.speaker) || ambiguousOrphan(neighbor)
          ) continue;
          const content = cleanSource(neighbor.text);
          if (!content || /^(\[|\{)/.test(content) || budget < 100) continue;
          const snippet = content.slice(0, Math.min(500, budget));
          context.push({ line: neighbor.line, speaker: neighbor.speaker, text: snippet });
          budget -= snippet.length;
          covered.add(i);
        }
      }
      covered.add(r.index);
      result.push({
        file: r.file,
        line: r.line,
        date: r.date,
        speaker: r.speaker,
        text,
        contextKind: "chronological-neighbors-not-verified-replies",
        context,
      });
    }
    return result;
  };
}

export function selectContext(messages, budget = 42000) {
  const total = messages.reduce((n, m) => n + m.content.length, 0);
  if (total <= budget) return { messages, omitted: 0 };
  const first = messages[0];
  const latest = messages.at(-1);
  // The latest message is never dropped, even when it alone exceeds the
  // history budget. The provider may impose its own finite context window;
  // that is reported separately instead of mislabeling the message invalid.
  const keepFirst = first !== latest && first.content.length + latest.content.length <= budget;
  const recent = [latest];
  let used = latest.content.length + (keepFirst ? first.content.length : 0);
  for (let i = messages.length - 2; i > 0; i--) {
    if (used + messages[i].content.length > budget) break;
    used += messages[i].content.length;
    recent.unshift(messages[i]);
  }
  const selected = keepFirst ? [first, ...recent] : recent;
  return { messages: selected, omitted: messages.length - selected.length };
}
