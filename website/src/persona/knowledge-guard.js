// A deterministic unknown answer is only safe for a single, direct fact
// question. Longer messages may quote that question, mention it in passing, or
// ask for something else at the end; those must reach the model in full.
function standaloneFactQuestion(messages) {
  const latest = messages.at(-1)?.content?.trim() || "";
  if (latest.length > 320) return "";
  const questions = latest.split("?").map((part) => part.trim()).filter(Boolean);
  if (
    questions.length > 2 ||
    (questions.length === 2 &&
      !/^(?:was it your usual|did you like it|was it good)$/i.test(questions[1]))
  ) return "";
  if (latest.includes("?") && !latest.endsWith("?")) return "";
  const question = latest.replace(/^(?:(?:hey|hi|yo|sup)[,!\.\s]+|(?:and|so)\s+)/i, "");
  if (
    !/^(?:what|which|where|when|how|did|were|was|have|are|is|do|tell me|name)\b/i.test(question)
  ) {
    return "";
  }
  if (
    /\b(?:and|also)\s+(?:what|which|where|when|how|why|did|were|was|have|are|is|do|should|can|could|would)\b/i
      .test(question)
  ) {
    return "";
  }
  return question;
}

// Recent real-world experiences are absent from the supplied archive. The
// provider has repeatedly invented dinners and routines despite prompt rules.
// A narrow source boundary is more faithful than a plausible false memory.
export function unknownRecentExperience(messages) {
  const latest = standaloneFactQuestion(messages);
  if (!latest) return null;
  if (
    !/\b(?:last night|yesterday|today|tonight|right now|this morning|this afternoon|earlier this week|currently)\b/i
      .test(latest)
  ) {
    return null;
  }
  if (
    /^\s*(?:how (?:are|have) you(?: doing)?|are you (?:okay|ok|good|alright))(?:\s+(?:today|tonight|right now))?[?.!\s]*$/i
      .test(latest)
  ) {
    return null;
  }
  if (
    !/\b(?:did|were|was|have|are|is) you\b|\b(?:what|how|where|when)(?:'s| is| was)? your\b/i.test(
      latest,
    )
  ) {
    return null;
  }
  if (
    /\b(?:did|were|was|have|are|is) you (?:think|feel|say|mean|recommend|suggest)\b/i.test(latest)
  ) {
    return null;
  }
  // A source-backed preference or a hypothetical question is not a claim
  // about what the real person actually did during a recent day.
  if (/\b(?:would you|could you|if you|your (?:favou?rite|fave))\b/i.test(latest)) {
    return null;
  }
  return "Idk";
}

// These domains have no stated favorite in the complete local source archive.
// A model kept replacing that absence with a fabricated "I don't have one"
// preference or a plausible favorite. Both are unsupported biographical claims.
export function unknownUndocumentedFavorite(messages) {
  const latest = standaloneFactQuestion(messages);
  if (!latest) return null;
  if (
    /^(?:(?:what(?:'s| is| was)|who(?:'s| is)|tell me|name)\s+(?:me\s+)?your|your|do you have (?:a|an))\s+(?:(?:all[- ]time|current|personal)\s+)?(?:favou?rite|fave|go-to|top)\s+(?:album|song|artist|band|music|genre|soundtrack|book|author)\b/i
      .test(latest)
  ) return "Idk";
  return null;
}
