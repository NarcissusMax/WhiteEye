import { createApp } from "../server/app.js";
import { createImpLibrary } from "../server/imp-retrieval.js";
import { buildImpPrompt } from "../src/persona/imp.js";
import research from "../private/imp-research.json" with { type: "json" };

const assert = (value, message = "Assertion failed") => {
  if (!value) throw Error(message);
};
const library = createImpLibrary(research);
const config = { baseUrl: "https://example.com/v1", model: "test", apiKey: "test" };
const request = (content) =>
  new Request("http://localhost:8000/api/chat", {
    method: "POST",
    headers: { origin: "http://localhost:8000", "content-type": "application/json" },
    body: JSON.stringify({ persona: "imp", messages: [{ role: "user", content }] }),
  });

Deno.test("IMP research covers every official volume description without claiming full text", () => {
  for (const [work, count] of [["Monster", 9], ["Tomodachi Game", 26]]) {
    const volumes = research.inventory.filter((source) =>
      source.work === work && source.kind === "official-volume-description"
    ).map((source) => source.volume).sort((a, b) => a - b);
    assert(volumes.length === count);
    assert(volumes.every((volume, index) => volume === index + 1));
  }
  const episodes = research.inventory.filter((source) => source.kind === "official-anime-synopsis");
  assert(episodes.length === 12);
  assert(new Set(episodes.map((source) => source.episode)).size === 12);
  assert(research.coverage.completeTexts === false);
  assert(research.coverage.primaryMangaVolumesIndexed === 0);
  assert(new Set(research.notes.map((note) => note.id)).size === research.notes.length);
  for (const source of research.inventory) {
    assert(!Object.hasOwn(source, "text"), "No raw external manga text should be bundled");
    assert(["www.viz.com", "shonenmagazine.com", "cstation.kodansha.co.jp", "tomodachi-anime.com"]
      .includes(new URL(source.url).hostname));
  }
  for (const note of research.notes) {
    assert(research.inventory.some((source) => source.id === note.source));
    assert(note.observation && note.interpretation);
    assert([note.observation, note.interpretation].join(" ").split(/\s+/).length < 200);
  }
});

Deno.test("IMP retrieves named volume evidence and preserves both character influences", () => {
  for (
    const [query, source] of [
      ["Johan Monster volume 4 crying at a children's book", "monster-v04"],
      ["Yuichi Tomodachi Game volume 14 gambling loss to Satone", "tomodachi-v14"],
      ["Tomodachi Game volume 26 ending and boss identity", "tomodachi-v26"],
    ]
  ) {
    const result = library.find(query);
    assert(result.context[0].source === source, `Wrong leading evidence for ${query}`);
    assert(result.context.some((note) => note.character === "Johan Liebert"));
    assert(result.context.some((note) => note.character === "Yuichi Katagiri"));
    assert(result.context.every((note) => note.sourceKind !== "manga-transcript"));
  }
  const final = library.find("Tomodachi Game volume 26 ending and boss identity");
  assert(final.context[0].observation.includes("without providing the detailed answer"));
  assert(final.coverage.completeTexts === false);
});

Deno.test("IMP omits whole notes when context is small and reports missing matches", () => {
  const original = JSON.stringify(research);
  for (const budget of [100, 2200, 5000]) {
    const result = library.find("trust money friendship fear motive gambling failure", {
      budget,
      limit: 4,
    });
    assert(JSON.stringify(result.context).length <= budget);
    assert(result.context.length <= 4);
    assert(result.coverage.omittedMatchingNotes > 0);
    assert(result.coverage.completeTexts === false);
    assert(result.coverage.primaryMangaVolumesIndexed === 0);
  }
  assert(JSON.stringify(research) === original, "Selection must not change research observations");
  const unknown = library.find("quasarxyz orbitalxyz");
  assert(unknown.coverage.matchingNotes === 0);
  assert(unknown.context.length === 4, "Character anchors may remain without invented matches");
});

Deno.test("IMP distinguishes supplied observations, analytic inference and incomplete canon", () => {
  const result = library.find("Johan emotion Yuichi gambling loyalty and counterplay");
  const prompt = buildImpPrompt({ research: result });
  assert(prompt.includes("A reviewed volume description is not a reviewed volume"));
  assert(prompt.includes("A publisher's cliffhanger question does not establish its answer"));
  assert(
    prompt.includes("An accusation, suspected cause, character's claim or an opponent's action"),
  );
  assert(prompt.includes("not character dialogue or a fact stated by the author"));
  assert(prompt.includes('"completeTexts":false'));
  assert(prompt.includes("johan-v04-trust-and-emotion"));
  assert(prompt.includes("yuichi-v11-skill-has-limits"));
});

Deno.test("IMP streams original text with retrieved research and honest persistent coverage", async () => {
  let prompt = "", calls = 0;
  const app = createApp({
    config,
    impLibrary: library,
    coteLibrary: {
      styles: [],
      find: () => ({ evidence: [{ id: "cote", file: "novel.pdf", text: "COTE background." }] }),
    },
    fetchModel: (_url, options) => {
      calls++;
      prompt = JSON.parse(options.body).messages[0].content;
      return Promise.resolve(
        new Response(
          'data: {"choices":[{"delta":{"content":"First, check what the offer costs each side."},"finish_reason":"stop"}]}\n\ndata: [DONE]\n\n',
        ),
      );
    },
  });
  const response = await app(request("Tomodachi Game volume 10 bargaining about escape"));
  assert(response.status === 200);
  const events = (await response.text()).trim().split("\n").map(JSON.parse);
  const done = events.at(-1);
  assert(calls === 1 && events[0].text === "First, check what the offer costs each side.");
  assert(prompt.includes("COTE background."));
  assert(prompt.includes("yuichi-v10-threatened-withdrawal"));
  assert(done.sourceMode === "synthesis");
  assert(done.sources.some((source) => source.id === "tomodachi-v10"));
  assert(done.sources.filter((source) => source.kind === "book-foundation").length === 7);
  assert(done.coverage.completeTexts === false && done.coverage.primaryMangaVolumesIndexed === 0);
  assert(done.coverage.monsterVolumeDescriptionsReviewed === 9);
  assert(done.coverage.tomodachiVolumeDescriptionsReviewed === 26);
});

Deno.test("Missing IMP research prevents a reply before the model is called", async () => {
  let called = false;
  const app = createApp({
    config,
    coteLibrary: { styles: [], find: () => ({ evidence: [] }) },
    fetchModel: () => {
      called = true;
      throw Error("Model should not run");
    },
  });
  const response = await app(request("Hello"));
  assert(response.status === 503 && !called);
  assert((await response.json()).error.includes("character research index"));
});
