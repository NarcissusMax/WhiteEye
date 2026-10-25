import { createApp } from "../server/app.js";
import { availableModels } from "../server/models.js";

const assert = (condition, message = "Assertion failed") => {
  if (!condition) throw Error(message);
};
const config = {
  baseUrl: "https://api.aicredits.in/v1",
  model: "nousresearch/hermes-4-405b",
  apiKey: "test-key",
};
const request = (model, participant = "guest", content = "hey") =>
  new Request("http://localhost:8000/api/chat", {
    method: "POST",
    headers: { origin: "http://localhost:8000", "content-type": "application/json" },
    body: JSON.stringify({ model, participant, messages: [{ role: "user", content }] }),
  });
const stream = () =>
  new Response(
    'data: {"choices":[{"delta":{"content":"Hey."},"finish_reason":"stop"}]}\n\ndata: [DONE]\n\n',
  );

Deno.test("AICredits exposes the six selected models without exposing credentials", async () => {
  const models = availableModels(config);
  assert(
    models.map((model) => model.id).join(",") === [
      "nousresearch/hermes-4-405b",
      "x-ai/grok-4.20",
      "x-ai/grok-4.6",
      "openai/gpt-5.5",
      "openai/gpt-5",
      "deepseek/deepseek-v3.2",
    ].join(","),
  );
  assert(availableModels({ ...config, baseUrl: "https://api.openai.com/v1" }).length === 1);
  const app = createApp({ config, fetchModel: () => Promise.resolve(stream()) });
  const status = await (await app(new Request("http://localhost:8000/api/status"))).json();
  assert(status.defaultModel === config.model);
  assert(status.models.length === 6);
  assert(!JSON.stringify(status).includes(config.apiKey));
});

Deno.test("selected model reaches the provider and unsupported models are rejected", async () => {
  const sent = [];
  const app = createApp({
    config,
    fetchModel: (_url, options) => {
      sent.push(JSON.parse(options.body));
      return Promise.resolve(stream());
    },
  });
  for (
    const model of [
      "x-ai/grok-4.20",
      "x-ai/grok-4.6",
      "openai/gpt-5.5",
      "openai/gpt-5",
      "deepseek/deepseek-v3.2",
    ]
  ) {
    const response = await app(request(model));
    assert(response.status === 200);
    await response.text();
  }
  assert(
    sent.map((body) => body.model).join(",") ===
      "x-ai/grok-4.20,x-ai/grok-4.6,openai/gpt-5.5,openai/gpt-5,deepseek/deepseek-v3.2",
  );
  for (const body of sent.slice(2, 4)) {
    assert(body.max_completion_tokens === 8192);
    assert(!Object.hasOwn(body, "temperature"));
    assert(!Object.hasOwn(body, "max_tokens"));
  }
  assert(sent[0].max_tokens === 4096 && sent[0].temperature === 0.82);
  assert(sent[4].max_tokens === 4096 && sent[4].temperature === 0.82);
  assert(!Object.hasOwn(sent[4], "max_completion_tokens"));
  const rejected = await app(request("unknown/free-model"));
  assert(rejected.status === 400);
  assert(sent.length === 5);
});

Deno.test("guest advice gets topical WhiteEye evidence and full-attention guidance", async () => {
  let prompt = "";
  const library = {
    ids: () => ["genuine-curiosity"],
    descriptors: () => [],
    select: () => [],
  };
  const app = createApp({
    config,
    behaviorLibrary: library,
    retrieve: () => [{ speaker: "whiteeye", text: "Look at what actually happened first." }],
    fetchModel: (_url, options) => {
      const body = JSON.parse(options.body);
      if (!body.stream) {
        return Promise.resolve(Response.json({
          choices: [{
            message: {
              content: JSON.stringify({
                kind: "advice",
                state: "investigative",
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
  const response = await app(
    request(config.model, "guest", "My friend keeps avoiding me. What do you think is going on?"),
  );
  assert(response.status === 200);
  await response.text();
  assert(prompt.includes("Look at what actually happened first."));
  assert(prompt.includes("Do not collapse a substantial first message into a one-line reaction"));
  assert(prompt.includes("Never attribute Griffith's biography"));
});
