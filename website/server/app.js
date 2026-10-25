import { buildSystemPrompt } from "../src/persona/system-prompt.js";
import { selectCanon } from "../src/persona/canon-retrieval.js";
import {
  unknownRecentExperience,
  unknownUndocumentedFavorite,
} from "../src/persona/knowledge-guard.js";
import { retrievalQueries, selectContext } from "./retrieval.js";
import { inferSituation } from "./situation.js";
import { buildGriffithPrompt, PERSONAS } from "../src/persona/personas.js";
import { availableModels, completionParameters, isGptReasoning } from "./models.js";
import { buildTatePrompt } from "../src/persona/andrew-tate.js";
import { repairSourceReply, verifySourceReply } from "../src/persona/source-response.js";
import { buildJanePrompt } from "../src/persona/patrick-jane.js";
import { resolveJaneEra } from "./jane-retrieval.js";
import { buildVegetaPrompt } from "../src/persona/vegeta.js";
import { resolveVegetaEra } from "./vegeta-retrieval.js";
import { buildImpPrompt, impReferences } from "../src/persona/imp.js";
import {
  buildVesperPrompt,
  selectCompositeEvidence,
  vesperReferences,
} from "../src/persona/vesper.js";

const encoder = new TextEncoder();
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".txt": "text/plain; charset=utf-8",
};
const security = {
  "Content-Security-Policy":
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; media-src 'self' blob:; frame-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "X-Frame-Options": "DENY",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
};
const json = (body, status = 200) =>
  Response.json(body, { status, headers: { ...security, "Cache-Control": "no-store" } });
export function validateMessages(value) {
  if (!Array.isArray(value) || !value.length) {
    throw Error("Invalid conversation.");
  }
  const messages = value.map((m) => {
    if (
      !m || !["user", "assistant"].includes(m.role) || typeof m.content !== "string" ||
      !m.content.trim()
    ) throw Error("Invalid message.");
    return { role: m.role, content: m.content.trim() };
  });
  if (messages.at(-1).role !== "user") throw Error("A conversation must end in a user message.");
  return messages;
}

export function validateMemory(value) {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 4) throw Error("Invalid memory.");
  let size = 0;
  return value.map((entry) => {
    if (
      !entry || typeof entry.user !== "string" || !entry.user.trim() ||
      typeof entry.assistant !== "string" ||
      !Number.isSafeInteger(entry.at) || entry.at < 0 || entry.at > Date.now() + 86400000 ||
      entry.user.length > 1400 || entry.assistant.length > 1400
    ) throw Error("Invalid memory.");
    size += entry.user.length + entry.assistant.length;
    if (size > 5200) throw Error("Memory limit exceeded.");
    return { at: entry.at, user: entry.user.trim(), assistant: entry.assistant.trim() };
  });
}

export function createApp(
  {
    config,
    retrieve = () => [],
    retrieveGriffith = () => [],
    tateLibrary = null,
    coteLibrary = null,
    janeLibrary = null,
    vegetaLibrary = null,
    impLibrary = null,
    answerMemory = null,
    preferenceMemory = null,
    models = availableModels(config),
    voiceScenes = () => [],
    behaviorLibrary = null,
    publicRoot = new URL("../public/", import.meta.url),
    fetchModel = fetch,
  },
) {
  const limits = new Map();
  const ready = Boolean(
    config.model && config.baseUrl &&
      (config.apiKey || /^https?:\/\/(127\.0\.0\.1|localhost)(:|\/)/.test(config.baseUrl)),
  );
  return async function handler(req, info = { remoteAddr: { hostname: "local" } }) {
    const url = new URL(req.url);
    if (url.pathname === "/api/status" && req.method === "GET") {
      return json({
        configured: ready,
        defaultModel: config.model || null,
        models,
        requiresAccess: Boolean(config.accessToken),
        provider: ready
          ? (config.baseUrl.includes("127.0.0.1") || config.baseUrl.includes("localhost")
            ? "Local model"
            : "Connected provider")
          : null,
      });
    }
    if (url.pathname === "/api/chat") {
      if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);
      if (req.headers.get("origin") !== url.origin) {
        return json({ error: "Request origin rejected." }, 403);
      }
      if (!req.headers.get("content-type")?.startsWith("application/json")) {
        return json({ error: "Expected JSON." }, 415);
      }
      if (
        config.accessToken && req.headers.get("authorization") !== `Bearer ${config.accessToken}`
      ) return json({ error: "Enter the access code in Connection to continue." }, 401);
      const ip = info.remoteAddr.hostname;
      const now = Date.now();
      for (const [key, value] of limits) if (now - value.start > 60000) limits.delete(key);
      const rate = limits.get(ip) || { start: now, count: 0, active: 0 };
      if (rate.count >= 20 || rate.active >= 2) {
        return json({ error: "Too many requests. Give it a minute and try again." }, 429);
      }
      rate.count++;
      limits.set(ip, rate);
      let payload, messages, memory;
      try {
        payload = await req.json();
      } catch {
        return json({ error: "The request is not valid JSON." }, 400);
      }
      if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
        return json({ error: "Invalid request." }, 400);
      }
      try {
        messages = validateMessages(payload.messages);
      } catch {
        return json({ error: "Invalid conversation format." }, 400);
      }
      try {
        memory = validateMemory(payload.memory);
      } catch {
        return json({ error: "Invalid prior-chat memory." }, 400);
      }
      const persona = payload.persona ?? "whiteeye";
      if (!Object.hasOwn(PERSONAS, persona)) {
        return json({ error: "Unknown persona." }, 400);
      }
      const participant = payload.participant ?? "guest";
      if (!["griffith", "guest"].includes(participant)) {
        return json({ error: "Unknown participant." }, 400);
      }
      const sourceLibrary = persona === "tate" ? tateLibrary : null;
      const sourceProfile = {};
      if (persona === "jane" && !janeLibrary) {
        return json({ error: "Patrick Jane’s research index is unavailable." }, 503);
      }
      if (persona === "vegeta" && !vegetaLibrary) {
        return json({ error: "Vegeta’s research index is unavailable." }, 503);
      }
      if (persona === "imp" && !coteLibrary) {
        return json({ error: "IMP’s Classroom of the Elite source index is unavailable." }, 503);
      }
      if (persona === "imp" && !impLibrary) {
        return json({ error: "IMP’s character research index is unavailable." }, 503);
      }
      if (persona === "vesper" && (!janeLibrary || !tateLibrary || !coteLibrary || !impLibrary)) {
        return json({ error: "Vesper’s source material is unavailable." }, 503);
      }
      if (persona === "tate" && !sourceLibrary) {
        return json({
          error: `${
            PERSONAS[persona].name
          }’s source index is unavailable. Rebuild the source index.`,
        }, 503);
      }
      if (!ready) {
        return json({
          error:
            "The conversation model is not connected yet. Open Connection for setup. Your message is saved; retry after connecting.",
        }, 503);
      }
      const model = payload.model ?? config.model;
      if (typeof model !== "string" || !models.some((option) => option.id === model)) {
        return json({ error: "Choose one of the available models." }, 400);
      }
      const unknown = persona === "whiteeye"
        ? unknownRecentExperience(messages) || unknownUndocumentedFavorite(messages)
        : null;
      if (unknown) {
        const body = `${JSON.stringify({ type: "delta", text: unknown })}\n${
          JSON.stringify({ type: "done", omitted: 0 })
        }\n`;
        return new Response(body, {
          headers: {
            ...security,
            "Content-Type": "application/x-ndjson; charset=utf-8",
            "Cache-Control": "no-store",
            "X-Accel-Buffering": "no",
          },
        });
      }
      const completePreference = persona === "whiteeye" ? preferenceMemory?.find(messages) : null;
      if (completePreference) {
        const body = `${JSON.stringify({ type: "delta", text: completePreference.reply })}\n${
          JSON.stringify({ type: "done", omitted: 0 })
        }\n`;
        return new Response(body, {
          headers: {
            ...security,
            "Content-Type": "application/x-ndjson; charset=utf-8",
            "Cache-Control": "no-store",
            "X-Accel-Buffering": "no",
          },
        });
      }
      const context = selectContext(messages);
      const query = retrievalQueries(context.messages);
      const source = sourceLibrary?.find(query);
      const research = persona === "jane"
        ? janeLibrary.find(query, { era: resolveJaneEra(context.messages) })
        : persona === "vegeta"
        ? vegetaLibrary.find(query, { era: resolveVegetaEra(context.messages) })
        : null;
      const synthesis = persona === "vesper"
        ? {
          whiteeye: retrieve(query, 2),
          griffith: retrieveGriffith(query, 1),
          tate: selectCompositeEvidence([
            ...tateLibrary.find(query).evidence,
            ...tateLibrary.styles,
          ]),
          cote: selectCompositeEvidence([
            ...coteLibrary.find(query).evidence,
            ...coteLibrary.styles,
          ]),
          jane: (() => {
            const selected = janeLibrary.find(query, { budget: 5000, limit: 4 });
            return [...selected.evidence, ...selected.styles];
          })(),
          imp: impLibrary.find(query, {
            budget: 5000,
            limit: 6,
            primaryBudget: 6000,
            primaryLimit: 3,
          }),
        }
        : null;
      const impContext = persona === "imp"
        ? {
          cote: selectCompositeEvidence([
            ...coteLibrary.find(query).evidence,
            ...coteLibrary.styles,
          ]),
          research: impLibrary.find(query),
        }
        : null;
      const controller = new AbortController();
      const abort = () => controller.abort();
      req.signal.addEventListener("abort", abort, { once: true });
      const timer = setTimeout(abort, source ? 240000 : 90000);
      rate.active++;
      const cleanup = () => {
        clearTimeout(timer);
        req.signal.removeEventListener("abort", abort);
        rate.active--;
      };
      // Behavioral selection is separate from factual lookup. The model-based
      // router can match a new situation by underlying process, not word overlap;
      // a bounded local fallback keeps chat available if that call fails.
      const situation = persona === "whiteeye" && behaviorLibrary
        ? await inferSituation(
          context.messages,
          behaviorLibrary,
          { ...config, model },
          fetchModel,
          controller.signal,
        )
        : null;
      const patterns = persona === "whiteeye"
        ? behaviorLibrary?.select(situation?.caseIds) || []
        : [];
      const scenes = persona === "whiteeye" && behaviorLibrary && voiceScenes.byIds
        ? voiceScenes.byIds(patterns.map((pattern) => pattern.scene).filter(Boolean))
        : persona === "griffith"
        ? voiceScenes(query.latest, query.prior)
          .filter((scene) => !["greeting", "not-interested", "wordplay"].includes(scene.id))
          .slice(0, 3)
        : persona === "whiteeye"
        ? voiceScenes(query.latest, query.prior)
        : [];
      const evidence = persona === "griffith"
        ? retrieveGriffith(query, 3)
        : persona === "whiteeye" && (participant === "guest" || !behaviorLibrary ||
            ["preference", "uncertainty"].includes(situation?.kind))
        ? retrieve(query, participant === "guest" ? 3 : 2)
        : [];
      const answers = persona === "whiteeye" ? answerMemory?.find(query, 10) || [] : [];
      const griffithHistory = persona === "whiteeye" && participant === "griffith"
        ? retrieveGriffith(query, 2)
        : [];
      let prompt = persona === "whiteeye"
        ? buildSystemPrompt({
          situation,
          patterns,
          scenes,
          canon: selectCanon(`${query.latest} ${query.prior}`, situation?.caseIds),
          evidence,
          memory,
          answers,
          griffithHistory,
          participant,
        })
        : persona === "griffith"
        ? buildGriffithPrompt({ evidence, scenes, memory })
        : persona === "tate"
        ? buildTatePrompt({ ...source, styles: sourceLibrary.styles, memory })
        : persona === "jane"
        ? buildJanePrompt({ ...research, memory })
        : persona === "vegeta"
        ? buildVegetaPrompt({ ...research, memory })
        : persona === "imp"
        ? buildImpPrompt({ ...impContext, memory })
        : persona === "vesper"
        ? buildVesperPrompt({ ...synthesis, memory })
        : "";
      if (context.omitted) {
        prompt +=
          `\n${context.omitted} older messages were omitted for space. You have the opening and recent conversation only. Do not pretend to recall omitted content; ask if needed.`;
      }
      let upstream;
      try {
        upstream = await fetchModel(`${config.baseUrl.replace(/\/$/, "")}/chat/completions`, {
          method: "POST",
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
            ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
          },
          body: JSON.stringify({
            model,
            messages: [{ role: "system", content: prompt }, ...context.messages],
            stream: true,
            store: false,
            ...completionParameters(
              model,
              source
                ? (isGptReasoning(model) ? 24576 : 16384)
                : isGptReasoning(model)
                ? 8192
                : 4096,
              source ? 0.2 : 0.82,
            ),
          }),
        });
      } catch {
        cleanup();
        return json(
          { error: "The model could not be reached. Check the connection and retry." },
          502,
        );
      }
      if (!upstream.ok || !upstream.body) {
        let providerError = null;
        try {
          const payload = await upstream.clone().json();
          providerError = payload?.error;
        } catch {
          // Some compatible providers return an empty or non-JSON error body.
        }
        await upstream.body?.cancel();
        cleanup();
        const message = upstream.status === 413 ||
            /(?:context[_ -]?length|maximum context|too many tokens|prompt is too long|input is too long)/i
              .test(String(providerError?.message || ""))
          ? "The model provider could not fit this much text in its context window. Your full message is saved here; try splitting it into parts."
          : upstream.status === 402 ||
              providerError?.code === "insufficient_quota" ||
              providerError?.code === "credit_balance_exhausted"
          ? "Your model provider has insufficient API credits for this reply. Add credits in the provider billing settings, then retry."
          : upstream.status === 429
          ? "The model provider is busy or has reached its usage limit. Try again shortly."
          : "The model provider rejected the request. Check the model name and server credentials.";
        return json({ error: message }, 502);
      }
      const body = new ReadableStream({
        async start(out) {
          const send = (event) => out.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
          let buffer = "", hasText = false, finished = false, sourceText = "", truncated = false;
          try {
            for await (const chunk of upstream.body.pipeThrough(new TextDecoderStream())) {
              buffer += chunk;
              const lines = buffer.split("\n");
              buffer = lines.pop();
              for (const line of lines) {
                if (!line.startsWith("data:")) continue;
                const data = line.slice(5).trim();
                if (data === "[DONE]") {
                  finished = true;
                  continue;
                }
                if (!data) continue;
                const event = JSON.parse(data);
                if (event.error) throw Error("Upstream failed.");
                const choice = event.choices?.[0];
                const text = choice?.delta?.content;
                if (typeof text === "string" && text) {
                  hasText = true;
                  if (source) {
                    sourceText += text;
                    if (sourceText.length > 180000) throw Error("Source response is too large.");
                  } else send({ type: "delta", text });
                }
                if (choice?.finish_reason) {
                  if (choice.finish_reason === "length") {
                    truncated = true;
                    send({ type: "notice", message: "Reply reached the model’s length limit." });
                  }
                  finished = true;
                }
              }
            }
            if (!hasText || !finished) throw Error("Incomplete response.");
            if (source) {
              if (truncated) throw Error("Incomplete source response.");
              let verified;
              try {
                verified = verifySourceReply(sourceText, source.evidence, sourceProfile);
                if (
                  verified.sources.some((source) =>
                    (sourceProfile.reviewAttributions || ["mixed-speakers", "edited-compilation"])
                      .includes(source.attribution)
                  )
                ) throw Error("Mixed source speaker review required.");
              } catch {
                const corrected = await repairSourceReply(
                  sourceText,
                  source.evidence,
                  query,
                  async (correctionPrompt) => {
                    const correction = await fetchModel(
                      `${config.baseUrl.replace(/\/$/, "")}/chat/completions`,
                      {
                        method: "POST",
                        signal: controller.signal,
                        headers: {
                          "Content-Type": "application/json",
                          ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
                        },
                        body: JSON.stringify({
                          model,
                          messages: [{ role: "system", content: correctionPrompt }],
                          stream: false,
                          store: false,
                          ...completionParameters(model, isGptReasoning(model) ? 8192 : 4096, 0),
                        }),
                      },
                    );
                    if (!correction.ok) throw Error("Source correction failed.");
                    const payload = await correction.json();
                    const content = payload.choices?.[0]?.message?.content;
                    if (typeof content !== "string") throw Error("Source correction is missing.");
                    return content;
                  },
                  sourceProfile,
                );
                verified = verifySourceReply(corrected, source.evidence, sourceProfile);
              }
              send({ type: "delta", text: verified.text });
              send({
                type: "done",
                omitted: context.omitted,
                sourceMode: verified.mode,
                sources: verified.sources,
                coverage: source.coverage,
              });
            } else {
              send({
                type: "done",
                omitted: context.omitted,
                ...(research
                  ? {
                    sourceMode: "interpretation",
                    sources: research.references,
                    coverage: research.coverage,
                  }
                  : {}),
                ...(synthesis
                  ? {
                    sourceMode: "synthesis",
                    sources: vesperReferences(),
                    coverage: { imp: synthesis.imp.coverage },
                  }
                  : {}),
                ...(impContext
                  ? {
                    sourceMode: "synthesis",
                    sources: impReferences(impContext.research),
                    coverage: impContext.research.coverage,
                  }
                  : {}),
              });
            }
          } catch {
            try {
              send({
                type: "error",
                message: controller.signal.aborted
                  ? "The reply timed out or was stopped. You can retry."
                  : source
                  ? "The source response could not be verified or completed. Retry to preserve exact wording."
                  : "The reply was interrupted. You can retry.",
              });
            } catch { /* Client disconnected. */ }
          } finally {
            cleanup();
            try {
              out.close();
            } catch { /* Already canceled. */ }
          }
        },
        cancel() {
          controller.abort();
        },
      });
      return new Response(body, {
        headers: {
          ...security,
          "Content-Type": "application/x-ndjson; charset=utf-8",
          "Cache-Control": "no-store",
          "X-Accel-Buffering": "no",
        },
      });
    }
    if (req.method !== "GET" && req.method !== "HEAD") {
      return json({ error: "Method not allowed." }, 405);
    }
    let path;
    try {
      path = decodeURIComponent(url.pathname);
    } catch {
      return json({ error: "Invalid path." }, 400);
    }
    if (path === "/" || path === "/conversation") path = "/index.html";
    if (
      !/^\/(?:index\.html|(?:styles|js|assets)\/[a-zA-Z0-9_./-]+)$/.test(path) ||
      path.includes("..")
    ) return json({ error: "Not found." }, 404);
    try {
      const file = await Deno.readFile(new URL("." + path, publicRoot));
      const type = types[path.slice(path.lastIndexOf("."))] || "application/octet-stream";
      return new Response(req.method === "HEAD" ? null : file, {
        headers: { ...security, "Content-Type": type, "Cache-Control": "no-cache" },
      });
    } catch {
      return json({ error: "Not found." }, 404);
    }
  };
}
