import { chunkTranscript, sourceAttribution } from "../server/tate-corpus.js";
import { createTateRetriever } from "../server/tate-retrieval.js";
import { buildTatePrompt, repairTateReply, verifyTateReply } from "../src/persona/andrew-tate.js";
import { createApp } from "../server/app.js";

const assert = (condition, message = "Assertion failed") => {
  if (!condition) throw Error(message);
};
const corpus = JSON.parse(
  await Deno.readTextFile(new URL("../private/tate-corpus.json", import.meta.url)),
);

Deno.test("Tate index accounts for all files, aliases, empty and other-speaker sources", () => {
  assert(corpus.inventory.length === 74);
  assert(corpus.inventory.some((file) => file.empty && file.file.includes("Speed Wins")));
  assert(corpus.inventory.filter((file) => file.duplicateOf).length === 6);
  assert(
    corpus.documents.some((file) =>
      file.file === "The Tate Bible" && file.attribution === "edited-compilation" &&
      file.text.includes("edited for clarity and brevity")
    ),
  );
  for (const record of corpus.records) {
    const doc = corpus.documents.find((file) => file.id === record.document);
    assert(doc.text.slice(record.start, record.end).trim().length > 0, record.id);
    assert(record.id === `${record.document}:${record.start}`);
    assert(record.line === 1 + (doc.text.slice(0, record.start).match(/\n/g) || []).length);
  }
  assert(sourceAttribution("Tristan Tate God Mode.txt") === "other-speaker");
  assert(
    sourceAttribution("No one cares about your personal problems- Dan Pena.txt") ===
      "other-speaker",
  );
});

Deno.test("Tate chunking retains every source character across overlapping line windows", () => {
  const text = "a short line\n\n".repeat(500) + "Last sentence.";
  const document = { id: "d", file: "test.txt", aliases: [], attribution: "andrew-course" };
  const chunks = chunkTranscript(text, document);
  let end = 0, reconstructed = "";
  for (const chunk of chunks) {
    assert(chunk.start <= end, "No gaps in the source");
    reconstructed += text.slice(end, chunk.end);
    end = chunk.end;
  }
  assert(reconstructed === text);
});

Deno.test("Tate retrieval combines repeated answers from all matching distinct documents", () => {
  const records = Array.from({ length: 12 }, (_, index) => ({
    id: `p${index}`,
    document: `d${index}`,
    file: `source-${index}.txt`,
    start: 0,
    end: 60,
    attribution: "mixed-speakers",
    line: 1,
    text: `Discipline and motivation. Different answer ${index}.`,
  }));
  records.push({ ...records[0], id: "tristan", document: "other", attribution: "other-speaker" });
  const result = createTateRetriever({ records, inventory: records }).find("discipline motivation");
  assert(result.evidence.length === 12, "Must not stop at a single transcript or top four");
  assert(result.coverage.matchedDocuments === 12 && result.coverage.omittedDocuments === 0);
  assert(!result.evidence.some((row) => row.id === "tristan"));
  const bounded = createTateRetriever({ records, inventory: records }, { budget: 120 })
    .find("discipline motivation");
  assert(bounded.coverage.omittedDocuments > 0, "Context omissions must be explicit");
});

Deno.test("real Tate retrieval spans courses, interviews and book with source text intact", () => {
  const library = createTateRetriever(corpus);
  for (
    const question of [
      "discipline and motivation",
      "making money and business",
      "fear and adversity",
    ]
  ) {
    const result = library.find(question);
    assert(result.evidence.length > 4, question);
    assert(new Set(result.evidence.map((row) => row.document)).size > 4, question);
    assert(result.evidence.every((row) => row.attribution !== "other-speaker"));
    assert(
      result.evidence.every((row) =>
        corpus.documents.some((source) =>
          source.id === row.document && source.text.slice(row.start, row.end) === row.text
        )
      ),
    );
  }
  assert(library.find("quuxflibber zzyyxx").evidence.length === 0);
  assert(
    library.find("hello").evidence.length === 0,
    "Greetings should not retrieve interview intros",
  );
});

Deno.test("Tate source replies reject paraphrases, invented IDs and partial malformed output", () => {
  const evidence = [{
    id: "a",
    file: "a.txt",
    aliases: ["copy.txt"],
    start: 10,
    line: 4,
    text: "Question\nA real answer.\nSecond thought.",
    attribution: "mixed-speakers",
  }, {
    id: "b",
    file: "b.txt",
    start: 0,
    line: 1,
    text: "Another answer.",
    attribution: "andrew-course",
  }];
  const result = verifyTateReply(
    JSON.stringify({
      mode: "source",
      excerpts: [
        { id: "a", text: "A real answer." },
        { id: "b", text: "Another answer." },
      ],
    }),
    evidence,
  );
  assert(result.text === "A real answer.\n\nAnother answer.");
  assert(result.sources.length === 2 && result.sources[0].line === 5);
  for (
    const invalid of [
      { mode: "source", excerpts: [{ id: "a", text: "A rewritten answer." }] },
      { mode: "source", excerpts: [{ id: "missing", text: "Another answer." }] },
      { mode: "source", excerpts: [] },
      { mode: "continuation", reply: "" },
    ]
  ) {
    let rejected = false;
    try {
      verifyTateReply(JSON.stringify(invalid), evidence);
    } catch {
      rejected = true;
    }
    assert(rejected, "Unverified wording must not be sent");
  }
  assert(verifyTateReply('{"mode":"continuation","reply":"Hello."}', []).mode === "continuation");
  const boundaries = verifyTateReply(
    JSON.stringify({
      mode: "source",
      excerpts: [
        { id: "a", from: "A real answer.", to: "Second thought." },
      ],
    }),
    evidence,
  );
  assert(boundaries.text === "A real answer.\nSecond thought.");
  const lineRange = verifyTateReply(
    JSON.stringify({
      mode: "source",
      excerpts: [
        { id: "a", fromLine: 5, toLine: 6 },
      ],
    }),
    evidence,
  );
  assert(lineRange.text === "A real answer.\nSecond thought.");
  assert(lineRange.sources[0].line === 5 && lineRange.sources[0].endLine === 6);
  const repeatedLine = verifyTateReply(
    JSON.stringify({
      mode: "source",
      excerpts: [
        { id: "r", fromLine: 7, toLine: 7 },
      ],
    }),
    [{ id: "r", line: 5, start: 0, file: "r.txt", text: "Same words.\nOther words.\nSame words." }],
  );
  assert(repeatedLine.sources[0].line === 7, "Repeated words retain the selected occurrence");
  for (
    const range of [
      { id: "a", fromLine: 0, toLine: 6 },
      { id: "a", fromLine: 6, toLine: 5 },
      { id: "a", fromLine: 5, toLine: 70 },
      { id: "a", fromLine: "5", toLine: 6 },
    ]
  ) {
    let rejected = false;
    try {
      verifyTateReply(JSON.stringify({ mode: "source", excerpts: [range] }), evidence);
    } catch {
      rejected = true;
    }
    assert(rejected, "Invented source lines must be rejected");
  }
  const wrapped = verifyTateReply(
    "```json\n" + JSON.stringify({
      mode: "source",
      excerpts: [
        { id: "a", from: "A real answer. Second thought.", to: "Second thought." },
      ],
    }) + "\n```",
    evidence,
  );
  assert(
    wrapped.text === "A real answer.\nSecond thought.",
    "Caption whitespace is restored exactly",
  );
  for (
    const excerpt of [
      { id: "a", from: "Second thought.", to: "A real answer." },
      { id: "a", from: "Rewritten phrase", to: "Second thought." },
      { id: "a", from: "", to: "Second thought." },
    ]
  ) {
    let rejected = false;
    try {
      verifyTateReply(JSON.stringify({ mode: "source", excerpts: [excerpt] }), evidence);
    } catch {
      rejected = true;
    }
    assert(rejected, "Invalid boundaries must not choose a span");
  }
  let ambiguous = false;
  try {
    verifyTateReply(
      JSON.stringify({
        mode: "source",
        excerpts: [
          { id: "c", from: "Answer", to: "end" },
        ],
      }),
      [{ id: "c", text: "Answer, Answer, end", file: "test.txt", start: 0, line: 1 }],
    );
  } catch {
    ambiguous = true;
  }
  assert(ambiguous, "Repeated boundaries must be rejected");
  const prompt = buildTatePrompt({ evidence });
  assert(prompt.includes("Read ALL supplied relevant passages together"));
  assert(prompt.includes("NO speaker labels"));
  assert(prompt.includes("not historical canon"));
});

Deno.test("Tate source correction preserves valid selections and rejects changed or missing references", async () => {
  const evidence = [
    { id: "a", file: "a.txt", line: 10, start: 0, text: "First answer.\nQualification." },
    { id: "b", file: "b.txt", line: 20, start: 0, text: "Another answer." },
  ];
  const raw = JSON.stringify({
    mode: "source",
    excerpts: [
      { id: "a", fromLine: 10, toLine: 11 },
      { id: "b", fromLine: 900, toLine: 950 },
    ],
  });
  const corrected = await repairTateReply(raw, evidence, "question", (prompt) => {
    assert(prompt.includes("Another answer."));
    assert(!prompt.includes("First answer."), "Only invalid selections should be reconsidered");
    return Promise.resolve(
      JSON.stringify({ repairs: [{ selection: 1, id: "b", fromLine: 20, toLine: 20 }] }),
    );
  });
  assert(
    verifyTateReply(corrected, evidence).text ===
      "First answer.\nQualification.\n\nAnother answer.",
  );
  for (
    const repairs of [
      [],
      [{ selection: 1, id: "a", fromLine: 10, toLine: 11 }],
      [{ selection: 0, id: "b", fromLine: 20, toLine: 20 }],
      [{ selection: 1, id: "b", fromLine: 0, toLine: 20 }],
      [{ selection: 1, id: "b", omit: true }],
    ]
  ) {
    let rejected = false;
    try {
      await repairTateReply(
        raw,
        evidence,
        "question",
        () => Promise.resolve(JSON.stringify({ repairs })),
      );
    } catch {
      rejected = true;
    }
    assert(rejected, "Invalid corrections must not become source replies");
  }
  const mixedEvidence = evidence.map((row, index) => ({
    ...row,
    attribution: index === 1 ? "mixed-speakers" : "andrew-course",
  }));
  const mixedRaw = JSON.stringify({
    mode: "source",
    excerpts: [
      { id: "a", fromLine: 10, toLine: 11 },
      { id: "b", fromLine: 20, toLine: 20 },
    ],
  });
  const reviewed = await repairTateReply(mixedRaw, mixedEvidence, "question", (prompt) => {
    assert(prompt.includes("independent speaker check"));
    assert(prompt.includes('"reviewSpeaker":true'));
    assert(!prompt.includes("First answer."));
    return Promise.resolve(JSON.stringify({ repairs: [{ selection: 1, id: "b", omit: true }] }));
  });
  assert(verifyTateReply(reviewed, mixedEvidence).text === "First answer.\nQualification.");
});

const request = (persona = "tate") =>
  new Request("http://localhost:8000/api/chat", {
    method: "POST",
    headers: { origin: "http://localhost:8000", "content-type": "application/json" },
    body: JSON.stringify({
      persona,
      messages: [{ role: "user", content: "discipline motivation" }],
    }),
  });
const config = { baseUrl: "https://example.com/v1", model: "test", apiKey: "test" };
Deno.test("Tate server buffers JSON and emits only verified multi-source wording and provenance", async () => {
  const evidence = [{ id: "a", file: "a.txt", line: 1, start: 0, text: "First exact answer." }, {
    id: "b",
    file: "b.txt",
    line: 1,
    start: 0,
    text: "Second exact answer.",
  }];
  const tateLibrary = {
    styles: [],
    find: () => ({ evidence, coverage: { includedDocuments: 2 } }),
  };
  for (const valid of [true, false]) {
    const app = createApp({
      config,
      tateLibrary,
      fetchModel: (_url, options) => {
        const payload = JSON.parse(options.body);
        assert(payload.messages[0].content.includes("Andrew Tate"));
        assert(!payload.messages[0].content.includes("The goat jambalaya"));
        const value = JSON.stringify({
          mode: "source",
          excerpts: [
            { id: "a", text: "First exact answer." },
            { id: "b", text: valid ? "Second exact answer." : "Made up answer." },
          ],
        });
        return Promise.resolve(
          new Response(`data: ${
            JSON.stringify({
              choices: [{
                delta: { content: value },
                finish_reason: "stop",
              }],
            })
          }\n\ndata: [DONE]\n\n`),
        );
      },
    });
    const response = await app(request());
    const events = (await response.text()).trim().split("\n").map(JSON.parse);
    if (valid) {
      assert(events[0].text === "First exact answer.\n\nSecond exact answer.");
      assert(events[1].sourceMode === "source" && events[1].sources.length === 2);
    } else {
      assert(events.every((event) => event.type !== "delta"), "No partial unverified output");
      assert(events[0].type === "error");
    }
  }
  const unavailable = await createApp({ config })(request());
  assert(unavailable.status === 503, "Never silently fall back to an unrelated persona");
});

Deno.test("Tate server corrects miscopied line numbers before sending any source wording", async () => {
  const evidence = [{ id: "a", file: "a.txt", line: 1, start: 0, text: "First exact answer." }, {
    id: "b",
    file: "b.txt",
    line: 4,
    start: 0,
    text: "Second exact answer.",
  }];
  let calls = 0;
  const app = createApp({
    config,
    tateLibrary: { styles: [], find: () => ({ evidence, coverage: {} }) },
    fetchModel: (_url, options) => {
      calls++;
      const payload = JSON.parse(options.body);
      if (calls === 1) {
        assert(payload.stream === true);
        return Promise.resolve(
          new Response(`data: ${
            JSON.stringify({
              choices: [{
                delta: {
                  content: JSON.stringify({
                    mode: "source",
                    excerpts: [
                      { id: "a", fromLine: 1, toLine: 1 },
                      { id: "b", fromLine: 70, toLine: 90 },
                    ],
                  }),
                },
                finish_reason: "stop",
              }],
            })
          }\n\ndata: [DONE]\n\n`),
        );
      }
      assert(payload.stream === false && calls === 2);
      return Promise.resolve(Response.json({
        choices: [{
          message: {
            content: JSON.stringify({
              repairs: [{ selection: 1, id: "b", fromLine: 4, toLine: 4 }],
            }),
          },
        }],
      }));
    },
  });
  const response = await app(request());
  const events = (await response.text()).trim().split("\n").map(JSON.parse);
  assert(calls === 2);
  assert(events[0].text === "First exact answer.\n\nSecond exact answer.");
  assert(events[1].sourceMode === "source" && events[1].sources.length === 2);
});
