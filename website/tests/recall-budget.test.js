import { selectPriorMemory } from "../public/js/memory.js";
import { createApp, validateMemory } from "../server/app.js";
const assert = (condition, message = "Assertion failed") => {
  if (!condition) throw Error(message);
};
const chats = () =>
  Array.from({ length: 5 }, (_, index) => ({
    id: `old-${index}`,
    remember: true,
    participant: "guest",
    createdAt: index,
    updatedAt: index,
    messages: [
      { role: "user", content: "Remember my violin project " + "context ".repeat(400), at: index },
      {
        role: "assistant",
        content: "Remembered answer " + "answer ".repeat(400),
        status: "complete",
      },
    ],
  }));
Deno.test("three long recalled exchanges fit the server's combined budget without altering chats", () => {
  const history = chats();
  const before = JSON.stringify(history);
  for (const limit of [3, 4, 20]) {
    const memory = selectPriorMemory(history, "fresh", "Remember my violin project?", limit);
    assert(memory.length === Math.min(limit, 4));
    assert(
      memory.reduce((size, entry) => size + entry.user.length + entry.assistant.length, 0) <= 5200,
    );
    assert(validateMemory(memory).length === memory.length);
  }
  assert(JSON.stringify(history) === before);
});
Deno.test("legacy, negative and future timestamps never poison a recalled request", () => {
  for (const at of [undefined, -20, Date.now() + 172800000, "yesterday"]) {
    const history = chats().slice(0, 1);
    history[0].messages[0].at = at;
    delete history[0].createdAt;
    const memory = selectPriorMemory(history, "fresh", "Remember my violin project?");
    assert(memory.length === 1 && memory[0].at === 0);
    assert(validateMemory(memory).length === 1);
  }
});
Deno.test("a fresh chat with three long prior exchanges receives a streamed response and recalled context", async () => {
  const memory = selectPriorMemory(chats(), "fresh", "Remember my violin project?");
  let prompt = "";
  const app = createApp({
    config: { baseUrl: "https://example.com/v1", model: "test", apiKey: "fixture" },
    fetchModel: (_url, options) => {
      prompt = JSON.parse(options.body).messages[0].content;
      return Promise.resolve(
        new Response(
          'data: {"choices":[{"delta":{"content":"I remember your violin project."},"finish_reason":"stop"}]}\n\ndata: [DONE]\n\n',
        ),
      );
    },
  });
  const response = await app(
    new Request("http://localhost:8000/api/chat", {
      method: "POST",
      headers: { origin: "http://localhost:8000", "content-type": "application/json" },
      body: JSON.stringify({
        persona: "whiteeye",
        participant: "guest",
        memory,
        messages: [{ role: "user", content: "Remember my violin project?" }],
      }),
    }),
  );
  assert(response.status === 200);
  const events = (await response.text()).trim().split("\n").map(JSON.parse);
  assert(events[0].text === "I remember your violin project.");
  assert(events.at(-1).type === "done");
  assert(prompt.includes("Remembered answer"));
});
