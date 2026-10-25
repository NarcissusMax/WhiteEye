// Motion belongs to the course chrome. Quoted text is never split or rewritten.
const root = document.documentElement;
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const easing = getComputedStyle(root).getPropertyValue('--ease-room').trim() || 'ease-out';
const timings = { press: 140, feedback: 200, reveal: 260, disclosure: 240, page: 300 };
const running = new Set();
const owners = new WeakMap();
const disclosures = new WeakMap();
let viewTransition;
let navigation = 0;
let reveals;
let artObserver;
let revealTargets = new Set();

export function motionEnabled() {
  return !reduced.matches && root.dataset.motion !== 'paused' && !document.hidden;
}

function animate(node, frames, options = {}, key = 'default') {
  if (!node || !motionEnabled() || !node.animate) return null;
  let owned = owners.get(node);
  if (!owned) { owned = new Map(); owners.set(node, owned); }
  owned.get(key)?.cancel();
  const animation = node.animate(frames, { duration: timings.feedback, easing, ...options });
  owned.set(key, animation); running.add(animation);
  const clear = () => { running.delete(animation); if (owned.get(key) === animation) owned.delete(key); };
  animation.finished.then(clear, clear);
  return animation;
}

function finishTransientMotion() {
  viewTransition?.skipTransition();
  for (const animation of [...running]) {
    try { animation.finish(); } catch { animation.cancel(); }
  }
  reveals?.disconnect();
  for (const target of revealTargets) target.classList.remove('motion-awaiting');
  revealTargets.clear();
}
window.addEventListener('whiteeye:motionchange', () => { if (!motionEnabled()) finishTransientMotion(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) finishTransientMotion(); });
reduced.addEventListener('change', () => { if (reduced.matches) finishTransientMotion(); });

export function updateAnimatedText(node, value) {
  if (!node || node.textContent === value) return;
  const previous = node.textContent;
  node.textContent = value;
  if (previous && previous !== '—') animate(node, [{ opacity: .35, transform: 'translateY(3px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: timings.feedback }, 'text');
}

export function confirmMotion(nodes) {
  for (const node of nodes.filter(Boolean)) {
    animate(node, [{ opacity: .5 }, { opacity: 1 }], { duration: timings.reveal }, 'confirm');
    node.classList.remove('motion-confirmed');
    if (motionEnabled()) {
      node.classList.add('motion-confirmed');
      node.addEventListener('animationend', () => node.classList.remove('motion-confirmed'), { once: true });
    }
  }
}

export function revealFeedback(node) {
  animate(node, [{ opacity: 0, transform: 'translateY(-6px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: timings.feedback }, 'feedback');
}

export function animateSearchResults(container) {
  if (!motionEnabled()) return;
  // Keep a repeated typing interaction short; never delay or hide its results.
  const items = [...container.children].slice(0, 8);
  items.forEach((item, index) => animate(item, [{ opacity: .25, transform: 'translateX(-5px)' }, { opacity: 1, transform: 'translateX(0)' }], { duration: 140, delay: index * 12 }, 'search'));
}

export function enhanceDisclosure(details) {
  if (disclosures.has(details)) return;
  const summary = details.querySelector(':scope > summary');
  if (!summary) return;
  const content = document.createElement('div'); content.className = 'disclosure-content';
  for (const child of [...details.childNodes]) if (child !== summary) content.append(child);
  details.append(content);
  const state = { animation: null, desired: details.open, content, revision: 0 };
  disclosures.set(details, state);
  summary.addEventListener('click', event => {
    event.preventDefault();
    setDisclosure(details, !state.desired, true);
  });
  details.addEventListener('toggle', () => {
    if (!state.animation) { state.desired = details.open; content.inert = !details.open; }
  });
}

export function setDisclosure(details, open, withMotion = false) {
  const state = disclosures.get(details);
  if (!state) { details.open = open; return; }
  if (state.desired === open && (!state.animation || withMotion)) return;
  const revision = ++state.revision;
  const start = details.getBoundingClientRect().height;
  state.animation?.cancel(); state.animation = null;
  state.desired = open;
  if (!withMotion || !motionEnabled()) {
    details.open = open; state.content.inert = !open; details.style.removeProperty('overflow');
    return;
  }
  details.open = true;
  state.content.inert = !open;
  const style = getComputedStyle(details);
  const chrome = parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth) + parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
  const closed = details.querySelector(':scope > summary').getBoundingClientRect().height + chrome;
  const full = Math.max(details.scrollHeight + parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth), closed);
  details.style.overflow = 'clip';
  const animation = animate(details, [{ height: `${start}px` }, { height: `${open ? full : closed}px` }], { duration: timings.disclosure, fill: 'both' }, 'disclosure');
  state.animation = animation;
  if (open) animate(state.content, [{ opacity: 0, transform: 'translateY(-4px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: timings.disclosure }, 'content');
  const finish = () => {
    if (revision !== state.revision) return;
    details.open = open; state.animation = null;
    animation?.cancel(); details.style.removeProperty('overflow');
  };
  if (animation) animation.finished.then(finish, () => {}); else finish();
}

export function preparePageMotion(main, scroll, { enter = false, direction = 1 } = {}) {
  reveals?.disconnect();
  for (const target of revealTargets) target.classList.remove('motion-awaiting');
  revealTargets = new Set();
  main.querySelectorAll('details').forEach(enhanceDisclosure);
  artObserver?.disconnect();
  artObserver = new IntersectionObserver(entries => {
    for (const entry of entries) {
      entry.target.classList.toggle('art-in-view', entry.isIntersecting);
      if (entry.isIntersecting && !entry.target.classList.contains('art-revealed')) {
        entry.target.classList.add('art-revealed');
      }
    }
  }, { root: scroll, threshold: 0 });
  main.querySelectorAll('.chapter-art:not(.compact-art), .graph-invitation, .lesson-journey').forEach(node => artObserver.observe(node));
  if (!motionEnabled()) return;
  const bounds = scroll.getBoundingClientRect();
  const candidates = [...main.querySelectorAll('.chapter-card, .phase-divider, .module-lesson-link, .reader-section-heading, .practice-item, .flashcard, .journal-editor, .resources-section, .whiteeye-quote, .lesson-connections, .graph-invitation, .connection-branch, .course-concept, .course-example, .course-model-steps li')];
  // Read geometry as a batch before applying any reveal classes.
  const below = candidates.filter(node => node.getBoundingClientRect().top >= bounds.bottom - 12);
  reveals = new IntersectionObserver(entries => {
    let stagger = 0;
    for (const entry of entries) if (entry.isIntersecting) {
      entry.target.classList.remove('motion-awaiting');
      revealTargets.delete(entry.target); reveals.unobserve(entry.target);
      animate(entry.target, [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: timings.reveal, delay: Math.min(stagger++ * 35, 105) }, 'reveal');
    }
  }, { root: scroll, threshold: 0, rootMargin: '0px 0px 24px 0px' });
  for (const node of below) { revealTargets.add(node); node.classList.add('motion-awaiting'); reveals.observe(node); }
  if (enter) {
    const pieces = main.querySelectorAll('.breadcrumbs, .reader-header, .lesson-journey, .reader-question, .quote-heading, .reader-toc, .graph-header, .graph-toolbar, .graph-body');
    [...pieces].forEach((node, index) => animate(node, [{ opacity: 0, transform: `translate(${direction * 26}px, 12px)` }, { opacity: 1, transform: 'translate(0, 0)' }], { duration: timings.page, delay: Math.min(index * 50, 150) }, 'entrance'));
  }
}

export function selectionMotion(container) {
  const current = container.querySelector('.rail-lesson[aria-current="page"]');
  if (!current || current.dataset.motionSelected === 'true') return;
  container.querySelectorAll('[data-motion-selected]').forEach(node => delete node.dataset.motionSelected);
  current.dataset.motionSelected = 'true';
  animate(current, [{ opacity: .45, transform: 'translateX(-3px)' }, { opacity: 1, transform: 'translateX(0)' }], { duration: timings.page }, 'selection');
}

export async function transitionPage(update, { direction = 1, main, scroll, initial = false } = {}) {
  const turn = ++navigation;
  const previous = viewTransition;
  viewTransition = null;
  previous?.skipTransition();
  // A skipped native transition still runs its pending DOM callback. Let that
  // settle before accepting another snapshot, and ignore superseded callbacks.
  if (previous) await previous.updateCallbackDone.catch(() => {});
  if (turn !== navigation) return;
  root.dataset.courseDirection = direction < 0 ? 'backward' : 'forward';
  if (!motionEnabled() || initial) {
    update(); preparePageMotion(main, scroll, { enter: initial, direction }); return;
  }
  root.dataset.courseTransition = 'running';
  if (typeof document.startViewTransition === 'function') {
    const transition = document.startViewTransition(() => {
      if (turn !== navigation) return;
      update();
      // Do not animate inside a snapshot. Offscreen reveals are registered after it ends.
    });
    viewTransition = transition;
    transition.ready.catch(() => {});
    transition.updateCallbackDone.catch(() => {});
    try { await transition.finished; } catch { /* Navigation still completes when snapshots cannot be made. */ }
    if (turn === navigation) {
      viewTransition = null; delete root.dataset.courseTransition;
      preparePageMotion(main, scroll);
    }
  } else {
    // The fallback updates navigation immediately and animates the new reading surface.
    update();
    const animation = animate(main, [{ opacity: 0, transform: `translateX(${direction * 22}px)` }, { opacity: 1, transform: 'translateX(0)' }], { duration: timings.page }, 'page');
    if (animation) await animation.finished.catch(() => {});
    if (turn === navigation) { delete root.dataset.courseTransition; preparePageMotion(main, scroll); }
  }
}

export function openCourseDrawer(dialog) {
  if (dialog.open) return;
  dialog.showModal();
  animate(dialog, [{ opacity: .4, transform: 'translateX(-32px)' }, { opacity: 1, transform: 'translateX(0)' }], { duration: timings.page }, 'drawer');
}
export async function closeCourseDrawer(dialog, { immediate = false, restoreFocus = true } = {}) {
  if (!dialog.open) return;
  dialog.dataset.restoreFocus = String(restoreFocus);
  if (!immediate && motionEnabled()) {
    const animation = animate(dialog, [{ opacity: 1, transform: 'translateX(0)' }, { opacity: 0, transform: 'translateX(-32px)' }], { duration: timings.feedback }, 'drawer');
    if (animation) await animation.finished.catch(() => {});
  }
  if (dialog.open) dialog.close();
}

document.addEventListener('pointerdown', event => {
  if (event.button !== 0 || !motionEnabled()) return;
  const target = event.target.closest('.course-button, .complete-button, .icon-button, .chapter-card, .resource-links a');
  if (!target || target.matches(':disabled, [aria-disabled="true"]')) return;
  animate(target, [{ transform: 'scale(1)' }, { transform: 'scale(.97)', offset: .4 }, { transform: 'scale(1)' }], { duration: timings.press }, 'press');
});
// Small click echoes stay on interactive chrome and never touch quoted text.
document.addEventListener('click', event => {
  if (!motionEnabled()) return;
  const target = event.target.closest('.course-button, .graph-tools button, .journey-step-number, .chapter-card, .rail-graph');
  if (!target || target.matches(':disabled')) return;
  const rect = target.getBoundingClientRect();
  const echo = document.createElement('span'); echo.className = 'course-click-echo'; echo.setAttribute('aria-hidden', 'true');
  const size = Math.max(rect.width, rect.height);
  echo.style.width = echo.style.height = `${size}px`;
  echo.style.left = `${(event.detail ? event.clientX - rect.left : rect.width / 2) - size / 2}px`;
  echo.style.top = `${(event.detail ? event.clientY - rect.top : rect.height / 2) - size / 2}px`;
  target.append(echo);
  const effect = animate(echo, [{ opacity: .23, transform: 'scale(0)' }, { opacity: 0, transform: 'scale(2)' }], { duration: 560 }, 'echo');
  if (effect) effect.finished.then(() => echo.remove(), () => echo.remove()); else echo.remove();
});
