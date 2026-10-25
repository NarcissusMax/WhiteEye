import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createCoteRetriever } from "../server/cote-retrieval.js";
import { createTateRetriever } from "../server/tate-retrieval.js";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const workerPath = resolve(root, "dist/server/index.js");
const manifestPath = resolve(root, "dist/.openai/hosting.json");
JSON.parse(await readFile(manifestPath, "utf8"));
const worker = await import(pathToFileURL(workerPath));
assert.equal(typeof worker.default?.fetch, "function");

const env = {
  MODEL_BASE_URL: "https://example.com/v1",
  MODEL_NAME: "test-model",
  MODEL_API_KEY: "test-key",
};
const page = await worker.default.fetch(new Request("https://whiteeye.example/"), env, {});
assert.equal(page.status, 200);
const html = await page.text();
assert.match(html, /<title>WhiteEye/);
assert.match(html, /id="persona-select"/);
assert.match(html, /value="tate">Andrew Tate/);
assert.match(html, /value="imp">IMP/);
for (const retired of ["johan", "yuichi", "ayanokoji"]) {
  assert(!html.includes(`value="${retired}"`));
}
assert.match(html, /value="jane">Patrick Jane/);
assert.match(html, /value="vegeta">Vegeta/);
assert.match(html, /value="vesper">Vesper/);
assert.match(html, /\/styles\/music\.css/);
assert.doesNotMatch(html, /id="rose-scene"/);
assert.match(html, /\/styles\/quiet\.css/);
assert.match(html, /data-theme="blood"/);
assert.match(html, /<script src="\/js\/theme\.js"><\/script>/);
assert.match(html, /\/styles\/themes\.css/);
assert.match(html, /\/styles\/opening\.css/);
assert.match(html, /\/styles\/satin\.css/);
assert(html.indexOf('/js/theme.js') < html.indexOf('<link rel="stylesheet"'),
  "Saved theme must be applied before styled paint");
assert.match(html, /\/js\/interface-motion\.js/);
assert.match(page.headers.get("content-security-policy"), /media-src 'self' blob:/);
assert(!page.headers.get("content-security-policy").includes("youtube"));
assert.match(html, /id="recording-file"/);

for (
  const asset of [
    "/js/theme.js",
    "/js/interface-motion.js",
    "/js/rose-scene.js",
    "/js/engraving-scene.js",
    "/js/vendor/three.module.min.js",
    "/js/vendor/three.core.min.js",
    "/js/recording-player.js",
  ]
) {
  const response = await worker.default.fetch(
    new Request("https://whiteeye.example" + asset),
    env,
    {},
  );
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "text/javascript; charset=utf-8");
}
const catalog = await worker.default.fetch(
  new Request("https://whiteeye.example/js/soundtracks.js"),
  env,
  {},
);
const music = await catalog.text();
assert.match(music, /blind-spots/);
assert.match(music, /lit-var/);

const status = await worker.default.fetch(
  new Request("https://whiteeye.example/api/status"),
  env,
  {},
);
assert.equal(status.status, 200);
assert.equal((await status.json()).configured, true);
const art = await worker.default.fetch(
  new Request("https://whiteeye.example/assets/quiet/clean-0-d699c5e4a767.webp"),
  env,
  {},
);
assert.equal(art.status, 200);
assert.equal(art.headers.get("content-type"), "image/webp");
assert((await art.arrayBuffer()).byteLength > 1000);
for (const path of ["/course/", "/course-2/"]) {
  const course = await worker.default.fetch(new Request("https://whiteeye.example" + path), env, {});
  assert.equal(course.status, 200);
  const markup = await course.text();
  assert.match(markup, /data-theme="blood"/);
  assert.match(markup, /data-theme-toggle/);
  assert.match(markup, /\/js\/theme\.js/);
  assert.match(markup, /\/styles\/themes\.css/);
  assert.match(markup, /\/styles\/satin\.css/);
}
for (const path of ["/styles/themes.css", "/styles/opening.css", "/styles/satin.css"]) {
  const sheet = await worker.default.fetch(new Request("https://whiteeye.example" + path), env, {});
  assert.equal(sheet.status, 200);
  assert.equal(sheet.headers.get("content-type"), "text/css; charset=utf-8");
}
for (const name of [
  "clean-0-07750a237c5e", "clean-2-c3522b655c64", "cutout-65-050a4483956b",
  "cutout-83-18cafbe94377", "cutout-7-e56444a85567", "cutout-8-a79a001e5a6c",
  "cutout-48-74ee5794f722", "cutout-64-0d5961c2c0cd", "crop-6-7efd86393f52",
  "cutout-91-7c1e131a189a",
]) {
  const raster = await worker.default.fetch(new Request("https://whiteeye.example/assets/satin/" + name + ".webp"), env, {});
  assert.equal(raster.status, 200);
  assert.equal(raster.headers.get("content-type"), "image/webp");
  assert((await raster.arrayBuffer()).byteLength > 100);
}
for (const name of [
  "cutout-4-8b441033111b.webp", "cutout-6-dd61a97d78c3.webp",
  "cutout-70-962ff1556b4b.webp", "cutout-1-9b382c2bdf41.webp",
  "cutout-3-66706a613915.webp", "cutout-2-3b62caa060df.webp",
]) {
  const raster = await worker.default.fetch(new Request("https://whiteeye.example/assets/blood/" + name), env, {});
  assert.equal(raster.status, 200);
  assert.equal(raster.headers.get("content-type"), "image/webp");
  assert((await raster.arrayBuffer()).byteLength > 1000);
}
const privateFile = await worker.default.fetch(
  new Request("https://whiteeye.example/private/corpus.json"),
  env,
  {},
);
assert.equal(privateFile.status, 404);
const privateTate = await worker.default.fetch(
  new Request("https://whiteeye.example/private/tate-corpus.json"),
  env,
  {},
);
assert.equal(privateTate.status, 404);
const tateCorpus = JSON.parse(await readFile(resolve(root, "private/tate-corpus.json"), "utf8"));
const evidence = createTateRetriever(tateCorpus).find("discipline and motivation").evidence;
assert(evidence.length > 4);
const excerpts = evidence.slice(0, 2).map((row) => {
  const index = row.text.split("\n").findIndex((line) => line.trim());
  return { id: row.id, fromLine: row.line + index, toLine: row.line + index };
});
const expectedText = evidence.slice(0, 2).map((row) =>
  row.text.split("\n").find((line) => line.trim())
).join("\n\n");
const originalFetch = globalThis.fetch;
try {
  globalThis.fetch = (_url, options) => {
    const payload = JSON.parse(options.body);
    assert.match(payload.messages[0].content, /Andrew Tate/);
    if (payload.stream === false) {
      return Response.json({
        choices: [{
          message: {
            content: JSON.stringify({
              repairs: excerpts.map((excerpt, selection) => ({ ...excerpt, selection })),
            }),
          },
        }],
      });
    }
    return new Response(`data: ${
      JSON.stringify({
        choices: [{
          delta: { content: JSON.stringify({ mode: "source", excerpts }) },
          finish_reason: "stop",
        }],
      })
    }\n\ndata: [DONE]\n\n`);
  };
  // The existing app captured fetch when status was checked above. Instantiate
  // an isolated worker under the stub so this packaged chat check stays offline.
  const tateWorker = await import(pathToFileURL(workerPath).href + "?tate-qa");
  const reply = await tateWorker.default.fetch(
    new Request("https://whiteeye.example/api/chat", {
      method: "POST",
      headers: { origin: "https://whiteeye.example", "content-type": "application/json" },
      body: JSON.stringify({
        persona: "tate",
        messages: [{ role: "user", content: "discipline and motivation" }],
      }),
    }),
    env,
    {},
  );
  assert.equal(reply.status, 200);
  const events = (await reply.text()).trim().split("\n").map(JSON.parse);
  assert.equal(events[0].text, expectedText);
  assert.equal(events[1].sourceMode, "source");
  assert.equal(events[1].sources.length, 2);
} finally {
  globalThis.fetch = originalFetch;
}
const privateCote = await worker.default.fetch(
  new Request("https://whiteeye.example/private/cote-corpus.json"),
  env,
  {},
);
assert.equal(privateCote.status, 404);
const coteCorpus = JSON.parse(await readFile(resolve(root, "private/cote-corpus.json"), "utf8"));
const coteEvidence = createCoteRetriever(coteCorpus).find("equality and ability").evidence;
assert(coteEvidence.length > 4);
for (const retired of ["johan", "yuichi", "ayanokoji"]) {
  const response = await worker.default.fetch(
    new Request("https://whiteeye.example/api/chat", {
      method: "POST",
      headers: { origin: "https://whiteeye.example", "content-type": "application/json" },
      body: JSON.stringify({
        persona: retired,
        messages: [{ role: "user", content: "hello" }],
      }),
    }),
    env,
    {},
  );
  assert.equal(response.status, 400);
}
const privateJane = await worker.default.fetch(
  new Request("https://whiteeye.example/private/jane-research.json"),
  env,
  {},
);
assert.equal(privateJane.status, 404);
const privateVegeta = await worker.default.fetch(
  new Request("https://whiteeye.example/private/vegeta-research.json"),
  env,
  {},
);
assert.equal(privateVegeta.status, 404);
const privateImp = await worker.default.fetch(
  new Request("https://whiteeye.example/private/imp-research.json"),
  env,
  {},
);
assert.equal(privateImp.status, 404);
for (const file of ["tomodachi-corpus.json", "tomodachi-scenes.json"]) {
  const response = await worker.default.fetch(
    new Request(`https://whiteeye.example/private/${file}`),
    env,
    {},
  );
  assert.equal(response.status, 404, "Supplied manga text must remain server context");
}
for (
  const [persona, mode, name] of [["jane", "interpretation", "Patrick Jane"], [
    "vegeta",
    "interpretation",
    "Vegeta",
  ], [
    "imp",
    "synthesis",
    "IMP",
  ], [
    "vesper",
    "synthesis",
    "Vesper",
  ]]
) {
  let calls = 0;
  try {
    globalThis.fetch = (_url, options) => {
      calls++;
      const payload = JSON.parse(options.body);
      const prompt = payload.messages[0].content;
      assert.match(prompt, new RegExp(name));
      assert(payload.stream, "New personas should stream original text");
      assert(prompt.length < 85000, "New persona prompts must have bounded research context");
      if (persona === "jane") assert.doesNotMatch(prompt, /Andrew Tate|Ayanokoji/);
      else if (persona === "vegeta") {
        assert.match(prompt, /Ultra Ego/);
        assert.doesNotMatch(prompt, /Patrick Jane|Ayanokoji Kiyotaka/);
      } else if (persona === "imp") {
        for (
          const title of [
            "The 48 Laws of Power",
            "The Art of Seduction",
            "The 33 Strategies of War",
            "The 50th Law",
            "Mastery",
            "The Laws of Human Nature",
            "The Daily Laws",
          ]
        ) assert(prompt.includes(title));
        assert(prompt.includes("Johan Liebert") && prompt.includes("Yuichi Katagiri"));
        assert(prompt.includes("johan-v04-trust-and-emotion"));
        assert(prompt.includes("yuichi-friends-and-ruthlessness"));
        assert(prompt.includes('"completeTexts":false'));
        assert(prompt.includes("TOMODACHI GAME PRIMARY MANGA CONTEXT"));
        assert(prompt.includes('"manga-scene-mixed-speakers"'));
        assert(prompt.includes('"allSuppliedFilesIndexed":true'));
        assert(prompt.includes("Unverified") || prompt.includes("unverified"));
      } else {
        for (
          const contributor of [
            "WhiteEye",
            "Griffith",
            "IMP",
            "Johan Liebert",
            "Yuichi Katagiri",
            "Ayanokoji Kiyotaka",
            "Andrew Tate",
            "Patrick Jane",
          ]
        ) assert(prompt.includes(contributor));
        assert(prompt.includes("IMP TOMODACHI GAME PRIMARY SCENES"));
        assert(prompt.includes('"manga-scene-mixed-speakers"'));
      }
      return new Response(
        'data: {"choices":[{"delta":{"content":"One original reply."},"finish_reason":"stop"}]}\n\ndata: [DONE]\n\n',
      );
    };
    const isolated = await import(pathToFileURL(workerPath).href + `?${persona}-qa`);
    const reply = await isolated.default.fetch(
      new Request("https://whiteeye.example/api/chat", {
        method: "POST",
        headers: { origin: "https://whiteeye.example", "content-type": "application/json" },
        body: JSON.stringify({
          persona,
          messages: [{
            role: "user",
            content: "What matters in discipline, fear and understanding people?",
          }],
        }),
      }),
      env,
      {},
    );
    assert.equal(reply.status, 200);
    const events = (await reply.text()).trim().split("\n").map(JSON.parse);
    assert.equal(events[0].text, "One original reply.");
    assert.equal(events.at(-1).sourceMode, mode);
    assert.equal(calls, 1, "Original replies should not enter exact-quotation repair");
    if (persona === "jane") {
      assert.equal(events.at(-1).coverage.transcriptFilesSearched, 150);
      assert(events.at(-1).sources.some((source) => source.episode));
    } else if (persona === "vegeta") {
      assert.equal(events.at(-1).coverage.branch, "main");
      assert(events.at(-1).sources.some((source) => source.url.includes("dragon-ball")));
    } else if (persona === "imp") {
      assert(events.at(-1).sources.length >= 10);
      assert.equal(events.at(-1).coverage.completeTexts, false);
      assert.equal(events.at(-1).coverage.primaryMangaVolumesIndexed, 0);
      assert.equal(events.at(-1).coverage.monsterVolumeDescriptionsReviewed, 9);
      assert.equal(events.at(-1).coverage.tomodachiVolumeDescriptionsReviewed, 26);
      assert.equal(events.at(-1).coverage.tomodachiPrimary.sourceFiles, 107);
      assert.equal(events.at(-1).coverage.tomodachiPrimary.primaryPagesIndexed, 4089);
      assert.equal(events.at(-1).coverage.tomodachiPrimary.completeText, false);
      assert(events.at(-1).coverage.tomodachiPrimary.includedPassages > 0);
      assert(events.at(-1).sources.some((source) => source.kind === "owner-manga-ocr"));
    } else {
      assert.equal(events.at(-1).sources.length, 5);
      assert.equal(events.at(-1).coverage.imp.tomodachiPrimary.sourceFiles, 107);
      assert(events.at(-1).coverage.imp.tomodachiPrimary.includedPassages > 0);
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
}
console.log(
  "Artifact serves seven personas, keeps Tate source replies, retires the three individual choices, and labels IMP/Jane/Vegeta/Vesper original replies with research context.",
);
