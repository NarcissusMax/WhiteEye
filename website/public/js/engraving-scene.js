// The original engravings are the materials of a small, real 3D stage.
import {
  AdditiveBlending, BufferGeometry, Float32BufferAttribute, Mesh, PerspectiveCamera,
  PlaneGeometry, Points, PointsMaterial, Scene, ShaderMaterial, SRGBColorSpace,
  TextureLoader, Vector2, WebGLRenderer,
} from './vendor/three.module.min.js';

const root = document.documentElement;
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const finePointer = matchMedia('(pointer: fine)');
const compact = matchMedia('(max-width: 760px)');
const home = document.querySelector('#rose-scene');
if (home) createEngravingScene(home, { landscape: home.dataset.landscape === 'true', chamber: home.dataset.scene === 'chamber' });

export function createEngravingScene(host, { landscape = false, chamber = false } = {}) {
  const art = host.parentElement;
  const fallback = art?.querySelector('img');
  if (!fallback || host.querySelector('canvas')) return () => {};
  let renderer;
  try {
    renderer = new WebGLRenderer({ alpha: true, antialias: false, powerPreference: 'low-power' });
  } catch { host.dataset.ready = 'false'; return () => {}; }
  renderer.setPixelRatio(Math.min(devicePixelRatio, finePointer.matches ? 1.5 : 1));
  renderer.setClearColor(0x0b0c10, 0);
  renderer.domElement.setAttribute('aria-hidden', 'true');
  host.append(renderer.domElement);
  const scene = new Scene();
  const camera = new PerspectiveCamera(32, 1, .1, 30);
  camera.position.z = 8.6;
  const ratio = Number(fallback.getAttribute('width')) / Number(fallback.getAttribute('height')) || (landscape ? 1.5 : 2 / 3);
  const geometry = new PlaneGeometry(ratio, 1, 72, 96);
  const uniforms = {
    engraving: { value: null }, time: { value: 0 }, motion: { value: 0 },
    pointer: { value: new Vector2() }, landscape: { value: Number(landscape) }, chamber: { value: Number(chamber) },
  };
  const material = new ShaderMaterial({
    uniforms,
    vertexShader: `
      uniform float landscape;
      uniform float chamber;
      varying vec2 artUv;
      varying float reliefDepth;
      void main() {
        artUv = uv;
        float opening = smoothstep(.43, .53, uv.x)
          * (1.0 - smoothstep(.85, .95, uv.x))
          * smoothstep(.13, .25, uv.y)
          * (1.0 - smoothstep(.76, .92, uv.y));
        float foliage = exp(-pow((uv.x - .33) * 8.0, 2.0));
        float landscapeRelief = pow(abs(uv.x - .5) * 2.0, 3.0) * .55
          + (1.0 - smoothstep(.0, .35, uv.y)) * .2 - .25;
        vec3 relief = position;
        reliefDepth = mix(.16 + foliage * .23 - opening * .65, landscapeRelief, landscape);
        float chamberWindow = smoothstep(.64, .74, uv.x) * (1.0 - smoothstep(.91, .99, uv.x));
        float chamberRelief = .12 - chamberWindow * .85 + (1.0 - smoothstep(.0, .20, uv.y)) * .32;
        relief.z = mix(reliefDepth, chamberRelief, chamber);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(relief, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D engraving;
      uniform float time;
      uniform float motion;
      uniform float landscape;
      uniform vec2 pointer;
      varying vec2 artUv;
      varying float reliefDepth;
      void main() {
        vec2 sampleUv = artUv;
        float water = smoothstep(.27, .36, artUv.y)
          * (1.0 - smoothstep(.49, .56, artUv.y))
          * smoothstep(.45, .58, artUv.x)
          * (1.0 - smoothstep(.80, .9, artUv.x));
        sampleUv.x += sin(artUv.y * 180.0 + time * .6) * water * .0013 * motion;
        vec3 ink = texture2D(engraving, sampleUv).rgb;
        vec2 moon = mix(vec2(.735, .686), vec2(.64, .65), landscape);
        vec2 distanceToMoon = (artUv - moon) * vec2(3.8, 3.0);
        float moonlight = exp(-dot(distanceToMoon, distanceToMoon));
        float light = 1.04 + motion * (.07 * sin(time * .45) * moonlight
          + pointer.x * .11 * smoothstep(.3, .9, artUv.x));
        vec3 glow = vec3(.012, .019, .032) * moonlight * (1.0 + .25 * sin(time * .4));
        gl_FragColor = vec4(ink * light + glow * motion, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
  const engraving = new Mesh(geometry, material);
  scene.add(engraving);
  // Small illuminated motes occupy different distances in front of the artwork.
  const dustGeometry = new BufferGeometry();
  const points = [], count = compact.matches ? 22 : 48;
  for (let i = 0; i < count; i++) {
    const seed = n => (Math.sin(n * 127.1 + 311.7) * 43758.5453) % 1;
    points.push(seed(i + 1) * 2.5, seed(i + 12) * 3.8, .2 + Math.abs(seed(i + 5)) * 1.8);
  }
  dustGeometry.setAttribute('position', new Float32BufferAttribute(points, 3));
  const dustMaterial = new PointsMaterial({ color: 0xb8c4d4, size: .013,
    transparent: true, opacity: .42, depthWrite: false, blending: AdditiveBlending });
  const dust = new Points(dustGeometry, dustMaterial); scene.add(dust);

  let texture, disposed = false, lost = false, visible = false, failed = false;
  let frame = 0, last = 0, elapsed = 0, width = 0, height = 0;
  let activeUntil = performance.now() + 9000;
  const target = new Vector2();
  const animated = () => !reduced.matches && root.dataset.motion !== 'paused';
  const listeners = [];
  const listen = (target, name, fn, options) => {
    target.addEventListener(name, fn, options);
    listeners.push(() => target.removeEventListener(name, fn, options));
  };
  function fail() {
    failed = true; host.dataset.ready = 'false';
    art.classList.remove('engraving-ready');
    cancelAnimationFrame(frame); frame = 0;
  }
  renderer.debug.onShaderError = fail;
  function render(now = performance.now()) {
    frame = 0;
    if (disposed || failed || lost || !texture || !width || !height || document.hidden || !visible) {
      host.dataset.state = 'idle'; return;
    }
    const moving = animated();
    if (moving && now - last < (finePointer.matches ? 1000 / 30 : 1000 / 20)) {
      frame = requestAnimationFrame(render); return;
    }
    const delta = Math.min(Math.max((now - last) / 1000, 0), .08); last = now;
    if (moving) {
      elapsed += delta; uniforms.pointer.value.lerp(target, 1 - Math.exp(-delta * 5));
      uniforms.time.value = elapsed;
    } else { uniforms.pointer.value.set(0, 0); uniforms.time.value = 0; }
    uniforms.motion.value = Number(moving);
    const amount = compact.matches ? .24 : .66;
    camera.position.x = uniforms.pointer.value.x * amount;
    camera.position.y = uniforms.pointer.value.y * amount * .5;
    camera.lookAt(0, 0, -.08);
    dust.visible = moving;
    dust.position.y = Math.sin(elapsed * .16) * .2;
    dust.rotation.z = Math.sin(elapsed * .09) * .06;
    dustMaterial.opacity = .28 + Math.sin(elapsed * .65) * .1;
    try { renderer.render(scene, camera); } catch { fail(); return; }
    if (failed) return;
    host.dataset.ready = 'true'; art.classList.add('engraving-ready');
    const continuing = moving && (now < activeUntil || uniforms.pointer.value.distanceTo(target) > .003);
    host.dataset.state = continuing ? 'running' : moving ? 'settled' : 'paused';
    if (continuing) frame = requestAnimationFrame(render);
  }
  function refresh() {
    cancelAnimationFrame(frame); frame = 0; last = performance.now() - 100;
    activeUntil = performance.now() + 6000; render();
  }
  const resize = new ResizeObserver(([entry]) => {
    ({ width, height } = entry.contentRect);
    if (!width || !height || disposed || lost) return refresh();
    renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix();
    const viewHeight = 2 * camera.position.z * Math.tan(camera.fov * Math.PI / 360);
    const imageHeight = Math.max(viewHeight, viewHeight * camera.aspect / ratio) * 1.09;
    engraving.scale.set(imageHeight, imageHeight, 1);
    const focus = landscape ? .5 : compact.matches ? .36 : .24;
    engraving.position.x = chamber && compact.matches ? (imageHeight * ratio - viewHeight * camera.aspect) * -.32 : 0;
    engraving.position.y = (imageHeight - viewHeight) * (focus - .5); refresh();
  });
  resize.observe(host);
  const visibility = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting; refresh();
  }); visibility.observe(host);
  function pointerMove(event) {
    if (event.pointerType === 'touch' || !finePointer.matches || !animated() || !visible) return;
    target.set(event.clientX / innerWidth * 2 - 1, 1 - event.clientY / innerHeight * 2);
    activeUntil = performance.now() + 4500;
    if (!frame) frame = requestAnimationFrame(render);
  }
  function pointerReset() {
    target.set(0, 0); if (!frame && visible && animated()) frame = requestAnimationFrame(render);
  }
  listen(document, 'pointermove', pointerMove, { passive: true });
  listen(root, 'pointerleave', pointerReset, { passive: true });
  listen(document, 'visibilitychange', refresh);
  listen(globalThis, 'blur', pointerReset);
  listen(globalThis, 'whiteeye:motionchange', refresh);
  listen(reduced, 'change', refresh);
  listen(renderer.domElement, 'webglcontextlost', event => {
    event.preventDefault(); lost = true; host.dataset.ready = 'false';
    art.classList.remove('engraving-ready'); refresh();
  });
  listen(renderer.domElement, 'webglcontextrestored', () => {
    lost = false; if (texture) texture.needsUpdate = true; refresh();
  });
  listen(globalThis, 'pageshow', refresh);
  function destroy() {
    if (disposed) return; disposed = true; cancelAnimationFrame(frame);
    resize.disconnect(); visibility.disconnect(); listeners.forEach(remove => remove());
    geometry.dispose(); material.dispose(); dustGeometry.dispose(); dustMaterial.dispose();
    texture?.dispose(); renderer.dispose(); renderer.domElement.remove();
    art.classList.remove('engraving-ready'); host.dataset.ready = 'false';
  }
  listen(globalThis, 'pagehide', event => { if (event.persisted) { cancelAnimationFrame(frame); frame = 0; } else destroy(); });
  new TextureLoader().load(fallback.currentSrc || fallback.src, loaded => {
    if (disposed) return loaded.dispose();
    texture = loaded; texture.colorSpace = SRGBColorSpace;
    texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
    uniforms.engraving.value = texture; refresh();
  }, undefined, fail);
  return destroy;
}
