import { createTomodachiLibrary } from "../server/tomodachi-retrieval.js";
import { createImpLibrary } from "../server/imp-retrieval.js";
import { buildImpPrompt } from "../src/persona/imp.js";
import { buildVesperPrompt } from "../src/persona/vesper.js";
import { createApp } from "../server/app.js";
import research from "../private/imp-research.json" with { type: "json" };
import indexed from "../private/tomodachi-corpus.json" with { type: "json" };
import reviewed from "../private/tomodachi-scenes.json" with { type: "json" };

const assert = (condition, message = "Assertion failed") => {
  if (!condition) throw Error(message);
};
const document = (chapter, pages) => {
  const id = `doc-${chapter}`;
  let offset = 0;
  const pageStarts = pages.map((text) => {
    const start = offset;
    offset += text.length + 1;
    return start;
  });
  return {
    id,
    chapter,
    file: `${chapter}.pdf`,
    pageStarts,
    text: pages.join("\f") + "\f",
    pageQuality: pages.map((_text, index) => ({ page: index + 1, meanConfidence: 75 })),
  };
};
const documents = [
  document("8", [
    "An administrator explains the rules. Friendship and trust matter. 🧠\n",
    "A different character suspects a secret. Proof can test the claim.\n",
    "The opponent challenges the plan. A claim is not established fact.\n",
    "The audience watches a debt game.\n",
    "A later rule changes the incentive.\n",
  ]),
  document("104", ["The latest supplied chapter discusses a friend's testimony.\n"]),
];
const corpus = {
  work: "Tomodachi Game",
  coverage: {
    allSuppliedFilesIndexed: true,
    sourceFiles: 2,
    primaryPagesIndexed: 6,
    completeText: false,
    missingNumberedChapters: [105, 106, 127],
    transcriptionVerified: false,
    speakerAttributionVerified: false,
  },
  documents,
  inventory: documents.map((doc) => ({
    file: doc.file,
    pages: doc.pageStarts.length,
    pagesProcessed: doc.pageStarts.length,
  })),
  records: documents.flatMap((doc) =>
    doc.pageStarts.map((start, index) => ({
      id: `${doc.id}-p${index + 1}`,
      document: doc.id,
      chapter: doc.chapter,
      file: doc.file,
      focusPage: index + 1,
      page: index + 1,
      endPage: index + 1,
      start,
      end: doc.pageStarts[index + 1] ?? doc.text.length,
      attribution: "manga-scene-mixed-speakers",
      extraction: "ocr",
      meanConfidence: 75,
    }))
  ),
};
const scenes = {
  notes: [{
    id: "scene-proof",
    topic: "Test a claim",
    tags: ["evidence", "trust", "proof"],
    foundation: true,
    observation: "The scene distinguishes an explanation from an accusation.",
    interpretation: "IMP can ask what observable evidence would discriminate between them.",
    evidence: [{ file: "8.pdf", page: 2 }],
  }],
};

Deno.test("Tomodachi retrieves unchanged page windows with chapter, page and attribution metadata", () => {
  const library = createTomodachiLibrary(corpus, scenes);
  const result = library.find("Tomodachi chapter 8 PDF page 1");
  assert(result.evidence.length === 1);
  const row = result.evidence[0];
  assert(row.text === documents[0].text.slice(0, documents[0].pageStarts[1]));
  assert(row.text.includes("🧠"), "UTF-16 source offsets must preserve Unicode");
  assert(row.chapter === "8" && row.page === 1 && row.extraction === "ocr");
  assert(row.attribution === "manga-scene-mixed-speakers");
  assert(result.references[0].verifiedDialogue === false);
  assert(result.coverage.transcriptionVerified === false);
});

Deno.test("Tomodachi names unavailable chapters honestly and never fills them with another chapter", () => {
  const library = createTomodachiLibrary(corpus, scenes);
  for (const query of ["Tomodachi chapter 127 ending", "Chapter 8 page 99"]) {
    const result = library.find(query);
    assert(result.evidence.length === 0 && result.sceneNotes.length === 0);
    assert(
      result.coverage.requestedChapterAvailable === false ||
        result.coverage.requestedPageAvailable === false,
    );
    assert(result.coverage.completeText === false);
  }
});

Deno.test("Tomodachi uses whole excerpts within the budget and keeps interpretation separate", () => {
  const original = JSON.stringify(corpus);
  const library = createTomodachiLibrary(corpus, scenes);
  for (const budget of [10, 400, 900]) {
    const result = library.find("trust rules evidence", { budget, limit: 2, noteBudget: 800 });
    assert(JSON.stringify(result.evidence).length <= budget);
    assert(result.evidence.length <= 2);
    assert(result.sceneNotes[0].interpretation === scenes.notes[0].interpretation);
    for (const row of result.evidence) {
      const reference = corpus.records.find((record) => record.id === row.id);
      const doc = documents.find((doc) => doc.id === reference.document);
      assert(row.text === doc.text.slice(reference.start, reference.end));
    }
  }
  assert(JSON.stringify(corpus) === original);
});

Deno.test("incomplete ingestion or a missing reviewed scene fails closed", () => {
  for (
    const invalid of [
      { ...corpus, coverage: { ...corpus.coverage, allSuppliedFilesIndexed: false } },
      { ...corpus, inventory: [{ file: "8.pdf", pages: 5, pagesProcessed: 4 }] },
    ]
  ) {
    let failed = false;
    try {
      createTomodachiLibrary(invalid, scenes);
    } catch {
      failed = true;
    }
    assert(failed);
  }
  let failed = false;
  try {
    createTomodachiLibrary(corpus, {
      notes: [{ ...scenes.notes[0], evidence: [{ file: "missing.pdf", page: 1 }] }],
    });
  } catch {
    failed = true;
  }
  assert(failed);
});

Deno.test("IMP and Vesper receive primary manga and distinguish it from publisher research", () => {
  const library = createImpLibrary(research, {
    tomodachiLibrary: createTomodachiLibrary(corpus, scenes),
  });
  const selected = library.find("evidence and trust");
  assert(selected.primary.evidence.length > 0 && selected.primary.sceneNotes.length === 1);
  assert(selected.coverage.primaryMangaPagesIndexed === 6);
  assert(selected.coverage.primaryMangaChapterFilesIndexed === 2);
  assert(selected.coverage.completeTexts === false);
  for (
    const prompt of [buildImpPrompt({ research: selected }), buildVesperPrompt({ imp: selected })]
  ) {
    assert(prompt.includes("A different character suspects a secret"));
    assert(prompt.includes("IMP can ask what observable evidence"));
    assert(prompt.includes("OCR"));
    assert(prompt.includes("speaker") && prompt.includes("unverified"));
    assert(!prompt.includes("Only Ayanokoji has a local primary fiction corpus"));
  }
});

Deno.test("IMP and Vesper stream with the actual primary manga context and preserve source coverage", async () => {
  const library = createImpLibrary(research, {
    tomodachiLibrary: createTomodachiLibrary(corpus, scenes),
  });
  let calls = 0;
  const archive = { styles: [], find: () => ({ evidence: [] }) };
  const app = createApp({
    config: { baseUrl: "https://example.com/v1", model: "test", apiKey: "test" },
    coteLibrary: archive,
    tateLibrary: archive,
    impLibrary: library,
    janeLibrary: { find: () => ({ evidence: [], styles: [] }) },
    fetchModel: (_url, options) => {
      calls++;
      const prompt = JSON.parse(options.body).messages[0].content;
      assert(prompt.includes("scene-proof") && prompt.includes("different character suspects"));
      return Promise.resolve(
        new Response(
          'data: {"choices":[{"delta":{"content":"Test that claim."},"finish_reason":"stop"}]}\n\ndata: [DONE]\n\n',
        ),
      );
    },
  });
  for (const persona of ["imp", "vesper"]) {
    const response = await app(
      new Request("http://localhost:8000/api/chat", {
        method: "POST",
        headers: { origin: "http://localhost:8000", "content-type": "application/json" },
        body: JSON.stringify({
          persona,
          messages: [{ role: "user", content: "evidence and trust" }],
        }),
      }),
    );
    assert(response.status === 200);
    const events = (await response.text()).trim().split("\n").map(JSON.parse);
    const done = events.at(-1);
    const coverage = persona === "imp" ? done.coverage : done.coverage.imp;
    assert(coverage.tomodachiPrimary.sourceFiles === 2 && coverage.primaryMangaPagesIndexed === 6);
    assert(coverage.tomodachiPrimary.completeText === false);
    if (persona === "imp") assert(done.sources.some((source) => source.kind === "owner-manga-ocr"));
  }
  assert(calls === 2);
});

Deno.test("every supplied manga file and PDF page is accounted for in the production index", () => {
  assert(indexed.inventory.length === 107 && indexed.documents.length === 107);
  assert(indexed.inventory.reduce((sum, source) => sum + source.pages, 0) === 4089);
  const docs = new Map(indexed.documents.map((doc) => [doc.file, doc]));
  for (const source of indexed.inventory) {
    assert(source.pages === source.pagesProcessed);
    assert(/^[0-9a-f]{64}$/.test(source.sha256));
    const doc = docs.get(source.file);
    assert(
      doc && doc.pageStarts.length === source.pages && doc.pageQuality.length === source.pages,
    );
    assert(doc.pageStarts[0] === 0);
    assert((doc.text.match(/\f/g) || []).length === source.pages);
    for (let page = 1; page < doc.pageStarts.length; page++) {
      assert(doc.pageStarts[page] > doc.pageStarts[page - 1]);
      assert(doc.text[doc.pageStarts[page] - 1] === "\f");
    }
  }
  assert(indexed.coverage.completeText === false && !indexed.coverage.volumeOnlyEpilogueIndexed);
  assert(
    indexed.coverage.missingNumberedChapters.join(",") ===
      Array.from({ length: 23 }, (_item, index) => index + 105).join(","),
  );
  assert(indexed.coverage.extraNumberedFiles.join(",") === "7.1,7.2,42.5");
  assert(
    indexed.records.every((row) =>
      row.attribution === "manga-scene-mixed-speakers" && row.extraction === "ocr"
    ),
  );
});

Deno.test("production retrieval reaches early, middle and late supplied chapters without corrupting OCR", () => {
  const library = createTomodachiLibrary(indexed, reviewed);
  for (const chapter of ["1", "7.1", "42.5", "51", "104"]) {
    const result = library.find(`Tomodachi Game chapter ${chapter}`);
    assert(result.evidence.length > 0, `No source evidence for chapter ${chapter}`);
    for (const row of result.evidence) {
      assert(row.chapter === chapter);
      const record = indexed.records.find((r) => r.id === row.id);
      const doc = indexed.documents.find((d) => d.id === record.document);
      assert(row.text === doc.text.slice(record.start, record.end));
    }
  }
  const unavailable = library.find("Tomodachi Game chapter 127 final reveal");
  assert(unavailable.evidence.length === 0 && !unavailable.coverage.requestedChapterAvailable);
});

Deno.test("unrelated bonus pages never become Yuichi evidence or cross a context boundary", () => {
  const library = createTomodachiLibrary(indexed, reviewed);
  const unrelated = library.find("Tomodachi chapter 62 page 40 Nobunaga");
  assert(unrelated.evidence.length === 0 && unrelated.sceneNotes.length === 0);
  assert(unrelated.coverage.requestedPageAvailable === true);
  assert(unrelated.coverage.requestedPageEligible === false);
  assert(unrelated.coverage.excludedNonTomodachiPages === 18);
  const boundary = library.find("Tomodachi chapter 62 page 33");
  assert(boundary.evidence.length === 1);
  assert(boundary.evidence[0].endPage === 33);
  assert(!boundary.evidence[0].text.includes("MISO"));
});
