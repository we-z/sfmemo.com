import * as THREE from './vendor/three.module.js';

const surface = document.querySelector('.hero-visual');
const fallback = surface?.querySelector('.hero-chip');
const canvas = document.querySelector('#hero-canvas');
const nativeScroll = matchMedia('(max-width: 780px), (hover: none) and (pointer: coarse), (max-width: 960px) and (max-height: 480px)');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

async function initialize() {
  // Use the same baked artwork without generating millions of pixels during page load.
  const texture = await new THREE.TextureLoader().loadAsync('./chip-surface.png');
  await texture.image.decode();
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setClearColor(0, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-4, 4, 3, -3, 0.1, 30);
  camera.position.z = 12;
  const root = new THREE.Group();
  scene.add(root);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x484b48, 2));
  const key = new THREE.DirectionalLight(0xffffff, 2.3);
  key.position.set(-3, 5, 8);
  scene.add(key);

  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const side = new THREE.MeshStandardMaterial({ color: 0x171a19, roughness: 0.92 });
  const front = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.96, metalness: 0 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(5.8, 4, 0.28), [side, side, side, side, front, side]);
  root.add(body);
  // Solder balls sit directly in the package's rear face, with no backing plate.
  const balls = new THREE.InstancedMesh(new THREE.SphereGeometry(0.075, 12, 8), new THREE.MeshStandardMaterial({ color: 0xa6a7a5, metalness: 0.75, roughness: 0.35 }), 96);
  const placement = new THREE.Object3D();
  for (let y = 0; y < 8; y++) for (let x = 0; x < 12; x++) {
    placement.position.set((x - 5.5) * 0.44, (y - 3.5) * 0.44, -0.205);
    placement.updateMatrix(); balls.setMatrixAt(y * 12 + x, placement.matrix);
  }
  root.add(balls);

  const current = new THREE.Vector2(0, 0);
  const target = current.clone();
  const offset = new THREE.Vector2();
  let drag = null, frame = 0, visible = true, initialized = false;
  let tapCandidate = null, tapStarted = null;
  const tapAngle = new THREE.Vector2();
  let heroTop = 0, travel = 1;
  const hero = document.querySelector('.hero-horizon');
  const meta = hero.querySelector('.hero-meta');
  const heroFrame = hero.querySelector('.hero-frame');
  let aspect = 1, baseViewWidth = 8.05, lastViewWidth = 0;
  let width = 0, height = 0, pixelRatio = 0;
  let scrollDirty = false, lastFrameTime = 0, needsRender = true;
  let departure = 0, targetDeparture = 0;
  function render(now = performance.now()) {
    frame = 0;
    if (!visible || document.hidden) return;
    if (scrollDirty) { scrollDirty = false; updateScroll(false); }
    const dt = lastFrameTime ? Math.min(now - lastFrameTime, 32) : 1000 / 60;
    lastFrameTime = now;
    // Brief, refresh-rate-independent settling fills gaps between native scroll samples.
    const blend = reduced.matches ? 1 : 1 - Math.exp(-dt / (drag ? 40 : 32));
    const rotationChanged = current.distanceToSquared(target) > 0.00000001;
    if (rotationChanged) current.lerp(target, blend);
    else current.copy(target);
    departure += (targetDeparture - departure) * blend;
    if (Math.abs(targetDeparture - departure) < 0.0001) departure = targetDeparture;
    meta.style.opacity = `${1 - departure}`;
    meta.style.transform = `translate3d(0, ${-80 * departure}px, 0)`;
    const wasTapping = tapStarted !== null;
    let wobble = 0;
    if (wasTapping) {
      const phase = clamp((now - tapStarted) / 600, 0, 1);
      if (phase === 1 || reduced.matches) tapStarted = null;
      else wobble = Math.sin(phase * Math.PI * 2) * (1 - phase) ** 2;
    }
    root.rotation.set(current.x + tapAngle.x * wobble, current.y + tapAngle.y * wobble, 0);
    root.updateMatrix();
    // Symmetric bounds include the solder balls extending behind the package.
    const m = root.matrix.elements;
    const projectedWidth = Math.abs(m[0]) * 5.8 + Math.abs(m[4]) * 4 + Math.abs(m[8]) * 0.56;
    const projectedHeight = Math.abs(m[1]) * 5.8 + Math.abs(m[5]) * 4 + Math.abs(m[9]) * 0.56;
    const viewWidth = Math.max(baseViewWidth, projectedWidth * 1.12, projectedHeight * aspect * 1.12);
    if (Math.abs(viewWidth - lastViewWidth) > 0.00001) {
      lastViewWidth = viewWidth;
      camera.left = -viewWidth / 2; camera.right = viewWidth / 2;
      camera.top = viewWidth / aspect / 2; camera.bottom = -camera.top;
      camera.updateProjectionMatrix();
    }
    if (needsRender || rotationChanged || wasTapping) renderer.render(scene, camera);
    needsRender = false;
    if (current.distanceToSquared(target) > 0.00000001 || departure !== targetDeparture || tapStarted !== null) schedule();
    else lastFrameTime = 0;
  }
  function schedule() { if (initialized && !frame && visible && !document.hidden) frame = requestAnimationFrame(render); }
  function updateScroll(requestFrame = true) {
    const t = reduced.matches ? 0 : clamp((scrollY - heroTop) / (travel * 0.82), 0, 1);
    const progress = t * t * (3 - 2 * t);
    if (!drag) target.set(-progress * 0.20 + offset.x, progress * 0.32 + offset.y);
    const phase = reduced.matches ? 0 : clamp(((scrollY - heroTop) / travel - 0.08) / 0.52, 0, 1);
    targetDeparture = phase * phase * (3 - 2 * phase);
    if (requestFrame) schedule();
  }
  function resize() {
    const rect = surface.getBoundingClientRect();
    aspect = rect.width / Math.max(rect.height, 1);
    baseViewWidth = nativeScroll.matches ? 6.7 : 8.05;
    lastViewWidth = 0;
    needsRender = true;
    const nextRatio = Math.min(devicePixelRatio, 2);
    if (pixelRatio !== nextRatio || width !== rect.width || height !== rect.height) {
      pixelRatio = nextRatio; width = rect.width; height = rect.height;
      renderer.setPixelRatio(pixelRatio);
      renderer.setSize(width, height, false);
    }
    heroTop = hero.getBoundingClientRect().top + scrollY;
    const pinnedTravel = hero.offsetHeight - heroFrame.offsetHeight;
    travel = Math.max(1, pinnedTravel > 1 ? pinnedTravel : hero.offsetHeight);
    updateScroll();
  }
  const raycaster = new THREE.Raycaster();
  function hitsChip(event) {
    const bounds = canvas.getBoundingClientRect();
    raycaster.setFromCamera(new THREE.Vector2((event.clientX - bounds.left) / bounds.width * 2 - 1, -(event.clientY - bounds.top) / bounds.height * 2 + 1), camera);
    return raycaster.intersectObject(root, true).length > 0;
  }
  // Observe taps without capturing touch input or blocking native scrolling/pinching.
  surface.addEventListener('pointerdown', event => {
    tapCandidate = null;
    if (!initialized || reduced.matches || !event.isPrimary || event.button !== 0) return;
    if (!nativeScroll.matches && event.pointerType === 'mouse') return;
    if (tapStarted !== null || !hitsChip(event)) return;
    tapCandidate = { id: event.pointerId, x: event.clientX, y: event.clientY, time: performance.now() };
  }, { passive: true });
  surface.addEventListener('pointermove', event => {
    if (tapCandidate && (event.pointerId !== tapCandidate.id || Math.hypot(event.clientX - tapCandidate.x, event.clientY - tapCandidate.y) > 10)) tapCandidate = null;
  }, { passive: true });
  surface.addEventListener('pointerup', event => {
    const tap = tapCandidate; tapCandidate = null;
    if (!tap || event.pointerId !== tap.id || reduced.matches || performance.now() - tap.time > 350) return;
    if (Math.hypot(event.clientX - tap.x, event.clientY - tap.y) > 10 || !hitsChip(event)) return;
    const bounds = canvas.getBoundingClientRect();
    tapAngle.set(event.clientY > bounds.top + bounds.height / 2 ? -0.10 : 0.10, event.clientX > bounds.left + bounds.width / 2 ? 0.16 : -0.16);
    tapStarted = performance.now();
    schedule();
  }, { passive: true });
  surface.addEventListener('pointercancel', () => { tapCandidate = null; }, { passive: true });
  surface.addEventListener('pointerleave', () => { tapCandidate = null; }, { passive: true });
  canvas.addEventListener('pointerdown', event => {
    if (!initialized || nativeScroll.matches || event.pointerType !== 'mouse' || event.button !== 0 || !hitsChip(event)) return;
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, rotation: target.clone(), offset: offset.clone() };
    canvas.setPointerCapture(event.pointerId);
    surface.dataset.dragging = 'true';
    event.preventDefault();
  });
  canvas.addEventListener('pointermove', event => {
    if (!drag || event.pointerId !== drag.id) return;
    const bounds = surface.getBoundingClientRect();
    target.set(clamp(drag.rotation.x + (event.clientY - drag.y) / bounds.height * Math.PI * 0.62, -0.65, 0.65), drag.rotation.y + (event.clientX - drag.x) / bounds.width * Math.PI * 2);
    offset.copy(drag.offset).add(target.clone().sub(drag.rotation));
    schedule();
  });
  function release(event) {
    if (!drag || (event?.pointerId != null && event.pointerId !== drag.id)) return;
    const id = drag.id; drag = null;
    if (canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id);
    surface.dataset.dragging = 'false';
    updateScroll();
  }
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);
  canvas.addEventListener('lostpointercapture', release);
  window.addEventListener('blur', () => { tapCandidate = null; release(); });
  canvas.addEventListener('dblclick', () => { offset.set(0, 0); updateScroll(); });
  window.addEventListener('scroll', () => { tapCandidate = null; scrollDirty = true; schedule(); }, { passive: true });
  nativeScroll.addEventListener('change', () => { release(); offset.set(0, 0); resize(); });
  reduced.addEventListener('change', () => { resize(); });
  document.addEventListener('visibilitychange', schedule);
  const sizing = new ResizeObserver(resize);
  sizing.observe(surface); sizing.observe(heroFrame);
  new IntersectionObserver(entries => { visible = entries[0].isIntersecting; if (visible) updateScroll(); }).observe(surface);
  canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); surface.classList.remove('chip-3d-ready'); });
  canvas.addEventListener('webglcontextrestored', () => { resize(); surface.classList.add('chip-3d-ready'); });
  // Reload can restore the scroll position after module initialization.
  // Reveal only after that position has settled, already at its matching angle.
  if (document.readyState !== 'complete') await new Promise(resolve => window.addEventListener('load', resolve, { once: true }));
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  // Compile shaders before the first visible frame; supported drivers do this in parallel.
  await renderer.compileAsync(scene, camera);
  resize(); current.copy(target); departure = targetDeparture;
  initialized = true; render();
  surface.classList.add('chip-3d-ready');
  document.documentElement.classList.remove('chip-webgl-pending');
}
if (canvas && fallback) initialize().catch(error => {
  document.documentElement.classList.remove('chip-webgl-pending');
  console.warn('Chip 3D fallback:', error);
});
