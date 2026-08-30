import * as THREE from "./vendor/three.module.js";

const hero = document.querySelector(".hero-horizon");
const canvas = document.querySelector("#hero-canvas");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = window.matchMedia("(pointer: fine)").matches;

if (hero && canvas) {
  try {
    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: false,
      powerPreference: "high-performance",
    });

    renderer.setClearColor(0x05070a, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, finePointer ? 1.45 : 1.2));

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const pointer = new THREE.Vector2(0.78, 0.58);
    const pointerTarget = new THREE.Vector2(0.78, 0.58);
    const rippleOrigin = new THREE.Vector2(0.76, 0.62);
    let rippleStartedAt = -1;
    let visible = true;
    let frameId = 0;
    let scrollProgress = 0;

    const uniforms = {
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uPointer: { value: pointer },
      uRippleOrigin: { value: rippleOrigin },
      uRipple: { value: -1 },
      uScroll: { value: 0 },
      uMobile: { value: 0 },
    };

    const material = new THREE.ShaderMaterial({
      uniforms,
      transparent: true,
      depthWrite: false,
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        precision highp float;

        varying vec2 vUv;
        uniform float uTime;
        uniform vec2 uResolution;
        uniform vec2 uPointer;
        uniform vec2 uRippleOrigin;
        uniform float uRipple;
        uniform float uScroll;
        uniform float uMobile;

        float hash(vec2 p) {
          p = fract(p * vec2(123.34, 456.21));
          p += dot(p, p + 45.32);
          return fract(p.x * p.y);
        }

        void main() {
          vec2 uv = vUv;
          float aspect = uResolution.x / max(uResolution.y, 1.0);
          float mobile = uMobile;
          float pointerFalloff = exp(-pow((uv.x - uPointer.x) * 2.7, 2.0));
          float baseY = mix(0.54, 0.44, mobile);
          float horizon = baseY
            + sin(uv.x * 3.45 + uTime * 0.11) * 0.035
            + sin(uv.x * 8.2 - uTime * 0.07) * 0.012
            + (uPointer.y - 0.5) * 0.105 * pointerFalloff
            - uScroll * mix(0.10, 0.05, mobile);

          if (uRipple >= 0.0 && uRipple <= 1.25) {
            vec2 rippleScale = vec2(aspect, 0.92);
            float distanceFromTap = length((uv - uRippleOrigin) * rippleScale);
            float radius = uRipple * 0.9;
            float ring = sin((distanceFromTap - radius) * 44.0)
              * exp(-abs(distanceFromTap - radius) * 19.0)
              * (1.0 - smoothstep(0.0, 1.2, uRipple));
            horizon += ring * 0.072;
          }

          float d = uv.y - horizon;
          float revealStart = mix(0.28, 0.02, mobile);
          float rightMask = smoothstep(revealStart, mix(0.72, 0.34, mobile), uv.x);
          float edgeFade = smoothstep(1.08, 0.82, uv.x);
          float fieldMask = rightMask * edgeFade;
          vec3 cobalt = vec3(0.055, 0.205, 0.62);
          vec3 blue = vec3(0.16, 0.46, 0.96);
          vec3 ice = vec3(0.66, 0.82, 1.0);
          vec3 color = vec3(0.0);
          float deepField = smoothstep(0.34, -0.24, d);
          float depthFade = smoothstep(-0.5, 0.04, d);
          color += mix(cobalt * 0.22, blue * 0.58, depthFade) * deepField * fieldMask;
          float leadingEdge = exp(-abs(d) * 42.0);
          color += mix(blue, ice, smoothstep(0.48, 0.94, uv.x)) * leadingEdge * fieldMask * 0.9;

          for (int index = 0; index < 9; index++) {
            float layer = float(index);
            float layerY = horizon - 0.032 - layer * 0.027
              + sin(uv.x * (5.2 + layer * 0.18) + layer * 0.62 - uTime * 0.035) * 0.006;
            float strand = exp(-abs(uv.y - layerY) * mix(135.0, 94.0, layer / 8.0));
            float strandFade = 1.0 - layer / 11.0;
            color += mix(cobalt, blue, 0.28 + uv.x * 0.38) * strand * fieldMask * strandFade * 0.34;
          }

          float glassSheen = exp(-pow(d * 5.8, 2.0))
            * smoothstep(0.38, 0.78, uv.x)
            * smoothstep(1.02, 0.72, uv.x);
          color += ice * glassSheen * 0.12;
          float lowerGlow = exp(-pow((d + 0.19) * 4.0, 2.0)) * fieldMask;
          color += cobalt * lowerGlow * 0.16;
          float grain = hash(gl_FragCoord.xy + floor(uTime * 8.0)) - 0.5;
          color += grain * 0.012;
          float alpha = clamp((deepField * 0.82 + leadingEdge + glassSheen * 0.2) * fieldMask, 0.0, 0.94);
          gl_FragColor = vec4(max(color, 0.0), alpha);
        }
      `,
    });

    scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material));

    function render(now = performance.now(), force = false) {
      frameId = 0;
      pointer.lerp(pointerTarget, reduceMotion ? 1 : 0.055);
      uniforms.uTime.value = reduceMotion ? 0 : now / 1000;
      uniforms.uScroll.value += (scrollProgress - uniforms.uScroll.value) * (reduceMotion ? 1 : 0.06);
      uniforms.uRipple.value = rippleStartedAt < 0 ? -1 : (now - rippleStartedAt) / 1700;
      renderer.render(scene, camera);
      if (!force && !reduceMotion && visible && !document.hidden) frameId = requestAnimationFrame(render);
    }

    function resize() {
      const bounds = hero.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      renderer.setSize(bounds.width, bounds.height, false);
      uniforms.uResolution.value.set(bounds.width, bounds.height);
      uniforms.uMobile.value = bounds.width < 780 ? 1 : 0;
      render(performance.now(), true);
    }

    function updateScroll() {
      const bounds = hero.getBoundingClientRect();
      scrollProgress = THREE.MathUtils.clamp(-bounds.top / Math.max(bounds.height, 1), 0, 1);
    }

    function pointFromEvent(event) {
      const bounds = hero.getBoundingClientRect();
      return {
        x: THREE.MathUtils.clamp((event.clientX - bounds.left) / bounds.width, 0, 1),
        y: THREE.MathUtils.clamp(1 - (event.clientY - bounds.top) / bounds.height, 0, 1),
      };
    }

    hero.addEventListener("pointermove", (event) => {
      if (!finePointer) return;
      const point = pointFromEvent(event);
      pointerTarget.set(point.x, point.y);
    });

    hero.addEventListener("pointerleave", () => pointerTarget.set(0.78, 0.58));

    hero.addEventListener("pointerdown", (event) => {
      if (event.button !== undefined && event.button !== 0) return;
      const point = pointFromEvent(event);
      rippleOrigin.set(point.x, point.y);
      pointerTarget.set(point.x, point.y);
      rippleStartedAt = performance.now();
    });

    function start() {
      if (frameId || reduceMotion || !visible || document.hidden) return;
      frameId = requestAnimationFrame(render);
    }

    function stop() {
      if (!frameId) return;
      cancelAnimationFrame(frameId);
      frameId = 0;
    }

    window.addEventListener("scroll", updateScroll, { passive: true });
    new ResizeObserver(resize).observe(hero);
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) start();
      else stop();
    }, { rootMargin: "100px" }).observe(hero);

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) stop();
      else start();
    });

    canvas.addEventListener("webglcontextlost", (event) => {
      event.preventDefault();
      stop();
      hero.classList.remove("webgl-ready");
    });

    updateScroll();
    resize();
    hero.classList.add("webgl-ready");
    render(performance.now(), true);
    start();
  } catch (error) {
    console.warn("SF Memory light field fallback enabled.", error);
  }
}

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
