import "./hbm-stack.js?v=42";
import "./systolic-array.js?v=20";
import "./vision-map.js?v=7";

const hero = document.querySelector(".hero-horizon");
const heroFrame = hero?.querySelector(".hero-frame");
const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
let reduceMotion = motionPreference.matches;

const themeRoot = document.documentElement;
const themeToggle = document.querySelector(".theme-toggle");
const themeColor = document.querySelector('meta[name="theme-color"]');

function applyTheme(theme, persist = false) {
  const nextTheme = theme === "light" ? "light" : "dark";
  const light = nextTheme === "light";
  themeRoot.dataset.theme = nextTheme;
  themeRoot.style.colorScheme = nextTheme;
  themeColor?.setAttribute("content", light ? "#f4f7fb" : "#05070a");
  themeToggle?.setAttribute("aria-pressed", String(light));
  themeToggle?.setAttribute("aria-label", light ? "Switch to dark mode" : "Switch to light mode");
  const label = themeToggle?.querySelector(".theme-toggle-text");
  if (label) label.textContent = light ? "Dark" : "Light";
  if (persist) {
    try { localStorage.setItem("sfmemo-theme", nextTheme); } catch {}
  }
  window.dispatchEvent(new CustomEvent("sfmemo:themechange", { detail: { theme: nextTheme } }));
}

applyTheme(themeRoot.dataset.theme);

themeToggle?.addEventListener("click", () => {
  const nextTheme = themeRoot.dataset.theme === "light" ? "dark" : "light";
  const bounds = themeToggle.getBoundingClientRect();
  themeRoot.style.setProperty("--theme-origin-x", `${bounds.left + bounds.width / 2}px`);
  themeRoot.style.setProperty("--theme-origin-y", `${bounds.top + bounds.height / 2}px`);
  const commitTheme = () => applyTheme(nextTheme, true);
  if (document.startViewTransition && !reduceMotion) document.startViewTransition(commitTheme);
  else commitTheme();
});

const approach = document.querySelector(".approach-editorial");

const vision = document.querySelector(".vision-editorial");
const visionMap = document.querySelector(".vision-map");

const motionRoot = document.documentElement;
const motionScenes = {
  hero,
  approach,
  vision,
  visionMap,
  closing: document.querySelector(".closing"),
};

const clamp01 = (value) => Math.min(1, Math.max(0, value));
const smoothstep = (value) => {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
};
const px = (value) => `${value.toFixed(2)}px`;
const unit = (value) => value.toFixed(4);

let motionFrame = 0;
let visualScroll = Math.max(0, window.scrollY);
let forceMotionFrame = true;

function setMotionVariable(name, value, target = motionRoot) {
  target?.style.setProperty(name, value);
}

function updateScrollMotion() {
  motionFrame = 0;
  const targetScroll = Math.max(0, window.scrollY);
  const mobile = window.innerWidth <= 780;

  if (reduceMotion) {
    motionRoot.classList.remove("scroll-motion");
    return;
  }

  visualScroll = forceMotionFrame || mobile
    ? targetScroll
    : visualScroll + (targetScroll - visualScroll) * 0.14;
  forceMotionFrame = false;

  const viewportHeight = window.innerHeight;
  const amplitude = mobile ? 0.36 : 1;
  const documentHeight = Math.max(document.documentElement.scrollHeight - viewportHeight, 1);

  const allElements = [
    motionScenes.hero,
    motionScenes.approach,
    motionScenes.vision,
    motionScenes.visionMap,
    motionScenes.closing,
  ].filter(Boolean);

  const measurements = new Map();
  allElements.forEach((element) => {
    const bounds = element.getBoundingClientRect();
    measurements.set(element, {
      top: bounds.top + targetScroll,
      height: bounds.height,
    });
  });

  setMotionVariable("--scroll-progress", unit(clamp01(targetScroll / documentHeight)));
  setMotionVariable("--page-grid-x", px(-visualScroll * 0.012));
  setMotionVariable("--page-grid-y", px(-visualScroll * 0.028));

  if (motionScenes.hero) {
    const heroMetrics = measurements.get(motionScenes.hero);
    const frameHeight = heroFrame?.offsetHeight || viewportHeight;
    const heroRange = Math.max(heroMetrics.height - frameHeight, 1);
    const heroProgress = clamp01((visualScroll - heroMetrics.top) / heroRange);
    const departureStart = mobile ? 0.08 : 0.22;
    const departureEnd = mobile ? 0.62 : 1;
    const metaStart = mobile ? 0.04 : 0.22;
    const metaEnd = mobile ? 0.3 : 0.84;
    const departure = smoothstep(clamp01((heroProgress - departureStart) / (departureEnd - departureStart)));
    const metaDeparture = smoothstep(clamp01((heroProgress - metaStart) / (metaEnd - metaStart)));

    setMotionVariable("--hero-eyebrow-y", px(-18 * departure * amplitude), motionScenes.hero);
    setMotionVariable("--hero-eyebrow-opacity", unit(1 - metaDeparture * 0.88), motionScenes.hero);
    setMotionVariable("--hero-meta-y", px(-30 * metaDeparture * amplitude), motionScenes.hero);
    setMotionVariable("--hero-meta-opacity", unit(1 - metaDeparture), motionScenes.hero);
  }

  if (motionScenes.approach) {
    const approachMetrics = measurements.get(motionScenes.approach);
    const approachTop = approachMetrics.top - visualScroll;
    const approachReveal = smoothstep(clamp01((viewportHeight * 0.88 - approachTop) / (viewportHeight * 0.66)));

    setMotionVariable("--approach-heading-y", px((1 - approachReveal) * 42 * amplitude), motionScenes.approach);
    setMotionVariable("--approach-heading-opacity", unit(0.2 + approachReveal * 0.8), motionScenes.approach);
  }

  if (motionScenes.vision) {
    const visionMetrics = measurements.get(motionScenes.vision);
    const visionTop = visionMetrics.top - visualScroll;
    const visionReveal = clamp01((viewportHeight * 0.9 - visionTop) / (viewportHeight * 0.72));
    const visionTravel = clamp01((viewportHeight - visionTop) / (viewportHeight + visionMetrics.height));
    const copyReveal = smoothstep(visionReveal);

    setMotionVariable("--vision-copy-y", px((1 - copyReveal) * 34 * amplitude), motionScenes.vision);
    setMotionVariable("--vision-copy-opacity", unit(0.18 + copyReveal * 0.82), motionScenes.vision);
    setMotionVariable("--vision-plane-y", px((0.5 - visionTravel) * 54 * amplitude), motionScenes.vision);
    setMotionVariable("--vision-plane-scale", unit(1.02 + visionTravel * 0.035), motionScenes.vision);

    const lineReveal = copyReveal;
    setMotionVariable("--vision-line-1-y", px((1 - lineReveal) * 58 * amplitude), motionScenes.vision);
    setMotionVariable("--vision-line-1-opacity", unit(0.08 + lineReveal * 0.92), motionScenes.vision);
    setMotionVariable("--vision-line-1-skew", `${((1 - lineReveal) * 2.4 * amplitude).toFixed(3)}deg`, motionScenes.vision);

    const mapReveal = smoothstep(clamp01((visionReveal - 0.18) / 0.82));
    setMotionVariable("--vision-map-opacity", unit(0.08 + mapReveal * 0.92), motionScenes.visionMap);
  }

  if (motionScenes.closing) {
    const closingMetrics = measurements.get(motionScenes.closing);
    const closingTop = closingMetrics.top - visualScroll;
    const closingReveal = smoothstep(clamp01((viewportHeight * 0.9 - closingTop) / (viewportHeight * 0.72)));
    const labelReveal = smoothstep(clamp01(closingReveal * 1.35));

    setMotionVariable("--closing-y", px((1 - closingReveal) * 86 * amplitude), motionScenes.closing);
    setMotionVariable("--closing-scale", unit(0.84 + closingReveal * 0.16), motionScenes.closing);
    setMotionVariable("--closing-opacity", unit(0.06 + closingReveal * 0.94), motionScenes.closing);
    setMotionVariable("--closing-label-y", px((1 - labelReveal) * 24 * amplitude), motionScenes.closing);
    setMotionVariable("--closing-label-opacity", unit(0.15 + labelReveal * 0.85), motionScenes.closing);
    setMotionVariable("--closing-link-x", px((1 - closingReveal) * 64 * amplitude), motionScenes.closing);
    setMotionVariable("--closing-link-opacity", unit(0.1 + closingReveal * 0.9), motionScenes.closing);
  }

  motionRoot.classList.add("scroll-motion");

  if (Math.abs(targetScroll - visualScroll) > 0.2) {
    motionFrame = requestAnimationFrame(updateScrollMotion);
  } else {
    visualScroll = targetScroll;
  }
}

function scheduleScrollMotion(force = false) {
  if (force) forceMotionFrame = true;
  if (!motionFrame) motionFrame = requestAnimationFrame(updateScrollMotion);
}

window.addEventListener("scroll", () => scheduleScrollMotion(), { passive: true });
window.addEventListener("resize", () => scheduleScrollMotion(true), { passive: true });
window.addEventListener("orientationchange", () => scheduleScrollMotion(true), { passive: true });
window.addEventListener("pageshow", () => scheduleScrollMotion(true));
window.addEventListener("hashchange", () => scheduleScrollMotion(true));
window.visualViewport?.addEventListener("resize", () => scheduleScrollMotion(true), { passive: true });

const sceneResizeObserver = new ResizeObserver(() => scheduleScrollMotion(true));
[
  motionScenes.hero,
  heroFrame,
  motionScenes.hero?.querySelector(".hero-copy"),
  motionScenes.approach,
  motionScenes.vision,
  motionScenes.closing,
]
  .filter(Boolean)
  .forEach((scene) => sceneResizeObserver.observe(scene));

document.fonts?.ready.then(() => scheduleScrollMotion(true));

motionPreference.addEventListener("change", (event) => {
  reduceMotion = event.matches;
  if (reduceMotion) {
    if (motionFrame) cancelAnimationFrame(motionFrame);
    motionFrame = 0;
    motionRoot.classList.remove("scroll-motion");
  } else {
    scheduleScrollMotion(true);
  }
});

scheduleScrollMotion(true);
