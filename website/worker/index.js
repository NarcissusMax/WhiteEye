import {
  loadCorpus,
  loadCoteCorpus,
  loadImpResearch,
  loadJaneResearch,
  loadTateCorpus,
  loadTomodachiCorpus,
  loadTomodachiScenes,
  loadVegetaResearch,
} from "./corpora.generated.js";
import { createCoteRetriever } from "../server/cote-retrieval.js";
import { createTateRetriever } from "../server/tate-retrieval.js";
import { createJaneLibrary } from "../server/jane-retrieval.js";
import { createVegetaLibrary } from "../server/vegeta-retrieval.js";
import { createImpLibrary } from "../server/imp-retrieval.js";
import { createTomodachiLibrary } from "../server/tomodachi-retrieval.js";
import { createApp } from "../server/app.js";
import { createAnswerMemory } from "../server/answer-memory.js";
import { createBehaviorLibrary } from "../server/behavior-retrieval.js";
import { availableModels } from "../server/models.js";
import { createPreferenceMemory } from "../server/preference-memory.js";
import { cleanSource, createRetriever } from "../server/retrieval.js";
import { createVoiceLibrary } from "../src/persona/voice-scenes.js";
import { assets } from "./assets.generated.js";
import { courseProgress } from "./course-progress.js";

const security = {
  "Content-Security-Policy":
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; media-src 'self' blob:; frame-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "X-Frame-Options": "DENY",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
};

let tateRetriever;
const tateLibrary = {
  get styles() {
    tateRetriever ||= createTateRetriever(loadTateCorpus());
    return tateRetriever.styles;
  },
  find(query) {
    tateRetriever ||= createTateRetriever(loadTateCorpus());
    return tateRetriever.find(query);
  },
};
let coteRetriever;
const coteLibrary = {
  get styles() {
    coteRetriever ||= createCoteRetriever(loadCoteCorpus());
    return coteRetriever.styles;
  },
  find(query) {
    coteRetriever ||= createCoteRetriever(loadCoteCorpus());
    return coteRetriever.find(query);
  },
};
// Static files and status requests must not build the chat search indexes.
// Cache each library only when a conversation first needs it.
function lazyLibrary(create) {
  let library;
  return new Proxy({}, {
    get(_target, key) {
      library ||= create();
      const value = Reflect.get(library, key, library);
      return typeof value === "function" ? value.bind(library) : value;
    },
  });
}
const janeLibrary = lazyLibrary(() => createJaneLibrary(loadJaneResearch()));
const vegetaLibrary = lazyLibrary(() => createVegetaLibrary(loadVegetaResearch()));
const impLibrary = lazyLibrary(() =>
  createImpLibrary(loadImpResearch(), {
    tomodachiLibrary: lazyLibrary(() =>
      createTomodachiLibrary(loadTomodachiCorpus(), loadTomodachiScenes())
    ),
  })
);
let whiteeyeRetriever, griffithRetriever, voiceLibrary;
const retrieve = (...args) =>
  (whiteeyeRetriever ||= createRetriever(loadCorpus().records))(...args);
const retrieveGriffith = (...args) =>
  (griffithRetriever ||= createRetriever(loadCorpus().records, {
    speaker: "other",
    includeNarrative: false,
  }))(...args);
const answerMemory = lazyLibrary(() => createAnswerMemory(loadCorpus().records));
const preferenceMemory = lazyLibrary(() => createPreferenceMemory(loadCorpus().records));
const getVoiceLibrary = () =>
  voiceLibrary ||= createVoiceLibrary(loadCorpus().records, cleanSource);
const voiceScenes = (...args) => getVoiceLibrary()(...args);
voiceScenes.byIds = (...args) => getVoiceLibrary().byIds(...args);
const behaviorLibrary = lazyLibrary(() => createBehaviorLibrary(loadCorpus().records));
let app;

function getApp(env) {
  if (app) return app;
  const config = {
    baseUrl: env.MODEL_BASE_URL || "https://api.openai.com/v1",
    model: env.MODEL_NAME || "",
    apiKey: env.MODEL_API_KEY || "",
    accessToken: env.WHITEEYE_ACCESS_TOKEN || "",
  };
  const target = new URL(config.baseUrl);
  if (target.protocol !== "https:") throw new Error("Remote providers require HTTPS.");
  app = createApp({
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
    models: availableModels(config),
    voiceScenes,
    behaviorLibrary,
    publicRoot: null,
  });
  return app;
}

function serveAsset(request, pathname) {
  const courseRoute =
    /^\/course(?:-2)?(?:\/(?:graph|lesson\/\d{2}\.\d{2}|module\/\d{2}|resource\/[a-z0-9-]+)?)?\/?$/
      .test(pathname);
  const path = courseRoute
    ? pathname.startsWith("/course-2") ? "/course-2/index.html" : "/course/index.html"
    : pathname === "/" || pathname === "/conversation"
    ? "/index.html"
    : pathname;
  const asset = assets[path];
  if (!asset) return Response.json({ error: "Not found." }, { status: 404, headers: security });
  const body = asset.base64
    ? Uint8Array.from(atob(asset.body), (character) => character.charCodeAt(0))
    : asset.body;
  return new Response(request.method === "HEAD" ? null : body, {
    headers: { ...security, "Content-Type": asset.type, "Cache-Control": "no-cache" },
  });
}

export default {
  fetch(request, env, ctx) {
    void ctx;
    const url = new URL(request.url);
    if (/^\/api\/course2?\//.test(url.pathname)) return courseProgress(request, env, security);
    if (url.pathname.startsWith("/api/")) {
      return getApp(env)(request, {
        remoteAddr: { hostname: request.headers.get("cf-connecting-ip") || "unknown" },
      });
    }
    if (request.method !== "GET" && request.method !== "HEAD") {
      return Response.json({ error: "Method not allowed." }, { status: 405, headers: security });
    }
    return serveAsset(request, url.pathname);
  },
};
