const KEY = "whiteeye.conversations.v1";
export const newConversation = () => ({
  id: crypto.randomUUID(),
  createdAt: Date.now(),
  updatedAt: Date.now(),
  title: "A new conversation",
  messages: [],
  draft: "",
  remember: false,
  starred: false,
  persona: "whiteeye",
  participant: "guest",
  model: null,
  folderId: null,
});
export function loadConversations() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { chats: [], folders: [], order: [], active: null };
    const data = JSON.parse(raw);
    if (!Array.isArray(data.chats)) throw Error("Invalid history");
    if (data.folders !== undefined && !Array.isArray(data.folders)) throw Error("Invalid folders");
    const ids = new Set();
    data.folders = (data.folders || []).filter((folder) => {
      if (
        !folder || typeof folder.id !== "string" || !folder.id || ids.has(folder.id) ||
        typeof folder.name !== "string" || !folder.name.trim()
      ) return false;
      ids.add(folder.id);
      return true;
    }).map((folder) => ({ ...folder, name: folder.name.trim().slice(0, 60) }));
    data.chats = data.chats.filter((c) =>
      typeof c.id === "string" && typeof c.title === "string" && Array.isArray(c.messages) &&
      c.messages.every((m) =>
        ["user", "assistant"].includes(m.role) && typeof m.content === "string"
      )
    );
    data.chats = sortConversations(data.chats).slice(0, 100);
    const chatIds = new Set(data.chats.map((chat) => chat.id));
    data.order = Array.isArray(data.order)
      ? [...new Set(data.order.filter((id) => chatIds.has(id)))]
      : [];
    for (const c of data.chats) {
      c.folderId = ids.has(c.folderId) ? c.folderId : null;
      c.updatedAt = conversationActivity(c);
      c.customTitle = c.customTitle === true;
      c.draft = typeof c.draft === "string" ? c.draft : "";
      c.remember = c.remember === true;
      c.starred = c.starred === true;
      const formerPersona = c.persona;
      const retired = ["johan", "yuichi", "ayanokoji"].includes(formerPersona);
      // Keep the speaker of each old turn while routing new turns to IMP.
      if (retired) {
        for (const message of c.messages) {
          if (!message.persona) message.persona = formerPersona;
        }
      }
      c.persona = retired
        ? "imp"
        : ["whiteeye", "griffith", "imp", "tate", "jane", "vegeta", "vesper"].includes(
            formerPersona,
          )
        ? formerPersona
        : "whiteeye";
      c.participant = c.participant === "guest" ? "guest" : "griffith";
      c.model = typeof c.model === "string" && c.model.length <= 100 ? c.model : null;
      for (const m of c.messages) if (m.status === "streaming") m.status = "interrupted";
    }
    return data;
  } catch {
    return {
      chats: [],
      folders: [],
      order: [],
      active: null,
      warning:
        "Saved history could not be read. It has not been overwritten. Export or recover browser storage before saving new conversations.",
      blocked: true,
    };
  }
}
export function saveConversations(data) {
  localStorage.setItem(
    KEY,
    JSON.stringify({
      chats: data.chats,
      folders: data.folders || [],
      order: data.order || [],
      active: data.active,
    }),
  );
}

export function planHistoryClear(chats) {
  const kept = chats.filter((chat) => chat.starred === true);
  return { kept, removed: chats.length - kept.length };
}

// Older histories have message timestamps but no updatedAt. Never reset them to now.
export function conversationActivity(chat) {
  const timestamps = [chat.createdAt, chat.updatedAt, ...chat.messages.map((m) => m.at)];
  return timestamps.reduce(
    (latest, value) => Number.isFinite(value) && value >= 0 ? Math.max(latest, value) : latest,
    0,
  );
}
export function sortConversations(chats) {
  const activity = new Map(chats.map((chat) => [chat, conversationActivity(chat)]));
  return [...chats].sort((a, b) => activity.get(b) - activity.get(a));
}

export function folderNameError(name, folders, exceptId = null) {
  if (!name.trim()) return "Give this folder a name.";
  if (name.trim().length > 60) return "Use 60 characters or fewer.";
  const key = (value) => value.trim().normalize("NFKC").toLocaleLowerCase();
  if (["all conversations", "unfiled"].includes(key(name))) {
    return "This name is used by a library view. Choose another folder name.";
  }
  return folders.some((folder) => folder.id !== exceptId && key(folder.name) === key(name))
    ? "A folder already has this name. Choose another."
    : "";
}

// Removing a folder only unfiles its conversations. Messages and protections stay intact.
export function removeFolder(data, folderId) {
  data.folders = data.folders.filter((folder) => folder.id !== folderId);
  for (const chat of data.chats) if (chat.folderId === folderId) chat.folderId = null;
}

export function orderedConversations(chats, order = []) {
  const positions = new Map(order.map((id, index) => [id, index]));
  return sortConversations(chats).sort((a, b) =>
    (positions.get(a.id) ?? -1) - (positions.get(b.id) ?? -1)
  );
}

// Positions are independent of activity: reading or replying never undoes a move.
export function moveConversation(data, id, beforeId = null) {
  if (!data.chats.some((chat) => chat.id === id)) return false;
  if (beforeId === id) return false;
  const order = orderedConversations(data.chats, data.order).map((chat) => chat.id)
    .filter((chatId) => chatId !== id);
  const position = beforeId === null ? order.length : order.indexOf(beforeId);
  if (position < 0) return false;
  order.splice(position, 0, id);
  data.order = order;
  return true;
}

export function filterConversations(chats, folderId = "all", query = "", order = []) {
  const needle = query.trim().toLocaleLowerCase();
  return orderedConversations(chats, order).filter((chat) =>
    (folderId === "all" ||
      (folderId === "unfiled" ? !chat.folderId : chat.folderId === folderId)) &&
    (!needle || chat.title.toLocaleLowerCase().includes(needle))
  );
}
