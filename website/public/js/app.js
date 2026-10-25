import {
  conversationActivity,
  filterConversations,
  folderNameError,
  loadConversations,
  moveConversation,
  newConversation,
  orderedConversations,
  planHistoryClear,
  removeFolder,
  saveConversations,
} from "./storage.js";
import { setupMessageNavigation } from "./message-navigation.js";
import { streamReply } from "./provider.js";
import { setupEntrance } from "./entrance.js";
import { setupAtmosphere } from "./atmosphere.js";
import { memoryEnabled, selectPriorMemory, setMemoryEnabled } from "./memory.js";
const $ = (s) => document.querySelector(s);
const PERSONA_NAMES = {
  whiteeye: "WhiteEye",
  griffith: "Griffith",
  johan: "Johan Liebert",
  yuichi: "Yuichi Katagiri",
  tate: "Andrew Tate",
  ayanokoji: "Ayanokoji Kiyotaka",
  imp: "IMP",
  jane: "Patrick Jane",
  vegeta: "Vegeta",
  vesper: "Vesper",
};
const personaName = (id) => PERSONA_NAMES[id] || "WhiteEye";
const introductions = {
  vesper: ["A meeting of five perspectives.", "One original voice. Say what’s on your mind."],
  imp: [
    "Read the room. Choose the move.",
    "One strategic mind shaped by three characters and seven books. What are you trying to change?",
  ],
  jane: ["Notice the little things.", "An AI interpretation informed by The Mentalist."],
  vegeta: [
    "What is your pride worth when it costs you?",
    "Explore Vegeta's choices and convictions. Choose an era, or speak to his latest self.",
  ],
  whiteeye: ["A different perspective.", "Say what’s on your mind.<br>We can start there."],
  griffith: ["An old familiar voice.", "Say something. He’ll have a thought about it."],
  tate: ["From the supplied transcripts.", "Ask a question. Answers draw on the collection."],
};
const starters = {
  imp: [
    [
      "Read the hidden incentives.",
      "I need to persuade someone who keeps saying no. What do they likely care about, and what am I overlooking?",
    ],
    [
      "Plan the next move.",
      "Help me prepare a difficult negotiation. What should I ask for, what objection should I expect, and what is my fallback?",
    ],
    [
      "Understand the pressure.",
      "Someone is making me decide quickly and invoking guilt. What kind of influence is happening here, and how should I respond?",
    ],
  ],
  vesper: [
    [
      "Find the assumption.",
      "I keep interpreting slow replies as rejection. How would you examine that?",
    ],
    [
      "A move and a counter-move.",
      "I need to negotiate more time on a project. My manager values reliability. What would you try, and what if they say no?",
    ],
    [
      "Turn understanding into action.",
      "I understand what I need to do, but I keep putting it off. What am I missing?",
    ],
  ],
  jane: [
    [
      "An observation or an assumption?",
      "Someone canceled our meeting, then suggested a different day. I assumed they don’t want to see me. What can I actually infer?",
    ],
    [
      "A story that changed.",
      "In a fictional case, a witness first said they were alone, then mentioned a friend arriving. How would you test what happened?",
    ],
    [
      "What comes after a long pursuit?",
      "How do you build a life after the goal that kept you going is finally over?",
    ],
  ],
  vegeta: [
    [
      "When pride becomes a weakness.",
      "You let Cell grow stronger to test yourself. What did that mistake teach you about pride?",
    ],
    [
      "A setback worth training for.",
      "I failed at something I trained for. How would you decide what to change next?",
    ],
    [
      "A harder choice than winning.",
      "If proving yourself would put someone you care about at risk, how would you decide what matters more?",
    ],
  ],
  tate: [
    ["Discipline and motivation.", "What have you said about discipline and motivation?"],
    ["Money and business.", "What have you said about making money and building a business?"],
    ["Fear and adversity.", "How do you deal with fear and adversity?"],
  ],
  whiteeye: [
    ["I feel like I’m falling behind.", "I feel like I’m falling behind in life."],
    ["What does it mean to be free?", "What does being free mean to you?"],
    [
      "Let’s talk about something lighter.",
      "What have you enjoyed playing? Tell me about your favorite games.",
    ],
  ],
  griffith: [
    ["What have you been playing?", "What games have you been into?"],
    ["Let’s argue about something.", "What's an opinion you would actually defend?"],
    ["What’s on your mind?", "What’s been on your mind lately?"],
  ],
};
const state = loadConversations();
let active = state.chats.find((c) => c.id === state.active) || newConversation();
let controller = null, status = {}, accessToken = "", scrollFollow = true, draftTimer;
const drawerBackground = new Map();
let libraryFolder = "all", libraryQuery = "", dialogInvoker;
try {
  const saved = localStorage.getItem("whiteeye:folder-view");
  if (saved === "unfiled" || state.folders.some((folder) => folder.id === saved)) {
    libraryFolder = saved;
  }
} catch { /* Folder filtering remains available without storage. */ }

const messageNavigation = setupMessageNavigation({
  region: $("#scroll-region"),
  messagesRoot: $("#messages"),
  getMessages: () => active.messages,
  onNavigate: () => {
    scrollFollow = false;
  },
});
let sidebarCollapsed = false;
try {
  sidebarCollapsed = localStorage.getItem("whiteeye:sidebar") === "collapsed";
} catch { /* The sidebar still works when device storage is unavailable. */ }
function touchChat(chat = active) {
  chat.updatedAt = Math.max(Date.now(), ...state.chats.map(conversationActivity)) + 1;
}
function syncSidebar() {
  const mobile = matchMedia("(max-width:760px)").matches;
  const changed = document.body.classList.contains("sidebar-collapsed") !== sidebarCollapsed;
  if (changed) globalThis.dispatchEvent(new Event("whiteeye:sidebarbefore"));
  document.body.classList.toggle("sidebar-collapsed", sidebarCollapsed);
  if (changed) globalThis.dispatchEvent(new Event("whiteeye:sidebarafter"));
  $("#sidebar-toggle").setAttribute("aria-expanded", String(!sidebarCollapsed));
  const label = sidebarCollapsed ? "Expand conversation sidebar" : "Collapse conversation sidebar";
  $("#sidebar-toggle").setAttribute("aria-label", label);
  $("#sidebar-toggle").title = label;
  $("#sidebar").inert = mobile ? !$("#sidebar").classList.contains("open") : sidebarCollapsed;
}
$("#sidebar-toggle").onclick = () => {
  sidebarCollapsed = !sidebarCollapsed;
  syncSidebar();
  try {
    localStorage.setItem("whiteeye:sidebar", sidebarCollapsed ? "collapsed" : "expanded");
  } catch { /* Keep the preference for this session. */ }
};
const time = (value) =>
  new Date(value || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
const announce = (text) => {
  $("#announcement").textContent = text;
};
function notice(text) {
  $("#chat-notice").textContent = text;
  $("#chat-notice").hidden = !text;
}
function persist() {
  if (state.blocked) return false;
  try {
    state.active = active.id;
    saveConversations(state);
    return true;
  } catch {
    notice("Device storage is full or unavailable. Export this conversation to keep a copy.");
    return false;
  }
}
function ensureSaved() {
  touchChat();
  if (!state.chats.some((c) => c.id === active.id)) state.chats.unshift(active);
}
function saveDraft() {
  const draft = $("#message-input").value;
  if (draft !== active.draft) {
    active.draft = draft;
    if (draft || state.chats.some((chat) => chat.id === active.id)) ensureSaved();
  }
  persist();
}
function syncMemoryControls() {
  const enabled = !state.blocked && memoryEnabled();
  const sidebar = $("#sidebar-memory");
  sidebar.checked = enabled;
  sidebar.disabled = Boolean(state.blocked);
  const dialog = $("#crosschat-memory");
  if (dialog) {
    dialog.checked = enabled;
    dialog.disabled = Boolean(state.blocked);
  }
}
function changeMemoryEnabled(enabled) {
  try {
    setMemoryEnabled(enabled);
    announce(enabled ? "Prior-chat memory enabled." : "Prior-chat memory disabled.");
  } catch {
    notice("This device could not save the memory setting.");
  }
  syncMemoryControls();
}
function syncDeleteButton() {
  const button = $("#delete");
  const saved = state.chats.some((chat) => chat.id === active.id);
  button.disabled = !saved || active.starred === true || Boolean(state.blocked);
  button.title = active.starred
    ? "Unstar this conversation before deleting it"
    : "Delete conversation";
  button.setAttribute(
    "aria-label",
    active.starred ? "Starred conversation. Unstar it before deleting" : "Delete this conversation",
  );
}
function renderHistory() {
  const root = $("#history");
  renderFolders();
  const folder = state.folders.find((item) => item.id === libraryFolder);
  $("#history-heading").textContent = folder?.name ||
    (libraryFolder === "unfiled" ? "Unfiled chats" : "Your conversations");
  $("#folder-options").hidden = !folder;
  $("#folder-options").disabled = Boolean(state.blocked);
  const chats = filterConversations(state.chats, libraryFolder, libraryQuery, state.order);
  $("#history-results").textContent = `${chats.length}`;
  root.replaceChildren();
  const { removed } = planHistoryClear(state.chats);
  const clearButton = $("#clear-history");
  clearButton.disabled = !removed || Boolean(state.blocked);
  $("#clear-history-count").textContent = state.blocked
    ? "History unavailable"
    : removed
    ? `${removed} unstarred ${removed === 1 ? "chat" : "chats"}`
    : state.chats.length
    ? "Starred chats stay"
    : "No chats to clear";
  clearButton.setAttribute(
    "aria-label",
    `Clear ${removed} unstarred ${removed === 1 ? "conversation" : "conversations"}`,
  );
  syncDeleteButton();
  if (!chats.length) {
    const empty = document.createElement("li");
    empty.className = "history-empty";
    const heading = document.createElement("strong");
    heading.textContent = libraryQuery
      ? "No matching conversations"
      : folder
      ? "A place for new thoughts"
      : "Your story starts here";
    const copy = document.createElement("p");
    copy.textContent = libraryQuery
      ? "Try another title or clear your search."
      : folder
      ? "Start a conversation here, or move a saved chat into this folder."
      : "A thought, a question, a place to begin.";
    const action = document.createElement("button");
    action.type = "button";
    action.className = "quiet-button";
    action.textContent = libraryQuery ? "Clear search" : "Start a conversation ↗";
    action.onclick = libraryQuery ? clearSearch : startNew;
    empty.append(heading, copy, action);
    root.append(empty);
    return;
  }
  for (const chat of chats) {
    const entry = document.createElement("li");
    entry.className = "history-entry" + (chat.id === active.id ? " active" : "");
    entry.dataset.chatId = chat.id;
    entry.addEventListener("dragover", (event) => {
      if (
        (!draggedChat && !event.dataTransfer.types.includes("application/x-whiteeye-chat")) ||
        draggedChat === chat.id
      ) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      entry.classList.add("drop-target");
    });
    entry.addEventListener("dragleave", () => entry.classList.remove("drop-target"));
    entry.addEventListener("drop", (event) => {
      event.preventDefault();
      const movedId = event.dataTransfer.getData("application/x-whiteeye-chat") || draggedChat;
      if (!movedId || movedId === chat.id) return;
      const after = event.clientY > entry.getBoundingClientRect().top + entry.clientHeight / 2;
      const visible = filterConversations(state.chats, libraryFolder, libraryQuery, state.order);
      const next = visible[visible.findIndex((item) => item.id === chat.id) + 1]?.id || null;
      reorderChat(movedId, after ? next : chat.id);
      draggedChat = null;
    });
    const handle = document.createElement("button");
    handle.type = "button";
    handle.className = "history-drag";
    handle.dataset.moveFor = chat.id;
    handle.textContent = "⠿";
    handle.draggable = !state.blocked;
    handle.disabled = Boolean(state.blocked);
    handle.setAttribute("aria-label", `Move ${chat.title}; use Alt and arrow keys to reorder`);
    handle.title = "Drag to reorder or move into a folder. Alt + ↑ / ↓ to reorder.";
    handle.onclick = () => organizeChat(chat);
    handle.addEventListener("dragstart", (event) => {
      draggedChat = chat.id;
      event.dataTransfer.setData("text/plain", chat.id);
      event.dataTransfer.setData("application/x-whiteeye-chat", chat.id);
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setDragImage(entry, 20, 20);
    });
    handle.addEventListener("dragend", () => {
      draggedChat = null;
      document.querySelectorAll(".drop-target").forEach((node) =>
        node.classList.remove("drop-target")
      );
    });
    handle.onkeydown = (event) => {
      if (!event.altKey || !["ArrowUp", "ArrowDown"].includes(event.key)) return;
      event.preventDefault();
      const visible = filterConversations(state.chats, libraryFolder, libraryQuery, state.order);
      const index = visible.findIndex((item) => item.id === chat.id);
      if (event.key === "ArrowUp" && index > 0) reorderChat(chat.id, visible[index - 1].id);
      if (event.key === "ArrowDown" && index < visible.length - 1) {
        reorderChat(chat.id, visible[index + 2]?.id || null);
      }
    };
    const b = document.createElement("button");
    b.className = "history-item" + (chat.id === active.id ? " active" : "");
    b.setAttribute("aria-current", chat.id === active.id ? "true" : "false");
    const title = document.createElement("span");
    title.className = "history-title";
    title.textContent = chat.title;
    const date = document.createElement("span");
    date.className = "history-date";
    const voices = new Set(
      chat.messages.filter((message) => message.role === "assistant")
        .map((message) => message.persona || "whiteeye"),
    );
    const voiceLabel = voices.size > 1 ? "Mixed voices" : personaName(chat.persona);
    const filedIn = state.folders.find((folder) => folder.id === chat.folderId)?.name;
    date.textContent = `${libraryFolder === "all" && filedIn ? filedIn : voiceLabel} · ` +
      new Date(conversationActivity(chat)).toLocaleDateString([], {
        month: "short",
        day: "numeric",
      });
    date.title = date.textContent;
    b.title = chat.title;
    b.append(title, date);
    b.onclick = () => switchChat(chat);
    const actions = document.createElement("div");
    actions.className = "history-actions";
    const star = document.createElement("button");
    star.type = "button";
    star.className = "history-star";
    star.dataset.starFor = chat.id;
    star.setAttribute("aria-pressed", String(chat.starred));
    star.setAttribute(
      "aria-label",
      chat.starred
        ? `Unstar ${chat.title} to allow deletion`
        : `Star ${chat.title} to protect it from deletion`,
    );
    star.title = chat.starred ? "Unstar to allow deletion" : "Star to protect from deletion";
    star.disabled = Boolean(state.blocked);
    star.textContent = chat.starred ? "★" : "☆";
    star.onclick = () => {
      const previous = chat.starred;
      chat.starred = !previous;
      touchChat(chat);
      if (!persist()) {
        chat.starred = previous;
        return;
      }
      renderHistory();
      [...root.querySelectorAll("[data-star-for]")].find((node) => node.dataset.starFor === chat.id)
        ?.focus();
      announce(
        chat.starred
          ? "Conversation starred and protected from deletion."
          : "Conversation unstarred and can be deleted.",
      );
    };
    const options = document.createElement("button");
    options.type = "button";
    options.className = "history-options";
    options.dataset.optionsFor = chat.id;
    options.setAttribute("aria-label", `Organize ${chat.title}`);
    options.title = "Rename, move or manage this conversation";
    options.textContent = "⋯";
    options.disabled = Boolean(state.blocked);
    options.onclick = () => organizeChat(chat);
    actions.append(star, options);
    entry.append(handle, b, actions);
    root.append(entry);
  }
}
let draggedChat = null;
function reorderChat(id, beforeId) {
  const previous = state.order;
  if (!moveConversation(state, id, beforeId)) return;
  if (!persist()) {
    state.order = previous;
    return;
  }
  renderHistory();
  [...$("#history").querySelectorAll("[data-move-for]")]
    .find((node) => node.dataset.moveFor === id)?.focus({ preventScroll: true });
  announce("Conversation moved. Your chosen order is saved.");
}
function newLibraryConversation() {
  const chat = newConversation();
  chat.folderId = state.folders.some((folder) => folder.id === libraryFolder)
    ? libraryFolder
    : null;
  return chat;
}
function setLibraryFolder(id) {
  libraryFolder = id;
  if (
    !state.chats.some((chat) => chat.id === active.id) && !active.messages.length &&
    !$("#message-input").value
  ) {
    active.folderId = state.folders.some((folder) => folder.id === id) ? id : null;
  }
  libraryQuery = "";
  $("#history-search").value = "";
  $("#clear-search").hidden = true;
  try {
    localStorage.setItem("whiteeye:folder-view", id);
  } catch { /* Session filter still works. */ }
  renderHistory();
}
function clearSearch() {
  libraryQuery = "";
  $("#history-search").value = "";
  $("#clear-search").hidden = true;
  renderHistory();
  $("#history-search").focus();
}
function renderFolders() {
  if (
    !["all", "unfiled"].includes(libraryFolder) &&
    !state.folders.some((folder) => folder.id === libraryFolder)
  ) libraryFolder = "all";
  const root = $("#folder-list");
  const focused = root.contains(document.activeElement)
    ? document.activeElement.dataset.folder
    : null;
  const counts = new Map();
  for (const chat of state.chats) counts.set(chat.folderId, (counts.get(chat.folderId) || 0) + 1);
  const folders = [
    { id: "all", name: "All conversations", count: state.chats.length },
    { id: "unfiled", name: "Unfiled", count: counts.get(null) || 0 },
    ...[...state.folders].sort((a, b) => a.name.localeCompare(b.name)).map((folder) => ({
      ...folder,
      count: counts.get(folder.id) || 0,
    })),
  ];
  root.replaceChildren(...folders.map((folder) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "folder-item";
    button.dataset.folder = folder.id;
    button.setAttribute("aria-pressed", String(libraryFolder === folder.id));
    button.setAttribute(
      "aria-label",
      `${folder.name} ${folder.count.toLocaleString()} ${
        folder.count === 1 ? "conversation" : "conversations"
      }`,
    );
    button.title = folder.name;
    const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    icon.setAttribute("viewBox", "0 0 24 24");
    icon.setAttribute("aria-hidden", "true");
    icon.setAttribute("width", "18");
    icon.setAttribute("height", "18");
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute(
      "d",
      folder.id === "all"
        ? "M4 5h16v14H4z M4 9h16 M9 5v14"
        : folder.id === "unfiled"
        ? "M4 5h16v14H4z M4 13h5l1 2h4l1-2h5"
        : "M3 7V5h7l2 3h9v11H3z",
    );
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", "currentColor");
    path.setAttribute("stroke-width", "1.4");
    icon.append(path);
    const name = document.createElement("span");
    name.className = "folder-name";
    name.textContent = folder.name;
    const count = document.createElement("span");
    count.className = "folder-count";
    count.textContent = folder.count.toLocaleString();
    count.setAttribute("aria-hidden", "true");
    button.append(icon, name, count);
    button.onclick = () => setLibraryFolder(folder.id);
    if (folder.id !== "all") {
      button.addEventListener("dragover", (event) => {
        if (!draggedChat && !event.dataTransfer.types.includes("application/x-whiteeye-chat")) {
          return;
        }
        event.preventDefault();
        button.classList.add("drop-target");
      });
      button.addEventListener("dragleave", () => button.classList.remove("drop-target"));
      button.addEventListener("drop", (event) => {
        event.preventDefault();
        const movedId = event.dataTransfer.getData("application/x-whiteeye-chat") || draggedChat;
        const chat = state.chats.find((item) => item.id === movedId);
        draggedChat = null;
        if (!chat) return;
        const previous = chat.folderId;
        chat.folderId = folder.id === "unfiled" ? null : folder.id;
        if (!persist()) {
          chat.folderId = previous;
          return;
        }
        renderHistory();
        announce(`Conversation moved to ${folder.name}.`);
      });
    }
    return button;
  }));
  if (focused) {
    [...root.children].find((node) => node.dataset.folder === focused)?.focus({
      preventScroll: true,
    });
  }
  $("#new-folder").disabled = Boolean(state.blocked);
}
function libraryError(message, field = null) {
  const error = $("#library-error");
  error.textContent = message;
  error.hidden = !message;
  if (field) {
    field.setAttribute("aria-invalid", String(Boolean(message)));
    if (message) field.focus();
  }
}
function editFolder(folder = null) {
  if (state.blocked) return;
  openDialog(
    folder ? "Name this folder." : "Make room for a new thread.",
    '<p id="folder-form-help">Gather conversations that belong together. Your chats stay on this device.</p><form id="folder-form" class="library-form" novalidate><label for="folder-name">Folder name</label><input id="folder-name" name="folder-name" autocomplete="off" maxlength="60" required placeholder="e.g. Reflections" aria-describedby="folder-form-help library-error"><p id="library-error" class="library-error" role="alert" hidden></p><div class="dialog-actions"><button class="primary-button" id="save-folder" type="submit">Create folder</button><button class="quiet-button" id="cancel-folder" type="button">Cancel</button></div></form><button id="remove-folder" class="folder-remove quiet-button" type="button" hidden>Remove folder</button>',
    "YOUR LIBRARY",
  );
  const field = $("#folder-name");
  field.value = folder?.name || "";
  $("#save-folder").textContent = folder ? "Save name" : "Create folder";
  $("#remove-folder").hidden = !folder;
  $("#remove-folder").onclick = () => confirmRemoveFolder(folder);
  $("#cancel-folder").onclick = () => $("#info-dialog").close();
  field.oninput = () => libraryError("", field);
  $("#folder-form").onsubmit = (event) => {
    event.preventDefault();
    const name = field.value.trim();
    const error = folderNameError(name, state.folders, folder?.id);
    if (error) {
      libraryError(error, field);
      return;
    }
    const previous = state.folders;
    const updated = folder
      ? { ...folder, name }
      : { id: crypto.randomUUID(), name, createdAt: Date.now() };
    state.folders = folder
      ? state.folders.map((item) => item.id === folder.id ? updated : item)
      : [...state.folders, updated];
    if (!persist()) {
      state.folders = previous;
      libraryError("This device could not save your folder. Free some storage and try again.");
      return;
    }
    setLibraryFolder(updated.id);
    $("#info-dialog").close();
    announce(folder ? "Folder renamed." : "Folder created. New conversations will start here.");
  };
  field.focus();
  field.select();
}
function confirmRemoveFolder(folder) {
  if (!folder || state.blocked) return;
  openDialog(
    "Remove this folder?",
    '<p id="folder-removal-copy"></p><p>Your conversations will move to Unfiled. Their messages, stars and recall settings stay saved.</p><p id="library-error" class="library-error" role="alert" hidden></p><div class="dialog-actions"><button id="confirm-remove-folder" class="primary-button danger" type="button">Remove folder</button><button id="keep-folder" class="primary-button" type="button">Keep folder</button></div>',
    "YOUR LIBRARY",
  );
  markDestructiveDialog();
  $("#folder-removal-copy").textContent = `Remove “${folder.name}” from your library?`;
  $("#keep-folder").onclick = () => $("#info-dialog").close();
  $("#keep-folder").focus();
  $("#confirm-remove-folder").onclick = () => {
    const previous = state.folders;
    const previousIds = state.chats.map((chat) => chat.folderId);
    const previousActiveFolder = active.folderId;
    removeFolder(state, folder.id);
    if (active.folderId === folder.id) active.folderId = null;
    if (!persist()) {
      state.folders = previous;
      state.chats.forEach((chat, index) => {
        chat.folderId = previousIds[index];
      });
      active.folderId = previousActiveFolder;
      libraryError("This device could not save the change. Your folder and chats are still here.");
      return;
    }
    setLibraryFolder("unfiled");
    $("#info-dialog").close();
    announce("Folder removed. Its conversations are kept in Unfiled.");
  };
}
function organizeChat(chat) {
  if (state.blocked) return;
  openDialog(
    "Keep this conversation close.",
    '<form id="organize-form" class="library-form" novalidate><label for="chat-name">Conversation name</label><input id="chat-name" name="chat-name" autocomplete="off" maxlength="140" required aria-describedby="library-error"><label for="chat-folder">Folder</label><select id="chat-folder" name="chat-folder" aria-describedby="chat-folder-help"></select><p id="chat-folder-help" class="form-help">Move this chat into a folder, or keep it unfiled.</p><label for="chat-position">Sidebar position</label><select id="chat-position" name="chat-position"></select><p class="form-help">Choose a position, or drag the sidebar handle. Alt + ↑ / ↓ also moves a chat.</p><label class="chat-recall" for="chat-recall"><input id="chat-recall" name="chat-recall" type="checkbox"><span>Allow prior-chat recall<small>Let this conversation inform future replies when memory is on.</small></span></label><p id="library-error" class="library-error" role="alert" hidden></p><div class="dialog-actions"><button class="primary-button" type="submit">Save changes</button><button id="cancel-organize" class="quiet-button" type="button">Cancel</button></div></form><div class="organize-danger"><p id="chat-protection" class="form-help"></p><button id="organize-delete" class="quiet-button" type="button">Delete conversation</button></div>',
    "YOUR CONVERSATION",
  );
  const field = $("#chat-name");
  field.value = chat.title;
  const options = [
    { id: "", name: "Unfiled" },
    ...[...state.folders].sort((a, b) => a.name.localeCompare(b.name)),
  ];
  $("#chat-folder").replaceChildren(...options.map((folder) => {
    const option = document.createElement("option");
    option.value = folder.id;
    option.textContent = folder.name;
    return option;
  }));
  $("#chat-folder").value = chat.folderId || "";
  const others = orderedConversations(state.chats, state.order).filter((item) =>
    item.id !== chat.id
  );
  const positionChoices = [
    { id: "keep", name: "Keep current position" },
    ...others.map((item) => ({ id: item.id, name: `Before ${item.title}` })),
    { id: "", name: "At the bottom" },
  ];
  $("#chat-position").replaceChildren(...positionChoices.map((item) => {
    const option = document.createElement("option");
    option.value = item.id;
    option.textContent = item.name;
    return option;
  }));
  $("#chat-recall").checked = chat.remember === true;
  $("#chat-protection").textContent = chat.starred
    ? "This chat is starred. Unstar it in the sidebar before deleting it."
    : "Deletion removes this chat from your device and prior-chat recall.";
  $("#organize-delete").disabled = chat.starred;
  $("#organize-delete").onclick = () => confirmDeleteChat(chat);
  $("#cancel-organize").onclick = () => $("#info-dialog").close();
  field.oninput = () => libraryError("", field);
  $("#organize-form").onsubmit = (event) => {
    event.preventDefault();
    const name = field.value.trim();
    if (!name || name.length > 140) {
      libraryError("Use a conversation name of 1–140 characters.", field);
      return;
    }
    const previous = {
      title: chat.title,
      folderId: chat.folderId,
      remember: chat.remember,
      customTitle: chat.customTitle,
      updatedAt: chat.updatedAt,
    };
    const previousOrder = state.order;
    const position = $("#chat-position").value;
    if (position !== "keep") moveConversation(state, chat.id, position || null);
    chat.customTitle = chat.customTitle || name !== chat.title;
    chat.title = name;
    chat.folderId = $("#chat-folder").value || null;
    chat.remember = $("#chat-recall").checked;
    touchChat(chat);
    if (!persist()) {
      Object.assign(chat, previous);
      state.order = previousOrder;
      libraryError("This device could not save the change. Your conversation is unchanged.");
      return;
    }
    if (chat.folderId) setLibraryFolder(chat.folderId);
    else setLibraryFolder("unfiled");
    $("#info-dialog").close();
    announce("Conversation updated.");
  };
  field.focus();
}
$("#new-folder").onclick = () => editFolder();
$("#folder-options").onclick = () =>
  editFolder(state.folders.find((folder) => folder.id === libraryFolder));
$("#history-search").oninput = (event) => {
  libraryQuery = event.target.value;
  $("#clear-search").hidden = !libraryQuery;
  renderHistory();
};
$("#history-search").onkeydown = (event) => {
  if (event.key === "Escape" && libraryQuery) {
    event.stopPropagation();
    clearSearch();
  }
};
$("#clear-search").onclick = clearSearch;
$("#info-dialog").addEventListener("close", () => {
  requestAnimationFrame(() => {
    if ($("#info-dialog").open) return;
    const fallback = $("#sidebar").inert
      ? matchMedia("(max-width:760px)").matches ? $("#mobile-history") : $("#sidebar-toggle")
      : $("#history-search");
    const target = dialogInvoker?.isConnected && !dialogInvoker.closest("[inert]")
      ? dialogInvoker
      : fallback;
    target?.focus({ preventScroll: true });
  });
});

function confirmDeleteChat(chat) {
  if (chat.starred) {
    announce("Unstar this conversation before deleting it.");
    return;
  }
  if (state.blocked) return;
  openDialog(
    "Let this conversation go?",
    '<p>This removes it from this device and from future prior-chat recall. Export a copy first if you want to keep it. Deletion cannot be undone here.</p><div class="dialog-actions"><button id="confirm-delete" class="primary-button danger">Delete conversation</button><button id="cancel-delete" class="primary-button">Keep it</button></div>',
    "YOUR CONVERSATION",
  );
  markDestructiveDialog();
  $("#cancel-delete").focus();
  $("#cancel-delete").onclick = () => $("#info-dialog").close();
  $("#confirm-delete").onclick = () => {
    if (chat.starred) {
      $("#info-dialog").close();
      announce("Unstar this conversation before deleting it.");
      return;
    }
    const wasActive = chat.id === active.id;
    const previousChats = state.chats;
    const previousActive = active;
    const previousActiveId = state.active;
    if (wasActive) active = newLibraryConversation();
    state.chats = state.chats.filter((item) => item.id !== chat.id);
    if (!persist()) {
      state.chats = previousChats;
      active = previousActive;
      state.active = previousActiveId;
      return;
    }
    if (wasActive) {
      cancelReply();
      setView("conversation");
      renderMessages();
    }
    renderHistory();
    $("#info-dialog").close();
    announce("Conversation deleted from this device and removed from future recall.");
  };
}
function confirmClearHistory() {
  const { kept, removed } = planHistoryClear(state.chats);
  if (!removed || state.blocked) return;
  const selectedIds = new Set(state.chats.filter((chat) => !chat.starred).map((chat) => chat.id));
  const noun = removed === 1 ? "conversation" : "conversations";
  const protectedNote = kept.length
    ? ` ${kept.length} starred ${kept.length === 1 ? "conversation stays" : "conversations stay"}.`
    : "";
  openDialog(
    "Clear conversation history?",
    `<p>Delete ${removed} unstarred ${noun} from this device and future prior-chat recall?${protectedNote} This cannot be undone. Export anything you want to keep first.</p><div class="dialog-actions"><button id="confirm-clear-history" class="primary-button danger">Clear ${removed} ${noun}</button><button id="cancel-clear-history" class="primary-button">Keep history</button></div>`,
    "YOUR CONVERSATIONS",
  );
  markDestructiveDialog();
  $("#cancel-clear-history").focus();
  $("#cancel-clear-history").onclick = () => $("#info-dialog").close();
  $("#confirm-clear-history").onclick = () => {
    const retained = state.chats.filter((chat) => chat.starred || !selectedIds.has(chat.id));
    const result = { kept: retained, removed: state.chats.length - retained.length };
    const previousChats = state.chats;
    const previousActive = active;
    const previousActiveId = state.active;
    const previousDraft = active.draft;
    const activeWasSaved = state.chats.some((chat) => chat.id === active.id);
    const keepActive = !activeWasSaved || result.kept.some((chat) => chat.id === active.id);
    state.chats = result.kept;
    if (keepActive) active.draft = $("#message-input").value;
    else active = newLibraryConversation();
    if (!persist()) {
      state.chats = previousChats;
      active = previousActive;
      state.active = previousActiveId;
      active.draft = previousDraft;
      return;
    }
    if (!keepActive) {
      cancelReply();
      setView("conversation");
      renderMessages();
    }
    renderHistory();
    $("#info-dialog").close();
    announce(
      `${result.removed} ${
        result.removed === 1 ? "conversation" : "conversations"
      } cleared. ${result.kept.length} starred ${
        result.kept.length === 1 ? "conversation remains" : "conversations remain"
      }.`,
    );
  };
}
function appendSourceDetails(article, message) {
  if (!message.sourceMode) return;
  const note = document.createElement("div");
  note.className = "message-note";
  if (message.sourceMode === "continuation") {
    note.textContent = "AI continuation · inferred from the supplied files";
    article.append(note);
    return;
  }
  if (message.sourceMode === "interpretation" || message.sourceMode === "synthesis") {
    const details = document.createElement("details");
    details.className = "message-sources";
    const summary = document.createElement("summary");
    summary.textContent = message.sourceMode === "synthesis"
      ? message.persona === "imp"
        ? "Original synthesis · characters and Greene books"
        : "Original synthesis · contributing personas"
      : "AI interpretation · research context";
    details.append(summary);
    const explanation = document.createElement("p");
    explanation.textContent = message.sourceMode === "synthesis"
      ? message.persona === "imp"
        ? message.coverage?.tomodachiPrimary
          ? "IMP draws on three character foundations, seven published Greene books, and the supplied Tomodachi Game manga scans. Relevant OCR scenes and separate scene analyses inform this reply. Monster uses publisher research. These references show context, not verified character quotations."
          : "IMP draws on three character foundations, seven published Greene books, and the research listed below. This saved reply used publisher descriptions for Monster and Tomodachi Game. These references show context, not verified character quotations."
        : "One original voice drawing on the personas below. This reply is a synthesis of their characterizations and available material."
      : "Original dialogue informed by research notes. These references show context supplied for this reply; they do not verify its wording as dialogue from the series.";
    details.append(explanation);
    const list = document.createElement("ul");
    for (const source of Array.isArray(message.sources) ? message.sources : []) {
      const item = document.createElement("li");
      const title = `${source.episode ? source.episode.toUpperCase() + " · " : ""}${
        source.title || source.name || "Research note"
      }`;
      let url;
      try {
        const candidate = new URL(source.url);
        if (
          candidate.protocol === "https:" &&
          [
            "www.springfieldspringfield.co.uk",
            "thescriptsavant.com",
            "www.tvguide.com",
            "en.dragon-ball-official.com",
            "www.viz.com",
            "tomodachi-anime.com",
            "shonenmagazine.com",
            "cstation.kodansha.co.jp",
            "sevenseasentertainment.com",
            "www.penguinrandomhouse.com",
            "powerseductionandwar.com",
          ]
            .includes(candidate.hostname) &&
          !candidate.username && !candidate.password
        ) url = candidate;
      } catch { /* References without a public URL remain plain text. */ }
      if (url) {
        const link = document.createElement("a");
        link.href = url.href;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = title;
        link.setAttribute("aria-label", `${title} (opens in a new tab)`);
        item.append(link);
      } else item.textContent = title;
      if (source.kind === "production-script") item.append(" · production draft");
      list.append(item);
    }
    details.append(list);
    if (message.persona === "imp" && message.coverage?.completeTexts === false) {
      const coverage = document.createElement("p");
      const primary = message.coverage.tomodachiPrimary;
      coverage.textContent = `Publisher descriptions reviewed: Monster ${
        message.coverage.monsterVolumeDescriptionsReviewed || 0
      }/${message.coverage.monsterPerfectEditionVolumes || 9} volumes; Tomodachi Game ${
        message.coverage.tomodachiVolumeDescriptionsReviewed || 0
      }/${message.coverage.tomodachiMangaVolumes || 26} volumes. ${
        primary
          ? `Tomodachi Game: ${primary.sourceFiles} supplied PDFs and ${primary.primaryPagesIndexed.toLocaleString()} pages indexed with OCR. Later chapters and the epilogue are missing; speaker attribution and transcription are unverified.`
          : "This reply did not use primary manga pages."
      }`;
      details.append(coverage);
    }
    if (message.coverage?.era) {
      const era = document.createElement("p");
      era.textContent = `Timeline: ${message.coverage.era}.`;
      details.append(era);
    }
    article.append(details);
    return;
  }
  const details = document.createElement("details");
  details.className = "message-sources";
  const summary = document.createElement("summary");
  const sources = Array.isArray(message.sources) ? message.sources : [];
  const count = new Set(sources.map((source) => source.file)).size;
  summary.textContent = `Verified source wording · ${count} ${count === 1 ? "file" : "files"}`;
  details.append(summary);
  const list = document.createElement("ul");
  for (const source of sources) {
    const item = document.createElement("li");
    const book = source.attribution === "edited-compilation" ? " · edited book text" : "";
    const pages = source.page ? ` · PDF pages ${source.page}–${source.endPage}` : "";
    const kind = source.kind === "inner-narration"
      ? " · inner narration"
      : source.kind === "dialogue"
      ? " · dialogue"
      : "";
    const ocr = source.extraction === "ocr" ? " · OCR text (may contain recognition errors)" : "";
    item.textContent =
      `${source.file}${pages} · lines ${source.line}–${source.endLine}${book}${kind}${ocr}`;
    if (source.aliases?.length) item.textContent += ` · also in ${source.aliases.join(", ")}`;
    list.append(item);
  }
  details.append(list);
  if (message.coverage?.omittedDocuments) {
    const coverage = document.createElement("p");
    coverage.textContent =
      `${message.coverage.omittedDocuments} matching sources could not fit in this reply’s context.`;
    details.append(coverage);
  }
  article.append(details);
}
function createMessage(message) {
  const article = document.createElement("article");
  article.className = `message ${message.role}`;
  article.dataset.id = message.id;
  const head = document.createElement("div");
  head.className = "message-head";
  if (message.role === "assistant") {
    if (!message.persona || message.persona === "whiteeye") {
      const img = document.createElement("img");
      img.src = "/assets/eye.svg";
      img.alt = "";
      img.width = 24;
      img.height = 24;
      head.append(img);
    } else {
      const mark = document.createElement("span");
      mark.className = "persona-monogram";
      mark.setAttribute("aria-hidden", "true");
      mark.textContent = personaName(message.persona)[0];
      head.append(mark);
    }
  }
  const name = document.createElement("span");
  name.textContent = message.role === "user" ? "YOU" : personaName(message.persona).toUpperCase();
  const stamp = document.createElement("time");
  stamp.textContent = time(message.at);
  const date = new Date(message.at || Date.now());
  if (!Number.isNaN(date.getTime())) stamp.dateTime = date.toISOString();
  head.append(name, stamp);
  const body = document.createElement("div");
  body.className = "message-body";
  body.textContent = message.content;
  if (message.status === "streaming" && !message.content) {
    const typing = document.createElement("div");
    typing.className = "typing";
    typing.setAttribute("aria-label", `${personaName(message.persona)} is thinking`);
    for (let i = 0; i < 3; i++) typing.append(document.createElement("span"));
    body.append(typing);
  }
  article.append(head, body);
  appendSourceDetails(article, message);
  if (message.status === "interrupted") {
    const note = document.createElement("div");
    note.className = "message-note";
    note.textContent = "Reply interrupted";
    article.append(note);
  }
  if (message.content) {
    const copy = document.createElement("button");
    copy.className = "message-copy";
    copy.textContent = "Copy";
    copy.setAttribute("aria-label", "Copy message");
    copy.onclick = async () => {
      try {
        await navigator.clipboard.writeText(message.content);
        copy.textContent = "Copied";
        setTimeout(() => copy.textContent = "Copy", 1500);
      } catch {
        announce("Copy unavailable. Select the message text to copy.");
      }
    };
    article.append(copy);
  }
  return article;
}
function renderMessages() {
  syncPersonaControls();
  $("#welcome").hidden = active.messages.length > 0;
  $("#messages").replaceChildren(...active.messages.map(createMessage));
  messageNavigation.sync();
  $("#export").disabled = !active.messages.length;
  syncDeleteButton();
  $("#message-input").value = active.draft || "";
  updateInput();
  const last = active.messages.at(-1);
  setError(
    last?.status === "interrupted"
      ? "The previous reply was interrupted. Retry to continue."
      : last?.role === "user"
      ? "Your last message is saved. Retry when you’re ready."
      : "",
  );
  if (active.messages.length) scrollBottom();
  else $("#scroll-region").scrollTop = 0;
  document.body.classList.toggle("has-conversation", active.messages.length > 0);
  globalThis.dispatchEvent(new Event("whiteeye:conversation"));
}
let displayedPersona;
function syncPersonaControls() {
  const persona = active.persona || "whiteeye";
  $("#persona-select").value = persona;
  $("#participant-select").value = active.participant || "guest";
  $("#participant-control").hidden = persona !== "whiteeye";
  syncModelControl();
  $("#welcome h1").textContent = personaName(persona);
  $("#welcome").dataset.persona = persona;
  $("#welcome").dataset.longName = String(personaName(persona).length > 13);
  $(".welcome-subtitle").textContent = introductions[persona][0];
  $(".intro").innerHTML = introductions[persona][1];
  for (const [index, button] of [...document.querySelectorAll("[data-prompt]")].entries()) {
    button.querySelector("span").textContent = starters[persona][index][0];
    button.dataset.prompt = starters[persona][index][1];
  }
  $("#message-input").placeholder = `Message ${personaName(persona)}…`;
  $("label[for='message-input']").textContent = `Your message to ${personaName(persona)}`;
  if (displayedPersona !== persona) {
    displayedPersona = persona;
    globalThis.dispatchEvent(new CustomEvent("whiteeye:persona", { detail: { persona } }));
  }
}
function availableModelOptions() {
  return Array.isArray(status.models)
    ? status.models.filter((model) =>
      model && typeof model.id === "string" && typeof model.label === "string"
    )
    : [];
}
function selectedModelId(chat = active, models = availableModelOptions()) {
  if (models.some((model) => model.id === chat.model)) return chat.model;
  if (models.some((model) => model.id === status.defaultModel)) return status.defaultModel;
  return models[0]?.id || "";
}
function closeModelMenu({ focus = false } = {}) {
  $("#model-options").hidden = true;
  $("#model-select").setAttribute("aria-expanded", "false");
  if (focus) $("#model-select").focus();
}
function openModelMenu() {
  if ($("#model-select").disabled) return;
  const options = $("#model-options");
  options.hidden = false;
  $("#model-select").setAttribute("aria-expanded", "true");
  options.querySelector('[aria-checked="true"]')?.focus();
}
function chooseModel(model) {
  if (controller) return;
  active.model = model.id;
  ensureSaved();
  persist();
  syncModelControl();
  renderHistory();
  closeModelMenu({ focus: true });
  announce(`Model changed to ${model.label}.`);
}
function syncModelControl() {
  const trigger = $("#model-select");
  const options = $("#model-options");
  const models = availableModelOptions();
  if (!models.length) {
    const label = status.configured ? "No models available" : "Not connected";
    $("#model-selected").textContent = label;
    trigger.setAttribute("aria-label", label);
    options.replaceChildren();
    trigger.disabled = true;
    closeModelMenu();
    return;
  }
  const selected = selectedModelId(active, models);
  const label = models.find((model) => model.id === selected).label;
  $("#model-selected").textContent = label;
  trigger.setAttribute("aria-label", models.length > 1 ? `Model: ${label}. Choose another model` : `Model: ${label}`);
  options.replaceChildren(...models.map((model) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "model-option";
    button.setAttribute("role", "menuitemradio");
    button.setAttribute("aria-checked", String(model.id === selected));
    button.textContent = model.label;
    button.onclick = () => chooseModel(model);
    return button;
  }));
  trigger.disabled = Boolean(controller) || !status.configured || models.length === 1;
  if (trigger.disabled) closeModelMenu();
}
function scrollBottom() {
  requestAnimationFrame(() => {
    const r = $("#scroll-region");
    r.scrollTo({ top: r.scrollHeight, behavior: "instant" });
  });
}
function setError(message) {
  $("#error").hidden = !message;
  $("#error-text").textContent = message;
}
function updateInput() {
  const input = $("#message-input");
  input.style.height = "auto";
  input.style.height = Math.min(input.scrollHeight, 160) + "px";
  $("#send").disabled = !input.value.trim() || Boolean(controller);
  $("#char-count").hidden = input.value.length < 10000;
  $("#char-count").textContent = `${input.value.length.toLocaleString()} characters`;
}
function setBusy(busy) {
  document.body.classList.toggle("is-thinking", busy);
  $("#send").hidden = busy;
  $("#stop").hidden = !busy;
  $("#retry").disabled = busy;
  $("#messages").setAttribute("aria-busy", String(busy));
  $("#persona-select").disabled = busy;
  $("#participant-select").disabled = busy;
  $("#model-select").disabled = busy || !status.configured || !(status.models?.length > 1);
  if (busy) closeModelMenu();
  updateInput();
}
function cancelReply() {
  if (controller) controller.abort();
}
function switchChat(chat) {
  clearTimeout(draftTimer);
  cancelReply();
  saveDraft();
  active = chat;
  touchChat();
  scrollFollow = true;
  setView("conversation");
  renderMessages();
  renderHistory();
  persist();
  closeSidebar();
  $("#main").focus({ preventScroll: true });
}
function startNew() {
  clearTimeout(draftTimer);
  cancelReply();
  saveDraft();
  const persona = active.persona || "whiteeye";
  const model = selectedModelId() || null;
  active = newConversation();
  active.folderId = state.folders.some((folder) => folder.id === libraryFolder)
    ? libraryFolder
    : null;
  libraryQuery = "";
  $("#history-search").value = "";
  $("#clear-search").hidden = true;
  active.persona = persona;
  active.model = model;
  setView("conversation");
  renderMessages();
  renderHistory();
  closeSidebar();
  $("#message-input").focus();
}
function setView(view, { focus = false } = {}) {
  const changed = document.body.classList.contains("view-reading") !== (view === "reading");
  document.body.classList.toggle("view-reading", view === "reading");
  $("#conversation-view").hidden = view !== "conversation";
  $("#reading-view").hidden = view !== "reading";
  for (const b of document.querySelectorAll("[data-view]")) {
    const selected = b.dataset.view === view;
    b.classList.toggle("active", selected);
    if (selected) b.setAttribute("aria-current", "page");
    else b.removeAttribute("aria-current");
  }
  if (changed) globalThis.dispatchEvent(new CustomEvent("whiteeye:surface", { detail: { view } }));
  if (focus) {
    closeSidebar();
    const target = view === "reading" ? $("#reading-view h1") || $("#main") : $("#main");
    target.tabIndex = -1;
    target.focus({ preventScroll: true });
  }
}
function openSidebar() {
  closeModelMenu();
  if (!matchMedia("(max-width:760px)").matches || $("dialog[open]")) return;
  document.body.classList.add("history-open");
  $("#sidebar").classList.add("open");
  $("#sidebar").setAttribute("role", "dialog");
  $("#sidebar").setAttribute("aria-modal", "true");
  $("#scrim").hidden = false;
  $("#mobile-history").setAttribute("aria-expanded", "true");
  $("#sidebar").inert = false;
  for (const node of document.querySelectorAll(".masthead, #main, .page-footer, .skip")) {
    if (!drawerBackground.has(node)) drawerBackground.set(node, node.inert);
    node.inert = true;
  }
  $("#close-sidebar").focus();
}
function closeSidebar() {
  const focusInDrawer = $("#sidebar").contains(document.activeElement);
  document.body.classList.remove("history-open");
  $("#sidebar").classList.remove("open");
  $("#sidebar").removeAttribute("role");
  $("#sidebar").removeAttribute("aria-modal");
  $("#scrim").hidden = true;
  $("#mobile-history").setAttribute("aria-expanded", "false");
  for (const [node, inert] of drawerBackground) node.inert = inert;
  drawerBackground.clear();
  syncSidebar();
  if (focusInDrawer && $("#sidebar").inert && !$("dialog[open]")) {
    $("#mobile-history").focus({ preventScroll: true });
  }
}
function markDestructiveDialog() {
  const dialog = $("#info-dialog");
  dialog.setAttribute("role", "alertdialog");
  const description = $("#dialog-content p");
  if (description) {
    if (!description.id) description.id = "dialog-description";
    dialog.setAttribute("aria-describedby", description.id);
  }
}
function openDialog(title, markup, eyebrow = "ABOUT THIS SPACE") {
  if (!$("#info-dialog").open) dialogInvoker = document.activeElement;
  $("#info-dialog").removeAttribute("role");
  $("#info-dialog").removeAttribute("aria-describedby");
  $("#dialog-title").textContent = title;
  $("#dialog-content").innerHTML = markup;
  $("#dialog-eyebrow").textContent = eyebrow;
  if (!$("#info-dialog").open) $("#info-dialog").showModal();
}
async function connection() {
  await checkStatus();
  openDialog(
    status.offline ? "Connection unavailable." : status.configured ? "A connection is ready." : "Bring the conversation to life.",
    `<p>${
      status.offline
        ? "The connection status couldn’t be checked. Try again in a moment. You can still open the courses and conversations saved on this device."
        : status.configured
        ? "Choose a model in the conversation controls, then send a message to begin. Your messages and relevant source excerpts are sent to the configured model provider."
        : "The site owner needs to configure a model connection before live conversations can begin. You can explore the courses and revisit conversations saved on this device."
    }</p>${
      status.requiresAccess
        ? '<label for="access-code">Access code<input id="access-code" type="password" autocomplete="off" placeholder="Enter the owner’s access code"></label><button id="save-access" class="primary-button">Use access code ↗</button><p>This code is kept in memory for this tab, until refresh.</p>'
        : ""
    }<div class="connection-actions"><button id="check-connection" class="primary-button" type="button">Check connection ↻</button><a class="connection-course-link" href="/course/">Explore the course <span aria-hidden="true">↗</span></a></div><p id="connection-result" role="status"></p>`,
    "CONNECTION",
  );
  $("#save-access")?.addEventListener("click", () => {
    accessToken = $("#access-code").value;
    $("#connection-result").textContent = "Access code set for this tab.";
  });
  $("#check-connection").onclick = async event => {
    const button = event.currentTarget;
    const result = $("#connection-result");
    button.disabled = true;
    button.setAttribute("aria-busy", "true");
    button.textContent = "Checking…";
    try {
      await checkStatus();
      result.textContent = status.offline
        ? "The connection is unavailable. Please try again in a moment."
        : status.configured
        ? "Model configuration found. Close this dialog and send a message."
        : "A model connection has not been configured yet.";
    } finally {
      button.disabled = false;
      button.removeAttribute("aria-busy");
      button.textContent = "Check connection ↻";
    }
  };
}
async function checkStatus() {
  const request = new AbortController();
  const timeout = setTimeout(() => request.abort(), 8000);
  try {
    const response = await fetch("/api/status", { signal: request.signal });
    if (!response.ok) throw Error();
    status = await response.json();
    syncModelControl();
    $("#connection-label").textContent = status.configured ? "Model ready" : "Connect model";
    $(".status-dot").classList.toggle("connected", status.configured);
  } catch {
    status = { configured: false, offline: true };
    syncModelControl();
    $("#connection-label").textContent = "Offline";
    $(".status-dot").classList.remove("connected");
  } finally {
    clearTimeout(timeout);
  }
}
async function generate(chat) {
  if (controller) return;
  controller = new AbortController();
  const ownController = controller;
  setError("");
  setBusy(true);
  announce(`${personaName(chat.persona)} is thinking.`);
  const reply = {
    id: crypto.randomUUID(),
    role: "assistant",
    persona: chat.persona || "whiteeye",
    content: "",
    at: Date.now(),
    status: "streaming",
  };
  chat.messages.push(reply);
  persist();
  $("#welcome").hidden = true;
  document.body.classList.add("has-conversation");
  const element = createMessage(reply);
  $("#messages").append(element);
  messageNavigation.sync();
  scrollFollow = true;
  scrollBottom();
  const requestMessages = chat.messages.filter((m) =>
    m !== reply && m.content && (m.persona || "whiteeye") === (chat.persona || "whiteeye")
  ).map((
    { role, content },
  ) => ({ role, content }));
  const memory = !state.blocked && memoryEnabled()
    ? selectPriorMemory(
      state.chats,
      chat.id,
      requestMessages.at(-1)?.content,
      3,
      chat.persona,
      chat.participant,
    )
    : [];
  try {
    await streamReply(requestMessages, {
      signal: ownController.signal,
      token: accessToken,
      memory,
      persona: chat.persona,
      participant: chat.participant,
      model: selectedModelId(chat) || undefined,
      onEvent: (event) => {
        if (event.type === "delta") {
          reply.content += event.text;
          element.querySelector(".message-body").textContent = reply.content;
          if (active.id === chat.id && scrollFollow) scrollBottom();
        }
        if (event.type === "notice") notice(event.message);
        if (event.type === "done" && event.sourceMode) {
          reply.sourceMode = event.sourceMode;
          reply.sources = event.sources || [];
          reply.coverage = event.coverage;
          appendSourceDetails(element, reply);
        }
        if (event.type === "done" && event.omitted) {
          notice(
            "This conversation is long. The model sees the latest message and available recent context; older details may need a reminder.",
          );
        }
      },
    });
    reply.status = "complete";
    if (active.id === chat.id) announce(`${personaName(chat.persona)} replied.`);
  } catch (error) {
    reply.status = "interrupted";
    if (active.id === chat.id) {
      setError(
        error.name === "AbortError"
          ? "Reply stopped. You can retry or write something new."
          : error.message,
      );
      announce("Reply interrupted.");
    }
  } finally {
    if (!reply.content) chat.messages.splice(chat.messages.indexOf(reply), 1);
    if (active.id === chat.id) {
      if (reply.content) element.replaceWith(createMessage(reply));
      else element.remove();
    }
    touchChat(chat);
    messageNavigation.sync();
    controller = null;
    setBusy(false);
    persist();
    renderHistory();
    $("#export").disabled = !active.messages.length;
    syncDeleteButton();
  }
}
async function send(text) {
  const value = text.trim();
  if (!value || controller) return;
  ensureSaved();
  if (active.messages.length === 0 && !active.customTitle) active.title = value.slice(0, 65);
  active.messages.push({
    id: crypto.randomUUID(),
    role: "user",
    persona: active.persona || "whiteeye",
    content: value,
    at: Date.now(),
    status: "complete",
  });
  active.draft = "";
  $("#message-input").value = "";
  persist();
  renderHistory();
  renderMessages();
  await generate(active);
}
$("#composer").onsubmit = (e) => {
  e.preventDefault();
  send($("#message-input").value);
};
$("#message-input").oninput = () => {
  updateInput();
  clearTimeout(draftTimer);
  draftTimer = setTimeout(() => {
    const draft = $("#message-input").value;
    if (draft !== active.draft) {
      active.draft = draft;
      ensureSaved();
      persist();
      renderHistory();
    }
  }, 350);
};
$("#message-input").onkeydown = (e) => {
  if (
    e.key === "Enter" && !e.shiftKey && !e.isComposing && !matchMedia("(pointer:coarse)").matches
  ) {
    e.preventDefault();
    send(e.currentTarget.value);
  }
};
$("#stop").onclick = cancelReply;
$("#retry").onclick = () => {
  if (controller) return;
  if (
    active.messages.length &&
    (active.messages.at(-1).persona || "whiteeye") !== active.persona
  ) {
    notice("Write a new message to continue this saved conversation with IMP.");
    $("#message-input").focus();
    return;
  }
  if (active.messages.at(-1)?.role === "assistant") active.messages.pop();
  renderMessages();
  generate(active);
};
$("#new-chat").onclick = startNew;
$("#clear-history").onclick = confirmClearHistory;
$("#persona-select").onchange = (event) => {
  if (controller) return;
  active.persona = event.target.value;
  ensureSaved();
  persist();
  renderMessages();
  renderHistory();
  $("#message-input").focus();
  announce(`Now speaking with ${personaName(active.persona)}.`);
};
$("#participant-select").onchange = (event) => {
  if (controller) return;
  active.participant = event.target.value;
  ensureSaved();
  persist();
  renderHistory();
  announce(active.participant === "griffith" ? "Speaking as SNMX." : "Speaking as a guest.");
};
$("#model-select").onclick = () => {
  if ($("#model-options").hidden) openModelMenu();
  else closeModelMenu();
};
$("#model-control").addEventListener("keydown", (event) => {
  const options = $("#model-options");
  if (event.key === "Escape" && !options.hidden) {
    event.preventDefault();
    closeModelMenu({ focus: true });
    return;
  }
  if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
  if (event.target === $("#model-select") && options.hidden) openModelMenu();
  if (options.hidden) return;
  event.preventDefault();
  const buttons = [...options.querySelectorAll("button")];
  const index = buttons.indexOf(document.activeElement);
  const next = event.key === "Home"
    ? 0
    : event.key === "End"
    ? buttons.length - 1
    : (index + (event.key === "ArrowDown" ? 1 : -1) + buttons.length) % buttons.length;
  buttons[next]?.focus();
});
$("#model-control").addEventListener("focusout", (event) => {
  if (!event.currentTarget.contains(event.relatedTarget)) closeModelMenu();
});
document.addEventListener("pointerdown", (event) => {
  if (!$("#model-control").contains(event.target)) closeModelMenu();
});
$("#mobile-history").onclick = openSidebar;
$("#close-sidebar").onclick = () => {
  closeSidebar();
  $("#mobile-history").focus();
};
$("#scrim").onclick = () => {
  closeSidebar();
  $("#mobile-history").focus();
};
for (const b of document.querySelectorAll("[data-view]")) {
  b.onclick = () => setView(b.dataset.view, { focus: true });
}
for (const b of document.querySelectorAll("[data-prompt]")) {
  b.onclick = () => {
    if (!controller) send(b.dataset.prompt);
  };
}
$("#back-to-chat").onclick = () => {
  setView("conversation");
  $("#message-input").focus();
};
$("#connection").onclick = connection;
$("#privacy").onclick = () => {
  openDialog(
    "A voice, thoughtfully interpreted.",
    '<p>WhiteEye and Griffith are AI interpretations of two people in the supplied conversations. Andrew Tate draws on the supplied transcript collection and edited Tate Bible; source replies preserve verified wording, though mixed speakers can still make attribution uncertain. Patrick Jane uses research notes from The Mentalist episodes, a production script, and creator/cast interviews. Vegeta uses research notes from official Dragon Ball material. Their replies are AI interpretations, not exact dialogue. IMP is one original persona combining the mindsets of Johan Liebert, Yuichi Katagiri and Ayanokoji Kiyotaka with seven published Robert Greene books. Four Greene titles are in the supplied IMP collection; the other three are informed by attributed passages reprinted in The Daily Laws and by author and publisher descriptions. Ayanokoji uses the supplied novels. Yuichi now also draws on 107 supplied Tomodachi Game PDFs: 4,089 pages indexed with OCR, numbered 1–104 plus three extra files. Relevant manga scenes and separate scene analyses inform IMP and Vesper. OCR can misread words and panel order; it does not verify speakers or exact dialogue. Later chapters and the epilogue are missing. Johan still uses publisher research across the nine Monster Perfect Edition volumes. Supporting Tomodachi research covers 26 volume descriptions and 12 anime synopses; descriptions do not count as full text. IMP replies are original synthesis, not canonical lines or Greene quotations. The three individual choices have been retired, while older messages remain readable. Vesper now draws on WhiteEye, Griffith, IMP, Andrew Tate and Patrick Jane. None is the actual person or character, and replies can be mistaken.</p><p>WhiteEye starts by speaking with a guest. Choose “SNMX” to use the familiar relationship from the original chats. Each character only receives live and saved messages addressed to that character. Switching characters in a chat does not erase the visible transcript.</p><p>Conversations are saved in this browser on this device. Anyone using this browser profile can read them. Export a conversation to keep your own copy, star it to protect it, or delete it. Clear history removes every unstarred conversation; starred ones remain.</p><p>When connected, your messages and relevant source excerpts are sent to the configured model provider. This application does not keep server-side conversation logs. Provider data handling depends on your chosen service.</p><p>Relevant excerpts from other saved chats on this device can inform replies, but simulated replies are not historical source facts. The sidebar lets you exclude any chat from recall or delete it. No cross-device sync.</p><label class="memory-setting"><input id="crosschat-memory" type="checkbox"> Use prior chats as memory</label><p>There is no app-side message length cap, but model providers have finite context windows. The latest message is always sent; older context may be omitted with a visible notice.</p><button id="read-more" class="primary-button">Explore the perspective ↗</button>',
  );
  syncMemoryControls();
  $("#crosschat-memory").onchange = (event) => changeMemoryEnabled(event.target.checked);
  $("#read-more").onclick = () => {
    $("#info-dialog").close();
    setView("reading", { focus: true });
  };
};
$("#export").onclick = () => {
  const text = `# WhiteEye — ${active.title}\n\n${
    active.messages.map((m) =>
      `## ${m.role === "user" ? "You" : personaName(m.persona)} · ${time(m.at)}\n\n${m.content}${
        m.status === "interrupted" ? "\n\n[Reply interrupted]" : ""
      }`
    ).join("\n\n")
  }`;
  const url = URL.createObjectURL(new Blob([text], { type: "text/markdown;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `whiteeye-${new Date(active.createdAt).toISOString().slice(0, 10)}.md`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
$("#delete").onclick = () => confirmDeleteChat(active);
$("#sidebar-memory").onchange = (event) => changeMemoryEnabled(event.target.checked);
$("#scroll-region").onscroll = () => {
  const r = $("#scroll-region");
  const atBottom = r.scrollHeight - r.scrollTop - r.clientHeight < 120;
  scrollFollow = !messageNavigation.navigating && atBottom;
  $("#jump").hidden = atBottom;
};
$("#jump").onclick = () => {
  messageNavigation.cancelNavigation();
  scrollFollow = true;
  scrollBottom();
};
document.addEventListener("keydown", (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
    e.preventDefault();
    if (!$("#info-dialog").open && !$("#entrance").open) startNew();
  }
  if ($("dialog[open]")) return;
  if (e.key === "Escape" && $("#sidebar").classList.contains("open")) {
    e.preventDefault();
    closeSidebar();
    $("#mobile-history").focus();
  }
  if (e.key === "Tab" && $("#sidebar").classList.contains("open")) {
    const items = [
      ...$("#sidebar").querySelectorAll(
        'button, a[href], input, textarea, select, [tabindex]:not([tabindex="-1"])',
      ),
    ].filter((node) =>
      !node.disabled && node.tabIndex >= 0 && !node.closest("[inert]") &&
      node.getClientRects().length > 0 && getComputedStyle(node).visibility !== "hidden"
    );
    if (!items.length) return;
    const first = items[0], last = items.at(-1);
    if (!items.includes(document.activeElement)) {
      e.preventDefault();
      (e.shiftKey ? last : first).focus();
    } else if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
});
globalThis.addEventListener("beforeunload", saveDraft);
matchMedia("(max-width:760px)").addEventListener("change", closeSidebar);
$("#info-dialog").addEventListener("click", (e) => {
  if (e.target === $("#info-dialog")) {
    const r = e.target.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) {
      e.target.close();
    }
  }
});
if (!state.chats.some((chat) => chat.id === active.id)) active = newLibraryConversation();
renderHistory();
renderMessages();
syncMemoryControls();
setView(
  new URLSearchParams(location.search).get("view") === "reading" ? "reading" : "conversation",
);
$("#new-chat kbd").textContent = /Mac|iPhone|iPad/.test(navigator.userAgent) ? "⌘ K" : "Ctrl K";
closeSidebar();
checkStatus();
if (matchMedia("(pointer:coarse)").matches) {
  $("#input-help").textContent = "Use the arrow to send. Enter adds a new line.";
}
if (state.warning) notice(state.warning);
setupEntrance();
setupAtmosphere();
