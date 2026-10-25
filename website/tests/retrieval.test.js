import { createRetriever, retrievalQueries } from "../server/retrieval.js";

const assert = (condition, message = "Assertion failed") => {
  if (!condition) throw Error(message);
};
const user = (content) => ({ role: "user", content });
const assistant = (content) => ({ role: "assistant", content });
const exam = "I have an exam tomorrow and I haven't studied the syllabus.";

Deno.test("retrieval follows the latest self-contained topic, not old distress", () => {
  for (
    const message of [
      "What games do you like?",
      "And what games do you like?",
      "What is your favorite color?",
      "And what about games?",
      "I like Fallout.",
    ]
  ) {
    const query = retrievalQueries([user(exam), assistant("Study now."), user(message)]);
    assert(query.latest === message);
    assert(query.prior === "", message);
  }
});

Deno.test("retrieval strips an explicit mid-message topic change", () => {
  const query = retrievalQueries([
    user("I am lonely and everything is disappointing."),
    assistant("Could some of this be assumptions?"),
    user(
      "Mostly assumptions honestly. I don't want to talk about that anymore. Different question: Vegeta or Goku?",
    ),
  ]);
  assert(query.latest === "Vegeta or Goku?", query.latest);
  assert(query.prior === "");
  const again = retrievalQueries([
    user(exam),
    user("Anyway, games. Different question: favorite color?"),
  ]);
  assert(again.latest === "favorite color?");
  assert(again.prior === "");
});

Deno.test("greetings and explicit switches never inherit previous topics", () => {
  for (const greeting of ["hey", "Hi!", "sup", "good morning", "yeah hey"]) {
    assert(retrievalQueries([user(exam), user(greeting)]).prior === "", greeting);
  }
  assert(retrievalQueries([user(exam), user("New topic: why?")]).prior === "");
  assert(retrievalQueries([]).latest === "");
  assert(retrievalQueries([]).prior === "");
});

Deno.test("dependent followups retain the most recent user topic", () => {
  for (
    const message of [
      "why?",
      "how so",
      "what do you mean?",
      "Can you explain that?",
      "but I only have two days",
      "yeah but what if i fail? wouldnt not trying be less embarrassing?",
    ]
  ) {
    const query = retrievalQueries([user(exam), assistant("A reply."), user(message)]);
    assert(query.latest === message);
    assert(query.prior === exam, message);
  }
});

Deno.test("followup chains stop at their nearest self-contained user topic", () => {
  const query = retrievalQueries([
    user(exam),
    user("What games do you like?"),
    assistant("I like Fallout."),
    user("why?"),
    assistant("An opinion about its story."),
    user("how so?"),
  ]);
  assert(query.prior === "What games do you like?\nwhy?", query.prior);
  assert(!query.prior.includes("exam"));
  const switched = retrievalQueries([
    user(exam),
    user("I am worried. New topic: games?"),
    user("why?"),
  ]);
  assert(switched.prior === "games?");
});

Deno.test("retrieval never learns a topic from assistant-generated wording", () => {
  const query = retrievalQueries([
    user("What games do you like?"),
    assistant("I prefer medical diagnoses and exams and therapy."),
    user("why?"),
  ]);
  assert(query.prior === "What games do you like?");
  assert(!JSON.stringify(query).includes("diagnoses"));
});

Deno.test("inherited retrieval context has bounded characters and turn count", () => {
  const query = retrievalQueries([
    user("An old unrelated history entry."),
    user("games ".repeat(1000)),
    user("why?"),
    user("how so?"),
    user("what do you mean?"),
  ]);
  assert(query.prior.length <= 2400);
  assert(query.prior.includes("games"));
  assert(!query.prior.includes("unrelated"));
});

Deno.test("latest retrieval terms outweigh equally rare prior terms", () => {
  const retrieve = createRetriever([
    { file: "one", line: 1, speaker: "whiteeye", text: "Alpha xray zulu." },
    { file: "two", line: 2, speaker: "whiteeye", text: "Bravo charlie delta." },
  ]);
  const result = retrieve({ latest: "alpha", prior: "bravo charlie delta" });
  assert(result.length === 2);
  assert(result[0].line === 1, "Three inherited terms must not outweigh one latest term.");
  assert(retrieve("alpha").length === 1, "String query API must remain compatible.");
  assert(retrieve("alpha")[0].line === 1);
  assert(retrieve({ latest: "why", prior: "bravo" })[0].line === 2);
});

Deno.test("an opposite historical topic cannot dominate a fresh query", () => {
  const retrieve = createRetriever([
    {
      file: "one",
      line: 1,
      speaker: "whiteeye",
      text: "Exams require studying the syllabus and worrying about failure.",
    },
    { file: "two", line: 2, speaker: "whiteeye", text: "Fallout and Metro are games I like." },
  ]);
  const result = retrieve(retrievalQueries([user(exam), user("What games do you like?")]));
  assert(result.length === 1);
  assert(result[0].line === 2);
});

Deno.test("ambiguous orphan is excluded as evidence and as a chronological neighbor", () => {
  const file = "Whiteye DMS (txt file old account).txt";
  const date = "06/04/2025 6:14 pm";
  const retrieve = createRetriever([
    { file, date, line: 149, speaker: "other", text: "What do you think about this?" },
    {
      file,
      date,
      line: 153,
      speaker: "whiteeye",
      text: "I personally don't care. Just cut the sideburns off or slim them.",
    },
    { file, date, line: 157, speaker: "whiteeye", text: "Loneliness depends on how you use it." },
    { file, date, line: 161, speaker: "other", text: "I am not grateful." },
    { file, date, line: 165, speaker: "secondary", text: "Loneliness means a clinical illness." },
  ]);
  assert(retrieve("sideburns").length === 0);
  const result = retrieve("loneliness");
  assert(result.length === 1);
  assert(result[0].line === 157);
  assert(result[0].contextKind === "chronological-neighbors-not-verified-replies");
  assert(result[0].context.some((turn) => turn.speaker === "other"));
  assert(result[0].context.every((turn) => turn.line !== 153 && turn.speaker !== "secondary"));
});

const readCorpus = async () =>
  JSON.parse(await Deno.readTextFile(new URL("../private/corpus.json", import.meta.url))).records;

Deno.test("corpus: incidental casual wording does not bury a named movie preference", async () => {
  const retrieve = createRetriever(await readCorpus());
  for (
    const query of [
      "Finally putting I, Robot on tonight. Somehow never saw it.",
      "I Robot",
      "i robot",
    ]
  ) {
    const result = retrieve(query);
    assert(result.length > 0, query);
    assert(result[0].file === "Whiteye DMS (txt file old account).txt", query);
    assert(result[0].line === 12928, query);
    assert(result.length <= 4);
    assert(result.every((record) => /\brobot\b/i.test(record.text)));
    assert(result.every((record) => record.speaker === "whiteeye"));
  }
});

Deno.test("corpus: a broad gaming remark does not inject unrelated memories", async () => {
  const retrieve = createRetriever(await readCorpus());
  for (
    const query of [
      "I finished everything I needed to do and spent the evening gaming. Is that bad?",
      "I finished everything I needed to do and spent the evening gaming. That bad?",
      "Finally finished everything I needed today. Somehow never saw it.",
      "I finished everything I needed to do today. Thinking of spending the evening gaming instead of doing something useful. Is that bad?",
    ]
  ) {
    assert(retrieve(query).length === 0, query);
  }
});

Deno.test("corpus: vague reply timing does not import a different friendship argument", async () => {
  const retrieve = createRetriever(await readCorpus());
  const result = retrieve(
    "My friend takes two days to reply sometimes, but helped me move and still invites me out.",
  );
  assert(result.length === 0);
  const specific = retrieve("my old friend never texts me first anymore. should i keep trying?");
  assert(specific[0]?.file === "Whiteye DMS (txt file looksmax account).txt");
  assert(specific[0]?.line === 27986);
});

Deno.test("corpus: precision filtering preserves direct game and canon retrieval", async () => {
  const retrieve = createRetriever(await readCorpus());
  const games = retrieve("what games do you like?");
  assert(games.length > 0);
  assert(games.every((record) => /\bgam(?:e|es|ing)\b/i.test(record.text)));
  assert(
    games.every((record) => !/^(?:its game 7|story games|a lot of games)$/i.test(record.text)),
  );
  const food = retrieve("favorite food jambalaya");
  assert(food[0]?.file === "WhiteEye Instagram Dms.txt");
  assert(food[0]?.line === 10784);
  const color = retrieve("favorite color");
  assert(color.some((record) => record.line === 10820));
});
