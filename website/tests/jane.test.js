import { createApp } from "../server/app.js";
import { createJaneLibrary, resolveJaneEra } from "../server/jane-retrieval.js";
import { buildJanePrompt } from "../src/persona/patrick-jane.js";

const assert = (value, message = "Assertion failed") => {
  if (!value) throw Error(message);
};
const research = JSON.parse(
  await Deno.readTextFile(new URL("../private/jane-research.json", import.meta.url)),
);
const library = createJaneLibrary(research);
const request = (messages, extra = {}) =>
  new Request("http://localhost:8000/api/chat", {
    method: "POST",
    headers: { origin: "http://localhost:8000", "content-type": "application/json" },
    body: JSON.stringify({ persona: "jane", messages, ...extra }),
  });
const stream = () =>
  new Response(
    'data: {"choices":[{"delta":{"content":"That is an assumption. What changed?"},"finish_reason":"stop"}]}\n\ndata: [DONE]\n\n',
  );
const config = { baseUrl: "https://example.com/v1", model: "test", apiKey: "test" };

Deno.test("Jane research has auditable collection coverage and original, bounded notes", () => {
  const transcripts = research.inventory.filter((source) => source.kind === "episode-transcript");
  assert(transcripts.length === 150);
  assert(new Set(transcripts.map((source) => source.episode.slice(1, 3))).size === 7);
  assert(
    transcripts.filter((source) => source.review === "scene-reviewed").length ===
      research.coverage.transcriptFilesSceneReviewed,
  );
  assert(research.notes.length === research.coverage.researchNotes);
  assert(new Set(research.notes.map((note) => note.id)).size === research.notes.length);
  for (const note of research.notes) {
    const source = research.inventory.find((source) => source.id === note.source);
    assert(source && source.url.startsWith("https://"));
    assert(note.observation && note.pattern && note.limit && note.locator);
    assert(!Object.hasOwn(source, "text"), "Raw external scripts must not be shipped");
    const words =
      [note.observation, note.pattern, note.limit, note.laterCanon?.text || ""].join(" ").split(
        /\s+/,
      ).length;
    assert(words < 200, "Scene notes should remain bounded original summaries");
  }
});

Deno.test("Jane retrieves complementary grief, skepticism, generosity and fallibility evidence", () => {
  const grief = library.find("Why don't you mock a grieving friend's belief in an afterlife?");
  assert(grief.evidence.some((note) => note.source === "s07e10"));
  assert(grief.evidence.some((note) => note.source === "s02e08"));
  const money = library.find(
    "How did you spend your poker winnings and why give your friends gifts?",
  );
  assert(money.evidence.some((note) => note.source === "s01e06"));
  const memory = library.find("Is your memory palace intact during amnesia in Fugue in Red?");
  assert(memory.evidence[0].source === "s04e10");
  const list = library.find("How do you use memory and research to narrow a list?");
  assert(list.evidence.some((note) => note.source === "s05e13"));
  assert(memory.evidence.every((note) => note.observation && note.limit));
});

Deno.test("Jane research context respects size, source diversity and missing evidence", () => {
  const selection = library.find("Lisbon grief love trust future fear family", {
    budget: 4000,
    limit: 3,
  });
  assert(selection.evidence.length <= 3);
  assert(JSON.stringify(selection.evidence).length < 4010);
  assert(new Set(selection.evidence.map((note) => note.source)).size === selection.evidence.length);
  assert(selection.coverage.omittedNotes > 0);
  const unknown = library.find("quasarxyz orbitalxyz");
  assert(unknown.evidence.length === 0);
  assert(unknown.styles.length > 2);
});

Deno.test("explicit Jane timeline persists, can change, and uses only human turns", () => {
  const messages = [
    { role: "user", content: "Roleplay Jane in season one." },
    { role: "assistant", content: "In season seven, I got married." },
    { role: "user", content: "What do you think about Lisbon?" },
  ];
  assert(resolveJaneEra(messages).through === 123);
  assert(
    resolveJaneEra([...messages, { role: "user", content: "Now use early FBI Jane." }]).through ===
      621,
  );
  assert(
    resolveJaneEra([...messages, { role: "user", content: "Switch to the full series." }])
      .through === 713,
  );
  assert(resolveJaneEra("As of S03E24").through === 324);
  assert(resolveJaneEra("During season 2 episode 10").through === 210);
  assert(resolveJaneEra("Season six, before Red John dies.").through === 607);
  assert(resolveJaneEra("Early FBI in season six.").through === 621);
});

Deno.test("early Jane context excludes later resolutions, romance and exceptional states", () => {
  const selection = library.find("Red John love marriage amnesia daughter", {
    era: resolveJaneEra("season one"),
  });
  assert([...selection.evidence, ...selection.styles].every((note) => note.ordinal <= 123));
  const prompt = buildJanePrompt(selection);
  assert(!prompt.includes("McAllister"));
  assert(!prompt.includes("Timothy Carter"));
  assert(!prompt.includes("pregnancy"));
  assert(!prompt.includes("jane-s04e10"));
  assert(!selection.references.some((source) => source.episode?.startsWith("s07")));
});

Deno.test("later corrections and combined-finale material do not leak early", () => {
  const firstPart = library.find("Strawberries & Cream hotel", { era: resolveJaneEra("S03E23") });
  assert(!firstPart.evidence.some((note) => note.source === "s03e23"));
  const finale = library.find("Strawberries & Cream hotel", { era: resolveJaneEra("S03E24") });
  assert(finale.evidence.some((note) => note.source === "s03e23"));
  assert(!JSON.stringify(finale).includes("Timothy Carter"));
  const corrected = library.find("Strawberries & Cream hotel", { era: resolveJaneEra("S04E01") });
  assert(corrected.evidence.some((note) => note.laterCanon?.includes("Timothy Carter")));
  const apparent = library.find("Red Rover, Red Rover", { era: resolveJaneEra("S04E23") });
  assert(!apparent.evidence.find((note) => note.source === "s04e23").laterCanon);
});

Deno.test("Jane streams original text with honest research labels and isolated sources", async () => {
  let prompt = "";
  const app = createApp({
    config,
    janeLibrary: library,
    fetchModel: (_url, options) => {
      const body = JSON.parse(options.body);
      prompt = body.messages[0].content;
      assert(body.stream === true);
      return Promise.resolve(stream());
    },
  });
  const response = await app(
    request([{ role: "user", content: "What do you infer from a changed story?" }]),
  );
  assert(response.status === 200);
  const events = (await response.text()).trim().split("\n").map(JSON.parse);
  assert(events[0].text === "That is an assumption. What changed?");
  const done = events.at(-1);
  assert(done.sourceMode === "interpretation");
  assert(done.coverage.transcriptFilesSearched === 150);
  assert(
    done.sources.length > 0 && done.sources.every((source) => source.url.startsWith("https://")),
  );
  assert(!prompt.includes("Andrew Tate"));
  assert(!prompt.includes("Ayanokoji"));
  assert(prompt.includes("They are paraphrases"));
  assert(prompt.includes("you cannot see the visitor"));
});

Deno.test("missing Jane research fails without spending a provider request", async () => {
  let calls = 0;
  const app = createApp({
    config,
    fetchModel: () => {
      calls++;
      return Promise.resolve(stream());
    },
  });
  const response = await app(request([{ role: "user", content: "Hi" }]));
  assert(response.status === 503);
  assert(calls === 0);
});
