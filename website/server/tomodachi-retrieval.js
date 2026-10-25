import { tokens } from "./retrieval.js";
import { createSourceRetriever } from "./tate-retrieval.js";

const families = [
  ["trust", "friendship", "friends", "loyalty", "betrayal", "alliance"],
  ["money", "debt", "gambling", "bet", "risk", "loss", "stake"],
  ["rules", "rule", "loophole", "condition", "contract", "game"],
  ["information", "secret", "evidence", "proof", "lie", "truth", "suspect"],
  ["strategy", "plan", "counterplay", "win", "lose", "failure", "preparation"],
  ["persuasion", "negotiation", "offer", "choice", "refuse", "deal"],
  ["emotion", "fear", "anger", "guilt", "pressure", "threat", "weakness"],
];
const overlaps = (a, b) => a.document === b.document && a.start < b.end && b.start < a.end;

// Pages remain mixed-speaker OCR. A matching word is not proof of Yuichi's
// authorship, a bubble's reading order, or the truth of a character's claim.
export function createTomodachiLibrary(corpus, scenes = { notes: [] }) {
  if (
    corpus.work !== "Tomodachi Game" || !corpus.coverage?.allSuppliedFilesIndexed ||
    corpus.inventory.some((source) => source.pagesProcessed !== source.pages) ||
    corpus.inventory.some((source) =>
      !corpus.documents.some((doc) =>
        doc.file === source.file &&
        doc.pageStarts?.length === source.pages && typeof doc.text === "string"
      )
    )
  ) throw Error("Tomodachi Game source ingestion is incomplete.");
  const documents = new Map(corpus.documents.map((document) => [document.id, document]));
  const exclusions = scenes.excludedPages || [];
  for (const range of exclusions) {
    const doc = corpus.documents.find((doc) => doc.file === range.file);
    if (
      !doc || !Number.isSafeInteger(range.fromPage) || !Number.isSafeInteger(range.toPage) ||
      range.fromPage < 1 || range.toPage < range.fromPage || range.toPage > doc.pageStarts.length
    ) {
      throw Error("Invalid Tomodachi Game page review.");
    }
  }
  const eligible = (file, page) =>
    !exclusions.some((range) =>
      range.file === file && page >= range.fromPage && page <= range.toPage
    );
  const records = corpus.records.filter((row) => eligible(row.file, row.focusPage)).map((row) => {
    const doc = documents.get(row.document);
    if (!doc || typeof doc.text !== "string") throw Error("Tomodachi Game source text is missing.");
    let first = row.focusPage, last = row.focusPage;
    while (first > row.page && eligible(row.file, first - 1)) first--;
    while (last < row.endPage && eligible(row.file, last + 1)) last++;
    return {
      ...row,
      page: first,
      endPage: last,
      start: doc.pageStarts[first - 1],
      end: doc.pageStarts[last] ?? doc.text.length,
      section: `Numbered chapter file ${row.chapter}, PDF pages ${first}–${last}`,
      pageQuality: doc.pageQuality?.slice(first - 1, last),
    };
  });
  const excludedNonTomodachiPages = corpus.documents.reduce(
    (sum, doc) =>
      sum + doc.pageStarts.filter((_offset, index) => !eligible(doc.file, index + 1)).length,
    0,
  );
  const hydrate = (record) => ({
    ...record,
    text: documents.get(record.document)?.text.slice(record.start, record.end),
  });
  const notes = (scenes.notes || []).map((note) => {
    const evidence = note.evidence.map(({ file, page }) => {
      const record = records.find((row) => row.file === file && row.focusPage === page);
      if (!record) throw Error(`Missing Tomodachi scene evidence: ${note.id}, ${file}, ${page}`);
      return record;
    });
    return {
      note,
      evidence,
      terms: new Set(
        tokens([note.topic, ...note.tags, note.observation, note.interpretation].join(" ")),
      ),
    };
  });
  let retriever;
  return {
    find(query, { budget = 10000, limit = 5, noteBudget = 2800 } = {}) {
      retriever ||= createSourceRetriever({ ...corpus, records }, {
        families,
        styleIds: [],
        budget: 70000,
      });
      const latest = typeof query === "string" ? query : query.latest || "";
      const prior = typeof query === "string" ? "" : query.prior || "";
      const chapter = latest.match(/\b(?:chapter|ch\.?)[ \t]*(\d{1,3}(?:\.\d+)?)\b/i)?.[1];
      const page = latest.match(/\b(?:pdf[ \t]+)?page[ \t]+(\d{1,3})\b/i)?.[1];
      const requestedDocument = chapter
        ? corpus.documents.find((document) => document.chapter === chapter)
        : null;
      const named = chapter
        ? records.filter((record) =>
          record.chapter === chapter &&
          (!page || record.focusPage === Number(page))
        )
        : [];
      const queryTerms = new Set(tokens(latest));
      const priorTerms = new Set(tokens(prior));
      const rankedNotes = notes.map((row) => ({
        ...row,
        score: [...row.terms].reduce(
          (sum, term) => sum + (queryTerms.has(term) ? 1 : priorTerms.has(term) ? 0.2 : 0),
          0,
        ) +
          (chapter && row.evidence.some((record) =>
              record.chapter === chapter &&
              (!page || record.focusPage === Number(page))
            )
            ? 20
            : 0),
      })).sort((a, b) => b.score - a.score || a.note.id.localeCompare(b.note.id));
      const sceneNotes = [];
      let noteSize = 2;
      for (const row of rankedNotes) {
        if (
          sceneNotes.length >= 3 || (chapter && !row.evidence.some((r) =>
            r.chapter === chapter &&
            (!page || r.focusPage === Number(page))
          ))
        ) {
          continue;
        }
        // Two reviewed foundational scenes can remain on an ordinary turn.
        if (!row.score && !row.note.foundation) continue;
        const size = JSON.stringify(row.note).length + (sceneNotes.length ? 1 : 0);
        if (noteSize + size <= noteBudget) {
          sceneNotes.push(row.note);
          noteSize += size;
        }
      }
      const matching = retriever.find(query);
      const selectedNotes = rankedNotes.filter((row) =>
        sceneNotes.some((n) => n.id === row.note.id)
      );
      const candidates = chapter
        ? [
          ...matching.evidence.filter((row) =>
            row.chapter === chapter &&
            (!page || row.focusPage === Number(page))
          ),
          ...selectedNotes.flatMap((row) =>
            row.evidence.filter((r) =>
              r.chapter === chapter &&
              (!page || r.focusPage === Number(page))
            )
          ),
          ...named,
        ]
        : [
          ...matching.evidence.slice(0, 1),
          ...selectedNotes.flatMap((row) => row.evidence),
          ...matching.evidence.slice(1),
        ];
      const evidence = [];
      let used = 2;
      for (const row of candidates) {
        if (evidence.length >= limit) break;
        if (evidence.some((other) => overlaps(other, row))) continue;
        const source = hydrate(row);
        if (!source.text) throw Error("Tomodachi Game source text is missing.");
        // Excerpts are whole stored page windows. Never silently clip a bubble.
        const { document, start, end, ...item } = source;
        const size = JSON.stringify(item).length + (evidence.length ? 1 : 0);
        if (used + size > budget) continue;
        evidence.push({ ...item, document, start, end });
        used += size;
      }
      const references = evidence.map((row) => ({
        id: row.id,
        title:
          `Tomodachi Game · numbered chapter ${row.chapter} · PDF pages ${row.page}–${row.endPage} · supplied scan OCR`,
        kind: "owner-manga-ocr",
        file: row.file,
        chapter: row.chapter,
        page: row.page,
        endPage: row.endPage,
        extraction: "ocr",
        verifiedDialogue: false,
      }));
      for (const note of sceneNotes) {
        for (const location of note.evidence) {
          if (
            references.some((r) =>
              r.file === location.file && r.page <= location.page && r.endPage >= location.page
            )
          ) continue;
          references.push({
            id: `${note.id}-${location.file}-${location.page}`,
            kind: "owner-manga-scene-analysis",
            title:
              `Tomodachi Game · ${note.topic} · ${location.file}, PDF page ${location.page} · scene analysis`,
            file: location.file,
            page: location.page,
            verifiedDialogue: false,
          });
        }
      }
      return {
        evidence: evidence.map(({ document: _document, start: _start, end: _end, ...row }) => row),
        sceneNotes,
        references,
        coverage: {
          ...corpus.coverage,
          excludedNonTomodachiPages,
          matchedDocuments: matching.coverage.matchedDocuments,
          includedDocuments: new Set(evidence.map((row) => row.document)).size,
          includedPassages: evidence.length,
          reviewedSceneNotes: notes.length,
          includedSceneNotes: sceneNotes.length,
          requestedChapter: chapter || null,
          requestedChapterAvailable: chapter ? Boolean(requestedDocument) : null,
          requestedPage: page ? Number(page) : null,
          requestedPageAvailable: page
            ? Boolean(
              requestedDocument && Number(page) > 0 &&
                Number(page) <= requestedDocument.pageStarts.length,
            )
            : null,
          requestedPageEligible: page && requestedDocument
            ? eligible(requestedDocument.file, Number(page)) &&
              Number(page) > 0 && Number(page) <= requestedDocument.pageStarts.length
            : null,
          omittedMatchingDocuments: Math.max(
            0,
            matching.coverage.matchedDocuments -
              new Set(evidence.map((row) => row.document)).size,
          ),
        },
      };
    },
  };
}
