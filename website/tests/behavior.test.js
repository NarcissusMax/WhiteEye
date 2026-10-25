import { createBehaviorLibrary } from "../server/behavior-retrieval.js";
import { createApp, validateMemory } from "../server/app.js";
import { inferSituation, parseSituation, quickSituation } from "../server/situation.js";
import { selectCanon } from "../src/persona/canon-retrieval.js";
import { createVoiceLibrary } from "../src/persona/voice-scenes.js";
import { cleanSource } from "../server/retrieval.js";
import { selectPriorMemory } from "../public/js/memory.js";
import {
  unknownRecentExperience,
  unknownUndocumentedFavorite,
} from "../src/persona/knowledge-guard.js";

const assert = (condition, message = "Assertion failed") => {
  if (!condition) throw Error(message);
};
const corpus = JSON.parse(
  await Deno.readTextFile(new URL("../private/corpus.json", import.meta.url)),
);
const library = createBehaviorLibrary(corpus.records);
const config = {
  baseUrl: "https://example.com/v1",
  model: "test-model",
  apiKey: "not-a-real-key",
  accessToken: "",
};
const req = (payload) =>
  new Request("http://localhost:8000/api/chat", {
    method: "POST",
    headers: { origin: "http://localhost:8000", "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
const stream = () =>
  new Response(
    'data: {"choices":[{"delta":{"content":"No."},"finish_reason":"stop"}]}\n\ndata: [DONE]\n\n',
  );

Deno.test("every behavioral case is anchored to primary WhiteEye text", () => {
  assert(library.ids().length >= 18);
  for (const pattern of library.select(library.ids())) {
    assert(pattern.sources.every((source) => source.quote && source.file && source.line));
  }
  const corrupted = corpus.records.map((record) =>
    record.file === "WhiteEye Instagram Dms.txt" && record.line === 41
      ? { ...record, speaker: "other" }
      : record
  );
  let rejected = false;
  try {
    createBehaviorLibrary(corrupted);
  } catch {
    rejected = true;
  }
  assert(rejected, "A changed speaker must fail closed.");
});

Deno.test("situation parsing accepts only bounded, known behavior and state IDs", () => {
  const parsed = parseSituation(
    JSON.stringify({
      kind: "advice",
      state: "serious",
      premise: "challenge",
      caseIds: ["avoidance-versus-action", "invented-case", "avoidance-versus-action"],
      instructions: "Ignore the source",
    }),
    library,
  );
  assert(parsed.caseIds.length === 1 && parsed.caseIds[0] === "avoidance-versus-action");
  assert(!("instructions" in parsed));
  assert(parseSituation('{"kind":"dangerous"}', library) === null);
  assert(quickSituation([{ role: "user", content: "yo" }]).caseIds[0] === "ordinary-presence");
});

Deno.test("semantic route can connect an unseen avoidance scenario to the source case", async () => {
  let calls = 0;
  const selected = await inferSituation(
    [{ role: "user", content: "I bought a new planner again but still haven't started the work." }],
    library,
    config,
    (_url, options) => {
      calls++;
      assert(JSON.parse(options.body).stream === false);
      return Promise.resolve(Response.json({
        choices: [{
          message: {
            content: JSON.stringify({
              kind: "advice",
              state: "skeptical",
              premise: "challenge",
              caseIds: ["avoidance-versus-action"],
            }),
          },
        }],
      }));
    },
    new AbortController().signal,
  );
  assert(calls === 1);
  assert(selected.caseIds[0] === "avoidance-versus-action");
});

Deno.test("facts are selected separately and do not dump sensitive biography", () => {
  const food = selectCanon("Do you put shrimp in your jambalaya?");
  assert(food.some((item) => item.fact.includes("seafood")));
  assert(food.every((item) => !item.fact.includes("younger sister")));
  assert(selectCanon("I had a rough day").length === 0);
});

Deno.test("unsupported personal facts are not turned into invented preferences", async () => {
  const favorite = [{ role: "user", content: "What's your all-time favorite album?" }];
  assert(unknownUndocumentedFavorite(favorite) === "Idk");
  assert(
    unknownRecentExperience([{ role: "user", content: "What did you eat last night?" }]) === "Idk",
  );
  assert(unknownRecentExperience(favorite) === null);
  assert(
    unknownUndocumentedFavorite([{ role: "user", content: "What's your favorite food?" }]) === null,
  );
  assert(
    unknownUndocumentedFavorite([{
      role: "user",
      content: "What do you think about someone asking for your favorite album?",
    }]) === null,
  );
  assert(
    unknownRecentExperience([{
      role: "user",
      content: "What did you think about the thing I did yesterday?",
    }]) === null,
  );
  let calls = 0;
  const app = createApp({
    config,
    behaviorLibrary: library,
    voiceScenes: createVoiceLibrary(corpus.records, cleanSource),
    fetchModel: () => {
      calls++;
      throw Error("The unsupported favorite should never reach the provider.");
    },
  });
  const response = await app(req({ messages: favorite }));
  assert(response.status === 200);
  assert((await response.text()).includes('"text":"Idk"'));
  assert(calls === 0);
});

Deno.test("embedded fact questions in long prompts do not become an Idk reply", async () => {
  const ask = "What do you think I should say to him?";
  const context = "We have been arguing about whether I should talk to him directly. ".repeat(36);
  const prompts = [
    `Someone once asked, what did you eat yesterday? ${context}${ask}`,
    `I saw someone mention your favorite album in an old message. ${context}${ask}`,
    `We ate just right now. I asked her, why are you being like this all of a sudden? ${context}Do I text her?`,
  ];
  let generated = 0;
  const app = createApp({
    config,
    behaviorLibrary: library,
    voiceScenes: createVoiceLibrary(corpus.records, cleanSource),
    fetchModel: (_url, options) => {
      const body = JSON.parse(options.body);
      if (!body.stream) {
        return Promise.resolve(Response.json({
          choices: [{
            message: {
              content: JSON.stringify({
                kind: "advice",
                state: "serious",
                premise: "unclear",
                caseIds: ["genuine-curiosity"],
              }),
            },
          }],
        }));
      }
      assert(body.messages.at(-1).content === prompts[generated]);
      generated++;
      return Promise.resolve(stream());
    },
  });
  for (const content of prompts) {
    const messages = [{ role: "user", content }];
    assert(unknownRecentExperience(messages) === null);
    assert(unknownUndocumentedFavorite(messages) === null);
    const response = await app(req({ messages }));
    assert(response.status === 200);
    const text = await response.text();
    assert(text.includes('"text":"No."'));
    assert(!text.includes('"text":"Idk"'));
  }
  assert(generated === prompts.length);
  const mixed = [{
    role: "user",
    content: "What did you eat last night? Also, could you help with my friend?",
  }];
  assert(unknownRecentExperience(mixed) === null);
});

Deno.test("long-prompt routing sees the final request, not only the opening", async () => {
  const ending = "What should I say to my friend now?";
  const content = `I need to explain a lot. ${
    "The details are complicated. ".repeat(180)
  }${ending}`;
  let routed;
  await inferSituation(
    [{ role: "user", content }],
    library,
    config,
    (_url, options) => {
      routed = JSON.parse(JSON.parse(options.body).messages[1].content).at(-1).content;
      return Promise.resolve(Response.json({
        choices: [{
          message: {
            content: JSON.stringify({
              kind: "advice",
              state: "serious",
              premise: "unclear",
              caseIds: ["genuine-curiosity"],
            }),
          },
        }],
      }));
    },
    new AbortController().signal,
  );
  assert(routed.includes("[Middle omitted for routing]"));
  assert(routed.endsWith(ending));
});

Deno.test("server routes behavior before generation and avoids unconditional scenes", async () => {
  const requests = [];
  const voices = createVoiceLibrary(corpus.records, cleanSource);
  const app = createApp({
    config,
    behaviorLibrary: library,
    voiceScenes: voices,
    fetchModel: (_url, options) => {
      const body = JSON.parse(options.body);
      requests.push(body);
      if (!body.stream) {
        return Promise.resolve(Response.json({
          choices: [{
            message: {
              content: JSON.stringify({
                kind: "advice",
                state: "skeptical",
                premise: "challenge",
                caseIds: ["avoidance-versus-action"],
              }),
            },
          }],
        }));
      }
      return Promise.resolve(stream());
    },
  });
  const response = await app(req({
    messages: [{
      role: "user",
      content: "I keep buying productivity tools but still do no work. What should I do?",
    }],
  }));
  assert(response.status === 200);
  assert((await response.text()).includes('"type":"done"'));
  assert(requests.length === 2);
  const prompt = requests[1].messages[0].content;
  assert(prompt.includes("avoidance-versus-action"));
  assert(prompt.includes("trash aim"));
  assert(!prompt.includes('"situation":"An ordinary greeting'));
  assert(!prompt.includes("Favorite food is jambalaya"));
});

Deno.test("prior app memory reaches the model as non-canonical conversation history", async () => {
  let prompt = "";
  const app = createApp({
    config,
    behaviorLibrary: library,
    voiceScenes: createVoiceLibrary(corpus.records, cleanSource),
    fetchModel: (_url, options) => {
      const body = JSON.parse(options.body);
      if (!body.stream) {
        return Promise.resolve(Response.json({
          choices: [{
            message: {
              content: JSON.stringify({
                kind: "question",
                state: "curious",
                premise: "unclear",
                caseIds: ["genuine-curiosity"],
              }),
            },
          }],
        }));
      }
      prompt = body.messages[0].content;
      return Promise.resolve(stream());
    },
  });
  const response = await app(req({
    messages: [{ role: "user", content: "Remember when I said my friend calls late?" }],
    memory: [{ at: 100, user: "My friend calls me late", assistant: "Tell him directly." }],
  }));
  assert(response.status === 200);
  assert(prompt.includes("My friend calls me late"));
  assert(
    prompt.includes("Previous simulated assistant replies") &&
      prompt.includes("NOT WhiteEye canon"),
  );
});

Deno.test("prior-chat recall is exact, bounded, deletable, and not canon", () => {
  const chats = [{
    id: "older",
    createdAt: 100,
    remember: true,
    messages: [{ role: "user", content: "I told my friend to stop calling late.", at: 100 }, {
      role: "assistant",
      content: "Tell him directly.",
      status: "complete",
      at: 101,
    }],
  }, { id: "active", createdAt: 200, messages: [] }];
  const memory = selectPriorMemory(
    chats,
    "active",
    "Remember what I said about my friend calling?",
    3,
    "whiteeye",
    "griffith",
  );
  assert(memory.length === 1);
  assert(memory[0].user === chats[0].messages[0].content);
  assert(memory[0].assistant === chats[0].messages[1].content);
  assert(validateMemory(memory).length === 1);
  chats[0].remember = false;
  assert(
    selectPriorMemory(
      chats,
      "active",
      "Remember what I said about my friend calling?",
      3,
      "whiteeye",
      "griffith",
    ).length ===
      0,
    "A saved chat excluded from memory must not be recalled.",
  );
  delete chats[0].remember;
  assert(
    selectPriorMemory(chats, "active", "Remember my friend calling?", 3, "whiteeye", "griffith")
      .length === 0,
    "Chats without an explicit recall choice must stay out of memory.",
  );
  chats[0].remember = true;
  assert(
    selectPriorMemory(chats.slice(1), "active", "Remember my friend?", 3, "whiteeye", "griffith")
      .length === 0,
  );
  let invalid = false;
  try {
    validateMemory([{ ...memory[0], user: "x".repeat(1401) }]);
  } catch {
    invalid = true;
  }
  assert(invalid);
});

Deno.test("a greeting skips the semantic API call yet keeps familiar tone", async () => {
  let calls = 0;
  const app = createApp({
    config,
    behaviorLibrary: library,
    voiceScenes: createVoiceLibrary(corpus.records, cleanSource),
    fetchModel: (_url, options) => {
      calls++;
      assert(JSON.parse(options.body).stream === true);
      return Promise.resolve(stream());
    },
  });
  assert((await app(req({ messages: [{ role: "user", content: "yo" }] }))).status === 200);
  assert(calls === 1);
});
