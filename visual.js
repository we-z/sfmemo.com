import "./hbm-stack.js?v=19";

const hero = document.querySelector(".hero-horizon");
const heroSurface = hero?.querySelector(".hero-visual") ?? hero;
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
const approachTrack = approach?.querySelector(".approach-track");
const approachList = approach?.querySelector(".approach-list");
const approachItems = [...document.querySelectorAll(".approach-item")];
const approachOrbitRunners = [...(approach?.querySelectorAll(".orbit-electron-runner") ?? [])];
const approachStageThresholds = [0, 0.26, 0.52, 0.78];
let activeApproachIndex = -1;

function updateApproachOrbit(progress) {
  const scrubProgress = reduceMotion ? 0 : Math.min(1, Math.max(0, progress));
  const centerX = 360;
  const centerY = 360;
  const fullTurn = Math.PI * 2;

  approachOrbitRunners.forEach((runner) => {
    const radius = Number.parseFloat(runner.dataset.radius ?? "0");
    const phase = Number.parseFloat(runner.dataset.phase ?? "0");
    const revolutions = Number.parseFloat(runner.dataset.revolutions ?? "1");
    const direction = Number.parseFloat(runner.dataset.direction ?? "1");
    const theta = fullTurn * (phase + scrubProgress * revolutions * direction);
    const x = centerX + Math.cos(theta) * radius;
    const y = centerY + Math.sin(theta) * radius;
    runner.setAttribute("transform", `translate(${x.toFixed(2)} ${y.toFixed(2)})`);
  });
}

function setApproachItem(nextIndex) {
  if (!approachItems.length || nextIndex === activeApproachIndex) return;
  activeApproachIndex = nextIndex;

  approachItems.forEach((item, index) => {
    const isOpen = index === nextIndex;
    const trigger = item.querySelector(".approach-trigger");
    const panel = item.querySelector(".approach-panel");
    item.dataset.open = String(isOpen);
    trigger?.setAttribute("aria-expanded", String(isOpen));
    panel?.setAttribute("aria-hidden", String(!isOpen));
  });

  if (approach) approach.dataset.active = String(nextIndex);
}

function getApproachScrollRange() {
  if (!approachTrack || !approachList) {
    return { indicatorStart: 0, stageStart: 0, end: 1 };
  }
  const trackTop = approachTrack.getBoundingClientRect().top + window.scrollY;
  const stickyTop = Number.parseFloat(getComputedStyle(approachList).top) || 0;
  const indicatorStart = trackTop - Math.max(stickyTop, window.innerHeight * 0.72);
  const stageStart = trackTop - stickyTop;
  const stickyFootprint = Math.max(approachList.offsetHeight, window.innerHeight * 0.72);
  const end = Math.max(stageStart + 1, trackTop + approachTrack.offsetHeight - stickyFootprint - stickyTop);
  return { indicatorStart, stageStart, end };
}

function updateApproachFromScroll(scrollPosition = window.scrollY) {
  if (!approachItems.length) return;
  const { indicatorStart, stageStart, end } = getApproachScrollRange();
  const indicatorProgress = Math.min(1, Math.max(0, (scrollPosition - indicatorStart) / (end - indicatorStart)));
  const stageProgress = Math.min(1, Math.max(0, (scrollPosition - stageStart) / (end - stageStart)));
  const stage = approachStageThresholds.reduce(
    (current, threshold, index) => stageProgress >= threshold ? index : current,
    0,
  );
  approach?.style.setProperty("--approach-stage-progress", indicatorProgress.toFixed(4));
  updateApproachOrbit(stageProgress);
  setApproachItem(stage);
}

function scrollToApproachItem(index) {
  const { stageStart: rangeStart, end } = getApproachScrollRange();
  const thresholdStart = approachStageThresholds[index] ?? 0;
  const thresholdEnd = approachStageThresholds[index + 1] ?? 1;
  const stagePosition = thresholdStart + (thresholdEnd - thresholdStart) * 0.5;
  window.scrollTo({
    top: rangeStart + (end - rangeStart) * stagePosition,
    behavior: reduceMotion ? "auto" : "smooth",
  });
}

approachItems.forEach((item, index) => {
  const trigger = item.querySelector(".approach-trigger");
  trigger?.addEventListener("click", () => scrollToApproachItem(index));
  trigger?.addEventListener("keydown", (event) => {
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const nextIndex = event.key === "Home"
      ? 0
      : event.key === "End"
        ? approachItems.length - 1
        : (index + (event.key === "ArrowDown" ? 1 : -1) + approachItems.length) % approachItems.length;
    approachItems[nextIndex].querySelector(".approach-trigger")?.focus();
    scrollToApproachItem(nextIndex);
  });
});

setApproachItem(0);
updateApproachOrbit(0);

const vision = document.querySelector(".vision-editorial");
const visionStages = [...document.querySelectorAll(".vision-stage")];

function syncVisionBodyHeight(stage) {
  const body = stage?.querySelector(".vision-body");
  const inner = body?.querySelector(".vision-body-inner");
  if (!body || !inner) return;
  body.style.setProperty("--vision-body-height", `${inner.scrollHeight}px`);
}

function setVisionStage(nextStage, open) {
  if (open) syncVisionBodyHeight(nextStage);
  visionStages.forEach((stage) => {
    const isOpen = stage === nextStage && open;
    const trigger = stage.querySelector(".vision-trigger");
    const body = stage.querySelector(".vision-body");
    stage.dataset.open = String(isOpen);
    trigger?.setAttribute("aria-expanded", String(isOpen));
    body?.setAttribute("aria-hidden", String(!isOpen));
  });

  if (!vision) return;
  if (open) vision.dataset.active = nextStage?.dataset.stage ?? "0";
  else delete vision.dataset.active;
}

visionStages.forEach((stage, index) => {
  const trigger = stage.querySelector(".vision-trigger");
  stage.dataset.open = "false";
  syncVisionBodyHeight(stage);

  trigger?.addEventListener("click", () => {
    const shouldOpen = stage.dataset.open !== "true";
    setVisionStage(stage, shouldOpen);
  });

  trigger?.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      setVisionStage(stage, false);
      return;
    }
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const direction = event.key === "ArrowRight" ? 1 : -1;
    const nextIndex = (index + direction + visionStages.length) % visionStages.length;
    visionStages[nextIndex].querySelector(".vision-trigger")?.focus();
  });
});

const visionBodyResizeObserver = new ResizeObserver((entries) => {
  entries.forEach((entry) => syncVisionBodyHeight(entry.target.closest(".vision-stage")));
});
visionStages.forEach((stage) => {
  const inner = stage.querySelector(".vision-body-inner");
  if (inner) visionBodyResizeObserver.observe(inner);
});
document.fonts?.ready.then(() => visionStages.forEach(syncVisionBodyHeight));

const motionRoot = document.documentElement;
const motionScenes = {
  hero,
  heroSurface,
  approach,
  vision,
  visionStages,
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
  updateApproachFromScroll(targetScroll);

  if (reduceMotion) {
    motionRoot.classList.remove("scroll-motion");
    return;
  }

  visualScroll = forceMotionFrame
    ? targetScroll
    : visualScroll + (targetScroll - visualScroll) * 0.14;
  forceMotionFrame = false;

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const mobile = viewportWidth <= 780;
  const amplitude = mobile ? 0.36 : 1;
  const documentHeight = Math.max(document.documentElement.scrollHeight - viewportHeight, 1);

  const allElements = [
    motionScenes.hero,
    motionScenes.approach,
    motionScenes.vision,
    motionScenes.closing,
    ...motionScenes.visionStages,
  ].filter(Boolean);

  const measurements = new Map();
  allElements.forEach((element) => {
    const bounds = element.getBoundingClientRect();
    measurements.set(element, {
      top: bounds.top + targetScroll,
      width: bounds.width,
      height: bounds.height,
    });
  });

  setMotionVariable("--scroll-progress", unit(clamp01(targetScroll / documentHeight)));
  setMotionVariable("--page-grid-x", px(-visualScroll * 0.012));
  setMotionVariable("--page-grid-y", px(-visualScroll * 0.028));

  if (motionScenes.hero && motionScenes.heroSurface) {
    const heroMetrics = measurements.get(motionScenes.hero);
    const surfaceHeight = motionScenes.heroSurface.offsetHeight || viewportHeight;
    const desktopRange = Math.max(heroMetrics.height - surfaceHeight, 1);
    const mobileRange = Math.max(heroMetrics.height * 0.8, 1);
    const heroProgress = smoothstep(clamp01((visualScroll - heroMetrics.top) / (mobile ? mobileRange : desktopRange)));
    const heroHold = mobile ? 0.26 : 0.22;
    const departure = smoothstep(clamp01((heroProgress - heroHold) / (1 - heroHold)));
    const metaDeparture = smoothstep(clamp01((heroProgress - heroHold) / (0.84 - heroHold)));

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

    [0, 1, 2].forEach((index) => {
      const lineReveal = smoothstep(clamp01((visionReveal - index * 0.11) / (1 - index * 0.11)));
      setMotionVariable(`--vision-line-${index + 1}-y`, px((1 - lineReveal) * (58 + index * 10) * amplitude), motionScenes.vision);
      setMotionVariable(`--vision-line-${index + 1}-opacity`, unit(0.08 + lineReveal * 0.92), motionScenes.vision);
      setMotionVariable(`--vision-line-${index + 1}-skew`, `${((1 - lineReveal) * 2.4 * amplitude).toFixed(3)}deg`, motionScenes.vision);
    });

    motionScenes.visionStages.forEach((stage, index) => {
      const stageReveal = smoothstep(clamp01((visionReveal - 0.2 - index * 0.1) / (0.7 - index * 0.04)));
      setMotionVariable("--stage-y", px((1 - stageReveal) * (66 + index * 9) * amplitude), stage);
      setMotionVariable("--stage-opacity", unit(0.14 + stageReveal * 0.86), stage);
      setMotionVariable("--stage-rotate", `${((1 - stageReveal) * 6 * amplitude).toFixed(3)}deg`, stage);
    });

    const stageWidth = motionScenes.vision.querySelector(".vision-stages")?.clientWidth ?? viewportWidth;
    setMotionVariable("--vision-tracer-x", px(stageWidth * 0.8 * visionTravel), motionScenes.vision);
    setMotionVariable("--vision-tracer-opacity", unit(Math.min(0.88, visionReveal * 1.25)), motionScenes.vision);
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
    setMotionVariable("--closing-word-x", px((0.5 - closingReveal) * 90 * amplitude), motionScenes.closing);
    setMotionVariable("--closing-word-scale", unit(0.92 + closingReveal * 0.08), motionScenes.closing);
    setMotionVariable("--closing-word-opacity", unit(0.012 + closingReveal * 0.045), motionScenes.closing);
    setMotionVariable("--closing-horizon-scale", unit(closingReveal), motionScenes.closing);
    setMotionVariable("--closing-horizon-opacity", unit(closingReveal * 0.7), motionScenes.closing);
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
  motionScenes.hero?.querySelector(".hero-copy"),
  motionScenes.approach,
  approachTrack,
  approachList,
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
