// A finite opening sequence, dismissible immediately and once per session.
export function setupEntrance() {
  const dialog = document.querySelector('#entrance');
  const skip = document.querySelector('#skip-entrance');
  const replay = document.querySelector('#replay-entrance');
  if (!dialog || !skip || !replay) return;
  const root = document.documentElement;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const still = () => motion.matches || root.dataset.motion === 'paused';
  let timer, closeTimer, returnTo, run = 0;
  const clearTimers = () => { clearTimeout(timer); clearTimeout(closeTimer); };

  function finish(immediate = false) {
    clearTimers();
    if (!dialog.open) return;
    const current = run;
    const close = () => {
      if (current !== run || !dialog.open) return;
      dialog.close();
      dialog.classList.remove('leaving');
      // Avoid opening a mobile keyboard after the automatic introduction.
      const target = returnTo?.isConnected ? returnTo : document.querySelector('#main');
      target?.focus({ preventScroll: true });
      window.dispatchEvent(new Event('whiteeye:entrancecomplete'));
    };
    if (immediate || still()) close();
    else {
      dialog.classList.add('leaving');
      closeTimer = setTimeout(close, 350);
    }
  }

  function play(isReplay = false) {
    if (dialog.open) return;
    clearTimers(); run++;
    returnTo = isReplay ? replay : null;
    dialog.classList.remove('leaving');
    try { dialog.showModal(); } catch { return; }
    skip.focus({ preventScroll: true });
    // Explicit replay remains usable as a still opening when motion is disabled.
    if (!still()) timer = setTimeout(() => finish(), 3200);
  }

  skip.addEventListener('click', () => finish());
  dialog.addEventListener('cancel', event => { event.preventDefault(); finish(true); });
  dialog.addEventListener('close', () => { if (!dialog.open) clearTimers(); });
  replay.addEventListener('click', () => play(true));
  motion.addEventListener('change', () => { if (still()) finish(true); });
  window.addEventListener('whiteeye:motionchange', () => { if (still()) finish(true); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) finish(true); });

  let seen = false;
  try {
    seen = sessionStorage.getItem('whiteeye:entrance:v4') === 'seen';
    sessionStorage.setItem('whiteeye:entrance:v4', 'seen');
  } catch { /* Storage restrictions never block the conversation. */ }
  if (!seen && !still()) play();
}
