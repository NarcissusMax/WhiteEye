const SETTING_KEY = "whiteeye.crosschat-memory.v1";
const stop = new Set(
  "about after again already always because could didnt doesnt dont every from have into just know like more much never only really should something still that their them there these they this those what when where which while with would your youre"
    .split(" "),
);
const terms = (value) =>
  new Set(
    (value.toLowerCase().match(/[a-z]{3,}/g) || []).filter((word) => !stop.has(word)),
  );

export function memoryEnabled() {
  try {
    return localStorage.getItem(SETTING_KEY) !== "off";
  } catch {
    return false;
  }
}

export function setMemoryEnabled(enabled) {
  localStorage.setItem(SETTING_KEY, enabled ? "on" : "off");
}

// No model-written summary is persisted. Every fragment is drawn from an
// existing, undeleted browser conversation and can disappear by deleting it.
export function selectPriorMemory(
  chats,
  activeId,
  latest,
  limit = 3,
  persona = "whiteeye",
  participant = "guest",
) {
  if (!Array.isArray(chats) || !latest?.trim()) return [];
  const recall = /\b(?:remember|last chat|last time|before|we talked|i told you)\b/i.test(latest);
  const query = terms(latest);
  const ranked = [];
  const recent = [...chats].filter(Boolean).sort((a, b) =>
    (Number(b.updatedAt) || Number(b.createdAt) || 0) -
    (Number(a.updatedAt) || Number(a.createdAt) || 0)
  );
  for (let chatIndex = 0; chatIndex < recent.length; chatIndex++) {
    const chat = recent[chatIndex];
    if (!chat || chat.id === activeId || chat.remember !== true || !Array.isArray(chat.messages)) {
      continue;
    }
    for (let i = 0; i < chat.messages.length; i++) {
      const user = chat.messages[i];
      if (
        !user || user.role !== "user" || typeof user.content !== "string" || !user.content.trim() ||
        (user.persona || "whiteeye") !== persona ||
        (persona === "whiteeye" && (chat.participant || "griffith") !== participant)
      ) continue;
      const next = chat.messages[i + 1];
      const assistant = next?.role === "assistant" &&
          (next.persona || "whiteeye") === persona && next.status === "complete" &&
          typeof next.content === "string"
        ? next.content
        : "";
      const userTerms = terms(user.content);
      const overlap = [...query].filter((word) => userTerms.has(word)).length;
      const specificity = [...query].filter((word) => word.length >= 6 && userTerms.has(word))
        .length;
      const score = overlap * 2 + specificity + (recall ? 1.5 : 0) +
        Math.max(0, 1 - chatIndex * 0.15);
      if ((!recall && (overlap < 2 && specificity < 1)) || (recall && !overlap && chatIndex > 1)) {
        continue;
      }
      ranked.push({
        score,
        at: [user.at, chat.createdAt].find((at) =>
          Number.isSafeInteger(at) && at >= 0 && at <= Date.now() + 86400000
        ) ?? 0,
        user: user.content.slice(0, 1200),
        assistant: assistant.slice(0, 1200),
      });
    }
  }
  const selected = ranked.sort((a, b) => b.score - a.score || b.at - a.at)
    .slice(0, Math.min(4, Math.max(0, limit)));
  // The request accepts 5,200 characters total, not 1,200 per field per exchange.
  // Share that budget so three long recalled exchanges never block a new reply.
  const fieldBudget = Math.min(1200, Math.floor(5200 / Math.max(1, selected.length * 2)));
  return selected.sort((a, b) => a.at - b.at).map(({ at, user, assistant }) => ({
    at,
    user: user.slice(0, fieldBudget),
    assistant: assistant.slice(0, fieldBudget),
  }));
}
