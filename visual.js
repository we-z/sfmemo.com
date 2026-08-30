import "./hbm-stack.js?v=8";

const hero = document.querySelector(".hero-horizon");
const heroSurface = hero?.querySelector(".hero-visual") ?? hero;
const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
let reduceMotion = motionPreference.matches;
const finePointer = window.matchMedia("(pointer: fine)").matches;

const approach = document.querySelector(".approach-editorial");
const approachItems = [...document.querySelectorAll(".approach-item")];
const approachWord = approach?.querySelector(".approach-watermark span");

function setApproachItem(nextItem, open) {
  approachItems.forEach((item) => {
    const isOpen = item === nextItem && open;
    const trigger = item.querySelector(".approach-trigger");
    const panel = item.querySelector(".approach-panel");
    item.dataset.open = String(isOpen);
    trigger?.setAttribute("aria-expanded", String(isOpen));
    panel?.setAttribute("aria-hidden", String(!isOpen));
  });

  approach?.classList.toggle("has-selection", open);
  if (approachWord) approachWord.textContent = open ? nextItem?.dataset.word ?? "BOUNDARY" : "BOUNDARY";
}

approachItems.forEach((item, index) => {
  const trigger = item.querySelector(".approach-trigger");
  item.dataset.open = "false";

  trigger?.addEventListener("click", () => {
    const shouldOpen = item.dataset.open !== "true";
    setApproachItem(item, shouldOpen);
  });

  trigger?.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      setApproachItem(item, false);
      return;
    }
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    const direction = event.key === "ArrowDown" ? 1 : -1;
    const nextIndex = (index + direction + approachItems.length) % approachItems.length;
    approachItems[nextIndex].querySelector(".approach-trigger")?.focus();
  });

  const previewWord = () => {
    const openItem = approachItems.find((candidate) => candidate.dataset.open === "true");
    if (approachWord) {
      approachWord.textContent = openItem?.dataset.word ?? item.dataset.word ?? "BOUNDARY";
    }
  };
  trigger?.addEventListener("mouseenter", previewWord);
  trigger?.addEventListener("focus", previewWord);
});

approach?.addEventListener("mouseleave", () => {
  const openItem = approachItems.find((item) => item.dataset.open === "true");
  if (approachWord) approachWord.textContent = openItem?.dataset.word ?? "BOUNDARY";
});

const vision = document.querySelector(".vision-editorial");
const visionStages = [...document.querySelectorAll(".vision-stage")];

function setVisionStage(nextStage, open) {
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

document.querySelectorAll("[data-ambient]").forEach((section) => {
  section.addEventListener("pointermove", (event) => {
    if (!finePointer) return;
    const bounds = section.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width) * 100;
    const y = ((event.clientY - bounds.top) / bounds.height) * 100;
    section.style.setProperty("--spot-x", `${x.toFixed(1)}%`);
    section.style.setProperty("--spot-y", `${y.toFixed(1)}%`);
  });
});

const motionRoot = document.documentElement;
const motionScenes = {
  hero,
  heroSurface,
  approach,
  approachItems,
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

  if (reduceMotion) {
    motionRoot.classList.remove("scroll-motion");
    return;
  }

  const targetScroll = Math.max(0, window.scrollY);
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
    ...motionScenes.approachItems,
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
    const departure = smoothstep(clamp01((heroProgress - 0.04) / 0.96));
    const metaDeparture = smoothstep(clamp01((heroProgress - 0.02) / 0.58));

    setMotionVariable("--hero-line-1-x", px(-viewportWidth * 0.045 * departure * amplitude), motionScenes.hero);
    setMotionVariable("--hero-line-1-y", px(-viewportHeight * 0.14 * departure * amplitude), motionScenes.hero);
    setMotionVariable("--hero-line-2-x", px(viewportWidth * 0.07 * departure * amplitude), motionScenes.hero);
    setMotionVariable("--hero-line-2-y", px(-viewportHeight * 0.095 * departure * amplitude), motionScenes.hero);
    setMotionVariable("--hero-line-3-x", px(-viewportWidth * 0.025 * departure * amplitude), motionScenes.hero);
    setMotionVariable("--hero-line-3-y", px(-viewportHeight * 0.05 * departure * amplitude), motionScenes.hero);
    setMotionVariable("--hero-eyebrow-y", px(-18 * departure * amplitude), motionScenes.hero);
    setMotionVariable("--hero-eyebrow-opacity", unit(1 - metaDeparture * 0.88), motionScenes.hero);
    setMotionVariable("--hero-meta-y", px(-30 * metaDeparture * amplitude), motionScenes.hero);
    setMotionVariable("--hero-meta-opacity", unit(1 - metaDeparture), motionScenes.hero);
  }

  if (motionScenes.approach) {
    const approachMetrics = measurements.get(motionScenes.approach);
    const approachTop = approachMetrics.top - visualScroll;
    const approachReveal = smoothstep(clamp01((viewportHeight * 0.88 - approachTop) / (viewportHeight * 0.66)));
    const approachTravel = clamp01((viewportHeight - approachTop) / (viewportHeight + approachMetrics.height));

    setMotionVariable("--approach-heading-y", px((1 - approachReveal) * 42 * amplitude), motionScenes.approach);
    setMotionVariable("--approach-heading-opacity", unit(0.2 + approachReveal * 0.8), motionScenes.approach);
    setMotionVariable("--approach-watermark-x", px((0.5 - approachTravel) * 110 * amplitude), motionScenes.approach);

    motionScenes.approachItems.forEach((item, index) => {
      const itemMetrics = measurements.get(item);
      const itemTop = itemMetrics.top - visualScroll;
      const reveal = smoothstep(clamp01((viewportHeight * 0.92 - itemTop) / (viewportHeight * 0.42)));
      setMotionVariable("--item-y", px((1 - reveal) * (42 + index * 7) * amplitude), item);
      setMotionVariable("--item-opacity", unit(0.16 + reveal * 0.84), item);
      setMotionVariable("--item-scale", unit(0.978 + reveal * 0.022), item);
    });
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
[motionScenes.hero, motionScenes.approach, motionScenes.vision, motionScenes.closing]
  .filter(Boolean)
  .forEach((scene) => sceneResizeObserver.observe(scene));

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
