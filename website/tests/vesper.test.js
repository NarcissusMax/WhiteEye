import { createApp } from "../server/app.js";
import { createJaneLibrary } from "../server/jane-retrieval.js";
import { createImpLibrary } from "../server/imp-retrieval.js";
import impResearch from "../private/imp-research.json" with { type: "json" };
import { selectPriorMemory } from "../public/js/memory.js";
import { loadConversations, saveConversations } from "../public/js/storage.js";
import {
  buildVesperPrompt,
  selectCompositeEvidence,
  VESPER_COMPONENTS,
} from "../src/persona/vesper.js";

const assert = (value, message = "Assertion failed") => {
  if (!value) throw Error(message);
};
const research = JSON.parse(
  await Deno.readTextFile(new URL("../private/jane-research.json", import.meta.url)),
);
const janeLibrary = createJaneLibrary(research);
const config = { baseUrl: "https://example.com/v1", model: "test", apiKey: "test" };
const request = (persona, content) =>
  new Request("http://localhost:8000/api/chat", {
    method: "POST",
    headers: { origin: "http://localhost:8000", "content-type": "application/json" },
    body: JSON.stringify({ persona, messages: [{ role: "user", content }] }),
  });

Deno.test("Vesper uses five active personas including IMP and preserves identity boundaries", () => {
  const prompt = buildVesperPrompt();
  for (
    const name of [
      "WhiteEye",
      "Griffith",
      "IMP",
      "Johan Liebert",
      "Yuichi Katagiri",
      "Ayanokoji Kiyotaka",
      "Andrew Tate",
      "Patrick Jane",
    ]
  ) assert(prompt.includes(name));
  assert(prompt.includes("The Daily Laws"));
  assert(VESPER_COMPONENTS.join(",") === "whiteeye,griffith,imp,tate,jane");
  assert(prompt.includes("one coherent original voice"));
  assert(prompt.includes("WhiteEye remains a close secondary influence"));
  assert(prompt.includes("Griffith has the least influence"));
  assert(prompt.includes("hierarchy overrides the order and length"));
  assert(prompt.includes("do not import memes"));
  assert(prompt.includes("First-person text alone does not identify the speaker"));
  assert(prompt.includes("no literal combined biography"));
  assert(
    prompt.includes("not a claim that every contributor shares the view") ||
      prompt.includes("a claim that every contributor shares the view"),
  );
});

Deno.test("composite context gives distinct files space, stays bounded and marks truncation", () => {
  const rows = [
    {
      id: "a1",
      document: "a",
      file: "a.txt",
      attribution: "andrew-course",
      text: "A".repeat(3500),
    },
    {
      id: "a2",
      document: "a",
      file: "a.txt",
      attribution: "andrew-course",
      text: "B".repeat(1500),
    },
    {
      id: "other",
      document: "other",
      file: "other.txt",
      attribution: "other-speaker",
      text: "Excluded",
    },
    {
      id: "b1",
      document: "b",
      file: "b.txt",
      attribution: "mixed-speakers",
      text: "C".repeat(2000),
    },
  ];
  const selected = selectCompositeEvidence(rows, 5000);
  assert(selected[0].id === "a1" && selected[1].id === "b1");
  assert(selected[0].truncated === true);
  assert(!selected.some((row) => row.id === "other"));
  assert(selected.reduce((sum, row) => sum + row.text.length, 0) <= 5000);
  assert(rows[0].text.length === 3500, "Selection must not alter individual source evidence");
});

Deno.test("Vesper routes source context to one original streamed reply without quotation verification", async () => {
  let modelCalls = 0, prompt = "", archiveCalls = 0;
  const archive = (name) => ({
    styles: [],
    find() {
      archiveCalls++;
      return {
        evidence: [{
          id: name,
          document: name,
          file: name,
          text: `${name} characterization context`,
          attribution: "mixed-speakers",
        }],
      };
    },
  });
  const app = createApp({
    config,
    janeLibrary,
    tateLibrary: archive("Tate"),
    coteLibrary: archive("COTE"),
    impLibrary: createImpLibrary(impResearch),
    retrieve:
      () => [{ file: "whiteeye.txt", speaker: "whiteeye", text: "Examine what you assumed." }],
    retrieveGriffith:
      () => [{ file: "griffith.txt", speaker: "other", text: "What supports that claim?" }],
    fetchModel: (_url, options) => {
      modelCalls++;
      prompt = JSON.parse(options.body).messages[0].content;
      return Promise.resolve(
        new Response(
          'data: {"choices":[{"delta":{"content":"Check the assumption, then make one useful move."},"finish_reason":"stop"}]}\n\ndata: [DONE]\n\n',
        ),
      );
    },
  });
  const response = await app(request("vesper", "How should I negotiate more time?"));
  assert(response.status === 200);
  const events = (await response.text()).trim().split("\n").map(JSON.parse);
  assert(events[0].text === "Check the assumption, then make one useful move.");
  const done = events.at(-1);
  assert(done.sourceMode === "synthesis");
  assert(done.sources.map((source) => source.persona).join(",") === VESPER_COMPONENTS.join(","));
  assert(modelCalls === 1 && archiveCalls === 2);
  assert(prompt.includes("Tate characterization context"));
  assert(prompt.includes("COTE characterization context"));
  assert(prompt.includes("Examine what you assumed."));
  assert(prompt.includes("What supports that claim?"));
  assert(prompt.includes("jane-s01e01"));
  assert(prompt.includes("johan-v04-trust-and-emotion"));
  assert(prompt.includes("yuichi-friends-and-ruthlessness"));
  assert(prompt.includes('"completeTexts":false'));
});

Deno.test("Vesper and Jane recall stays separate from each other and other personas", () => {
  const chats = ["vesper", "jane", "whiteeye", "tate"].map((persona, index) => ({
    id: persona,
    createdAt: index,
    remember: true,
    persona,
    messages: [
      { role: "user", persona, content: `My private violin project for ${persona}.`, at: index },
      { role: "assistant", persona, content: `${persona} reply`, status: "complete" },
    ],
  }));
  for (const persona of ["vesper", "jane"]) {
    const memory = selectPriorMemory(chats, "fresh", "Remember my violin project?", 4, persona);
    assert(memory.length === 1);
    assert(memory[0].user.includes(`for ${persona}`));
    assert(memory[0].assistant === `${persona} reply`);
  }
});

Deno.test("Jane and Vesper persist alongside older chats and source context", () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  const values = new Map();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
    },
  });
  try {
    const chats = ["whiteeye", "jane", "vesper"].map((persona, index) => ({
      id: persona,
      title: persona,
      persona,
      createdAt: index,
      messages: [{
        role: "assistant",
        persona,
        content: "Saved reply",
        sourceMode: persona === "jane" ? "interpretation" : "synthesis",
        sources: [{ title: "Saved context" }],
      }],
    }));
    saveConversations({ chats, active: "jane", folders: [] });
    const restored = loadConversations();
    assert(restored.chats.length === 3);
    for (const persona of ["jane", "vesper"]) {
      const chat = restored.chats.find((chat) => chat.id === persona);
      assert(chat.persona === persona && chat.messages[0].sources[0].title === "Saved context");
    }
  } finally {
    Object.defineProperty(globalThis, "localStorage", descriptor);
  }
});

Deno.test("missing contributor research stops Vesper before a model call", async () => {
  let calls = 0;
  const app = createApp({
    config,
    janeLibrary,
    fetchModel: () => {
      calls++;
      throw Error("Should not run");
    },
  });
  const response = await app(request("vesper", "Hello"));
  assert(response.status === 503 && calls === 0);
});
