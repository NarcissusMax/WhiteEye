import { respondLocally } from "./local-engine.js";
import { WHITE_EYE_SYSTEM_PROMPT } from "../persona/system-prompt.js";

const minimumDelay = 480;
const maximumDelay = 1080;

function delay(duration, signal) {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(resolve, duration);
    signal?.addEventListener(
      "abort",
      () => {
        window.clearTimeout(timer);
        reject(new DOMException("Reply cancelled", "AbortError"));
      },
      { once: true },
    );
  });
}

function sanitizeRemoteReply(payload) {
  const reply = typeof payload?.reply === "string" ? payload.reply.trim() : "";
  if (!reply) throw new Error("The conversation service returned no reply.");
  return reply;
}

/**
 * Adapter for a private, server-side model route.
 *
 * In `index.html`, set `window.WHITEEYE_CONFIG = { chatEndpoint: "/api/chat" }`
 * after installing a secure endpoint. Until then the product uses the local,
 * source-informed dialogue fallback and never sends a message over the network.
 */
export function createChatProvider({ endpoint = window.WHITEEYE_CONFIG?.chatEndpoint } = {}) {
  async function reply({ messages, signal }) {
    const lastMessage = messages.at(-1)?.content || "";

    if (!endpoint) {
      const duration = Math.min(
        maximumDelay,
        Math.max(minimumDelay, minimumDelay + lastMessage.length * 7),
      );
      await delay(duration, signal);
      return { text: respondLocally({ message: lastMessage, history: messages }), source: "local" };
    }

    const response = await fetch(endpoint, {
      method: "POST",
      signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ systemPrompt: WHITE_EYE_SYSTEM_PROMPT, messages }),
    });

    if (!response.ok) {
      throw new Error(`The conversation service could not respond (${response.status}).`);
    }

    return { text: sanitizeRemoteReply(await response.json()), source: "remote" };
  }

  return { reply, hasRemoteEndpoint: Boolean(endpoint) };
}
