// Opt-in paid-provider review, never part of the automated unit/UI suite.
// Uses the local server; no credentials are read or printed here.
const SMOKE_CASES = [
  { id: "greeting", messages: [{ role: "user", content: "yo" }] },
  {
    id: "ordinary-opinion",
    messages: [{
      role: "user",
      content: "I never played Skyrim. games just get boring for me ngl",
    }],
  },
  {
    id: "past-regret",
    messages: [{
      role: "user",
      content:
        "I wasted the last year and now everyone is ahead of me. I keep thinking about all the things I couldve done.",
    }],
  },
  {
    id: "food-canon",
    messages: [{ role: "user", content: "what would you put in your jambalaya? shrimp?" }],
  },
  {
    id: "imperfect-advice",
    messages: [{
      role: "user",
      content:
        "my old friend never texts me first anymore. i already told him it bothers me and he still doesnt. should i keep trying?",
    }],
  },
  {
    id: "context-and-disagreement",
    messages: [
      {
        role: "user",
        content:
          "I have an exam Friday. I work evenings but mornings are free. I think im just gonna give up and skip it.",
      },
      {
        role: "assistant",
        content:
          "Why skip it? You still have the mornings. Study what you can and actually give yourself a chance.",
      },
      {
        role: "user",
        content: "yeah but what if i fail? wouldnt not trying be less embarrassing?",
      },
    ],
  },
];
const MAX_CASES = 12;

export function parseOptions(args) {
  const values = new Map();
  for (const arg of args) {
    const match = /^(--live|--suite|--only|--output)(?:=(.*))?$/.exec(arg);
    if (!match) throw Error(`Unknown argument: ${arg}`);
    const [, name, value] = match;
    if (values.has(name)) throw Error(`Repeated argument: ${name}`);
    if (name === "--live" && value !== undefined) throw Error("Use --live without a value.");
    if (name !== "--live" && !value) throw Error(`Use ${name}=VALUE.`);
    values.set(name, value);
  }
  const suite = values.get("--suite") || "smoke";
  if (!["smoke", "fidelity", "relationship", "behavior", "personas"].includes(suite)) {
    throw Error("Suite must be smoke, fidelity, relationship, behavior or personas.");
  }
  const output = values.get("--output") ||
    (suite === "smoke" ? "persona-review" : `${suite}-review`);
  if (!/^[a-z0-9-]+$/.test(output)) {
    throw Error("Output must be a basename containing only lowercase letters, digits and hyphens.");
  }
  const only = values.get("--only")?.split(",");
  if (only?.some((id) => !/^[a-z0-9-]+$/.test(id))) throw Error("Invalid --only case ID.");
  if (only && new Set(only).size !== only.length) throw Error("Repeated --only case ID.");
  return { live: values.has("--live"), suite, output, only };
}

export function selectCases(cases, only) {
  if (!Array.isArray(cases) || !cases.length || cases.length > MAX_CASES) {
    throw Error(`A review suite must contain between 1 and ${MAX_CASES} cases.`);
  }
  const ids = new Set();
  for (const test of cases) {
    if (!/^[a-z0-9-]+$/.test(test.id) || ids.has(test.id)) {
      throw Error("Invalid or duplicate case ID.");
    }
    if (test.persona && !["whiteeye", "griffith", "imp"].includes(test.persona)) {
      throw Error(`Invalid persona for ${test.id}.`);
    }
    if (test.participant && !["griffith", "guest"].includes(test.participant)) {
      throw Error(`Invalid participant for ${test.id}.`);
    }
    ids.add(test.id);
    if (
      !Array.isArray(test.messages) || !test.messages.length || test.messages.length > 20 ||
      test.messages.at(-1).role !== "user" || test.messages.some((message) =>
        !["user", "assistant"].includes(message.role) || typeof message.content !== "string" ||
        !message.content.trim() || message.content.length > 12000
      )
    ) {
      throw Error(`Invalid messages for ${test.id}.`);
    }
  }
  if (only) {
    const unknown = only.filter((id) => !ids.has(id));
    if (unknown.length) throw Error(`Unknown case IDs: ${unknown.join(", ")}`);
  }
  return only ? cases.filter((test) => only.includes(test.id)) : cases;
}

export async function reviewCase(test, fetcher = fetch) {
  const started = Date.now();
  let status = null, buffer = "", reply = "";
  const events = [];
  const consume = (line) => {
    if (!line.trim()) return;
    const event = JSON.parse(line);
    if (!event || !["delta", "notice", "done", "error"].includes(event.type)) {
      throw Error("Invalid stream event.");
    }
    if (event.type === "delta") {
      if (typeof event.text !== "string") throw Error("Invalid stream delta.");
      reply += event.text;
    } else events.push(event);
  };
  try {
    const response = await fetcher("http://127.0.0.1:8000/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "http://127.0.0.1:8000" },
      body: JSON.stringify({
        messages: test.messages,
        persona: test.persona || "whiteeye",
        participant: test.participant || "griffith",
      }),
      signal: AbortSignal.timeout(100000),
    });
    status = response.status;
    if (response.ok) {
      if (!response.body) throw Error("The server returned no response body.");
      for await (const chunk of response.body.pipeThrough(new TextDecoderStream())) {
        buffer += chunk;
        const lines = buffer.split("\n");
        buffer = lines.pop();
        for (const line of lines) consume(line);
      }
      // NDJSON producers may close without a trailing newline, including after done.
      consume(buffer);
    } else {
      let message = `HTTP ${status} returned a non-JSON error.`;
      try {
        const body = await response.json();
        message = typeof body.error === "string"
          ? body.error
          : `Provider request failed: HTTP ${status}.`;
      } catch {
        // Do not dump an HTML response, request headers or other unstructured data.
      }
      events.push({ type: "error", code: "http_error", message });
    }
  } catch (error) {
    events.push({
      type: "error",
      code: "transport_error",
      message: error instanceof Error ? error.message : "The request or response stream failed.",
    });
  }
  if (!events.some((event) => event.type === "done")) {
    events.push({
      type: "error",
      code: "missing_done",
      message: "Stream ended without a done event.",
    });
  }
  if (!reply.trim() && !events.some((event) => event.type === "error")) {
    events.push({
      type: "error",
      code: "empty_reply",
      message: "The provider returned no reply text.",
    });
  }
  return {
    id: test.id,
    persona: test.persona || "whiteeye",
    participant: test.participant || "griffith",
    messages: test.messages,
    source: test.source || [],
    expect: test.expect || [],
    avoid: test.avoid || [],
    status,
    reply,
    events,
    ms: Date.now() - started,
    transport: events.some((event) => event.type === "error") ? "failed" : "complete",
    personalityReview: "manual-required",
  };
}

async function main() {
  const options = parseOptions(Deno.args);
  if (!options.live) {
    console.log(
      "No requests sent. Add --live to use API credits. Default: six smoke cases. " +
        "Use --suite=fidelity or --suite=behavior for 12 held-out cases, --suite=relationship for 3 fresh-thread cases, or --suite=personas for voice switching, --only=ID,ID to limit calls, " +
        "and --output=NAME for artifacts/NAME.json. Personality/style always require manual review.",
    );
    return 0;
  }
  const cases = options.suite !== "smoke"
    ? JSON.parse(await Deno.readTextFile(`tests/${options.suite}-cases.json`))
    : SMOKE_CASES;
  const selected = selectCases(cases, options.only);
  const outputPath = `artifacts/${options.output}.json`;
  const results = [];
  const startedAt = new Date().toISOString();
  const save = async () => {
    await Deno.writeTextFile(
      outputPath,
      JSON.stringify(
        {
          startedAt,
          reviewedAt: new Date().toISOString(),
          suite: options.suite,
          selected: selected.map((test) => test.id),
          completed: results.length === selected.length &&
            results.every((r) => r.transport === "complete"),
          personalityReview: "manual-required; HTTP success is not a fidelity score",
          results,
        },
        null,
        2,
      ) + "\n",
    );
  };
  await Deno.mkdir("artifacts", { recursive: true });
  // Check artifact write access before the first paid request; preserve every subsequent result.
  await save();
  console.log(
    `${options.suite}: at most ${selected.length} API calls; no retries. Writing ${outputPath}. ` +
      "Transport completion does not establish personality fidelity; review source/expect/avoid manually.",
  );
  for (const test of selected) {
    const result = await reviewCase(test);
    results.push(result);
    console.log(JSON.stringify(result));
    await save();
    if (result.transport === "failed") break;
  }
  const failed = results.length !== selected.length ||
    results.some((r) => r.transport === "failed");
  console.log(
    `${results.length}/${selected.length} cases recorded; transport ${
      failed ? "failed" : "complete"
    }. ` +
      `Personality review remains manual. ${outputPath}`,
  );
  return failed ? 1 : 0;
}

if (import.meta.main) {
  try {
    Deno.exitCode = await main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Review could not complete.");
    Deno.exitCode = 1;
  }
}
