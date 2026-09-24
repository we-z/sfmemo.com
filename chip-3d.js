import * as THREE from './vendor/three.module.js';

const surface = document.querySelector('.hero-visual');
const fallback = surface?.querySelector('.hero-chip');
const canvas = document.querySelector('#hero-canvas');
const nativeScroll = matchMedia('(max-width: 780px), (hover: none) and (pointer: coarse), (max-width: 960px) and (max-height: 480px)');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

async function initialize() {
  await document.fonts.load('100px "Chip Marking"');
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

  // Bake the existing package layout into the material, not floating geometry.
  const textureCanvas = document.createElement('canvas');
  textureCanvas.width = 1450;
  textureCanvas.height = 1000;
  const ctx = textureCanvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 1450, 1000);
  gradient.addColorStop(0, '#242526');
  gradient.addColorStop(1, '#121314');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1450, 1000);
  let seed = 42;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  for (let i = 0; i < 240000; i++) {
    ctx.fillStyle = `rgba(180,180,180,${random() * 0.09})`;
    ctx.fillRect(random() * 1450, random() * 1000, 1.5, 1.5);
  }
  ctx.fillStyle = '#73746e';
  ctx.textBaseline = 'top';
  const label = (text, x, y, size) => {
    ctx.font = `${size}px "Chip Marking"`;
    ctx.fillText(text, x, y);
  };
  label('sfmemo', 72, 65, 181);
  label('SFM8H256A', 72, 320, 113);
  label('CA01 / 2609', 72, 465, 113);
  label('DTAHJM0042', 72, 635, 64);
  label('Made in California', 135, 856, 73);
  ctx.save();
  ctx.translate(1390, 395);
  ctx.rotate(Math.PI / 2);
  label('B4 0836', 0, 0, 121);
  ctx.restore();
  const matrix = fallback.querySelector('.hero-chip-matrix');
  ctx.save();
  ctx.translate(1168, 20);
  ctx.scale(260 / 52, 260 / 52);
  ctx.fill(new Path2D(matrix.querySelector('path').getAttribute('d')));
  ctx.restore();
  const dot = ctx.createRadialGradient(91, 882, 3, 94, 890, 21);
  dot.addColorStop(0, '#101112');
  dot.addColorStop(0.8, '#171819');
  dot.addColorStop(1, '#353737');
  ctx.fillStyle = dot;
  ctx.beginPath(); ctx.arc(94, 890, 20, 0, Math.PI * 2); ctx.fill();
  // Grain crosses the etched markings, with no text shadow.
  for (let i = 0; i < 180000; i++) {
    ctx.fillStyle = `rgba(15,16,16,${random() * 0.28})`;
    ctx.fillRect(random() * 1450, random() * 1000, 1.4, 1.4);
  }
  // Molded rim remains visible even when the package faces the camera.
  ctx.strokeStyle = '#373a3b'; ctx.lineWidth = 7;
  ctx.strokeRect(4, 4, 1442, 992);
  ctx.strokeStyle = '#101212'; ctx.lineWidth = 5;
  ctx.strokeRect(13, 13, 1424, 974);
  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const side = new THREE.MeshStandardMaterial({ color: 0x171a19, roughness: 0.92 });
  const front = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.96, metalness: 0 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(5.8, 4, 0.28), [side, side, side, side, front, side]);
  root.add(body);
  const substrate = new THREE.Mesh(new THREE.BoxGeometry(5.94, 4.14, 0.08), new THREE.MeshStandardMaterial({ color: 0x17231d, roughness: 0.82 }));
  substrate.position.z = -0.18;
  root.add(substrate);
  // Underside contacts remain part of the same solid package when rotated.
  const pads = new THREE.InstancedMesh(new THREE.CircleGeometry(0.075, 12), new THREE.MeshStandardMaterial({ color: 0x9e9272, metalness: 0.65, roughness: 0.5, side: THREE.DoubleSide }), 96);
  const placement = new THREE.Object3D();
  for (let y = 0; y < 8; y++) for (let x = 0; x < 12; x++) {
    placement.position.set((x - 5.5) * 0.44, (y - 3.5) * 0.44, -0.223);
    placement.updateMatrix(); pads.setMatrixAt(y * 12 + x, placement.matrix);
  }
  root.add(pads);

  const current = new THREE.Vector2(0, 0);
  const target = current.clone();
  const offset = new THREE.Vector2();
  let drag = null, frame = 0, visible = true;
  let heroTop = 0, travel = 1;
  const hero = document.querySelector('.hero-horizon');
  function render() {
    frame = 0;
    if (!visible || document.hidden) return;
    current.lerp(target, reduced.matches ? 1 : drag ? 0.34 : 0.115);
    root.rotation.set(current.x, current.y, 0);
    renderer.render(scene, camera);
    if (current.distanceTo(target) > 0.0001) schedule();
  }
  function schedule() { if (!frame && visible && !document.hidden) frame = requestAnimationFrame(render); }
  function updateScroll() {
    const t = reduced.matches ? 0 : clamp((scrollY - heroTop) / (travel * 0.82), 0, 1);
    const progress = t * t * (3 - 2 * t);
    if (!drag) target.set(-progress * 0.72 + offset.x, progress * 1.12 + offset.y);
    surface.closest('.hero-horizon').style.setProperty('--chip-copy-travel', `${-Math.min(1, t * 2) * 420}px`);
    surface.closest('.hero-horizon').style.setProperty('--chip-copy-opacity', `${1 - Math.min(1, t * 2)}`);
    schedule();
  }
  function resize() {
    const rect = surface.getBoundingClientRect();
    const aspect = rect.width / Math.max(rect.height, 1);
    const viewWidth = Math.max(nativeScroll.matches ? 6.45 : 8.05, 4.6 * aspect);
    camera.left = -viewWidth / 2; camera.right = viewWidth / 2;
    camera.top = viewWidth / aspect / 2; camera.bottom = -camera.top;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(rect.width, rect.height, false);
    heroTop = hero.getBoundingClientRect().top + scrollY;
    travel = Math.max(1, hero.offsetHeight - hero.querySelector(".hero-frame").offsetHeight);
    updateScroll();
  }
  const raycaster = new THREE.Raycaster();
  canvas.addEventListener('pointerdown', event => {
    if (nativeScroll.matches || event.pointerType !== 'mouse' || event.button !== 0) return;
    const bounds = canvas.getBoundingClientRect();
    raycaster.setFromCamera(new THREE.Vector2((event.clientX - bounds.left) / bounds.width * 2 - 1, -(event.clientY - bounds.top) / bounds.height * 2 + 1), camera);
    if (!raycaster.intersectObject(root, true).length) return;
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
  window.addEventListener('blur', () => release());
  canvas.addEventListener('dblclick', () => { offset.set(0, 0); updateScroll(); });
  window.addEventListener('scroll', updateScroll, { passive: true });
  nativeScroll.addEventListener('change', () => { release(); offset.set(0, 0); resize(); });
  reduced.addEventListener('change', updateScroll);
  document.addEventListener('visibilitychange', schedule);
  new ResizeObserver(resize).observe(surface);
  new IntersectionObserver(entries => { visible = entries[0].isIntersecting; if (visible) updateScroll(); }).observe(surface);
  canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); surface.classList.remove('chip-3d-ready'); });
  canvas.addEventListener('webglcontextrestored', () => { resize(); surface.classList.add('chip-3d-ready'); });
  // Reload can restore the scroll position after module initialization.
  // Reveal only after that position has settled, already at its matching angle.
  if (document.readyState !== 'complete') await new Promise(resolve => window.addEventListener('load', resolve, { once: true }));
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  resize(); current.copy(target); render();
  surface.classList.add('chip-3d-ready');
  document.documentElement.classList.remove('chip-webgl-pending');
}
if (canvas && fallback) initialize().catch(error => {
  document.documentElement.classList.remove('chip-webgl-pending');
  console.warn('Chip 3D fallback:', error);
});
