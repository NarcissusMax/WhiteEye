// Finite, flat interface feedback; source quotations remain untouched.
const root = document.documentElement;
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const running = new Set(), owners = new WeakMap();
const canMove = () => !reduced.matches && root.dataset.motion !== 'paused' && !document.hidden;
let sidebarBefore;
const themeAssets = {
  celestial: [
    ['wordmark', '/assets/celestial/cutout-70-dff3c22137a2.webp'],
    ['brandArt', '/assets/celestial/cutout-6-6b81bddfa225.webp'],
    ['sidebarArt', '/assets/celestial/cutout-3-6cfddc1981ae.webp'],
    ['footerArt', '/assets/celestial/cutout-87-5dec2743282d.webp'],
    ['openingArt', '/assets/celestial/cutout-70-dff3c22137a2.webp'],
  ],
  blood: [
    ['wordmark', '/assets/satin/cutout-65-050a4483956b.webp'],
    ['brandArt', '/assets/satin/cutout-8-a79a001e5a6c.webp'],
    ['sidebarArt', '/assets/satin/crop-6-7efd86393f52.webp'],
    ['footerArt', '/assets/satin/cutout-83-18cafbe94377.webp'],
    ['openingArt', '/assets/blood/cutout-3-66706a613915.webp'],
  ],
  parchment: [
    ['wordmark', '/assets/quiet/cutout-69-a3f4bd44461c.webp'],
    ['brandArt', '/assets/quiet/cutout-6-13ca93fff4d3.webp'],
    ['footerArt', '/assets/quiet/cutout-87-5c1703a161a0.webp'],
    ['openingArt', '/assets/quiet/cutout-69-a3f4bd44461c.webp'],
  ],
};
const loaded = new Map(); let assetGeneration = 0;
function prepareThemeArt() {
  const generation = ++assetGeneration;
  const theme = root.dataset.appearance || 'blood';
  for (const [flag, src] of themeAssets[theme]) {
    delete root.dataset[flag];
    if (!loaded.has(src)) loaded.set(src, new Promise(resolve => {
      const image = new Image(); image.onload = () => resolve(true);
      image.onerror = () => resolve(false); image.src = src;
    }));
    loaded.get(src).then(success => {
      if (success && generation === assetGeneration) root.dataset[flag] = 'ready';
    });
  }
}
window.addEventListener('whiteeye:themechange', prepareThemeArt);
prepareThemeArt();

function play(node, frames, options = {}, key = 'reveal') {
  if (!node || !canMove()) return;
  let map = owners.get(node);
  if (!map) { map = new Map(); owners.set(node, map); }
  map.get(key)?.cancel();
  const animation = node.animate(frames, { duration: 220, easing: 'ease-out', ...options });
  map.set(key, animation); running.add(animation);
  const finish = () => { running.delete(animation); if (map.get(key) === animation) map.delete(key); };
  animation.finished.then(finish, finish);
}
function reveal(nodes) {
  [...nodes].slice(0, 8).forEach((node, i) => play(node, [
    { opacity: 0, transform: 'translateY(5px)' },
    { opacity: 1, transform: 'translateY(0)' },
  ], { delay: i * 18 }));
}
function settle() {
  for (const animation of [...running]) {
    try { animation.finish(); } catch { animation.cancel(); }
  }
}
window.addEventListener('whiteeye:motionchange', () => { if (!canMove()) settle(); });
reduced.addEventListener('change', () => { if (!canMove()) settle(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) settle(); });
window.addEventListener('blur', settle);
window.addEventListener('pagehide', settle);

window.addEventListener('whiteeye:persona', () => reveal(document.querySelectorAll('.welcome-copy > :not(.welcome-mark)')));
window.addEventListener('whiteeye:conversation', () => {
  const messages = document.querySelector('#messages');
  if (messages?.children.length) reveal([messages]);
  else reveal(document.querySelectorAll('.welcome-copy > :not(.welcome-mark)'));
});
window.addEventListener('whiteeye:surface', event => {
  reveal(document.querySelectorAll(event.detail.view === 'reading'
    ? '.reading-heading, .reading-art, .reading-grid article'
    : '.welcome-copy, .composer-wrap'));
});
window.addEventListener('whiteeye:sidebarbefore', () => {
  sidebarBefore = document.querySelector('#main')?.getBoundingClientRect();
});
window.addEventListener('whiteeye:sidebarafter', () => {
  const main = document.querySelector('#main'); if (!main || !sidebarBefore) return;
  const after = main.getBoundingClientRect();
  play(main, [{ transform: `translateX(${sidebarBefore.x - after.x}px)` }, { transform: 'translateX(0)' }], { duration: 200 }, 'layout');
  sidebarBefore = null;
});
for (const id of ['model-options', 'music-panel', 'error', 'chat-notice']) {
  const node = document.getElementById(id); if (!node) continue;
  new MutationObserver(() => {
    if (!node.hidden) play(node, [{ opacity: 0, transform: 'translateY(-3px)' }, { opacity: 1, transform: 'none' }], { duration: 160 });
  }).observe(node, { attributes: true, attributeFilter: ['hidden'] });
}
document.addEventListener('toggle', event => {
  if (event.target.matches('details[open]') && !event.target.closest('.course-room')) {
    reveal([...event.target.children].filter(n => n.tagName !== 'SUMMARY'));
  }
}, true);
if (!document.body.classList.contains('course-room')) reveal(document.querySelectorAll('.welcome-copy'));
