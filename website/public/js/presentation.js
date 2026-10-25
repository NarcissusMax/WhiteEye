// A device-local preference; system reduced motion always takes precedence.
const root = document.documentElement;
const toggle = document.querySelector("#motion-toggle");
const label = document.querySelector("#motion-label");
const reduced = matchMedia("(prefers-reduced-motion: reduce)");
let enabled = true;
try {
  enabled = localStorage.getItem("whiteeye:motion") !== "off";
} catch { /* Motion control remains usable when storage is unavailable. */ }

function updateMotion() {
  const active = enabled && !reduced.matches;
  root.dataset.motion = active ? "running" : "paused";
  toggle.setAttribute("aria-pressed", String(active));
  toggle.setAttribute("aria-disabled", String(reduced.matches));
  toggle.setAttribute(
    "aria-label",
    reduced.matches
      ? "Reduced motion enabled in device settings"
      : active
      ? "Motion on, turn ambient motion off"
      : "Motion off, turn ambient motion on",
  );
  toggle.title = reduced.matches
    ? "Reduced motion follows your device setting"
    : "Toggle ambient motion";
  label.textContent = reduced.matches ? "Reduced motion" : active ? "Motion on" : "Motion off";
  globalThis.dispatchEvent(new Event("whiteeye:motionchange"));
}
toggle.addEventListener("click", () => {
  if (reduced.matches) return;
  enabled = !enabled;
  try {
    localStorage.setItem("whiteeye:motion", enabled ? "on" : "off");
  } catch { /* The current session still receives the preference. */ }
  updateMotion();
});
reduced.addEventListener("change", updateMotion);
document.addEventListener("visibilitychange", () => {
  root.classList.toggle("page-inactive", document.hidden);
});
updateMotion();
