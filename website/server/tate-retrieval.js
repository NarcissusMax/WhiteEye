import { tokens } from "./retrieval.js";

export const TATE_FAMILIES = [
  ["money", "wealth", "wealthy", "rich", "financial", "income", "business", "cash"],
  ["discipline", "motivation", "motivated", "lazy", "laziness", "procrastination"],
  ["fear", "afraid", "scared", "adversity", "courage"],
  ["depression", "depressed"],
  ["confidence", "confident", "ego", "selfesteem"],
  ["communication", "communicate", "talk", "speaking"],
  ["friends", "friend", "friendship"],
  ["happy", "happiness"],
  ["failure", "fail", "failing", "failed"],
];
const termsOf = (text) => tokens(text).map((term) => term.replace(/(?:ing|s)$/, ""));
const normalized = (text) => text.toLowerCase().replace(/\s+/g, " ").trim();

// Search every eligible document before allocating the prompt budget. A round
// across documents precedes extra passages from the same source.
export function createSourceRetriever(
  corpus,
  { budget = 128000, families = [], styleIds = null } = {},
) {
  const documents = new Map((corpus.documents || []).map((document) => [document.id, document]));
  const records = corpus.records.map((record) => ({
    ...record,
    text: record.text ?? documents.get(record.document)?.text.slice(record.start, record.end),
    pageStarts: documents.get(record.document)?.pageStarts,
  }));
  const lists = new Map();
  const rows = records.filter((r) => r.attribution !== "other-speaker").map((r, index) => {
    if (typeof r.text !== "string") throw Error("Source text is missing.");
    const counts = new Map();
    for (const term of termsOf(r.text)) counts.set(term, (counts.get(term) || 0) + 1);
    for (const [term, count] of counts) {
      if (!lists.has(term)) lists.set(term, []);
      lists.get(term).push(index, count);
    }
    return { r, length: [...counts.values()].reduce((a, b) => a + b, 0) };
  });
  // Numeric postings avoid retaining thousands of per-window string maps in
  // the hosted worker. Query cost scales with matching terms, not corpus size.
  const postings = new Map();
  for (const [term, list] of lists) {
    postings.set(term, new Uint32Array(list));
  }
  lists.clear();
  const average = rows.reduce((sum, row) => sum + row.length, 0) / (rows.length || 1) || 1;
  const styles = records.filter((record) =>
    styleIds
      ? styleIds.includes(record.id)
      : record.attribution === "andrew-course" && record.start > 2000 && record.start < 6000
  ).filter((record, index, all) =>
    styleIds || all.findIndex((other) => other.document === record.document) === index
  )
    .slice(0, 6);
  return {
    styles,
    find(query) {
      const latest = typeof query === "string" ? query : query.latest;
      const prior = typeof query === "string" ? "" : query.prior;
      if (
        /^(?:hi|hey|hello|yo|sup|wassup|good (?:morning|evening|night))[\s!?.]*$/i.test(
          latest || "",
        )
      ) {
        return {
          evidence: [],
          coverage: {
            matchedDocuments: 0,
            includedDocuments: 0,
            omittedDocuments: 0,
            sourceFiles: corpus.inventory.length,
          },
        };
      }
      const base = [...new Set(termsOf(`${latest} ${prior}`))];
      const weights = new Map(termsOf(latest || "").map((term) => [term, 1]));
      for (const term of termsOf(prior || "")) if (!weights.has(term)) weights.set(term, 0.3);
      for (const family of families) {
        const related = termsOf(family.join(" "));
        if (base.some((term) => related.includes(term))) {
          for (const term of related) if (!weights.has(term)) weights.set(term, 0.25);
        }
      }
      const phrase = normalized(latest || "");
      const scores = new Float64Array(rows.length), overlaps = new Uint16Array(rows.length);
      const baseTerms = new Set(base);
      for (const [term, weight] of weights) {
        const list = postings.get(term);
        if (!list) continue;
        const frequency = list.length / 2;
        const idf = Math.log(1 + (rows.length - frequency + 0.5) / (frequency + 0.5));
        for (let i = 0; i < list.length; i += 2) {
          const index = list[i], count = list[i + 1];
          scores[index] += weight * idf * count * 2.2 /
            (count + 1.2 * (0.25 + 0.75 * rows[index].length / average));
          if (baseTerms.has(term)) overlaps[index]++;
        }
      }
      const ranked = rows.map(({ r }, index) => {
        const exact = overlaps[index] && phrase.length > 15 && normalized(r.text).includes(phrase);
        return { r, score: scores[index] + (exact ? 40 : 0), overlap: overlaps[index] };
      }).filter((match) => match.score > 0 && match.overlap > 0)
        .sort((a, b) => b.score - a.score || a.r.id.localeCompare(b.r.id));
      const threshold = (ranked[0]?.score || 0) * 0.25;
      const groups = new Map();
      for (const match of ranked) {
        if (match.score < threshold) continue;
        if (!groups.has(match.r.document)) groups.set(match.r.document, []);
        groups.get(match.r.document).push(match);
      }
      const evidence = [], included = new Set();
      let used = 0;
      // At most three windows per document, but never a global top-four limit.
      for (let round = 0; round < 3; round++) {
        for (const matches of groups.values()) {
          const match = matches.filter(({ r }) =>
            !evidence.some((other) =>
              other.document === r.document && other.start < r.end && r.start < other.end
            )
          )[0];
          if (!match || used + match.r.text.length > budget) {
            continue;
          }
          evidence.push(match.r);
          included.add(match.r.document);
          used += match.r.text.length;
        }
      }
      return {
        evidence,
        coverage: {
          matchedDocuments: groups.size,
          includedDocuments: included.size,
          omittedDocuments: groups.size - included.size,
          sourceFiles: corpus.inventory.length,
        },
      };
    },
  };
}

export function createTateRetriever(corpus, options = {}) {
  return createSourceRetriever(corpus, { families: TATE_FAMILIES, ...options });
}
