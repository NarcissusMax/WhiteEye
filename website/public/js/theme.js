// Apply the saved appearance before styles paint; retain legacy dark/light preferences.
(() => {
  const root = document.documentElement;
  const key = 'whiteeye:theme:v2';
  const legacyKey = 'whiteeye:theme:v1';
  const defaultAppearance = 'blood';
  const names = { celestial: 'Celestial gothic', blood: 'Blood gothic', parchment: 'Parchment' };
  const colors = { celestial: '#01060d', blood: '#100d10', parchment: '#f0ebe0' };
  const valid = value => Object.hasOwn(names, value) ? value : defaultAppearance;
  const read = () => {
    try {
      const saved = localStorage.getItem(key);
      if (saved !== null) return valid(saved);
      const legacy = localStorage.getItem(legacyKey);
      return legacy === 'parchment' ? 'parchment' : legacy === 'blood' ? 'celestial' : defaultAppearance;
    } catch { return defaultAppearance; }
  };
  let appearance = read();
  const baseTheme = () => appearance === 'parchment' ? 'parchment' : 'blood';
  const meta = document.querySelector('meta[name="theme-color"]');
  const paint = () => {
    root.dataset.theme = baseTheme();
    root.dataset.appearance = appearance;
    if (meta) meta.content = colors[appearance];
  };
  paint();

  const updateImages = () => {
    document.querySelectorAll('img[data-blood-src]').forEach(image => {
      const requested = appearance;
      const next = requested === 'parchment' ? image.dataset.parchmentSrc
        : requested === 'celestial' ? image.dataset.celestialSrc || image.dataset.bloodSrc : image.dataset.bloodSrc;
      const ready = () => {
        if (root.dataset.appearance === requested) {
          image.dataset.assetTheme = baseTheme();
          image.dataset.assetAppearance = requested;
        }
      };
      if (image.getAttribute('src') === next && image.complete && image.naturalWidth) { ready(); return; }
      image.dataset.assetTheme = 'loading';
      image.onload = ready;
      image.src = next;
    });
  };
  const update = () => {
    paint();
    updateImages();
    document.querySelectorAll('[data-theme-toggle]').forEach(trigger => {
      trigger.setAttribute('aria-label', `Choose appearance; current: ${names[appearance]}`);
      const label = trigger.querySelector('[data-theme-label]');
      if (label) label.textContent = names[appearance];
    });
    document.querySelectorAll('[data-theme-option]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.themeOption === appearance));
    });
    window.dispatchEvent(new CustomEvent('whiteeye:themechange', { detail: { theme: baseTheme(), appearance } }));
  };
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-theme-option]').forEach(button => {
      button.addEventListener('click', () => {
        appearance = valid(button.dataset.themeOption);
        try { localStorage.setItem(key, appearance); } catch { /* Keep this session usable. */ }
        update();
        const picker = button.closest('.theme-picker');
        picker.open = false;
        picker.querySelector('summary').focus({ preventScroll: true });
      });
    });
    update();
  }, { once: true });
  document.addEventListener('pointerdown', event => {
    document.querySelectorAll('.theme-picker[open]').forEach(picker => {
      if (!picker.contains(event.target)) picker.open = false;
    });
  });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    const picker = document.querySelector('.theme-picker[open]');
    if (!picker) return;
    event.preventDefault(); event.stopPropagation();
    picker.open = false;
    picker.querySelector('summary').focus({ preventScroll: true });
  }, true);
  window.addEventListener('storage', event => {
    if (event.key === key || event.key === legacyKey || event.key === null) { appearance = read(); update(); }
  });
  window.addEventListener('whiteeye:courseview', updateImages);
})();
