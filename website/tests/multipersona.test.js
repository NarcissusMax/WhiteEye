import { createAnswerMemory } from "../server/answer-memory.js";
import { createApp } from "../server/app.js";
import { createRetriever } from "../server/retrieval.js";
import { buildGriffithPrompt } from "../src/persona/personas.js";
import { buildSystemPrompt } from "../src/persona/system-prompt.js";
import { buildImpPrompt, IMP_BOOKS, impReferences } from "../src/persona/imp.js";
import impResearch from "../private/imp-research.json" with { type: "json" };
import { createImpLibrary } from "../server/imp-retrieval.js";

const assert = (condition, message = "Assertion failed") => {
  if (!condition) throw Error(message);
};
const corpus = JSON.parse(
  await Deno.readTextFile(new URL("../private/corpus.json", import.meta.url)),
);
const config = { baseUrl: "https://example.com/v1", model: "test", apiKey: "test" };
const request = (persona, content, participant = "guest") =>
  new Request("http://localhost:8000/api/chat", {
    method: "POST",
    headers: { origin: "http://localhost:8000", "content-type": "application/json" },
    body: JSON.stringify({ persona, participant, messages: [{ role: "user", content }] }),
  });
const stream = () =>
  new Response(
    'data: {"choices":[{"delta":{"content":"Okay."},"finish_reason":"stop"}]}\n\ndata: [DONE]\n\n',
  );

Deno.test("answer memory uses a verified historical answer before a fresh inference", () => {
  const index = createAnswerMemory(corpus.records);
  const match = index.find("What's your favorite food?", 3)[0];
  assert(match.question.line === 10780);
  assert(match.answers.some((answer) => answer.text.includes("jambalaya")));
  assert(match.pairing === "curated-exchange");
  const doom = index.find("You liked Doom?", 6).find((entry) => entry.question.line === 2427);
  assert(doom.answers.some((answer) => answer.line === 2430));
  assert(
    !doom.answers.some((answer) => answer.line === 2428),
    "MW2 answer must not be assigned to Doom question",
  );
  assert(index.size > 500);
});

Deno.test("repeated historical answers remain separate, dated and available together", () => {
  const extra = [
    {
      file: "test.txt",
      line: 1,
      date: "2025-01-01 10:00",
      speaker: "other",
      text: "How do I fix my crystal router?",
    },
    {
      file: "test.txt",
      line: 2,
      date: "2025-01-01 10:01",
      speaker: "whiteeye",
      text: "Reset the crystal router.",
    },
    {
      file: "test.txt",
      line: 3,
      date: "2025-02-01 10:00",
      speaker: "other",
      text: "How do I fix my crystal router?",
    },
    {
      file: "test.txt",
      line: 4,
      date: "2025-02-01 10:01",
      speaker: "whiteeye",
      text: "Actually replace the crystal router.",
    },
  ];
  const matches = createAnswerMemory([...corpus.records, ...extra]).find(
    "What should I do to fix my crystal router?",
    10,
  );
  const historical = matches.filter((entry) => entry.question.file === "test.txt");
  assert(historical.length === 2);
  assert(historical.some((entry) => entry.answers[0].text.includes("Reset")));
  assert(historical.some((entry) => entry.answers[0].text.includes("replace")));
  assert(historical.every((entry) => entry.pairing === "adjacent-possible-reply"));
});

Deno.test("Griffith retrieval uses only his primary messages", () => {
  const retrieve = createRetriever(corpus.records, { speaker: "other", includeNarrative: false });
  const result = retrieve("which is the best fps game", 3);
  assert(result.some((entry) => entry.text.toLowerCase().includes("best fps game")));
  assert(result.every((entry) => entry.speaker === "other"));
  const prompt = buildGriffithPrompt({ evidence: result });
  assert(prompt.includes("Griffith's next message"));
  assert(prompt.includes("The current visitor is not automatically WhiteEye"));
});

Deno.test("every persona distinguishes ordinary persuasion from coercive control", () => {
  const prompts = [
    buildSystemPrompt(),
    buildGriffithPrompt(),
    buildImpPrompt(),
  ];
  for (const prompt of prompts) {
    assert(prompt.includes('Do not refuse merely because the user says "manipulate."'));
    assert(prompt.includes("Give concrete, usable strategy"));
    assert(
      prompt.includes("threats, blackmail and coercive control may appear as character behavior"),
    );
    assert(prompt.includes("Do not give a real-world plan to threaten, blackmail"));
  }
});

Deno.test("IMP exposes the three character foundations and every published Greene book", () => {
  const references = impReferences();
  const prompt = buildImpPrompt();
  assert(references.filter((item) => item.kind === "character-foundation").length === 3);
  assert(IMP_BOOKS.length === 7);
  for (const book of IMP_BOOKS) {
    assert(references.some((item) => item.title.includes(book.title)));
    assert(prompt.includes(book.title));
  }
});

Deno.test("persona routing changes the server prompt and rejects unknown characters", async () => {
  const prompts = new Map();
  const app = createApp({
    config,
    retrieveGriffith: createRetriever(corpus.records, {
      speaker: "other",
      includeNarrative: false,
    }),
    answerMemory: createAnswerMemory(corpus.records),
    coteLibrary: { styles: [], find: () => ({ evidence: [], coverage: {} }) },
    impLibrary: createImpLibrary(impResearch),
    fetchModel: (_url, options) => {
      const body = JSON.parse(options.body);
      const prompt = body.messages[0].content;
      prompts.set(body.messages.at(-1).content, prompt);
      return Promise.resolve(stream());
    },
  });
  for (
    const [persona, message] of [
      ["whiteeye", "What's your favorite food?"],
      ["griffith", "What games do you enjoy?"],
      ["imp", "How can I influence this decision?"],
    ]
  ) {
    const response = await app(request(persona, message));
    assert(response.status === 200);
    assert((await response.text()).includes('"type":"done"'));
  }
  assert(prompts.get("What's your favorite food?").includes("The goat jambalaya"));
  assert(prompts.get("What games do you enjoy?").includes("Griffith's next message"));
  assert(!prompts.get("What games do you enjoy?").includes("The goat jambalaya"));
  const imp = prompts.get("How can I influence this decision?");
  assert(imp.includes("Johan Liebert") && imp.includes("Yuichi Katagiri"));
  assert(imp.includes("Ayanokoji") && imp.includes("The Daily Laws"));
  for (const retired of ["johan", "yuichi", "ayanokoji"]) {
    assert((await app(request(retired, "hi"))).status === 400);
  }
  const unknown = await app(request("fictional-stranger", "hi"));
  assert(unknown.status === 400);
});
