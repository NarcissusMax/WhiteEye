import {
  filterConversations,
  folderNameError,
  loadConversations,
  moveConversation,
  orderedConversations,
  removeFolder,
  saveConversations,
} from "../public/js/storage.js";
const assert = (condition, message = "Assertion failed") => {
  if (!condition) throw Error(message);
};

Deno.test("folder names are required, bounded and unique while renaming permits the same name", () => {
  const folders = [{ id: "work", name: "Reflections" }];
  assert(folderNameError(" ", folders));
  assert(folderNameError("Unfiled", folders));
  assert(folderNameError("All conversations", folders));
  assert(folderNameError("x".repeat(61), folders));
  assert(folderNameError(" reflections ", folders));
  assert(!folderNameError(" Reflections ", folders, "work"));
  assert(!folderNameError("Reading", folders));
});

Deno.test("removing a folder preserves conversations, messages, stars and recall", () => {
  const chat = {
    id: "chat",
    folderId: "work",
    title: "A thought",
    starred: true,
    remember: true,
    messages: [{ role: "user", content: "Keep this." }],
  };
  const unrelated = { id: "other", folderId: "other" };
  const data = {
    folders: [{ id: "work", name: "Work" }, { id: "other", name: "Other" }],
    chats: [chat, unrelated],
  };
  removeFolder(data, "work");
  assert(data.folders.length === 1 && data.folders[0].id === "other");
  assert(data.chats[0] === chat && chat.folderId === null);
  assert(chat.starred && chat.remember && chat.messages[0].content === "Keep this.");
  assert(unrelated.folderId === "other");
});

Deno.test("folder and title filtering preserves recent activity ordering", () => {
  const chats = [{ id: "a", title: "A reflection", folderId: "work", createdAt: 2, messages: [] }, {
    id: "b",
    title: "A reflection later",
    folderId: "work",
    updatedAt: 4,
    messages: [],
  }, { id: "c", title: "A book", folderId: null, createdAt: 3, messages: [] }];
  assert(filterConversations(chats, "work", "reflection").map((c) => c.id).join(",") === "b,a");
  assert(filterConversations(chats, "unfiled")[0].id === "c");
  assert(filterConversations(chats, "all", "BOOK")[0].id === "c");
  assert(filterConversations(chats, "work", "unknown").length === 0);
});

Deno.test("folders round-trip in device history and legacy or orphaned chats stay accessible", () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  let value;
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: () => value,
      setItem: (_key, raw) => {
        value = raw;
      },
    },
  });
  try {
    const chat = {
      id: "a",
      title: "Legacy",
      messages: [{ role: "user", content: "Hello" }],
      starred: true,
      remember: true,
    };
    value = JSON.stringify({ chats: [chat], active: "a" });
    let loaded = loadConversations();
    assert(loaded.folders.length === 0 && loaded.chats[0].folderId === null);
    loaded.order = ["a"];
    loaded.folders = [{ id: "reflections", name: "Reflections" }];
    loaded.chats[0].folderId = "reflections";
    saveConversations(loaded);
    loaded = loadConversations();
    assert(loaded.folders[0].name === "Reflections" && loaded.chats[0].folderId === "reflections");
    assert(loaded.chats[0].starred && loaded.chats[0].remember);
    assert(loaded.order.join(",") === "a");
    loaded.chats[0].folderId = "missing";
    saveConversations(loaded);
    assert(loadConversations().chats[0].folderId === null);
    value = JSON.stringify({ chats: [chat], folders: { invalid: true } });
    assert(
      loadConversations().blocked,
      "Corrupt folder metadata must not overwrite device history",
    );
  } finally {
    Object.defineProperty(globalThis, "localStorage", descriptor);
  }
});

Deno.test("manual ordering survives activity changes and filtering without changing chat data", () => {
  const chats = ["a", "b", "c"].map((id, index) => ({
    id,
    title: id,
    messages: [],
    updatedAt: index,
    folderId: index === 1 ? null : "work",
    remember: true,
  }));
  const data = { chats, order: [] };
  const snapshot = JSON.stringify(chats);
  assert(moveConversation(data, "a", "c"));
  assert(data.order.join(",") === "a,c,b");
  assert(JSON.stringify(chats) === snapshot);
  chats[1].updatedAt = Date.now();
  assert(orderedConversations(chats, data.order).map((chat) => chat.id).join(",") === "a,c,b");
  assert(
    filterConversations(chats, "work", "", data.order).map((chat) => chat.id).join(",") === "a,c",
  );
  assert(moveConversation(data, "a", null));
  assert(data.order.join(",") === "c,b,a");
  assert(!moveConversation(data, "unknown", "a"));
  assert(!moveConversation(data, "a", "unknown"));
  assert(!moveConversation(data, "a", "a"));
  assert(data.order.join(",") === "c,b,a");
});
