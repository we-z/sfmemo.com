import * as THREE from './vendor/three.module.js';

const surface = document.querySelector('.hero-visual');
const fallback = surface?.querySelector('.hero-chip');
const canvas = document.querySelector('#hero-canvas');
const nativeScroll = matchMedia('(max-width: 780px), (hover: none) and (pointer: coarse), (max-width: 960px) and (max-height: 480px)');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

async function initialize() {
  // Native 4K lettering and surface detail are baked offline, never during scrolling.
  const texture = await new THREE.TextureLoader().loadAsync('./chip-surface-4k.webp');
  await texture.image.decode();
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setClearColor(0, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const gl = renderer.getContext();
  const maxBufferSide = Math.min(4096, gl.getParameter(gl.MAX_RENDERBUFFER_SIZE), ...gl.getParameter(gl.MAX_VIEWPORT_DIMS));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  camera.position.z = 12;
  const tanHalfFov = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const packageCorners = [];
  for (const x of [-2.9, 2.9]) for (const y of [-2, 2]) for (const z of [-0.27, 0.14]) {
    packageCorners.push(new THREE.Vector3(x, y, z));
  }
  const projectedCorner = new THREE.Vector3();
  const root = new THREE.Group();
  scene.add(root);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x484b48, 2));
  const key = new THREE.DirectionalLight(0xffffff, 2.3);
  key.position.set(-3, 5, 8);
  scene.add(key);

  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const side = new THREE.MeshStandardMaterial({ color: 0x171a19, roughness: 0.92 });
  const front = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.96, metalness: 0 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(5.8, 4, 0.28), [side, side, side, side, front, side]);
  root.add(body);
  // Solder balls sit directly in the package's rear face, with no backing plate.
  const balls = new THREE.InstancedMesh(new THREE.SphereGeometry(0.065, 24, 16), new THREE.MeshStandardMaterial({ color: 0xa6a7a5, metalness: 0.75, roughness: 0.35 }), 384);
  const placement = new THREE.Object3D();
  for (let y = 0; y < 16; y++) for (let x = 0; x < 24; x++) {
    placement.position.set((x - 11.5) * 0.22, (y - 7.5) * 0.22, -0.195);
    placement.updateMatrix(); balls.setMatrixAt(y * 24 + x, placement.matrix);
  }
  root.add(balls);

  const current = new THREE.Vector2(0, 0);
  const target = current.clone();
  const offset = new THREE.Vector2();
  const maxRotationSpeed = THREE.MathUtils.degToRad(240) / 1000;
  let drag = null, frame = 0, visible = true, initialized = false;
  let tapCandidate = null, tapStarted = null;
  let heroTop = 0, travel = 1;
  const hero = document.querySelector('.hero-horizon');
  const intro = hero.querySelector('.hero-intro');
  const meta = hero.querySelector('.hero-meta');
  const heroFrame = hero.querySelector('.hero-frame');
  let aspect = 1, baseViewWidth = 8.05, horizontalMargin = 1.12, verticalMargin = 1.12;
  let width = 0, height = 0, resolutionScale = 0, resolutionTimer = 0;
  let scrollDirty = false, lastFrameTime = 0, needsRender = true;
  let departure = 0, targetDeparture = 0;
  function render(now = performance.now()) {
    frame = 0;
    if (!visible || document.hidden) { lastFrameTime = 0; return; }
    if (scrollDirty) { scrollDirty = false; updateScroll(false); }
    const dt = lastFrameTime ? clamp(now - lastFrameTime, 0, 32) : 0;
    lastFrameTime = now;
    // Brief, refresh-rate-independent settling fills gaps between native scroll samples.
    const blend = reduced.matches ? 1 : 1 - Math.exp(-dt / (drag ? 40 : 32));
    const rotationChanged = current.distanceToSquared(target) > 0.00000001;
    if (rotationChanged) {
      // Follow native scrolling without letting a fast swipe skip the visible turn.
      const rotationBlend = drag || reduced.matches ? blend : Math.min(blend, maxRotationSpeed * dt / current.distanceTo(target));
      current.lerp(target, rotationBlend);
    }
    else current.copy(target);
    departure += (targetDeparture - departure) * blend;
    if (Math.abs(targetDeparture - departure) < 0.0001) departure = targetDeparture;
    meta.style.opacity = `${1 - departure}`;
    meta.style.transform = `translate3d(0, ${-80 * departure}px, 0)`;
    const wasTapping = tapStarted !== null;
    let spin = 0;
    if (wasTapping) {
      const elapsed = now - tapStarted;
      if (elapsed >= 1800 || reduced.matches) tapStarted = null;
      else {
        // Ease through two half-turns, with 300ms to see the solder balls.
        const outward = clamp(elapsed / 750, 0, 1);
        const homeward = clamp((elapsed - 1050) / 750, 0, 1);
        spin = Math.PI * (outward * outward * (3 - 2 * outward) + homeward * homeward * (3 - 2 * homeward));
      }
    }
    root.rotation.set(current.x, current.y + spin, 0);
    root.updateMatrix();
    // Keep the flat face's size, then fit nearer corners through the full spin.
    const tanHorizontal = tanHalfFov * aspect;
    let distance = 0.14 + baseViewWidth / (2 * tanHorizontal);
    for (const corner of packageCorners) {
      projectedCorner.copy(corner).applyMatrix4(root.matrix);
      distance = Math.max(distance,
        projectedCorner.z + Math.abs(projectedCorner.x) * horizontalMargin / tanHorizontal,
        projectedCorner.z + Math.abs(projectedCorner.y) * verticalMargin / tanHalfFov);
    }
    if (Math.abs(distance - camera.position.z) > 0.00001) {
      camera.position.z = distance;
      camera.updateMatrixWorld();
    }
    if (needsRender || rotationChanged || wasTapping) renderer.render(scene, camera);
    needsRender = false;
    if (current.distanceToSquared(target) > 0.00000001 || departure !== targetDeparture || tapStarted !== null) schedule();
    else lastFrameTime = 0;
  }
  function schedule() {
    if (initialized && !frame && visible && !document.hidden) {
      if (!lastFrameTime) lastFrameTime = performance.now();
      frame = requestAnimationFrame(render);
    }
  }
  function updateScroll(requestFrame = true) {
    const t = reduced.matches ? 0 : clamp((scrollY - heroTop) / travel, 0, 1);
    const progress = t * t * (3 - 2 * t);
    if (!drag) target.set(offset.x, progress * Math.PI + offset.y);
    const phase = reduced.matches ? 0 : clamp(((scrollY - heroTop) / travel - 0.08) / 0.52, 0, 1);
    targetDeparture = phase * phase * (3 - 2 * phase);
    if (requestFrame) schedule();
  }
  function updateResolution() {
    if (!width || !height) return;
    resolutionScale = devicePixelRatio * (window.visualViewport?.scale || 1);
    // Redraw detail for Retina and pinch zoom, bounded by GPU size and memory.
    const ratio = Math.min(resolutionScale, 6, Math.sqrt(6000000 / (width * height)), maxBufferSide / width, maxBufferSide / height);
    if (canvas.width === Math.floor(width * ratio) && canvas.height === Math.floor(height * ratio)) return;
    renderer.setDrawingBufferSize(width, height, ratio);
    needsRender = true;
    schedule();
  }
  function queueResolutionUpdate() {
    clearTimeout(resolutionTimer);
    if (devicePixelRatio * (window.visualViewport?.scale || 1) === resolutionScale) return;
    // Allocate once when zoom settles, rather than on every pinch sample.
    resolutionTimer = setTimeout(updateResolution, 120);
  }
  function resize() {
    const rect = surface.getBoundingClientRect();
    aspect = rect.width / Math.max(rect.height, 1);
    const faceWidth = Math.max(1, Math.min(intro.getBoundingClientRect().width, rect.width - 2));
    horizontalMargin = rect.width / faceWidth;
    baseViewWidth = 5.8 * horizontalMargin;
    fallback.style.width = `${faceWidth}px`;
    // The mobile canvas sits low in the hero. Leave room below its nearest corner.
    const roomBelow = heroFrame.getBoundingClientRect().bottom - 8 - (rect.top + rect.height / 2);
    verticalMargin = nativeScroll.matches ? Math.max(1.12, rect.height / 2 / Math.max(16, roomBelow)) : 1.12;
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
    needsRender = true;
    width = rect.width; height = rect.height;
    updateResolution();
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
  // Share tap/click rotation without capturing touch input or blocking native scrolling.
  surface.addEventListener('pointerdown', event => {
    tapCandidate = null;
    if (!initialized || reduced.matches || !event.isPrimary || event.button !== 0) return;
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
    tapStarted = performance.now();
    schedule();
  }, { passive: true });
  surface.addEventListener('pointercancel', () => { tapCandidate = null; }, { passive: true });
  surface.addEventListener('pointerleave', () => { tapCandidate = null; }, { passive: true });
  canvas.addEventListener('pointerdown', event => {
    if (!initialized || nativeScroll.matches || tapStarted !== null || event.pointerType !== 'mouse' || event.button !== 0 || !hitsChip(event)) return;
    // Grab the displayed pose even while it is catching up with a scroll target.
    offset.add(current.clone().sub(target));
    target.copy(current);
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
  canvas.addEventListener('dblclick', () => { tapStarted = null; needsRender = true; offset.set(0, 0); updateScroll(); });
  window.addEventListener('scroll', () => { tapCandidate = null; scrollDirty = true; schedule(); }, { passive: true });
  window.addEventListener('resize', queueResolutionUpdate, { passive: true });
  window.visualViewport?.addEventListener('resize', queueResolutionUpdate, { passive: true });
  nativeScroll.addEventListener('change', () => { release(); offset.set(0, 0); resize(); });
  reduced.addEventListener('change', () => { resize(); });
  document.addEventListener('visibilitychange', () => { lastFrameTime = 0; schedule(); });
  const sizing = new ResizeObserver(resize);
  sizing.observe(surface); sizing.observe(heroFrame); sizing.observe(intro);
  new IntersectionObserver(entries => { visible = entries[0].isIntersecting; lastFrameTime = 0; if (visible) updateScroll(); }).observe(surface);
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
