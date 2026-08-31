import * as THREE from "./vendor/three.module.js";

const surface = document.querySelector(".approach-systolic");
const canvas = document.querySelector("#systolic-canvas");
const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
const coarsePointer = window.matchMedia("(hover: none) and (pointer: coarse)");

if (surface && canvas) {
  try {
    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setClearColor(0x05070a, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-4, 4, 4, -4, 0.1, 40);
    camera.position.set(0, 7.25, 8.8);
    camera.lookAt(0, 0, 0);

    const arrayRoot = new THREE.Group();
    const defaultRotation = { x: 0.02, y: -0.38 };
    const targetRotation = { ...defaultRotation };
    arrayRoot.rotation.set(defaultRotation.x, defaultRotation.y, 0);
    scene.add(arrayRoot);

    const ambient = new THREE.HemisphereLight(0xd8e9ff, 0x02050b, 2.25);
    scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xf3f8ff, 4.3);
    keyLight.position.set(-4.8, 7.4, 6.2);
    scene.add(keyLight);

    const rimLight = new THREE.PointLight(0x367dff, 24, 18, 2);
    rimLight.position.set(4.7, 2.1, 4.2);
    scene.add(rimLight);

    const substrateMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x07111f,
      metalness: 0.58,
      roughness: 0.38,
      clearcoat: 0.34,
      clearcoatRoughness: 0.32,
      emissive: 0x020813,
      emissiveIntensity: 0.1,
    });
    const interposerMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x0a2a4c,
      metalness: 0.5,
      roughness: 0.32,
      clearcoat: 0.4,
      clearcoatRoughness: 0.25,
      emissive: 0x031326,
      emissiveIntensity: 0.14,
    });
    const cellMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      vertexColors: true,
      metalness: 0.32,
      roughness: 0.3,
      clearcoat: 0.48,
      clearcoatRoughness: 0.24,
    });
    const coreMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      vertexColors: true,
      toneMapped: false,
    });
    const signalMaterialA = new THREE.MeshBasicMaterial({
      color: 0xbfe7ff,
      toneMapped: false,
    });
    const signalMaterialB = new THREE.MeshBasicMaterial({
      color: 0x8db8ff,
      toneMapped: false,
    });
    const resultMaterial = new THREE.MeshBasicMaterial({
      color: 0xe8f6ff,
      toneMapped: false,
    });
    const glowMaterialA = new THREE.MeshBasicMaterial({
      color: 0x4ba8ff,
      transparent: true,
      opacity: 0.18,
      depthWrite: false,
      toneMapped: false,
    });
    const glowMaterialB = new THREE.MeshBasicMaterial({
      color: 0x6b7dff,
      transparent: true,
      opacity: 0.15,
      depthWrite: false,
      toneMapped: false,
    });

    const substrate = new THREE.Mesh(new THREE.BoxGeometry(7.15, 0.2, 7.15), substrateMaterial);
    substrate.position.y = -0.28;
    arrayRoot.add(substrate);

    const interposer = new THREE.Mesh(new THREE.BoxGeometry(6.75, 0.12, 6.75), interposerMaterial);
    interposer.position.y = -0.12;
    arrayRoot.add(interposer);

    const substrateEdgeMaterial = new THREE.LineBasicMaterial({
      color: 0x3977b8,
      transparent: true,
      opacity: 0.54,
    });
    const substrateEdges = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(6.76, 0.125, 6.76)),
      substrateEdgeMaterial,
    );
    substrateEdges.position.y = -0.115;
    arrayRoot.add(substrateEdges);

    const gridSize = 8;
    const pitch = 0.72;
    const gridSpan = (gridSize - 1) * pitch;
    const first = -gridSpan / 2;
    const helper = new THREE.Object3D();
    const cellGeometry = new THREE.BoxGeometry(0.52, 0.13, 0.52);
    const coreGeometry = new THREE.BoxGeometry(0.3, 0.055, 0.3);
    const cellMesh = new THREE.InstancedMesh(cellGeometry, cellMaterial, gridSize * gridSize);
    const coreMesh = new THREE.InstancedMesh(coreGeometry, coreMaterial, gridSize * gridSize);
    cellMesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    coreMesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);

    const cellPositions = [];
    for (let row = 0; row < gridSize; row += 1) {
      for (let column = 0; column < gridSize; column += 1) {
        const index = row * gridSize + column;
        const x = first + column * pitch;
        const z = first + row * pitch;
        cellPositions.push({ row, column, x, z });

        helper.position.set(x, 0.035, z);
        helper.rotation.set(0, 0, 0);
        helper.scale.set(1, 1, 1);
        helper.updateMatrix();
        cellMesh.setMatrixAt(index, helper.matrix);

        helper.position.set(x, 0.13, z);
        helper.updateMatrix();
        coreMesh.setMatrixAt(index, helper.matrix);
      }
    }
    cellMesh.instanceMatrix.needsUpdate = true;
    coreMesh.instanceMatrix.needsUpdate = true;
    arrayRoot.add(cellMesh, coreMesh);

    const lanePositions = [];
    for (let index = 0; index < gridSize; index += 1) lanePositions.push(first + index * pitch);

    const traceVertices = [];
    lanePositions.forEach((lane) => {
      traceVertices.push(-3.28, -0.015, lane, 3.28, -0.015, lane);
      traceVertices.push(lane, -0.005, -3.28, lane, -0.005, 3.28);
    });
    const traceGeometry = new THREE.BufferGeometry();
    traceGeometry.setAttribute("position", new THREE.Float32BufferAttribute(traceVertices, 3));
    const traceMaterial = new THREE.LineBasicMaterial({
      color: 0x4e94d6,
      transparent: true,
      opacity: 0.3,
    });
    const traces = new THREE.LineSegments(traceGeometry, traceMaterial);
    arrayRoot.add(traces);

    const padMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x6da9d7,
      metalness: 0.72,
      roughness: 0.25,
      emissive: 0x0d3154,
      emissiveIntensity: 0.24,
    });
    const rowPads = new THREE.InstancedMesh(new THREE.BoxGeometry(0.2, 0.06, 0.34), padMaterial, gridSize * 2);
    const columnPads = new THREE.InstancedMesh(new THREE.BoxGeometry(0.34, 0.06, 0.2), padMaterial, gridSize * 2);
    lanePositions.forEach((lane, index) => {
      [-3.3, 3.3].forEach((x, side) => {
        helper.position.set(x, 0.045, lane);
        helper.updateMatrix();
        rowPads.setMatrixAt(index * 2 + side, helper.matrix);
      });
      [-3.3, 3.3].forEach((z, side) => {
        helper.position.set(lane, 0.045, z);
        helper.updateMatrix();
        columnPads.setMatrixAt(index * 2 + side, helper.matrix);
      });
    });
    rowPads.instanceMatrix.needsUpdate = true;
    columnPads.instanceMatrix.needsUpdate = true;
    arrayRoot.add(rowPads, columnPads);

    const pulseGeometry = new THREE.SphereGeometry(0.065, 12, 8);
    const glowGeometry = new THREE.SphereGeometry(0.13, 12, 8);
    const rowPulses = [];
    const columnPulses = [];
    const resultPulses = [];

    const createPulse = (material, glowMaterial) => {
      const group = new THREE.Group();
      const core = new THREE.Mesh(pulseGeometry, material);
      const glow = new THREE.Mesh(glowGeometry, glowMaterial);
      group.add(core, glow);
      arrayRoot.add(group);
      return group;
    };

    for (let index = 0; index < gridSize; index += 1) {
      rowPulses.push(createPulse(signalMaterialA, glowMaterialA));
      columnPulses.push(createPulse(signalMaterialB, glowMaterialB));
      resultPulses.push(createPulse(resultMaterial, glowMaterialA));
    }

    const darkCellPalette = [0x123d69, 0x154875, 0x173f70, 0x1b4c7d];
    const lightCellPalette = [0x21699e, 0x2675aa, 0x2a669f, 0x2f79b1];
    const darkCorePalette = [0x39a0d2, 0x536bd0, 0x338cbf, 0x5e72c9];
    const lightCorePalette = [0x1676ad, 0x3659bd, 0x1d6f9f, 0x405faf];
    const cellColor = new THREE.Color();
    const coreColor = new THREE.Color();
    const activeCellDark = new THREE.Color(0x5eb9ff);
    const activeCellLight = new THREE.Color(0x176bc4);
    const activeCoreDark = new THREE.Color(0xe0f4ff);
    const activeCoreLight = new THREE.Color(0x8bc8ff);

    let lightTheme = document.documentElement.dataset.theme === "light";
    let visible = true;
    let animationFrame = 0;
    let previousTime = performance.now();
    let simulationTime = 4.8;
    let boostUntil = 0;
    let hoveredCell = -1;
    let reducedMotion = motionPreference.matches;

    const fract = (value) => value - Math.floor(value);
    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
    const wrappedDistance = (a, b) => {
      const distance = Math.abs(a - b);
      return Math.min(distance, 1 - distance);
    };

    function applyTheme() {
      lightTheme = document.documentElement.dataset.theme === "light";
      renderer.toneMappingExposure = lightTheme ? 1.0 : 1.18;
      substrateMaterial.color.setHex(lightTheme ? 0x15304d : 0x07111f);
      substrateMaterial.emissive.setHex(lightTheme ? 0x07182b : 0x020813);
      interposerMaterial.color.setHex(lightTheme ? 0x225f91 : 0x0a2a4c);
      interposerMaterial.emissive.setHex(lightTheme ? 0x0a3158 : 0x031326);
      substrateEdgeMaterial.color.setHex(lightTheme ? 0x1559c5 : 0x3977b8);
      substrateEdgeMaterial.opacity = lightTheme ? 0.68 : 0.54;
      traceMaterial.color.setHex(lightTheme ? 0x1769b3 : 0x4e94d6);
      traceMaterial.opacity = lightTheme ? 0.42 : 0.3;
      padMaterial.color.setHex(lightTheme ? 0x2b74a8 : 0x6da9d7);
      padMaterial.emissive.setHex(lightTheme ? 0x0e3f70 : 0x0d3154);
      if (reducedMotion) renderFrame(performance.now());
    }

    function updateColors(time, boost) {
      const bodyPalette = lightTheme ? lightCellPalette : darkCellPalette;
      const topPalette = lightTheme ? lightCorePalette : darkCorePalette;
      const activeBody = lightTheme ? activeCellLight : activeCellDark;
      const activeTop = lightTheme ? activeCoreLight : activeCoreDark;
      const waveTime = reducedMotion ? 7.3 : simulationTime;

      cellPositions.forEach(({ row, column }, index) => {
        const diagonalPhase = fract(waveTime * 0.34 - (row + column) * 0.057);
        const wave = Math.exp(-Math.pow(wrappedDistance(diagonalPhase, 0.04), 2) * 270);
        const hovered = index === hoveredCell ? 0.78 : 0;
        const hoverLane = hoveredCell >= 0 && (
          row === Math.floor(hoveredCell / gridSize) || column === hoveredCell % gridSize
        ) ? 0.16 : 0;
        const activation = clamp(wave * (0.74 + boost * 0.34) + hovered + hoverLane, 0, 1);

        cellColor.setHex(bodyPalette[(row + column * 3) % bodyPalette.length]).lerp(activeBody, activation * 0.76);
        coreColor.setHex(topPalette[(row * 2 + column) % topPalette.length]).lerp(activeTop, activation);
        cellMesh.setColorAt(index, cellColor);
        coreMesh.setColorAt(index, coreColor);
      });
      cellMesh.instanceColor.needsUpdate = true;
      coreMesh.instanceColor.needsUpdate = true;

      const glowScale = 1 + boost * 0.55;
      rowPulses.forEach((pulse, row) => {
        const progress = fract(waveTime * 0.19 - row * 0.045);
        pulse.position.set(-3.42 + progress * 6.84, 0.2, lanePositions[row]);
        pulse.scale.setScalar(glowScale);
      });
      columnPulses.forEach((pulse, column) => {
        const progress = fract(waveTime * 0.19 - column * 0.045);
        pulse.position.set(lanePositions[column], 0.21, -3.42 + progress * 6.84);
        pulse.scale.setScalar(glowScale);
      });
      resultPulses.forEach((pulse, row) => {
        const progress = fract(waveTime * 0.16 - row * 0.075 - 0.34);
        pulse.position.set(2.72 + progress * 0.82, 0.22, lanePositions[row]);
        pulse.scale.setScalar(0.78 + boost * 0.45);
      });

      coreMaterial.opacity = 0.86 + boost * 0.14;
      glowMaterialA.opacity = 0.16 + boost * 0.2;
      glowMaterialB.opacity = 0.14 + boost * 0.18;
      interposerMaterial.emissiveIntensity = (lightTheme ? 0.12 : 0.15) + boost * 0.18;
      rimLight.intensity = 24 + boost * 14;
    }

    function renderFrame(time) {
      animationFrame = 0;
      const elapsed = Math.min(0.05, Math.max(0, (time - previousTime) / 1000));
      previousTime = time;
      const boost = reducedMotion ? 0 : clamp((boostUntil - time) / 900, 0, 1);
      if (!reducedMotion) simulationTime += elapsed * (1 + boost * 2.5);

      arrayRoot.rotation.x += (targetRotation.x - arrayRoot.rotation.x) * 0.09;
      arrayRoot.rotation.y += (targetRotation.y - arrayRoot.rotation.y) * 0.09;
      updateColors(time, boost);
      renderer.render(scene, camera);

      if (visible && !reducedMotion) animationFrame = requestAnimationFrame(renderFrame);
    }

    function requestRender() {
      if (!animationFrame) {
        previousTime = performance.now();
        animationFrame = requestAnimationFrame(renderFrame);
      }
    }

    function resize() {
      const bounds = surface.getBoundingClientRect();
      const width = Math.max(1, Math.round(bounds.width));
      const height = Math.max(1, Math.round(bounds.height));
      const aspect = width / height;
      const viewHeight = Math.max(8.4, 10.1 / Math.max(aspect, 0.4));
      const halfHeight = viewHeight / 2;
      const halfWidth = halfHeight * aspect;
      camera.left = -halfWidth;
      camera.right = halfWidth;
      camera.top = halfHeight;
      camera.bottom = -halfHeight;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, coarsePointer.matches ? 1 : 1.25));
      renderer.setSize(width, height, false);
      requestRender();
    }

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    function updateHover(event) {
      if (coarsePointer.matches) return;
      const bounds = canvas.getBoundingClientRect();
      pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
      pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObject(coreMesh, false)[0];
      hoveredCell = Number.isInteger(hit?.instanceId) ? hit.instanceId : -1;
    }

    const drag = {
      id: null,
      startX: 0,
      startY: 0,
      lastX: 0,
      lastY: 0,
      moved: false,
    };

    canvas.addEventListener("pointerdown", (event) => {
      drag.id = event.pointerId;
      drag.startX = drag.lastX = event.clientX;
      drag.startY = drag.lastY = event.clientY;
      drag.moved = false;
    });

    canvas.addEventListener("pointermove", (event) => {
      updateHover(event);
      if (drag.id !== event.pointerId) return;
      const totalX = event.clientX - drag.startX;
      const totalY = event.clientY - drag.startY;
      if (!drag.moved && Math.abs(totalX) > 7 && Math.abs(totalX) > Math.abs(totalY) * 1.15) {
        drag.moved = true;
        canvas.setPointerCapture(event.pointerId);
      }
      if (!drag.moved) return;
      event.preventDefault();
      const dx = event.clientX - drag.lastX;
      const dy = event.clientY - drag.lastY;
      targetRotation.y += dx * 0.011;
      targetRotation.x = clamp(targetRotation.x + dy * 0.007, -0.32, 0.34);
      drag.lastX = event.clientX;
      drag.lastY = event.clientY;
      requestRender();
    }, { passive: false });

    const finishPointer = (event) => {
      if (drag.id !== event.pointerId) return;
      if (!drag.moved) boostUntil = performance.now() + 1050;
      drag.id = null;
      drag.moved = false;
      requestRender();
    };
    canvas.addEventListener("pointerup", finishPointer);
    canvas.addEventListener("pointercancel", finishPointer);
    canvas.addEventListener("pointerleave", (event) => {
      if (drag.id === null) hoveredCell = -1;
      if (event.pointerType === "mouse") requestRender();
    });
    canvas.addEventListener("dblclick", () => {
      targetRotation.x = defaultRotation.x;
      targetRotation.y = defaultRotation.y;
      requestRender();
    });

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(surface);
    const visibilityObserver = new IntersectionObserver((entries) => {
      visible = entries.some((entry) => entry.isIntersecting);
      if (visible) requestRender();
      else if (animationFrame) {
        cancelAnimationFrame(animationFrame);
        animationFrame = 0;
      }
    }, { rootMargin: "180px" });
    visibilityObserver.observe(surface);

    window.addEventListener("sfmemo:themechange", applyTheme);
    motionPreference.addEventListener("change", (event) => {
      reducedMotion = event.matches;
      requestRender();
    });
    coarsePointer.addEventListener("change", resize);

    applyTheme();
    resize();
    requestRender();
  } catch {
    surface.classList.add("is-unavailable");
  }
}
