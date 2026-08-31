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
    camera.position.set(0, 10.8, 2.05);
    camera.up.set(0, 0, -1);
    camera.lookAt(0, 0, 0);

    const arrayRoot = new THREE.Group();
    const defaultRotation = { x: 0, y: 0 };
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
    const substrate = new THREE.Mesh(new THREE.BoxGeometry(8.2, 0.2, 8.2), substrateMaterial);
    substrate.position.y = -0.28;
    arrayRoot.add(substrate);

    const interposer = new THREE.Mesh(new THREE.BoxGeometry(8, 0.12, 8), interposerMaterial);
    interposer.position.y = -0.12;
    arrayRoot.add(interposer);

    const substrateEdgeMaterial = new THREE.LineBasicMaterial({
      color: 0x3977b8,
      transparent: true,
      opacity: 0.54,
    });
    const substrateEdges = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(8.01, 0.125, 8.01)),
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

    const hbmBaseMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x0a294a,
      metalness: 0.56,
      roughness: 0.34,
      clearcoat: 0.42,
      clearcoatRoughness: 0.25,
      emissive: 0x031326,
      emissiveIntensity: 0.14,
    });
    const hbmLayerMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x164d80,
      metalness: 0.24,
      roughness: 0.3,
      clearcoat: 0.52,
      clearcoatRoughness: 0.22,
      emissive: 0x061e38,
      emissiveIntensity: 0.16,
    });
    const hbmTopMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x276aa3,
      metalness: 0.18,
      roughness: 0.27,
      clearcoat: 0.6,
      clearcoatRoughness: 0.18,
      iridescence: 0.18,
      iridescenceIOR: 1.32,
      iridescenceThicknessRange: [150, 250],
      emissive: 0x092a4a,
      emissiveIntensity: 0.18,
    });
    const hbmViaMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xc39252,
      metalness: 0.82,
      roughness: 0.22,
      emissive: 0x3d210a,
      emissiveIntensity: 0.12,
    });

    const hbmPositions = [];
    const hbmOffsets = [...lanePositions];
    hbmOffsets.forEach((offset) => {
      hbmPositions.push({ x: offset, z: -3.7, rotation: 0 });
      hbmPositions.push({ x: offset, z: 3.7, rotation: 0 });
      hbmPositions.push({ x: -3.7, z: offset, rotation: Math.PI / 2 });
      hbmPositions.push({ x: 3.7, z: offset, rotation: Math.PI / 2 });
    });

    const hbmBaseMesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.64, 0.08, 0.5),
      hbmBaseMaterial,
      hbmPositions.length,
    );
    const hbmLayerCount = 4;
    const hbmLayerMesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.58, 0.052, 0.44),
      hbmLayerMaterial,
      hbmPositions.length * hbmLayerCount,
    );
    const hbmTopMesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.5, 0.022, 0.35),
      hbmTopMaterial,
      hbmPositions.length,
    );
    const hbmViaMesh = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.026, 0.026, 0.035, 10),
      hbmViaMaterial,
      hbmPositions.length * 4,
    );

    hbmPositions.forEach(({ x, z, rotation }, stackIndex) => {
      helper.position.set(x, 0.01, z);
      helper.rotation.set(0, rotation, 0);
      helper.scale.set(1, 1, 1);
      helper.updateMatrix();
      hbmBaseMesh.setMatrixAt(stackIndex, helper.matrix);

      for (let layer = 0; layer < hbmLayerCount; layer += 1) {
        helper.position.set(x, 0.075 + layer * 0.066, z);
        helper.rotation.set(0, rotation, 0);
        helper.updateMatrix();
        hbmLayerMesh.setMatrixAt(stackIndex * hbmLayerCount + layer, helper.matrix);
      }

      helper.position.set(x, 0.3, z);
      helper.rotation.set(0, rotation, 0);
      helper.updateMatrix();
      hbmTopMesh.setMatrixAt(stackIndex, helper.matrix);

      [-0.18, -0.06, 0.06, 0.18].forEach((localX, viaIndex) => {
        const cos = Math.cos(rotation);
        const sin = Math.sin(rotation);
        helper.position.set(x + localX * cos, 0.33, z - localX * sin);
        helper.rotation.set(0, rotation, 0);
        helper.updateMatrix();
        hbmViaMesh.setMatrixAt(stackIndex * 4 + viaIndex, helper.matrix);
      });
    });
    hbmBaseMesh.instanceMatrix.needsUpdate = true;
    hbmLayerMesh.instanceMatrix.needsUpdate = true;
    hbmTopMesh.instanceMatrix.needsUpdate = true;
    hbmViaMesh.instanceMatrix.needsUpdate = true;
    arrayRoot.add(hbmBaseMesh, hbmLayerMesh, hbmTopMesh, hbmViaMesh);

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
    const boostBlueDark = new THREE.Color(0x4c9ff0);
    const boostBlueLight = new THREE.Color(0x2b78c6);
    const boostTopDark = new THREE.Color(0x77c6ff);
    const boostTopLight = new THREE.Color(0x3d8fd0);
    const boostSubstrateDark = new THREE.Color(0x123b69);
    const boostSubstrateLight = new THREE.Color(0x397db3);
    const boostInterposerDark = new THREE.Color(0x246ea9);
    const boostInterposerLight = new THREE.Color(0x4a92c9);
    const boostGold = new THREE.Color(0xf1c777);

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
      hbmBaseMaterial.color.setHex(lightTheme ? 0x1c527f : 0x0a294a);
      hbmBaseMaterial.emissive.setHex(lightTheme ? 0x0a3158 : 0x031326);
      hbmLayerMaterial.color.setHex(lightTheme ? 0x2b75aa : 0x164d80);
      hbmLayerMaterial.emissive.setHex(lightTheme ? 0x10426f : 0x061e38);
      hbmTopMaterial.color.setHex(lightTheme ? 0x3c87b9 : 0x276aa3);
      hbmTopMaterial.emissive.setHex(lightTheme ? 0x15517e : 0x092a4a);
      hbmViaMaterial.color.setHex(lightTheme ? 0x9c6f37 : 0xc39252);
      hbmViaMaterial.emissive.setHex(lightTheme ? 0x3b220b : 0x3d210a);
      if (reducedMotion) renderFrame(performance.now());
    }

    function updateColors(time, boost) {
      const bodyPalette = lightTheme ? lightCellPalette : darkCellPalette;
      const topPalette = lightTheme ? lightCorePalette : darkCorePalette;
      const activeBody = lightTheme ? activeCellLight : activeCellDark;
      const activeTop = lightTheme ? activeCoreLight : activeCoreDark;
      const waveTime = reducedMotion ? 7.3 : simulationTime;
      const cycleLength = gridSize * 2 + 4;
      const wavePosition = fract(waveTime * 0.095) * cycleLength - 2;

      cellPositions.forEach(({ row, column }, index) => {
        const diagonal = row + column;
        const leadingWave = Math.exp(-Math.pow(diagonal - wavePosition, 2) * 1.4);
        const trailingWave = Math.exp(-Math.pow(diagonal - (wavePosition - 3), 2) * 2.2) * 0.28;
        const wave = Math.min(1, leadingWave + trailingWave);
        const hovered = index === hoveredCell ? 0.78 : 0;
        const hoverLane = hoveredCell >= 0 && (
          row === Math.floor(hoveredCell / gridSize) || column === hoveredCell % gridSize
        ) ? 0.16 : 0;
        const activation = clamp(wave * (0.74 + boost * 0.34) + hovered + hoverLane, 0, 1);

        cellColor
          .setHex(bodyPalette[(row + column * 3) % bodyPalette.length])
          .lerp(activeBody, clamp(activation * 0.76 + boost * 0.28, 0, 1));
        coreColor
          .setHex(topPalette[(row * 2 + column) % topPalette.length])
          .lerp(activeTop, clamp(activation + boost * 0.34, 0, 1));
        cellMesh.setColorAt(index, cellColor);
        coreMesh.setColorAt(index, coreColor);
      });
      cellMesh.instanceColor.needsUpdate = true;
      coreMesh.instanceColor.needsUpdate = true;

      renderer.toneMappingExposure = (lightTheme ? 1 : 1.18) + boost * 0.18;

      substrateMaterial.color
        .setHex(lightTheme ? 0x15304d : 0x07111f)
        .lerp(lightTheme ? boostSubstrateLight : boostSubstrateDark, boost * 0.5);
      interposerMaterial.color
        .setHex(lightTheme ? 0x225f91 : 0x0a2a4c)
        .lerp(lightTheme ? boostInterposerLight : boostInterposerDark, boost * 0.62);
      padMaterial.color
        .setHex(lightTheme ? 0x2b74a8 : 0x6da9d7)
        .lerp(lightTheme ? boostTopLight : activeCoreDark, boost * 0.52);
      hbmBaseMaterial.color
        .setHex(lightTheme ? 0x1c527f : 0x0a294a)
        .lerp(lightTheme ? boostBlueLight : boostBlueDark, boost * 0.56);
      hbmLayerMaterial.color
        .setHex(lightTheme ? 0x2b75aa : 0x164d80)
        .lerp(lightTheme ? boostBlueLight : boostBlueDark, boost * 0.72);
      hbmTopMaterial.color
        .setHex(lightTheme ? 0x3c87b9 : 0x276aa3)
        .lerp(lightTheme ? boostTopLight : boostTopDark, boost * 0.76);
      hbmViaMaterial.color
        .setHex(lightTheme ? 0x9c6f37 : 0xc39252)
        .lerp(boostGold, boost * 0.7);

      substrateEdgeMaterial.opacity = (lightTheme ? 0.68 : 0.54) + boost * 0.22;
      traceMaterial.opacity = (lightTheme ? 0.42 : 0.3) + boost * 0.36;
      hbmBaseMaterial.emissiveIntensity = (lightTheme ? 0.12 : 0.14) + boost * 0.3;
      hbmLayerMaterial.emissiveIntensity = (lightTheme ? 0.14 : 0.16) + boost * 0.42;
      hbmTopMaterial.emissiveIntensity = (lightTheme ? 0.16 : 0.18) + boost * 0.48;
      hbmViaMaterial.emissiveIntensity = 0.12 + boost * 0.3;
      interposerMaterial.emissiveIntensity = (lightTheme ? 0.12 : 0.15) + boost * 0.34;
      rimLight.intensity = 24 + boost * 22;
    }

    function renderFrame(time) {
      animationFrame = 0;
      const elapsed = Math.min(0.05, Math.max(0, (time - previousTime) / 1000));
      previousTime = time;
      const boost = reducedMotion ? 0 : clamp((boostUntil - time) / 900, 0, 1);
      if (!reducedMotion) simulationTime += elapsed * (1 + boost * 4.2);

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
      const viewHeight = Math.max(10.4, 11.4 / Math.max(aspect, 0.4));
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
      targetRotation.y = clamp(targetRotation.y + dx * 0.008, -0.28, 0.28);
      targetRotation.x = 0;
      drag.lastX = event.clientX;
      drag.lastY = event.clientY;
      requestRender();
    }, { passive: false });

    const finishPointer = (event) => {
      if (drag.id !== event.pointerId) return;
      if (!drag.moved) boostUntil = performance.now() + 1350;
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
