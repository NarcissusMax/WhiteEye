import { createApp } from "../server/app.js";
import { createVegetaLibrary, resolveVegetaEra } from "../server/vegeta-retrieval.js";
import { buildVegetaPrompt } from "../src/persona/vegeta.js";

const assert = (value, message = "Assertion failed") => {
  if (!value) throw Error(message);
};
const corpus = JSON.parse(
  await Deno.readTextFile(new URL("../private/vegeta-research.json", import.meta.url)),
);
const library = createVegetaLibrary(corpus);
const request = (messages, persona = "vegeta") =>
  new Request("http://localhost:8000/api/chat", {
    method: "POST",
    headers: { origin: "http://localhost:8000", "content-type": "application/json" },
    body: JSON.stringify({ persona, messages }),
  });
const stream = () =>
  new Response(
    'data: {"choices":[{"delta":{"content":"Then train for the part you failed."},"finish_reason":"stop"}]}\n\ndata: [DONE]\n\n',
  );
const config = { baseUrl: "https://example.com/v1", model: "test", apiKey: "test" };

Deno.test("Vegeta research has traceable, bounded original notes across continuities", () => {
  assert(corpus.inventory.length >= 20);
  assert(corpus.notes.length >= 30);
  assert(new Set(corpus.notes.map((note) => note.id)).size === corpus.notes.length);
  for (const note of corpus.notes) {
    const source = corpus.inventory.find((source) => source.id === note.source);
    assert(source?.url.startsWith("https://"));
    assert(note.observation && note.behavior && note.limit && note.tags.length);
    assert(!Object.hasOwn(note, "dialogue"), "Exact franchise dialogue is not stored");
    assert(note.observation.split(/\s+/).length < 100);
  }
});

Deno.test("Vegeta era follows the user's explicit choice and keeps GT and DAIMA separate", () => {
  const messages = [
    { role: "user", content: "Play Vegeta in the Saiyan arc." },
    { role: "assistant", content: "In GT, I can transform." },
    { role: "user", content: "What would you say to Kakarot?" },
  ];
  assert(resolveVegetaEra(messages).through === 1);
  assert(
    resolveVegetaEra([...messages, { role: "user", content: "Switch to GT Vegeta." }]).branch ===
      "gt",
  );
  assert(resolveVegetaEra("Roleplay Vegeta in DAIMA").branch === "daima");
  assert(resolveVegetaEra("Vegeta on Namek").through === 2);
  assert(resolveVegetaEra("Be Vegeta during the Buu saga").through === 4);
  assert(resolveVegetaEra("In the Granolah arc, what is pride?").through === 9);
  assert(
    resolveVegetaEra([...messages, { role: "user", content: "Use the latest Vegeta." }]).through ===
      10,
  );
});

Deno.test("early Vegeta prompt excludes later family, Cell, Buu and Ultra Ego facts", () => {
  const selection = library.find("family and pride", {
    era: resolveVegetaEra("In the Saiyan arc"),
  });
  assert(selection.timeline.every((note) => note.stage === 1));
  assert(selection.evidence.every((note) => note.stage === 1));
  const prompt = buildVegetaPrompt(selection);
  for (const later of ["Bulma", "Trunks", "Cell", "Buu", "Cabba", "Ultra Ego", "Bulla"]) {
    assert(!prompt.includes(later), `Early era leaked ${later}`);
  }
});

Deno.test("Vegeta's decision model changes with experience rather than only changing his voice", () => {
  const invader = buildVegetaPrompt(
    library.find("I was defeated by a rival", { era: resolveVegetaEra("In the Saiyan arc") }),
  );
  const adult = buildVegetaPrompt(library.find("I was defeated by a rival"));
  assert(invader.includes("MINDSET AND PRIORITIES"));
  assert(invader.includes("HOW HE DECIDES"));
  assert(invader.includes("PRESSURE POINTS"));
  assert(invader.includes("Power and royal status come first"));
  assert(adult.includes("Family, the people under threat and the cost of his old mistakes"));
  assert(adult.includes("FOR AN ORDINARY USER'S PROBLEM"));
  assert(!invader.includes("Family, the people under threat"));
});

Deno.test("Majin Vegeta's duel does not know the later sacrifice", () => {
  const era = resolveVegetaEra("Play Majin Vegeta while he confronts Goku.");
  assert(era.phase === "majin-before-sacrifice");
  const selection = library.find("family and power", { era });
  assert(!selection.timeline.some((note) => note.id === "14-sacrifice"));
  assert(!selection.evidence.some((note) => note.id === "14-family-farewell"));
  const prompt = buildVegetaPrompt(selection);
  assert(!prompt.includes("Genki-Dama"));
});

Deno.test("GT and DAIMA research does not merge with later Super manga events", () => {
  for (const branch of ["gt", "daima"]) {
    const selection = library.find("Goku pride fusion", { era: resolveVegetaEra(`In ${branch}`) });
    assert(selection.evidence.every((note) => note.stage <= 4 || note.branch === branch));
    assert(selection.timeline.every((note) => note.stage <= 4 || note.branch === branch));
    assert(selection.coverage.branch === branch);
  }
  const gt = library.find("fusion", { era: resolveVegetaEra("In GT") });
  assert(gt.timeline.some((note) => note.id === "31-gt-fusion"));
  assert(!buildVegetaPrompt(gt).includes("Ultra Ego"));
});

Deno.test("Vegeta streams a bounded original interpretation with the active era and references", async () => {
  let prompt = "";
  const app = createApp({
    config,
    vegetaLibrary: library,
    fetchModel: (_url, options) => {
      const payload = JSON.parse(options.body);
      prompt = payload.messages[0].content;
      assert(payload.stream === true);
      return Promise.resolve(stream());
    },
  });
  const response = await app(request([
    { role: "user", content: "Play Vegeta in the Cell arc." },
    { role: "assistant", content: "I allowed Cell to advance." },
    { role: "user", content: "What would you do after a mistake?" },
  ]));
  assert(response.status === 200);
  const events = (await response.text()).trim().split("\n").map(JSON.parse);
  assert(events[0].text === "Then train for the part you failed.");
  assert(events.at(-1).sourceMode === "interpretation");
  assert(events.at(-1).coverage.era.includes("Cell"));
  assert(events.at(-1).sources.every((source) => source.url.startsWith("https://")));
  assert(prompt.includes("Cell"));
  assert(!prompt.includes("Ultra Ego"));
  assert(prompt.length < 40000);
});
