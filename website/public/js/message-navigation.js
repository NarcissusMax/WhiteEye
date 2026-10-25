// Only the visible marker window is mounted. Message offsets are measured on
// layout changes, then searched in logarithmic time while the transcript scrolls.
export function setupMessageNavigation({ region, messagesRoot, getMessages, onNavigate }) {
  const rail = document.querySelector("#message-navigation");
  const list = document.querySelector("#message-markers");
  const track = document.querySelector("#marker-track");
  const prompt = document.querySelector("#latest-prompt");
  const response = document.querySelector("#latest-response");
  const coarse = matchMedia("(pointer: coarse)");
  let rows = [], tops = [], current = -1, focusIndex = 0, frame = 0;
  let layoutDirty = true, navigating = false, navigationTimer;
  let windowKey = "", lastPrompt = -1, lastResponse = -1, target = -1;
  const step = () => coarse.matches ? 44 : 28;
  const instant = () =>
    matchMedia("(prefers-reduced-motion: reduce)").matches ||
    document.documentElement.dataset.motion === "paused";

  function cancelNavigation() {
    clearTimeout(navigationTimer);
    navigating = false;
  }
  function measure() {
    const origin = region.getBoundingClientRect().top - region.scrollTop;
    tops = [...messagesRoot.children].map((node) => node.getBoundingClientRect().top - origin);
    layoutDirty = false;
  }
  function revealMarker(index) {
    const top = index * step();
    if (top < list.scrollTop) list.scrollTop = top;
    else if (top + step() > list.scrollTop + list.clientHeight) {
      list.scrollTop = top + step() - list.clientHeight;
    }
  }
  function jump(index, immediate = false, keyboard = false) {
    if (index < 0 || index >= rows.length) return;
    if (layoutDirty) measure();
    onNavigate();
    cancelNavigation();
    navigating = true;
    // Suppress reply-following until a smooth jump settles. A wheel/touch gesture
    // immediately returns control to the reader.
    navigationTimer = setTimeout(cancelNavigation, 1200);
    focusIndex = index;
    target = index;
    region.scrollTo({
      top: Math.max(0, tops[index] - 24),
      behavior: immediate || instant() ? "instant" : "smooth",
    });
    revealMarker(index);
    renderWindow();
    if (keyboard) track.querySelector(`[data-index="${index}"]`)?.focus({ preventScroll: true });
    schedule();
  }
  function renderWindow() {
    const size = step();
    const start = Math.max(0, Math.floor(list.scrollTop / size) - 3);
    const end = Math.min(rows.length, Math.ceil((list.scrollTop + list.clientHeight) / size) + 3);
    const key = `${start}:${end}:${size}`;
    if (key !== windowKey) {
      // Retain focused markers when scrolling the list independently.
      const focused = document.activeElement?.closest(".message-marker");
      const focusedIndex = focused?.dataset.index;
      const indices = new Set(Array.from({ length: end - start }, (_, i) => start + i));
      if (focusedIndex !== undefined) indices.add(Number(focusedIndex));
      track.replaceChildren(
        ...[...indices].sort((a, b) => a - b).map((index) => {
          const row = rows[index];
          const button = document.createElement("button");
          button.type = "button";
          button.className = `message-marker ${row.role}`;
          button.dataset.index = String(index);
          button.style.top = `${index * size}px`;
          const speaker = row.role === "user" ? "Your prompt" : row.speaker;
          const label = `${speaker}, message ${index + 1} of ${rows.length}: ${
            row.excerpt || "Reply in progress"
          }`;
          button.setAttribute("aria-label", label);
          button.title = label;
          const line = document.createElement("span");
          line.className = `marker-line ${row.role}`;
          line.setAttribute("aria-hidden", "true");
          button.append(line);
          button.onclick = () => jump(index);
          return button;
        }),
      );
      windowKey = key;
      if (focusedIndex !== undefined) {
        track.querySelector(`[data-index="${focusedIndex}"]`)?.focus({ preventScroll: true });
      }
    }
    if (!track.querySelector(`[data-index="${focusIndex}"]`) && track.firstElementChild) {
      focusIndex = Number(track.firstElementChild.dataset.index);
    }
    for (const button of track.children) {
      const index = Number(button.dataset.index);
      button.tabIndex = index === focusIndex ? 0 : -1;
      if (index === current) button.setAttribute("aria-current", "location");
      else button.removeAttribute("aria-current");
    }
  }
  function update() {
    frame = 0;
    if (rail.hidden || !region.clientHeight) return;
    if (layoutDirty) measure();
    const position = region.scrollTop + Math.min(80, region.clientHeight * .2);
    let low = 0, high = tops.length - 1;
    while (low < high) {
      const middle = Math.ceil((low + high) / 2);
      if (tops[middle] <= position) low = middle;
      else high = middle - 1;
    }
    const visibleTarget = navigating && target >= 0 && tops[target] >= region.scrollTop - 24 &&
      tops[target] < region.scrollTop + region.clientHeight;
    const atEnd = region.scrollHeight - region.scrollTop - region.clientHeight < 2;
    const next = visibleTarget ? target : atEnd ? tops.length - 1 : tops.length ? low : -1;
    if (current !== next) {
      current = next;
      if (!list.contains(document.activeElement)) {
        focusIndex = current;
        revealMarker(current);
      }
    }
    renderWindow();
  }
  function schedule(dirty = false) {
    layoutDirty ||= dirty;
    if (!frame) frame = requestAnimationFrame(update);
  }
  function sync() {
    cancelNavigation();
    const names = {
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
    rows = getMessages().map((message) => ({
      role: message.role,
      speaker: `${names[message.persona] || "WhiteEye"} response`,
      excerpt: message.content.replace(/\s+/g, " ").slice(0, 80),
    }));
    lastPrompt = rows.findLastIndex((row) => row.role === "user");
    lastResponse = rows.findLastIndex((row) => row.role === "assistant");
    prompt.disabled = lastPrompt < 0;
    response.disabled = lastResponse < 0;
    rail.hidden = rows.length === 0;
    region.parentElement.classList.toggle("has-message-navigation", rows.length > 0);
    current = -1;
    focusIndex = Math.max(0, rows.length - 1);
    windowKey = "";
    track.replaceChildren();
    track.style.height = `${rows.length * step()}px`;
    schedule(true);
  }
  prompt.onclick = () => jump(lastPrompt, true);
  response.onclick = () => jump(lastResponse, true);
  list.addEventListener("scroll", () => {
    if (!frame) frame = requestAnimationFrame(update);
  }, { passive: true });
  list.addEventListener("keydown", (event) => {
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const index = Number(document.activeElement?.dataset.index ?? focusIndex);
    const next = event.key === "Home"
      ? 0
      : event.key === "End"
      ? rows.length - 1
      : Math.max(0, Math.min(rows.length - 1, index + (event.key === "ArrowDown" ? 1 : -1)));
    jump(next, false, true);
  });
  region.addEventListener("scroll", () => schedule(), { passive: true });
  region.addEventListener("wheel", cancelNavigation, { passive: true });
  region.addEventListener("touchstart", cancelNavigation, { passive: true });
  new ResizeObserver(() => schedule(true)).observe(messagesRoot);
  new ResizeObserver(() => {
    windowKey = "";
    schedule(true);
  }).observe(region);
  coarse.addEventListener("change", sync);
  return {
    sync,
    cancelNavigation,
    get navigating() {
      return navigating;
    },
  };
}
