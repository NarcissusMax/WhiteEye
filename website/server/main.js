import { createApp } from "./app.js";
import { cleanSource, createRetriever } from "./retrieval.js";
import { createVoiceLibrary } from "../src/persona/voice-scenes.js";
import { createBehaviorLibrary } from "./behavior-retrieval.js";
import { createAnswerMemory } from "./answer-memory.js";
import { createPreferenceMemory } from "./preference-memory.js";
import { availableModels } from "./models.js";
import { createCoteRetriever } from "./cote-retrieval.js";
import { createTateRetriever } from "./tate-retrieval.js";
import { createJaneLibrary } from "./jane-retrieval.js";
import { createVegetaLibrary } from "./vegeta-retrieval.js";
import { createImpLibrary } from "./imp-retrieval.js";
import { createTomodachiLibrary } from "./tomodachi-retrieval.js";
const env = (name, fallback = "") => Deno.env.get(name) || fallback;
const config = {
  baseUrl: env("MODEL_BASE_URL", "https://api.openai.com/v1"),
  model: env("MODEL_NAME"),
  apiKey: env("MODEL_API_KEY"),
  accessToken: env("WHITEEYE_ACCESS_TOKEN"),
};
const hostname = env("HOST", "127.0.0.1");
if (!["127.0.0.1", "localhost", "::1"].includes(hostname) && config.accessToken.length < 24) {
  throw Error(
    "Set WHITEEYE_ACCESS_TOKEN to at least 24 characters before exposing this private app.",
  );
}
const target = new URL(config.baseUrl);
if (
  target.protocol !== "https:" &&
  !["127.0.0.1", "localhost", "::1", "[::1]"].includes(target.hostname)
) throw Error("Remote providers require HTTPS.");
let corpus;
try {
  corpus = JSON.parse(await Deno.readTextFile(new URL("../private/corpus.json", import.meta.url)));
} catch {
  throw Error("Source index missing. Run deno task index before starting WhiteEye.");
}
const retrieve = createRetriever(corpus.records);
const retrieveGriffith = createRetriever(corpus.records, {
  speaker: "other",
  includeNarrative: false,
});
const answerMemory = createAnswerMemory(corpus.records);
const preferenceMemory = createPreferenceMemory(corpus.records);
const voiceScenes = createVoiceLibrary(corpus.records, cleanSource);
const behaviorLibrary = createBehaviorLibrary(corpus.records);
const models = availableModels(config);
const tateCorpus = JSON.parse(
  await Deno.readTextFile(new URL("../private/tate-corpus.json", import.meta.url)),
);
const tateLibrary = createTateRetriever(tateCorpus);
const coteCorpus = JSON.parse(
  await Deno.readTextFile(new URL("../private/cote-corpus.json", import.meta.url)),
);
const coteLibrary = createCoteRetriever(coteCorpus);
const janeResearch = JSON.parse(
  await Deno.readTextFile(new URL("../private/jane-research.json", import.meta.url)),
);
const janeLibrary = createJaneLibrary(janeResearch);
const vegetaResearch = JSON.parse(
  await Deno.readTextFile(new URL("../private/vegeta-research.json", import.meta.url)),
);
const vegetaLibrary = createVegetaLibrary(vegetaResearch);
const impResearch = JSON.parse(
  await Deno.readTextFile(new URL("../private/imp-research.json", import.meta.url)),
);
const tomodachiCorpus = JSON.parse(
  await Deno.readTextFile(new URL("../private/tomodachi-corpus.json", import.meta.url)),
);
const tomodachiScenes = JSON.parse(
  await Deno.readTextFile(new URL("../private/tomodachi-scenes.json", import.meta.url)),
);
const impLibrary = createImpLibrary(impResearch, {
  tomodachiLibrary: createTomodachiLibrary(tomodachiCorpus, tomodachiScenes),
});
Deno.serve(
  { hostname, port: Number(env("PORT", "8000")) },
  createApp({
    config,
    retrieve,
    retrieveGriffith,
    tateLibrary,
    coteLibrary,
    janeLibrary,
    vegetaLibrary,
    impLibrary,
    answerMemory,
    preferenceMemory,
    models,
    voiceScenes,
    behaviorLibrary,
  }),
);
