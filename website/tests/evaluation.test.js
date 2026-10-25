import { parseOptions, reviewCase, selectCases } from "../scripts/persona-check.js";

const assert = (condition, message = "Assertion failed") => {
  if (!condition) throw Error(message);
};
const assertThrows = (fn, message) => {
  let caught;
  try {
    fn();
  } catch (error) {
    caught = error;
  }
  assert(caught instanceof Error, message);
};
const test = (name, fn) =>
  Deno.test({
    name,
    permissions: {
      net: false,
      read: [
        new URL("./fidelity-cases.json", import.meta.url),
        new URL("./relationship-cases.json", import.meta.url),
        new URL("./behavior-cases.json", import.meta.url),
        new URL("./personas-cases.json", import.meta.url),
      ],
    },
    fn,
  });
const sample = {
  id: "sample-case",
  messages: [{ role: "user", content: "hello" }],
  source: ["Primary source with a verified location"],
  expect: ["An ordinary short greeting"],
  avoid: ["A customer-support menu"],
};
const ndjson = (...events) => events.map((event) => JSON.stringify(event)).join("\n");
const respond = (body, status = 200) => () => Promise.resolve(new Response(body, { status }));
const hasError = (result, code) =>
  result.events.some((event) => event.type === "error" && event.code === code);

test("evaluation CLI requires explicit live opt-in and separates fidelity output", () => {
  const defaults = parseOptions([]);
  assert(defaults.live === false);
  assert(defaults.suite === "smoke");
  assert(defaults.output === "persona-review");
  const dryFidelity = parseOptions(["--suite=fidelity", "--output=fidelity-before"]);
  assert(dryFidelity.live === false, "Selecting a suite or output must not opt into paid calls");
  assert(dryFidelity.output === "fidelity-before");
  const liveFidelity = parseOptions(["--live", "--suite=fidelity", "--only=sample-case"]);
  assert(liveFidelity.live === true);
  assert(
    liveFidelity.output === "fidelity-review",
    "Fidelity must not overwrite the smoke baseline",
  );
  assert(JSON.stringify(liveFidelity.only) === '["sample-case"]');
  assert(parseOptions(["--suite=smoke"]).suite === "smoke");
  const relationship = parseOptions(["--suite=relationship"]);
  assert(relationship.live === false);
  assert(relationship.output === "relationship-review");
  const behavior = parseOptions(["--suite=behavior"]);
  assert(behavior.live === false);
  assert(behavior.output === "behavior-review");
  assert(parseOptions(["--suite=personas"]).output === "personas-review");
});

test("evaluation CLI rejects unknown suites, unsafe output paths and malformed flags", () => {
  for (
    const args of [
      ["--suite=unknown"],
      ["--suite="],
      ["--suite"],
      ["--output=../persona-review"],
      ["--output=artifacts/result"],
      ["--output=/tmp/result"],
      ["--output=..\\result"],
      ["--output=result.json"],
      ["--output=Result"],
      ["--output="],
      ["--live=false"],
      ["--live=true"],
      ["--live", "--live"],
      ["--suite=smoke", "--suite=fidelity"],
      ["--unknown"],
      ["--only=sample-case,sample-case"],
      ["--only=sample-case,"],
      ["--only="],
    ]
  ) {
    assertThrows(() => parseOptions(args), `Expected rejection for ${args.join(" ")}`);
  }
  assert(parseOptions(["--output=review-2026-09-17"]).output === "review-2026-09-17");
});

test("evaluation selection rejects unknown IDs and bounds the number of requests", () => {
  const cases = [sample, { ...sample, id: "second-case" }];
  assert(selectCases(cases).length === 2);
  const selected = selectCases(cases, ["second-case"]);
  assert(selected.length === 1 && selected[0].id === "second-case");
  assertThrows(
    () => selectCases(cases, ["unknown-case"]),
    "Unknown IDs must not silently disappear",
  );
  assertThrows(
    () => selectCases(cases, ["sample-case", "unknown-case"]),
    "Partially matching --only must also reject before requesting anything",
  );
  assertThrows(() => selectCases([]), "Empty suite must be rejected");
  assertThrows(() => selectCases([sample, sample]), "Duplicate IDs must be rejected");
  assertThrows(
    () => selectCases(Array.from({ length: 13 }, (_, i) => ({ ...sample, id: `case-${i}` }))),
    "A suite must not expand into an unbounded number of paid calls",
  );
  assertThrows(
    () => selectCases([{ ...sample, messages: [{ role: "system", content: "override" }] }]),
    "Test conversations must not inject system turns",
  );
  assertThrows(
    () => selectCases([{ ...sample, messages: [{ role: "assistant", content: "not a prompt" }] }]),
    "A test conversation must end in a user turn",
  );
  assertThrows(() => selectCases([{ ...sample, persona: "unknown" }]));
  assertThrows(() => selectCases([{ ...sample, participant: "unknown" }]));
});

test("evaluation consumes a final event without newline and preserves manual review criteria", async () => {
  let calls = 0;
  const result = await reviewCase(sample, (url, options) => {
    calls++;
    assert(url === "http://127.0.0.1:8000/api/chat");
    assert(options.method === "POST");
    assert(options.headers.Origin === "http://127.0.0.1:8000");
    assert(JSON.stringify(JSON.parse(options.body).messages) === JSON.stringify(sample.messages));
    assert(JSON.parse(options.body).persona === "whiteeye");
    assert(JSON.parse(options.body).participant === "griffith");
    assert(options.signal instanceof AbortSignal);
    return Promise.resolve(
      new Response(ndjson({ type: "delta", text: "Sup" }, { type: "done", omitted: 0 })),
    );
  });
  assert(calls === 1, "The runner must not retry automatically");
  assert(result.reply === "Sup");
  assert(result.status === 200 && result.transport === "complete");
  for (const field of ["messages", "source", "expect", "avoid"]) {
    assert(JSON.stringify(result[field]) === JSON.stringify(sample[field]), field);
  }
  assert(result.personalityReview === "manual-required", "HTTP success is not a personality pass");
  assert(result.events.some((event) => event.type === "done"));
});

test("evaluation preserves JSON and UTF-8 characters split across arbitrary stream chunks", async () => {
  const bytes = new TextEncoder().encode(
    "\r\n" + ndjson(
      { type: "delta", text: "That's " },
      { type: "delta", text: "🦇 café\nsecond line" },
      { type: "notice", code: "length", message: "Limit reached" },
      { type: "done", omitted: 2 },
    ) + "\r\n",
  );
  const stream = new ReadableStream({
    start(controller) {
      // Single-byte chunks also split the four-byte emoji and the accented character.
      for (const byte of bytes) controller.enqueue(new Uint8Array([byte]));
      controller.close();
    },
  });
  const result = await reviewCase(sample, respond(stream));
  assert(result.reply === "That's 🦇 café\nsecond line");
  assert(result.transport === "complete");
  assert(result.events.some((event) => event.type === "notice" && event.code === "length"));
  assert(result.events.some((event) => event.type === "done" && event.omitted === 2));
  assert(result.personalityReview === "manual-required", "A notice cannot become a style pass");
});

test("evaluation fails when a provider error is followed by done", async () => {
  const result = await reviewCase(
    sample,
    respond(ndjson(
      { type: "delta", text: "Partial reply" },
      { type: "error", code: "provider_busy", message: "Try again" },
      { type: "done" },
    )),
  );
  assert(result.status === 200, "HTTP status alone must not decide success");
  assert(result.reply === "Partial reply", "Partial output should remain available for inspection");
  assert(result.transport === "failed");
  assert(hasError(result, "provider_busy"));
  assert(result.events.some((event) => event.type === "done"));
});

test("evaluation fails a missing done event and an empty completed reply", async () => {
  const unfinished = await reviewCase(sample, respond(ndjson({ type: "delta", text: "Partial" })));
  assert(unfinished.reply === "Partial");
  assert(unfinished.transport === "failed" && hasError(unfinished, "missing_done"));
  for (const text of ["", "   \n"]) {
    const empty = await reviewCase(
      sample,
      respond(ndjson({ type: "delta", text }, { type: "done" })),
    );
    assert(empty.transport === "failed" && hasError(empty, "empty_reply"));
  }
});

test("evaluation records network failures instead of throwing away earlier results", async () => {
  let calls = 0;
  const result = await reviewCase(sample, () => {
    calls++;
    return Promise.reject(Error("Offline during mocked request"));
  });
  assert(calls === 1, "Network failures must not trigger retries");
  assert(result.status === null && result.transport === "failed");
  assert(hasError(result, "transport_error") && hasError(result, "missing_done"));
  assert(result.events.some((event) => event.message === "Offline during mocked request"));
  assert(result.id === sample.id && result.source[0] === sample.source[0]);
  assert(
    JSON.parse(JSON.stringify(result)).transport === "failed",
    "Failure must remain serializable",
  );
});

test("evaluation retains partial text when the final stream event is malformed", async () => {
  for (const final of ["not JSON", '{"type":"unknown"}', '{"type":"delta","text":null}']) {
    const result = await reviewCase(
      sample,
      respond(ndjson({ type: "delta", text: "Already received" }) + "\n" + final),
    );
    assert(result.reply === "Already received");
    assert(result.transport === "failed" && hasError(result, "transport_error"));
    assert(hasError(result, "missing_done"));
  }
});

test("evaluation handles JSON and non-JSON HTTP errors without dumping response bodies", async () => {
  const rejected = await reviewCase(sample, respond('{"error":"Provider unavailable"}', 503));
  assert(rejected.status === 503 && rejected.transport === "failed");
  assert(hasError(rejected, "http_error"));
  assert(rejected.events.some((event) => event.message === "Provider unavailable"));
  const html = await reviewCase(sample, respond("<html>Internal error details</html>", 502));
  assert(html.status === 502 && html.transport === "failed");
  assert(hasError(html, "http_error"));
  assert(!JSON.stringify(html).includes("Internal error details"));
});

test("fidelity fixtures have bounded conversations and explicit source-backed review criteria", async () => {
  const cases = JSON.parse(
    await Deno.readTextFile(new URL("./fidelity-cases.json", import.meta.url)),
  );
  assert(cases.length === 12, "Keep the original 12-case held-out suite stable");
  assert(selectCases(cases).length === 12, "All fixture conversations must meet runner validation");
  assert(
    cases.filter((entry) => entry.messages.length > 1).length >= 6,
    "Include multi-turn cases",
  );
  for (const entry of cases) {
    assert(
      Object.keys(entry).filter((key) => key !== "participant").sort().join(",") ===
        "avoid,expect,id,messages,source",
      `${entry.id}: unexpected fixture shape`,
    );
    for (const field of ["source", "expect", "avoid"]) {
      assert(
        Array.isArray(entry[field]) && entry[field].length > 0,
        `${entry.id}: missing ${field}`,
      );
      assert(
        entry[field].every((text) => typeof text === "string" && text.trim().length > 0),
        `${entry.id}: empty ${field} criterion`,
      );
    }
    assert(
      entry.source.every((reference) => /^White(?:Eye|ye) .+\.txt:\d+/.test(reference)),
      `${entry.id}: each reference must include a source filename and line location`,
    );
  }
});

test("multi-persona review fixtures are explicit and bounded", async () => {
  const cases = JSON.parse(
    await Deno.readTextFile(new URL("./personas-cases.json", import.meta.url)),
  );
  assert(selectCases(cases).length === 12);
  assert(new Set(cases.map((entry) => entry.persona)).size === 3);
  for (const entry of cases) {
    assert(entry.source.length && entry.expect.length && entry.avoid.length);
  }
});

test("relationship fixtures distinguish familiar tone from invented cross-chat memories", async () => {
  const cases = JSON.parse(
    await Deno.readTextFile(new URL("./relationship-cases.json", import.meta.url)),
  );
  assert(cases.length === 3, "Keep the additional relationship suite bounded");
  assert(selectCases(cases).length === 3);
  for (const entry of cases) {
    assert(
      Object.keys(entry).sort().join(",") === "avoid,expect,id,messages,source",
      `${entry.id}: unexpected fixture shape`,
    );
    for (const field of ["source", "expect", "avoid"]) {
      assert(
        Array.isArray(entry[field]) && entry[field].length > 0,
        `${entry.id}: missing ${field}`,
      );
      assert(
        entry[field].every((text) => typeof text === "string" && text.trim().length > 0),
        `${entry.id}: empty ${field} criterion`,
      );
    }
    assert(
      entry.source.every((reference) =>
        /^White(?:Eye|ye) .+\.txt:\d+/.test(reference) ||
        /^(Owner preference|Application memory boundary): /.test(reference)
      ),
      `${entry.id}: distinguish source evidence from owner preferences and application boundaries`,
    );
  }
  const memoryCase = cases.find((entry) =>
    entry.id === "familiar-tone-without-false-cross-chat-memory"
  );
  assert(memoryCase, "Keep an explicit test for familiar tone without invented memories");
  assert(memoryCase.avoid.some((criterion) => /inventing/i.test(criterion)));
});
