import {
  conversationActivity,
  loadConversations,
  newConversation,
  planHistoryClear,
  saveConversations,
  sortConversations,
} from "../public/js/storage.js";
import { selectPriorMemory } from "../public/js/memory.js";

const assert = (condition, message = "Assertion failed") => {
  if (!condition) throw Error(message);
};

Deno.test("bulk clear keeps starred chats and migrates older history safely", () => {
  const originalStorage = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  const values = new Map();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
    },
  });
  try {
    values.set(
      "whiteeye.conversations.v1",
      JSON.stringify({
        active: "ordinary",
        chats: [
          {
            id: "ordinary",
            title: "An older chat",
            messages: [{ role: "user", content: "Keep this in history until cleared." }],
          },
          {
            id: "favorite",
            title: "A starred chat",
            starred: true,
            remember: true,
            messages: [{ role: "user", content: "This conversation matters." }],
          },
        ],
      }),
    );
    const history = loadConversations();
    assert(newConversation().starred === false);
    assert(newConversation().remember === false, "New chats should begin with recall off");
    assert(history.chats[0].starred === false, "Older chats start unstarred");
    assert(history.chats[0].remember === false, "Older chats without a choice default to off");
    assert(history.chats[1].starred === true);
    assert(history.chats[1].remember === true, "Explicit recall choices stay on");

    const { kept, removed } = planHistoryClear(history.chats);
    assert(removed === 1);
    assert(kept.length === 1 && kept[0].id === "favorite");
    assert(kept[0].messages[0].content === "This conversation matters.");
    saveConversations({ chats: kept, active: "favorite" });

    const reloaded = loadConversations();
    assert(reloaded.chats.length === 1 && reloaded.chats[0].starred === true);
    assert(reloaded.chats[0].remember === true);
    assert(reloaded.active === "favorite");
    assert(planHistoryClear(reloaded.chats).removed === 0);
  } finally {
    Object.defineProperty(globalThis, "localStorage", originalStorage);
  }
});

Deno.test("recent use and edits sort history ahead of old messages without losing chats", () => {
  const old = { id: "old", createdAt: 10, messages: [{ at: 30 }] };
  const recent = { id: "recent", createdAt: 20, messages: [{ at: 50 }, { at: 40 }] };
  const reopened = { id: "reopened", createdAt: 1, updatedAt: 60, messages: [{ at: 2 }] };
  const malformed = { id: "unknown", createdAt: "bad", updatedAt: NaN, messages: [{ at: -1 }] };
  const chats = [old, malformed, recent, reopened];
  assert(
    sortConversations(chats).map((chat) => chat.id).join(",") === "reopened,recent,old,unknown",
  );
  assert(chats[0] === old, "Sorting should not mutate the stored collection");
  assert(conversationActivity(recent) === 50, "Migration uses the latest valid message timestamp");
  assert(conversationActivity(malformed) === 0, "Invalid dates must not make a chat appear recent");
  old.updatedAt = 70;
  assert(sortConversations(chats)[0] === old, "Draft and settings edits take precedence");
});

Deno.test("all retired persona histories become IMP chats without leaking their private recall", () => {
  const originalStorage = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  const retired = ["johan", "yuichi", "ayanokoji"];
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: () =>
        JSON.stringify({
          chats: retired.map((persona, index) => ({
            id: persona,
            title: `Earlier ${persona} chat`,
            persona,
            createdAt: index + 1,
            remember: true,
            messages: [
              { role: "user", content: "Remember my violin project?", at: index + 1 },
              { role: "assistant", content: "A prior answer.", status: "complete" },
            ],
          })),
        }),
    },
  });
  try {
    const chats = loadConversations().chats;
    assert(chats.length === 3);
    for (const chat of chats) {
      assert(chat.persona === "imp");
      assert(chat.messages.every((message) => message.persona === chat.id));
    }
    assert(selectPriorMemory(chats, "fresh", "Remember my violin project?", 3, "imp").length === 0);
  } finally {
    Object.defineProperty(globalThis, "localStorage", originalStorage);
  }
});
