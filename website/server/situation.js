import { completionParameters, isGptReasoning } from "./models.js";

const KINDS = new Set([
  "smalltalk",
  "announcement",
  "preference",
  "advice",
  "disagreement",
  "vent",
  "achievement",
  "uncertainty",
  "question",
]);
const STATES = new Set([
  "relaxed",
  "amused",
  "curious",
  "serious",
  "skeptical",
  "impatient",
  "warm",
  "investigative",
  "uncertain",
]);
const PREMISES = new Set(["accept", "challenge", "unclear"]);

export function quickSituation(messages) {
  const latest = messages.at(-1)?.content.trim() || "";
  if (/^(?:hi|hey|hello|yo|sup|wassup|what'?s up|howdy)[!?.\s]*$/i.test(latest)) {
    return {
      kind: "smalltalk",
      state: "relaxed",
      premise: "accept",
      caseIds: ["ordinary-presence"],
    };
  }
  if (/^(?:lol+|lmao+|haha+|😭+|💀+|thanks?\b|ty\b|got it\b)[!?.\s]*$/i.test(latest)) {
    return {
      kind: "smalltalk",
      state: "relaxed",
      premise: "accept",
      caseIds: ["ordinary-presence"],
    };
  }
  return null;
}

const fallbackRules = [
  [
    "avoidance-versus-action",
    /procrastinat|put(?:ting)? (?:it|this) off|keep delay|can't start|cant start|wait for motivation|making excuses|avoid(?:ing)? (?:doing|starting|studying)/i,
  ],
  ["effort-before-outcome", /\bexam|\btest\b|\bstudy|give up|fail(?:ure|ing)?\b/i],
  [
    "regret-and-time",
    /\bregret|wasted? (?:my |the |a )?(?:time|year|life)|should.?ve|too late|everyone (?:is |else )?ahead|behind in life/i,
  ],
  [
    "repeated-reassurance",
    /reassur|promise (?:me|you)|are you (?:sure|still)|keep asking|again and again/i,
  ],
  [
    "friendship-beyond-reply-speed",
    /\bfriend|text(?:ing|ed|s)?|reply|respond|fake people|care(?:s|d)? about me/i,
  ],
  ["someone-keeps-crossing-a-line", /boundary|overstep|ignored my request|won't stop|wont stop/i],
  [
    "earned-pride",
    /i (?:did it|passed|finished|finally|managed|made it)|i got (?:the job|in)|i spoke|i tried/i,
  ],
  [
    "listen-when-advice-is-unwanted",
    /(?:don't|dont|not) want advice|just (?:want|need) (?:you )?to listen|i(?:'m| am) venting/i,
  ],
  [
    "premise-and-wording",
    /higher quality|better person|words? (?:don't|dont) matter|just semantics|nitpick/i,
  ],
  [
    "test-the-generalization",
    /everyone|nobody|always|never|all (?:men|women|people)|biology proves|objectively/i,
  ],
  [
    "concede-the-limit",
    /you (?:don't|dont|can't|cant) (?:know|understand)|you haven.?t lived|not in my shoes/i,
  ],
  [
    "dependency-and-agency",
    /(?:tell|decide|choose) (?:me|for me)|only you (?:can|understand)|need you to decide/i,
  ],
  ["ordinary-preference", /\bfav(?:orite|ourite)?|\bgames?\b|\bmovie|\banime|\bfood\b|\bshow\b/i],
];

export function fallbackSituation(messages, library) {
  const latest = messages.at(-1)?.content || "";
  const matched = fallbackRules.filter(([, pattern]) => pattern.test(latest))
    .map(([id]) => id).filter((id) => library.ids().includes(id)).slice(0, 2);
  const advice = /\b(?:should i|what (?:do|should) i do|how (?:do|can) i|help me|advice)\b/i
    .test(latest);
  const question = /\?\s*$/.test(latest);
  return {
    kind: advice ? "advice" : question ? "question" : "announcement",
    state: "relaxed",
    premise: "unclear",
    caseIds: matched.length ? matched : ["genuine-curiosity"],
  };
}

export function parseSituation(content, library) {
  if (typeof content !== "string" || content.length > 5000) return null;
  let parsed;
  try {
    parsed = JSON.parse(content.trim().replace(/^```(?:json)?\s*|\s*```$/g, ""));
  } catch {
    return null;
  }
  if (
    !parsed || !KINDS.has(parsed.kind) || !STATES.has(parsed.state) ||
    !PREMISES.has(parsed.premise) || !Array.isArray(parsed.caseIds)
  ) return null;
  const available = new Set(library.ids());
  const caseIds = [...new Set(parsed.caseIds)].filter((id) => available.has(id)).slice(0, 3);
  if (!caseIds.length) return null;
  return { kind: parsed.kind, state: parsed.state, premise: parsed.premise, caseIds };
}

export async function inferSituation(messages, library, config, fetchModel, signal) {
  const quick = quickSituation(messages);
  if (quick) return quick;
  const fallback = fallbackSituation(messages, library);
  const recentMessages = messages.slice(-6);
  const recent = recentMessages.map(({ role, content }, index) => ({
    role,
    // The actual request often comes after a long explanation. Keep both ends
    // for analogy selection; generation still receives the complete message.
    content: index === recentMessages.length - 1 && content.length > 3200
      ? `${content.slice(0, 900)}\n[Middle omitted for routing]\n${content.slice(-2200)}`
      : content.slice(0, 3200),
  }));
  const instruction =
    `Select behavioral analogies for ONE next private DM. Classify the actual latest ` +
    `message, not just its topic. Check whether it asks for advice, is just sharing news, ` +
    `continues a disagreement, or explicitly wants listening. Do not presume repeated ` +
    `excuses or reassurance unless the supplied live turns show repetition. A case is an ` +
    `analogy, not a source of invented shared history. Choose 1-3 case IDs by the underlying ` +
    `situation and WhiteEye's response process, even if the vocabulary differs. ` +
    `Return only JSON: {"kind":"smalltalk|announcement|preference|advice|disagreement|vent|achievement|uncertainty|question",` +
    `"state":"relaxed|amused|curious|serious|skeptical|impatient|warm|investigative|uncertain",` +
    `"premise":"accept|challenge|unclear","caseIds":["id"]}. ` +
    `Impatient requires actual repetition in the live conversation. No explanation.\n` +
    JSON.stringify(library.descriptors());
  try {
    const timeout = AbortSignal.timeout(18000);
    const response = await fetchModel(`${config.baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      signal: AbortSignal.any([signal, timeout]),
      headers: {
        "Content-Type": "application/json",
        ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: "system", content: instruction },
          { role: "user", content: JSON.stringify(recent) },
        ],
        stream: false,
        store: false,
        ...completionParameters(config.model, isGptReasoning(config.model) ? 1536 : 700, 0),
      }),
    });
    if (!response.ok) return fallback;
    const result = await response.json();
    return parseSituation(result.choices?.[0]?.message?.content, library) || fallback;
  } catch {
    return fallback;
  }
}
