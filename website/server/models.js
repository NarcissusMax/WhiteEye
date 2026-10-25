// AICredits' public catalog IDs checked on 2026-10-02. Keep this allowlist
// server-side so a browser cannot select arbitrary models with the owner's key.
const AICREDITS_MODELS = Object.freeze([
  { id: "nousresearch/hermes-4-405b", label: "Hermes 4 405B" },
  { id: "x-ai/grok-4.20", label: "Grok 4.20" },
  { id: "x-ai/grok-4.6", label: "Grok 4.6" },
  { id: "openai/gpt-5.5", label: "GPT-5.5" },
  { id: "openai/gpt-5", label: "GPT-5" },
  { id: "deepseek/deepseek-v3.2", label: "DeepSeek V3.2" },
]);

export function availableModels(config) {
  const host = new URL(config.baseUrl).hostname.toLowerCase();
  const configured = { id: config.model, label: config.model };
  if (host !== "api.aicredits.in") return config.model ? [configured] : [];
  const models = AICREDITS_MODELS.map((model) => ({ ...model }));
  if (config.model && !models.some((model) => model.id === config.model)) {
    models.unshift({ id: config.model, label: `Configured: ${config.model}` });
  }
  return models;
}

export function isGptReasoning(model) {
  return /^(?:openai\/)?gpt-5(?:\.5)?$/.test(model);
}

export function completionParameters(model, maxTokens, temperature) {
  if (isGptReasoning(model)) {
    // GPT-5 and GPT-5.5 use a reasoning-inclusive Chat Completions budget. The default
    // sampling controls are retained; non-default temperature is unsupported.
    return { max_completion_tokens: maxTokens };
  }
  return { max_tokens: maxTokens, temperature };
}
