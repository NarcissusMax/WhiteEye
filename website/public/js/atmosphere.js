// An engraved eye follows the native pointer without a particle trail. All motion uses time-based transforms, with no forced layout or node churn.
export function setupAtmosphere({ force = false } = {}) {
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  const pointer = matchMedia("(pointer: fine)");
  const root = document.documentElement;
  if ((!pointer.matches && !force) || document.querySelector(".cursor-light")) return;
  const light = document.createElement("div");
  light.className = "cursor-light";
  light.setAttribute("aria-hidden", "true");
  const halo = document.createElement("span");
  halo.className = "cursor-halo";
  const eye = document.createElement("span");
  eye.className = "cursor-focus";
  light.append(halo, eye);
  document.body.append(light);
  let frame = 0, x = 0, y = 0, eyeX = 0, eyeY = 0, last = 0;
  let present = false, interactive = false;
  const position = (node, px, py, radiusX, radiusY = radiusX) => {
    node.style.transform = `translate3d(${(px - radiusX).toFixed(1)}px, ${
      (py - radiusY).toFixed(1)
    }px, 0)`;
  };
  const reset = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    present = false;
    root.classList.remove("cursor-present", "cursor-over-action");
  };
  const animate = (now) => {
    frame = 0;
    if (!present || document.hidden || motion.matches || root.dataset.motion === "paused") return;
    const dt = Math.min((now - last) / 1000, .05);
    last = now;
    const ease = 1 - Math.exp(-dt * 20);
    eyeX += (x - eyeX) * ease;
    eyeY += (y - eyeY) * ease;
    position(halo, eyeX, eyeY, 70);
    position(eye, eyeX, eyeY, 21, 15);
    const unsettled = Math.hypot(x - eyeX, y - eyeY) > .1;
    if (root.classList.contains("cursor-over-action") !== interactive) {
      root.classList.toggle("cursor-over-action", interactive);
    }
    if (!root.classList.contains("cursor-present")) root.classList.add("cursor-present");
    if (unsettled) frame = requestAnimationFrame(animate);
  };
  document.addEventListener("pointermove", (event) => {
    if (
      event.pointerType === "touch" || document.hidden || motion.matches ||
      root.dataset.motion === "paused"
    ) return;
    x = event.clientX;
    y = event.clientY;
    if (!present) {
      eyeX = x;
      eyeY = y;
      present = true;
    }
    interactive = Boolean(
      event.target instanceof Element &&
        event.target.closest("button, a, textarea, input, select, summary, label, [role='button']"),
    );
    if (!frame) {
      last = performance.now();
      frame = requestAnimationFrame(animate);
    }
  }, { passive: true });
  root.addEventListener("pointerleave", reset, { passive: true });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) reset();
  });
  globalThis.addEventListener("blur", reset);
  motion.addEventListener("change", reset);
  globalThis.addEventListener("whiteeye:motionchange", reset);
}
