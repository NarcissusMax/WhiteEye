import { createApp } from "../server/app.js";
import { createPreferenceMemory, isCompleteGameQuestion } from "../server/preference-memory.js";

const assert = (condition, message = "Assertion failed") => {
  if (!condition) throw Error(message);
};
const corpus = JSON.parse(
  await Deno.readTextFile(new URL("../private/corpus.json", import.meta.url)),
);
const preferenceMemory = createPreferenceMemory(corpus.records);

Deno.test("complete game questions combine every historical game list and keep its qualifications", () => {
  const answer = preferenceMemory.find([{
    role: "user",
    content: "What are your favourite games?",
  }]);
  assert(answer?.domain === "games");
  assert(answer.evidence.length === 8);
  const titles = [
    "Telltale The Walking Dead",
    "Yakuza 0",
    "Beyond Two Souls",
    "Life Is Strange",
    "Metro",
    "Uncharted",
    "Telltale The Wolf Among Us",
    "Detroit Become Human",
    "Until Dawn",
    "Outcast",
    "Dead Space",
    "Silent Hill",
    "Heavy Rain",
    "The Witcher 3",
    "Minecraft",
    "Skyrim",
    "Fallout",
    "MW2",
    "MW3",
    "BO2",
    "Titanfall 1 and 2",
    "Doom",
    "Cyberpunk",
    "Dying Light 1",
    "Roguebook",
  ];
  for (const title of titles) {
    assert(answer.reply.includes(title), `Missing source-backed game: ${title}`);
  }
  assert(answer.reply.includes("people say is good"), "Mass Effect must remain hearsay");
  assert(answer.reply.includes("Skyrim obviously first"));
  assert(answer.reply.includes("favorite COD campaign"));
});

Deno.test("a complete game answer needs verified WhiteEye source records", () => {
  const modified = corpus.records.filter((record) =>
    !(record.file.includes("looksmax account") && record.line === 13144)
  );
  assert(
    createPreferenceMemory(modified).find([{ role: "user", content: "Favorite games?" }]) === null,
  );
  assert(isCompleteGameQuestion([{ role: "user", content: "Favorite games?" }]));
  assert(
    !isCompleteGameQuestion([{ role: "user", content: "Is Skyrim your favorite modded game?" }]),
  );
  assert(!isCompleteGameQuestion([{ role: "user", content: "Tell me your favorite films." }]));
  assert(!isCompleteGameQuestion([{ role: "user", content: "Name every game you've played." }]));
});

Deno.test("WhiteEye serves a complete game list without model omissions or persona crossover", async () => {
  let modelCalls = 0;
  const app = createApp({
    config: { baseUrl: "https://example.com/v1", model: "test", apiKey: "test" },
    preferenceMemory,
    fetchModel: () => {
      modelCalls++;
      return Promise.resolve(
        new Response(
          'data: {"choices":[{"delta":{"content":"Other persona."},"finish_reason":"stop"}]}\n\ndata: [DONE]\n\n',
        ),
      );
    },
  });
  const makeRequest = (persona, content) =>
    new Request("http://localhost:8000/api/chat", {
      method: "POST",
      headers: { origin: "http://localhost:8000", "content-type": "application/json" },
      body: JSON.stringify({ persona, messages: [{ role: "user", content }] }),
    });
  const whiteeye = await app(makeRequest("whiteeye", "What are your favourite games?"));
  assert(whiteeye.status === 200);
  const reply = await whiteeye.text();
  assert(reply.includes("Yakuza 0") && reply.includes("Roguebook"));
  assert(modelCalls === 0, "A model can omit games from a broad list");
  const griffith = await app(makeRequest("griffith", "What are your favourite games?"));
  assert(griffith.status === 200);
  assert(!(await griffith.text()).includes("Yakuza 0"));
  assert(modelCalls === 1);
});
