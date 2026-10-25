import { chunkCote, coteSections, pdfPageStarts } from "../server/cote-corpus.js";
import { createCoteRetriever } from "../server/cote-retrieval.js";
import { buildAyanokojiPrompt, COTE_PROFILE } from "../src/persona/ayanokoji.js";
import { repairSourceReply, verifySourceReply } from "../src/persona/source-response.js";
import { createApp } from "../server/app.js";
import { loadConversations } from "../public/js/storage.js";
import impResearch from "../private/imp-research.json" with { type: "json" };
import { createImpLibrary } from "../server/imp-retrieval.js";

const assert = (value, message = "Assertion failed") => {
  if (!value) throw Error(message);
};
const corpus = JSON.parse(
  await Deno.readTextFile(new URL("../private/cote-corpus.json", import.meta.url)),
);

Deno.test("COTE index covers all 20 PDFs including scanned short stories with original offsets", () => {
  assert(corpus.inventory.length === 20);
  assert(corpus.inventory.reduce((sum, row) => sum + row.pages, 0) === 4300);
  const scanned = corpus.documents.find((row) => row.file.includes("1025"));
  assert(scanned.extraction === "ocr" && scanned.text.length > 15000);
  assert(scanned.text.includes("red panda"), "Scanned story must not be replaced by its credits");
  for (const doc of corpus.documents) {
    const rows = corpus.records.filter((row) => row.document === doc.id);
    let end = 0, reconstructed = "";
    for (const row of rows) {
      assert(row.start <= end, "No missing source characters");
      reconstructed += doc.text.slice(end, row.end);
      end = row.end;
      assert(row.line === 1 + (doc.text.slice(0, row.start).match(/\n/g) || []).length);
    }
    assert(reconstructed === doc.text, doc.file);
    assert(doc.pageStarts.length === corpus.inventory.find((row) => row.file === doc.file).pages);
  }
});

Deno.test("COTE section hints distinguish Atsuomi, Kiyotaka, other soliloquies and afterwords", () => {
  const zero = corpus.documents.find((row) => row.file === "cote_0.pdf");
  const sections = coteSections(zero.text, zero.file);
  assert(
    sections.some((row) =>
      row.section === "Chapter 5:" && row.viewpointHint === "Kiyotaka narration"
    ),
  );
  assert(
    sections.some((row) =>
      row.section === "Chapter 6:" && row.viewpointHint === "Atsuomi narration"
    ),
  );
  assert(sections.some((row) => row.viewpointHint.includes("author or translator")));
  const two = corpus.documents.find((row) => row.file === "cote_2.pdf");
  assert(
    coteSections(two.text, two.file).some((row) =>
      row.viewpointHint.includes("Sakura Airi") && row.viewpointHint.includes("Soliloquy")
    ),
  );
  const text = "First page.\n\fSecond page.\n\fThird page.\f";
  assert(JSON.stringify(pdfPageStarts(text)) === JSON.stringify([0, 13, 27]));
  assert(chunkCote({ id: "test", file: "test.pdf", text, attribution: "novel-scene" }).length > 0);
});

Deno.test("COTE retrieval searches multiple volumes without Tate voices or fabricated matches", () => {
  const library = createCoteRetriever(corpus);
  assert(
    library.styles.length >= 3 && library.styles.every((row) => row.attribution === "novel-scene"),
  );
  for (const question of ["friendship and trust", "equality and ability", "freedom White Room"]) {
    const result = library.find(question);
    assert(new Set(result.evidence.map((row) => row.document)).size > 4, question);
    assert(result.evidence.every((row) => row.pageStarts && row.file.endsWith(".pdf")));
    assert(result.coverage.sourceFiles === 20);
  }
  assert(library.find("hello").evidence.length === 0);
  assert(library.find("quuxflibber zzyyxx").evidence.length === 0);
  const bounded = createCoteRetriever(corpus, { budget: 7000 }).find("friendship trust");
  assert(bounded.coverage.omittedDocuments > 0, "Context omissions must be disclosed");
  const prompt = buildAyanokojiPrompt({ ...library.find("equality"), styles: library.styles });
  assert(prompt.includes("Read ALL supplied relevant passages together"));
  assert(prompt.includes("Atsuomi") && prompt.includes("inner-narration"));
  assert(!prompt.includes("Andrew Tate") && !prompt.includes("andrew-course"));
});

const evidence = [{
  id: "novel",
  file: "cote_1.pdf",
  line: 10,
  start: 0,
  text: "My thought.\n\f“Not my words,” she said.\n“My reply.”",
  pageStarts: [0, 13],
  attribution: "novel-scene",
  extraction: "pdf-text",
}];
const raw = JSON.stringify({
  mode: "source",
  excerpts: [
    { id: "novel", fromLine: 10, toLine: 10, kind: "inner-narration" },
    { id: "novel", fromLine: 12, toLine: 12, kind: "dialogue" },
  ],
});

Deno.test("Novel verification preserves exact text, PDF pages and narration types; rejects guesses", () => {
  const verified = verifySourceReply(raw, evidence, COTE_PROFILE);
  assert(verified.text === "My thought.\n\n“My reply.”");
  assert(verified.sources[0].page === 1 && verified.sources[1].page === 2);
  assert(verified.sources[0].kind === "inner-narration" && verified.sources[1].kind === "dialogue");
  for (
    const excerpt of [
      { id: "novel", fromLine: 10, toLine: 10 },
      { id: "novel", fromLine: 10, toLine: 10, kind: "other" },
      { id: "tate", fromLine: 10, toLine: 10, kind: "dialogue" },
      { id: "novel", text: "A paraphrase", kind: "inner-narration" },
    ]
  ) {
    let rejected = false;
    try {
      verifySourceReply(
        JSON.stringify({ mode: "source", excerpts: [excerpt] }),
        evidence,
        COTE_PROFILE,
      );
    } catch {
      rejected = true;
    }
    assert(rejected);
  }
});

Deno.test("Every novel selection receives a speaker review and can omit another character", async () => {
  const selections = JSON.parse(raw).excerpts;
  selections.push({ id: "novel", fromLine: 11, toLine: 11, kind: "dialogue" });
  let calls = 0;
  const corrected = await repairSourceReply(
    JSON.stringify({ mode: "source", excerpts: selections }),
    evidence,
    "question",
    (prompt) => {
      calls++;
      assert(prompt.includes("Ayanokoji Kiyotaka") && prompt.includes("Atsuomi"));
      assert(prompt.includes('kind:"inner-narration"'));
      assert(!prompt.includes("Audit Andrew Tate"));
      return Promise.resolve(JSON.stringify({
        repairs: [
          { selection: 0, ...selections[0] },
          { selection: 1, ...selections[1] },
          { selection: 2, id: "novel", omit: true },
        ],
      }));
    },
    COTE_PROFILE,
  );
  assert(calls === 1);
  assert(
    verifySourceReply(corrected, evidence, COTE_PROFILE).text === "My thought.\n\n“My reply.”",
  );
});

Deno.test("Retired Ayanokoji route rejects new chats while the COTE corpus stays available to IMP", async () => {
  const config = { baseUrl: "https://example.com/v1", model: "test", apiKey: "test" };
  const request = (persona) =>
    new Request("http://localhost:8000/api/chat", {
      method: "POST",
      headers: { origin: "http://localhost:8000", "content-type": "application/json" },
      body: JSON.stringify({
        persona,
        messages: [{ role: "user", content: "What did you think?" }],
      }),
    });
  assert((await createApp({ config })(request("ayanokoji"))).status === 400);
  assert((await createApp({ config })(request("imp"))).status === 503);
  let prompt = "";
  const app = createApp({
    config,
    coteLibrary: { styles: [], find: () => ({ evidence, coverage: { sourceFiles: 20 } }) },
    impLibrary: createImpLibrary(impResearch),
    fetchModel: (_url, options) => {
      prompt = JSON.parse(options.body).messages[0].content;
      return Promise.resolve(
        new Response(
          'data: {"choices":[{"delta":{"content":"First, test the assumption."},"finish_reason":"stop"}]}\n\ndata: [DONE]\n\n',
        ),
      );
    },
  });
  const events = (await (await app(request("imp"))).text()).trim().split("\n").map(JSON.parse);
  assert(prompt.includes("My thought.") && prompt.includes("Johan Liebert"));
  assert(events[0].text === "First, test the assumption.");
  assert(events[1].sourceMode === "synthesis" && events[1].sources.length >= 10);
  assert(events[1].coverage.completeTexts === false);
});

Deno.test("Saved Ayanokoji chats migrate to IMP while retaining original speaker labels", () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: () =>
        JSON.stringify({
          chats: [
            {
              id: "a",
              title: "COTE",
              messages: [{ role: "assistant", content: "Old answer." }],
              persona: "ayanokoji",
            },
            { id: "t", title: "Tate", messages: [], persona: "tate" },
          ],
          active: "a",
        }),
    },
  });
  try {
    const saved = loadConversations();
    assert(saved.chats.find((row) => row.id === "a").persona === "imp");
    assert(saved.chats.find((row) => row.id === "a").messages[0].persona === "ayanokoji");
    assert(saved.chats.find((row) => row.id === "t").persona === "tate");
  } finally {
    Object.defineProperty(globalThis, "localStorage", previous);
  }
});

Deno.test("Provider insufficient balance is explained without retries or unverified source text", async () => {
  let calls = 0;
  const config = { baseUrl: "https://example.com/v1", model: "test", apiKey: "test" };
  const app = createApp({
    config,
    coteLibrary: { styles: [], find: () => ({ evidence: [], coverage: {} }) },
    impLibrary: createImpLibrary(impResearch),
    fetchModel: () => {
      calls++;
      return Promise.resolve(
        Response.json({ error: { code: 402, message: "insufficient balance" } }, { status: 402 }),
      );
    },
  });
  const response = await app(
    new Request("http://localhost:8000/api/chat", {
      method: "POST",
      headers: { origin: "http://localhost:8000", "content-type": "application/json" },
      body: JSON.stringify({
        persona: "imp",
        messages: [{ role: "user", content: "hello" }],
      }),
    }),
  );
  assert(response.status === 502 && calls === 1);
  assert((await response.json()).error.includes("insufficient API credits"));
});
