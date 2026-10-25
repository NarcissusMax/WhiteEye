// The room is usable immediately. Load its dimensional enhancement on intent.
const host = document.querySelector("#rose-scene");
const welcome = document.querySelector("#welcome");
const reduced = matchMedia("(prefers-reduced-motion: reduce)");
let requested = false;

function enhance() {
  if (
    requested || !host || !welcome || welcome.hidden || reduced.matches ||
    document.documentElement.dataset.motion === "paused"
  ) return;
  requested = true;
  const load = () => {
    if (
      welcome.hidden || document.hidden || reduced.matches ||
      document.documentElement.dataset.motion === "paused"
    ) {
      requested = false;
      return;
    }
    import("./engraving-scene.js").catch(() => {
      host.dataset.ready = "false";
    });
  };
  if ("requestIdleCallback" in globalThis) requestIdleCallback(load, { timeout: 1200 });
  else setTimeout(load, 0);
}
function welcomeIntent(event) {
  if (event.target instanceof Element && event.target.closest("#welcome")) enhance();
}
document.addEventListener("pointermove", welcomeIntent, { passive: true });
document.addEventListener("pointerdown", welcomeIntent, { passive: true });
document.querySelector("#motion-toggle")?.addEventListener("click", enhance);

// The still image appears first; spatial detail arrives after the initial paint.
if ('requestIdleCallback' in globalThis) requestIdleCallback(enhance, { timeout: 1600 });
else setTimeout(enhance, 800);
globalThis.addEventListener('whiteeye:motionchange', enhance);
