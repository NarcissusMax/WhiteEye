export async function streamReply(
  messages,
  { signal, onEvent, token = "", memory = [], persona = "whiteeye", participant = "guest", model },
) {
  const response = await fetch("/api/chat", {
    method: "POST",
    signal,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ messages, memory, persona, participant, model }),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw Error(payload.error || "The conversation service could not respond. Please retry.");
  }
  let buffer = "", complete = false;
  for await (const chunk of response.body.pipeThrough(new TextDecoderStream())) {
    buffer += chunk;
    const lines = buffer.split("\n");
    buffer = lines.pop();
    for (const line of lines) {
      if (!line.trim()) continue;
      const event = JSON.parse(line);
      if (event.type === "error") throw Error(event.message);
      if (event.type === "done") complete = true;
      onEvent(event);
    }
  }
  if (!complete) throw Error("The reply was interrupted. Please retry.");
}
