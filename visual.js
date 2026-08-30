import * as THREE from "./vendor/three.module.js";

const canvas = document.querySelector("#memory-canvas");
const shell = document.querySelector("#memory-visual");
const stage = shell?.querySelector(".scene-stage");
const hint = shell?.querySelector(".scene-hint");
const tabs = [...document.querySelectorAll("button[data-scene-target]")];
const details = [...document.querySelectorAll(".system-rail details")];
const readout = document.querySelector("#scene-panel");
const readoutIndex = readout?.querySelector(".scene-readout-index");
const readoutTitle = readout?.querySelector("h3");
const readoutBody = readout?.querySelector(":scope > p:last-child");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = window.matchMedia("(pointer: fine)").matches;
const visualLink = document.querySelector('a[href="#memory-visual"]');
let selected = "memory";
let renderSelection = null;

const content = {
  memory: {
    index: "01 / Memory",
    title: "Bandwidth, close to compute.",
    body: "Stacked memory and data paths designed around AI workloads.",
  },
  logic: {
    index: "02 / Logic",
    title: "Control across the stack.",
    body: "Scheduling, telemetry, test, and repair brought into the subsystem.",
  },
  package: {
    index: "03 / Package",
    title: "The package becomes architecture.",
    body: "Interconnect, power, thermals, and reliability designed together.",
  },
};

if (hint) {
  hint.textContent = finePointer
    ? "Drag to orbit · click a component"
    : "Tap to inspect · swipe to orbit";
}

function updateReadout(key) {
  const item = content[key];
  if (!item) return;
  if (readoutIndex) readoutIndex.textContent = item.index;
  if (readoutTitle) readoutTitle.textContent = item.title;
  if (readoutBody) readoutBody.textContent = item.body;

  tabs.forEach((tab) => {
    const active = tab.dataset.sceneTarget === key;
    tab.setAttribute("aria-selected", String(active));
    tab.tabIndex = active ? 0 : -1;
  });

  const activeTab = tabs.find((tab) => tab.dataset.sceneTarget === key);
  if (activeTab && readout) readout.setAttribute("aria-labelledby", activeTab.id);
  if (shell) shell.dataset.selection = key;
}

function setSelection(key) {
  if (!content[key]) return;
  selected = key;
  updateReadout(key);
  renderSelection?.();
}

tabs.forEach((tab, tabIndex) => {
  tab.addEventListener("click", () => setSelection(tab.dataset.sceneTarget));
  tab.addEventListener("keydown", (event) => {
    if (!event.key.startsWith("Arrow")) return;
    event.preventDefault();
    const direction = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : -1;
    const next = tabs[(tabIndex + direction + tabs.length) % tabs.length];
    next.focus();
    setSelection(next.dataset.sceneTarget);
  });
});

details.forEach((detail) => {
  detail.addEventListener("toggle", () => {
    if (!detail.open) return;
    details.forEach((other) => {
      if (other !== detail) other.removeAttribute("open");
    });
    if (detail.dataset.visualTarget) setSelection(detail.dataset.visualTarget);
  });
});

updateReadout(selected);

visualLink?.addEventListener("click", () => {
  requestAnimationFrame(() => shell?.focus({ preventScroll: true }));
});

if (canvas && shell && stage) {
  try {
    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, finePointer ? 1.45 : 1.2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x05070a, 0.032);

    const camera = new THREE.PerspectiveCamera(31, 1, 0.1, 100);
    const world = new THREE.Group();
    world.rotation.set(-0.055, -0.42, -0.012);
    scene.add(world);

    const colors = {
      base: 0x070d16,
      interposer: 0x0a2443,
      edge: 0x60a5fa,
      cyan: 0x67e8f9,
      blue: 0x3b82f6,
      logic: 0x1257b8,
      stack: 0x0a315e,
      line: 0x263a55,
    };

    const materials = {
      substrate: new THREE.MeshPhysicalMaterial({
        color: colors.base,
        metalness: 0.78,
        roughness: 0.3,
        clearcoat: 0.7,
        clearcoatRoughness: 0.32,
      }),
      interposer: new THREE.MeshPhysicalMaterial({
        color: colors.interposer,
        emissive: 0x071d38,
        emissiveIntensity: 0.55,
        metalness: 0.6,
        roughness: 0.24,
        transparent: true,
        opacity: 0.88,
        clearcoat: 0.85,
      }),
      logic: new THREE.MeshPhysicalMaterial({
        color: colors.logic,
        emissive: 0x0b3f8b,
        emissiveIntensity: 0.72,
        metalness: 0.68,
        roughness: 0.2,
        clearcoat: 1,
      }),
      logicTop: new THREE.MeshPhysicalMaterial({
        color: 0x1d77db,
        emissive: 0x0b4a9f,
        emissiveIntensity: 0.95,
        metalness: 0.55,
        roughness: 0.12,
        clearcoat: 1,
      }),
      stack: new THREE.MeshPhysicalMaterial({
        color: colors.stack,
        emissive: 0x061a32,
        emissiveIntensity: 0.62,
        metalness: 0.64,
        roughness: 0.23,
        clearcoat: 0.8,
      }),
      stackBase: new THREE.MeshPhysicalMaterial({
        color: 0x102d50,
        emissive: 0x071a31,
        emissiveIntensity: 0.42,
        metalness: 0.68,
        roughness: 0.27,
      }),
      via: new THREE.MeshBasicMaterial({
        color: colors.cyan,
        transparent: true,
        opacity: 0.34,
        blending: THREE.AdditiveBlending,
      }),
      bump: new THREE.MeshStandardMaterial({
        color: 0xa6d8ff,
        emissive: 0x174d85,
        emissiveIntensity: 0.28,
        metalness: 0.9,
        roughness: 0.18,
      }),
    };

    const selectableMeshes = [];
    const stackLayers = [];
    const stackGroups = [];

    function register(mesh, component) {
      mesh.userData.component = component;
      selectableMeshes.push(mesh);
      return mesh;
    }

    function box(width, height, depth, material, edgeColor = colors.line, edgeOpacity = 0.72) {
      const geometry = new THREE.BoxGeometry(width, height, depth);
      const mesh = new THREE.Mesh(geometry, material);
      const edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(geometry),
        new THREE.LineBasicMaterial({ color: edgeColor, transparent: true, opacity: edgeOpacity })
      );
      mesh.add(edges);
      return mesh;
    }

    const substrate = register(box(10.2, 0.42, 7.45, materials.substrate, colors.line, 0.62), "package");
    substrate.position.y = -1.48;
    world.add(substrate);

    const interposer = register(box(8.85, 0.18, 6.15, materials.interposer, colors.blue, 0.82), "package");
    interposer.position.y = -1.12;
    world.add(interposer);

    const accelerator = register(box(3.15, 0.72, 2.82, materials.logic, colors.cyan, 0.96), "logic");
    accelerator.position.y = -0.59;
    world.add(accelerator);

    const logicTop = register(box(2.62, 0.055, 2.28, materials.logicTop, colors.cyan, 0.72), "logic");
    logicTop.position.y = 0.385;
    accelerator.add(logicTop);

    const circuitMaterial = new THREE.LineBasicMaterial({
      color: colors.cyan,
      transparent: true,
      opacity: 0.42,
      blending: THREE.AdditiveBlending,
    });

    [-0.82, -0.42, 0, 0.42, 0.82].forEach((offset, index) => {
      const points = index % 2 === 0
        ? [new THREE.Vector3(-1.05, -0.185, offset), new THREE.Vector3(1.05, -0.185, offset)]
        : [new THREE.Vector3(offset, -0.185, -0.88), new THREE.Vector3(offset, -0.185, 0.88)];
      world.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), circuitMaterial));
    });

    const stackPositions = [
      [-3.1, -1.88],
      [3.1, -1.88],
      [-3.1, 1.88],
      [3.1, 1.88],
    ];

    const viaGeometry = new THREE.CylinderGeometry(0.026, 0.026, 1.7, 8);

    stackPositions.forEach(([x, z], stackIndex) => {
      const group = new THREE.Group();
      group.position.set(x, 0, z);

      const baseDie = register(box(1.78, 0.22, 1.56, materials.stackBase, colors.blue, 0.86), "memory");
      baseDie.position.y = -0.82;
      group.add(baseDie);

      for (let layerIndex = 0; layerIndex < 7; layerIndex += 1) {
        const memoryDie = register(box(1.64, 0.135, 1.42, materials.stack, colors.edge, 0.92), "memory");
        const baseY = -0.5 + layerIndex * 0.235;
        memoryDie.position.set(layerIndex * 0.012, baseY, -layerIndex * 0.008);
        memoryDie.userData.baseY = baseY;
        memoryDie.userData.layerIndex = layerIndex;
        stackLayers.push(memoryDie);
        group.add(memoryDie);
      }

      [[-0.47, -0.37], [0.47, -0.37], [-0.47, 0.37], [0.47, 0.37]].forEach(([viaX, viaZ]) => {
        const via = new THREE.Mesh(viaGeometry, materials.via);
        via.position.set(viaX, 0.16, viaZ);
        group.add(via);
      });

      group.userData.phase = stackIndex * 0.46;
      stackGroups.push(group);
      world.add(group);
    });

    const bumpGeometry = new THREE.CylinderGeometry(0.035, 0.035, 0.075, 8);
    const bumpLocations = [];

    for (let x = -1.15; x <= 1.15; x += 0.38) {
      for (let z = -0.95; z <= 0.95; z += 0.38) bumpLocations.push([x, z]);
    }

    stackPositions.forEach(([stackX, stackZ]) => {
      for (let x = -0.58; x <= 0.58; x += 0.29) {
        for (let z = -0.46; z <= 0.46; z += 0.3) bumpLocations.push([stackX + x, stackZ + z]);
      }
    });

    const bumps = register(new THREE.InstancedMesh(bumpGeometry, materials.bump, bumpLocations.length), "package");
    const bumpMatrix = new THREE.Matrix4();
    bumpLocations.forEach(([x, z], index) => {
      bumpMatrix.makeTranslation(x, -0.99, z);
      bumps.setMatrixAt(index, bumpMatrix);
    });
    bumps.instanceMatrix.needsUpdate = true;
    world.add(bumps);

    const paths = [];
    const pulses = [];
    const pulseGeometry = new THREE.SphereGeometry(0.065, 12, 12);
    const pulseMaterial = new THREE.MeshBasicMaterial({
      color: colors.cyan,
      transparent: true,
      opacity: 0.84,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    stackPositions.forEach(([x, z], pathIndex) => {
      const points = [
        new THREE.Vector3(Math.sign(x) * 1.56, -0.94, Math.sign(z) * 0.72),
        new THREE.Vector3(Math.sign(x) * 2.08, -0.94, Math.sign(z) * 0.72),
        new THREE.Vector3(Math.sign(x) * 2.08, -0.94, z),
        new THREE.Vector3(x, -0.94, z),
      ];
      const curve = new THREE.CatmullRomCurve3(points, false, "catmullrom", 0.08);
      const pathGeometry = new THREE.TubeGeometry(curve, 42, 0.025, 6, false);
      const pathMaterial = new THREE.MeshBasicMaterial({
        color: colors.cyan,
        transparent: true,
        opacity: 0.52,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const glowMaterial = new THREE.MeshBasicMaterial({
        color: colors.blue,
        transparent: true,
        opacity: 0.1,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const glow = new THREE.Mesh(new THREE.TubeGeometry(curve, 42, 0.06, 6, false), glowMaterial);
      const path = new THREE.Mesh(pathGeometry, pathMaterial);
      world.add(glow);
      world.add(path);
      paths.push({ curve, material: pathMaterial, glowMaterial });

      for (let pulseIndex = 0; pulseIndex < 3; pulseIndex += 1) {
        const pulse = new THREE.Mesh(pulseGeometry, pulseMaterial);
        pulse.userData.offset = pathIndex * 0.17 + pulseIndex * 0.31;
        world.add(pulse);
        pulses.push({ curve, mesh: pulse });
      }
    });

    const initialWorldRotation = world.rotation.clone();
    world.rotation.set(0, 0, 0);
    world.updateMatrixWorld(true);
    const modelBounds = new THREE.Box3().setFromObject(world);
    const modelSize = modelBounds.getSize(new THREE.Vector3());
    const rotationalWidth = Math.hypot(modelSize.x, modelSize.z);
    world.rotation.copy(initialWorldRotation);
    world.updateMatrixWorld(true);

    const scanMaterial = new THREE.MeshBasicMaterial({
      color: colors.cyan,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const scan = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 6.1), scanMaterial);
    scan.rotation.x = -Math.PI / 2;
    scan.position.set(-4.5, -0.985, 0);
    world.add(scan);

    const haloMaterial = new THREE.MeshBasicMaterial({
      color: colors.blue,
      transparent: true,
      opacity: 0.08,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const halo = new THREE.Mesh(new THREE.RingGeometry(5.8, 5.83, 112), haloMaterial);
    halo.rotation.x = -Math.PI / 2;
    halo.position.y = -1.72;
    world.add(halo);

    const particleGeometry = new THREE.BufferGeometry();
    const particleCount = finePointer ? 140 : 80;
    const particlePositions = new Float32Array(particleCount * 3);
    for (let index = 0; index < particleCount; index += 1) {
      particlePositions[index * 3] = (Math.random() - 0.5) * 18;
      particlePositions[index * 3 + 1] = (Math.random() - 0.5) * 8;
      particlePositions[index * 3 + 2] = (Math.random() - 0.5) * 14;
    }
    particleGeometry.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));
    const particles = new THREE.Points(
      particleGeometry,
      new THREE.PointsMaterial({
        color: colors.edge,
        size: 0.025,
        transparent: true,
        opacity: 0.28,
        sizeAttenuation: true,
      })
    );
    scene.add(particles);

    scene.add(new THREE.HemisphereLight(0xc3e1ff, 0x020407, 1.62));

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.65);
    keyLight.position.set(4, 10, 7);
    scene.add(keyLight);

    const blueLight = new THREE.PointLight(colors.blue, 25, 22, 2.05);
    blueLight.position.set(-4.7, 3.1, 4.2);
    scene.add(blueLight);

    const cyanLight = new THREE.PointLight(colors.cyan, 18, 18, 2.2);
    cyanLight.position.set(4.8, 2.4, -4.2);
    scene.add(cyanLight);

    const pointer = new THREE.Vector2();
    const pointerTarget = new THREE.Vector2();
    const raycaster = new THREE.Raycaster();
    const normalizedPointer = new THREE.Vector2();
    const cameraDirection = new THREE.Vector3();
    const cameraLookAt = new THREE.Vector3(0, -0.35, 0);
    const startTime = performance.now();
    const drag = { active: false, id: null, x: 0, y: 0, moved: false };

    let orbitYaw = 0;
    let orbitTarget = 0;
    let fitDistance = 18;
    let cameraDistance = 0;
    let isVisible = true;
    let frameId = 0;
    let lastRenderedAt = 0;

    function damp(current, target, amount) {
      return current + (target - current) * amount;
    }

    function resize() {
      const { width, height } = stage.getBoundingClientRect();
      if (!width || !height) return;

      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.fov = camera.aspect < 1.04 ? 38 : 31;

      const verticalFov = THREE.MathUtils.degToRad(camera.fov);
      const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * camera.aspect);
      const projectedHeight = modelSize.y + rotationalWidth * 0.45;
      const heightDistance = (projectedHeight / 2) / Math.tan(verticalFov / 2);
      const widthDistance = (rotationalWidth / 2) / Math.tan(horizontalFov / 2);
      fitDistance = Math.max(heightDistance, widthDistance) * (camera.aspect < 1.04 ? 1.15 : 1.1);

      if (!Number.isFinite(cameraDistance) || cameraDistance <= 0) cameraDistance = fitDistance;
      camera.near = Math.max(0.1, fitDistance / 30);
      camera.far = fitDistance * 5;
      camera.updateProjectionMatrix();
    }

    function render(now = performance.now(), force = false) {
      frameId = 0;

      if (!force && !finePointer && now - lastRenderedAt < 30) {
        if (!reduceMotion && isVisible && !document.hidden) frameId = requestAnimationFrame(render);
        return;
      }

      lastRenderedAt = now;
      const elapsed = (now - startTime) / 1000;
      pointer.lerp(pointerTarget, 0.055);
      orbitYaw = damp(orbitYaw, orbitTarget, 0.075);

      const reveal = Math.min(1, elapsed / 1.25);
      const revealEase = 1 - Math.pow(1 - reveal, 3);
      world.scale.setScalar(0.9 + revealEase * 0.1);
      world.position.y = -0.24 + revealEase * 0.24;

      const ambientYaw = reduceMotion ? 0 : Math.sin(elapsed * 0.14) * 0.018;
      const ambientPitch = reduceMotion ? 0 : Math.sin(elapsed * 0.19) * 0.009;
      world.rotation.y = damp(world.rotation.y, -0.42 + orbitYaw + pointer.x * 0.075 + ambientYaw, 0.07);
      world.rotation.x = damp(world.rotation.x, -0.055 + pointer.y * 0.035 + ambientPitch, 0.07);

      const selectionZoom = selected === "logic" ? 0.98 : selected === "package" ? 1.04 : 1;
      cameraDistance = damp(cameraDistance, fitDistance * selectionZoom, 0.065);
      cameraDirection.set(
        camera.aspect < 1.04 ? 0.53 : 0.56,
        camera.aspect < 1.04 ? 0.54 : 0.43,
        0.69
      ).normalize();
      camera.position.copy(cameraDirection.multiplyScalar(cameraDistance));
      camera.lookAt(cameraLookAt);

      materials.stack.emissiveIntensity = damp(materials.stack.emissiveIntensity, selected === "memory" ? 1.15 : 0.36, 0.08);
      materials.stackBase.emissiveIntensity = damp(materials.stackBase.emissiveIntensity, selected === "memory" ? 0.88 : 0.3, 0.08);
      materials.logic.emissiveIntensity = damp(materials.logic.emissiveIntensity, selected === "logic" ? 1.45 : 0.55, 0.08);
      materials.logicTop.emissiveIntensity = damp(materials.logicTop.emissiveIntensity, selected === "logic" ? 1.65 : 0.72, 0.08);
      materials.interposer.emissiveIntensity = damp(materials.interposer.emissiveIntensity, selected === "package" ? 1.35 : 0.48, 0.08);
      materials.via.opacity = damp(materials.via.opacity, selected === "memory" ? 0.76 : 0.24, 0.08);

      stackLayers.forEach((layer) => {
        const spread = selected === "memory" ? layer.userData.layerIndex * 0.018 : 0;
        layer.position.y = damp(layer.position.y, layer.userData.baseY + spread, 0.09);
      });

      stackGroups.forEach((group) => {
        const float = reduceMotion ? 0 : Math.sin(elapsed * 0.7 + group.userData.phase) * 0.018;
        group.position.y = damp(group.position.y, float, 0.08);
      });

      accelerator.scale.setScalar(damp(accelerator.scale.x, selected === "logic" ? 1.055 : 1, 0.085));

      const pathOpacity = selected === "package" ? 0.17 : 0.7;
      paths.forEach(({ material, glowMaterial }) => {
        material.opacity = damp(material.opacity, pathOpacity, 0.08);
        glowMaterial.opacity = damp(glowMaterial.opacity, pathOpacity * 0.18, 0.08);
      });

      pulses.forEach(({ curve, mesh }) => {
        const travel = (elapsed * 0.2 + mesh.userData.offset) % 1;
        const direction = selected === "logic" ? 1 - travel : travel;
        mesh.position.copy(curve.getPoint(THREE.MathUtils.clamp(direction, 0.001, 0.999)));
        mesh.scale.setScalar(selected === "package" ? 0.62 : 1);
      });
      pulseMaterial.opacity = damp(pulseMaterial.opacity, selected === "package" ? 0.28 : 0.9, 0.08);

      scan.position.x = -4.7 + ((elapsed * 1.05) % 9.4);
      scanMaterial.opacity = damp(scanMaterial.opacity, selected === "package" ? 0.19 : 0, 0.08);
      haloMaterial.opacity = damp(haloMaterial.opacity, selected === "package" ? 0.24 : 0.07, 0.08);
      particles.rotation.y = reduceMotion ? 0 : elapsed * 0.006;

      renderer.render(scene, camera);
      if (!reduceMotion && isVisible && !document.hidden) frameId = requestAnimationFrame(render);
    }

    function start() {
      if (reduceMotion || frameId || !isVisible || document.hidden) return;
      frameId = requestAnimationFrame(render);
    }

    renderSelection = () => {
      if (reduceMotion || !frameId) render(performance.now(), true);
    };

    function stop() {
      if (!frameId) return;
      cancelAnimationFrame(frameId);
      frameId = 0;
    }

    function pointerCoordinates(event) {
      const rect = canvas.getBoundingClientRect();
      normalizedPointer.set(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1
      );
      return rect;
    }

    function pick(event) {
      pointerCoordinates(event);
      raycaster.setFromCamera(normalizedPointer, camera);
      const hit = raycaster.intersectObjects(selectableMeshes, false)[0];
      return hit?.object?.userData?.component ?? null;
    }

    canvas.addEventListener("pointerdown", (event) => {
      if (event.button !== undefined && event.button !== 0) return;
      drag.active = true;
      drag.id = event.pointerId;
      drag.x = event.clientX;
      drag.y = event.clientY;
      drag.moved = false;
      try {
        canvas.setPointerCapture?.(event.pointerId);
      } catch {
        // Pointer capture is a progressive enhancement.
      }
    });

    canvas.addEventListener("pointermove", (event) => {
      const rect = pointerCoordinates(event);

      if (drag.active && drag.id === event.pointerId) {
        const dx = event.clientX - drag.x;
        const dy = event.clientY - drag.y;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) drag.moved = true;
        if (event.pointerType !== "touch" || Math.abs(dx) > Math.abs(dy)) {
          orbitTarget = THREE.MathUtils.clamp(orbitTarget + dx * 0.0042, -0.36, 0.36);
        }
        drag.x = event.clientX;
        drag.y = event.clientY;
        return;
      }

      if (finePointer) {
        pointerTarget.set(
          ((event.clientX - rect.left) / rect.width - 0.5) * 2,
          ((event.clientY - rect.top) / rect.height - 0.5) * 2
        );
        canvas.classList.toggle("is-hovering", Boolean(pick(event)));
      }
    });

    function endPointer(event) {
      if (!drag.active || drag.id !== event.pointerId) return;
      if (!drag.moved) {
        const component = pick(event);
        if (component) setSelection(component);
      }
      drag.active = false;
      drag.id = null;
      try {
        canvas.releasePointerCapture?.(event.pointerId);
      } catch {
        // The pointer may already have been released by the browser.
      }
    }

    function cancelPointer(event) {
      if (event && drag.id !== event.pointerId) return;
      drag.active = false;
      drag.id = null;
    }

    canvas.addEventListener("pointerup", endPointer);
    canvas.addEventListener("pointercancel", cancelPointer);
    window.addEventListener("pointerup", endPointer);
    window.addEventListener("pointercancel", cancelPointer);
    canvas.addEventListener("pointerleave", (event) => {
      pointerTarget.set(0, 0);
      canvas.classList.remove("is-hovering");
    });

    canvas.addEventListener("webglcontextlost", (event) => {
      event.preventDefault();
      stop();
      shell.classList.remove("webgl-ready");
      shell.classList.add("webgl-fallback");
    });

    new ResizeObserver(resize).observe(stage);

    new IntersectionObserver(([entry]) => {
      isVisible = entry.isIntersecting;
      if (isVisible) start();
      else stop();
    }, { rootMargin: "140px" }).observe(stage);

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) stop();
      else start();
    });

    resize();
    updateReadout(selected);
    render(performance.now(), true);
    shell.classList.add("webgl-ready");
    start();
  } catch (error) {
    shell.classList.add("webgl-fallback");
    console.warn("SF Memory visual fallback enabled.", error);
  }
}
