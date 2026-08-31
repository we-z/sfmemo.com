import * as THREE from "./vendor/three.module.js";

const hero = document.querySelector(".hero-horizon");
const heroFrame = hero?.querySelector(".hero-frame");
const surface = hero?.querySelector(".hero-visual");
const canvas = document.querySelector("#hero-canvas");
const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
const touchNavigationPreference = window.matchMedia("(hover: none) and (pointer: coarse)");
const finePointer = window.matchMedia("(pointer: fine)").matches;
const INITIAL_ROTATION_X = 0.18;
const INITIAL_ROTATION_Y = 0.46;
const SCROLL_REVEAL_ROTATION_X = 0.1;
const SCROLL_REVEAL_ROTATION_Y = -0.82;

if (hero && surface && canvas) {
  try {
    let themeLight = document.documentElement.dataset.theme === "light";
    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setClearColor(0x05070a, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = themeLight ? 1.06 : 1.18;

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-4, 4, 3, -3, 0.1, 40);
    camera.up.set(0, 1, 0);
    camera.position.set(0, 1.6, 12);

    const stackRoot = new THREE.Group();
    stackRoot.rotation.set(INITIAL_ROTATION_X, INITIAL_ROTATION_Y, 0);
    scene.add(stackRoot);

    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
    const smoothstep = (value) => {
      const bounded = clamp(value, 0, 1);
      return bounded * bounded * (3 - 2 * bounded);
    };

    function createSlab(width, depth, height, chamfer, cutaway = 0) {
      const halfWidth = width / 2;
      const halfDepth = depth / 2;
      const shape = new THREE.Shape();
      shape.moveTo(-halfWidth + chamfer, -halfDepth);

      if (cutaway > 0) {
        shape.lineTo(halfWidth - cutaway, -halfDepth);
        shape.lineTo(halfWidth - cutaway, -halfDepth + cutaway);
        shape.lineTo(halfWidth, -halfDepth + cutaway);
      } else {
        shape.lineTo(halfWidth - chamfer, -halfDepth);
        shape.lineTo(halfWidth, -halfDepth + chamfer);
      }

      shape.lineTo(halfWidth, halfDepth - chamfer);
      shape.lineTo(halfWidth - chamfer, halfDepth);
      shape.lineTo(-halfWidth + chamfer, halfDepth);
      shape.lineTo(-halfWidth, halfDepth - chamfer);
      shape.lineTo(-halfWidth, -halfDepth + chamfer);
      shape.closePath();

      const geometry = new THREE.ExtrudeGeometry(shape, {
        depth: height,
        bevelEnabled: false,
        curveSegments: 1,
      });
      geometry.rotateX(-Math.PI / 2);
      geometry.translate(0, -height / 2, 0);
      geometry.computeVertexNormals();
      return geometry;
    }

    const ambient = new THREE.HemisphereLight(0xd8e8ff, 0x030710, 2.15);
    scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xf4f8ff, 4.6);
    keyLight.position.set(-4.5, 6.5, 7.5);
    scene.add(keyLight);

    const rimLight = new THREE.PointLight(0x4389ff, 31, 18, 2);
    rimLight.position.set(4.4, 1.8, 3.8);
    scene.add(rimLight);

    const copperLight = new THREE.PointLight(0xc69258, 9, 8, 2);
    copperLight.position.set(2.2, 0.8, 4.5);
    scene.add(copperLight);

    const substrateMaterial = new THREE.MeshStandardMaterial({
      color: 0x09111d,
      metalness: 0.48,
      roughness: 0.5,
    });
    const interposerMaterial = new THREE.MeshStandardMaterial({
      color: 0x0d3159,
      metalness: 0.58,
      roughness: 0.36,
    });
    const baseMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x123d6c,
      metalness: 0.48,
      roughness: 0.3,
      clearcoat: 0.58,
      clearcoatRoughness: 0.28,
    });

    const substrate = new THREE.Mesh(createSlab(6.15, 3.05, 0.22, 0.16), substrateMaterial);
    substrate.position.y = -1.42;
    stackRoot.add(substrate);

    const interposer = new THREE.Mesh(createSlab(5.82, 2.84, 0.11, 0.14), interposerMaterial);
    interposer.position.y = -1.245;
    stackRoot.add(interposer);

    const baseDie = new THREE.Mesh(createSlab(5.08, 2.58, 0.23, 0.12, 0.7), baseMaterial);
    baseDie.position.y = -1.05;
    stackRoot.add(baseDie);

    const layerCount = 16;
    const layerWidth = 4.94;
    const layerDepth = 2.5;
    const layerHeight = 0.105;
    const layerPitch = 0.205;
    const firstLayerY = -0.78;
    const layerGeometry = createSlab(layerWidth, layerDepth, layerHeight, 0.11, 0.68);
    const layerMaterials = [];
    const layerMeshes = [];

    for (let index = 0; index < layerCount; index += 1) {
      const material = new THREE.MeshPhysicalMaterial({
        color: 0x12345b,
        metalness: 0.34,
        roughness: 0.27,
        clearcoat: 0.68,
        clearcoatRoughness: 0.25,
        emissive: 0x0a2647,
        emissiveIntensity: 0.14,
      });
      const layer = new THREE.Mesh(layerGeometry, material);
      layer.position.y = firstLayerY + index * layerPitch;
      layerMaterials.push(material);
      layerMeshes.push(layer);
      stackRoot.add(layer);
    }

    const seamGeometry = createSlab(4.84, 2.42, 0.035, 0.1, 0.65);
    const seamMaterial = new THREE.MeshStandardMaterial({
      color: 0x02060b,
      metalness: 0.18,
      roughness: 0.64,
    });
    const seams = new THREE.InstancedMesh(seamGeometry, seamMaterial, layerCount - 1);
    const helper = new THREE.Object3D();
    for (let index = 0; index < layerCount - 1; index += 1) {
      helper.position.set(0, firstLayerY + index * layerPitch + layerPitch / 2, 0);
      helper.rotation.set(0, 0, 0);
      helper.scale.set(1, 1, 1);
      helper.updateMatrix();
      seams.setMatrixAt(index, helper.matrix);
    }
    stackRoot.add(seams);

    const edgeMaterial = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false });
    const edgeStrips = new THREE.InstancedMesh(
      new THREE.BoxGeometry(4.13, 0.022, 0.028),
      edgeMaterial,
      layerCount,
    );
    const edgeIdle = new THREE.Color(0x6a93bd);
    const edgeActive = new THREE.Color(0xc7e2ff);
    for (let index = 0; index < layerCount; index += 1) {
      helper.position.set(-0.39, firstLayerY + index * layerPitch + layerHeight / 2 + 0.002, 1.258);
      helper.rotation.set(0, 0, 0);
      helper.scale.set(1, 1, 1);
      helper.updateMatrix();
      edgeStrips.setMatrixAt(index, helper.matrix);
      edgeStrips.setColorAt(index, edgeIdle);
    }
    edgeStrips.instanceColor.needsUpdate = true;
    stackRoot.add(edgeStrips);

    const tsvColumns = [
      { x: 1.49, z: 0.82 },
      { x: 1.88, z: 0.82 },
      { x: 1.49, z: 1.12 },
      { x: 1.88, z: 1.12 },
    ];
    const towerBottom = -1.115;
    const towerTop = firstLayerY + (layerCount - 1) * layerPitch + layerHeight / 2 + 0.12;
    const towerHeight = towerTop - towerBottom;
    const tsvMaterial = new THREE.MeshStandardMaterial({
      color: 0xd0a269,
      metalness: 0.78,
      roughness: 0.24,
      emissive: 0x4b2d12,
      emissiveIntensity: 0.2,
    });
    const tsvs = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.052, 0.052, towerHeight, 12),
      tsvMaterial,
      tsvColumns.length,
    );
    tsvColumns.forEach((column, index) => {
      helper.position.set(column.x, towerBottom + towerHeight / 2, column.z);
      helper.rotation.set(0, 0, 0);
      helper.scale.set(1, 1, 1);
      helper.updateMatrix();
      tsvs.setMatrixAt(index, helper.matrix);
    });
    stackRoot.add(tsvs);

    const bumpCount = tsvColumns.length * (layerCount - 1);
    const bumps = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.068, 10, 7),
      new THREE.MeshStandardMaterial({
        color: 0xc9a97a,
        metalness: 0.72,
        roughness: 0.28,
        emissive: 0x2f1b0c,
        emissiveIntensity: 0.16,
      }),
      bumpCount,
    );
    let bumpIndex = 0;
    for (let layer = 0; layer < layerCount - 1; layer += 1) {
      tsvColumns.forEach((column) => {
        helper.position.set(column.x, firstLayerY + layer * layerPitch + layerPitch / 2, column.z);
        helper.rotation.set(0, 0, 0);
        helper.scale.set(1, 0.72, 1);
        helper.updateMatrix();
        bumps.setMatrixAt(bumpIndex, helper.matrix);
        bumpIndex += 1;
      });
    }
    stackRoot.add(bumps);

    const routeMaterial = new THREE.LineBasicMaterial({
      color: 0x6b9dde,
      transparent: true,
      opacity: 0.27,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    const routes = [];
    const verticalStarts = [];
    const routeSegments = [];
    const entryZ = [1.3, 1.17, 1.04, 0.91];

    tsvColumns.forEach((column, index) => {
      const start = new THREE.Vector3(-2.42, -0.9, entryZ[index]);
      const elbow = new THREE.Vector3(column.x, -0.9, entryZ[index]);
      const base = new THREE.Vector3(column.x, -0.9, column.z);
      const top = new THREE.Vector3(column.x, towerTop + 0.04, column.z);
      const route = new THREE.CurvePath();
      route.add(new THREE.LineCurve3(start, elbow));
      route.add(new THREE.LineCurve3(elbow, base));
      route.add(new THREE.LineCurve3(base, top));
      routes.push(route);

      const horizontalLength = start.distanceTo(elbow) + elbow.distanceTo(base);
      const totalLength = horizontalLength + base.distanceTo(top);
      verticalStarts.push(horizontalLength / totalLength);
      routeSegments.push(
        start.x, start.y, start.z, elbow.x, elbow.y, elbow.z,
        elbow.x, elbow.y, elbow.z, base.x, base.y, base.z,
        base.x, base.y, base.z, top.x, top.y, top.z,
      );
    });

    const routeGeometry = new THREE.BufferGeometry();
    routeGeometry.setAttribute("position", new THREE.Float32BufferAttribute(routeSegments, 3));
    stackRoot.add(new THREE.LineSegments(routeGeometry, routeMaterial));

    const particleCount = 12;
    const particleMaterial = new THREE.MeshBasicMaterial({
      color: 0xd8eaff,
      transparent: true,
      opacity: 0.94,
      blending: THREE.AdditiveBlending,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    });
    const particles = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.058, 10, 7),
      particleMaterial,
      particleCount,
    );
    particles.frustumCulled = false;
    stackRoot.add(particles);

    const particleHaloMaterial = new THREE.MeshBasicMaterial({
      color: 0x5fa3ff,
      transparent: true,
      opacity: 0.2,
      blending: THREE.AdditiveBlending,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    });
    const particleHalos = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.095, 10, 7),
      particleHaloMaterial,
      particleCount,
    );
    particleHalos.frustumCulled = false;
    particles.renderOrder = 18;
    particleHalos.renderOrder = 17;
    stackRoot.add(particleHalos);

    const particleMeta = Array.from({ length: particleCount }, (_, index) => ({
      lane: index % routes.length,
      phase: (index / particleCount + (index % routes.length) * 0.031) % 1,
    }));

    const shadowMaterial = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: { uOpacity: { value: 0.32 } },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        uniform float uOpacity;
        void main() {
          vec2 point = (vUv - 0.5) * vec2(1.0, 2.5);
          float falloff = 1.0 - smoothstep(0.05, 0.5, length(point));
          gl_FragColor = vec4(0.01, 0.03, 0.07, falloff * uOpacity);
        }
      `,
    });
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(6.8, 2.6), shadowMaterial);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.set(0, -1.55, 0.15);
    stackRoot.add(shadow);

    const interactionMeshes = [
      substrate,
      interposer,
      baseDie,
      ...layerMeshes,
      seams,
      edgeStrips,
      tsvs,
      bumps,
    ];

    const raycaster = new THREE.Raycaster();
    const pointerNdc = new THREE.Vector2();
    const activePointers = new Map();
    const mobileTapPointers = new Map();
    const rotationCurrent = new THREE.Vector2(INITIAL_ROTATION_X, INITIAL_ROTATION_Y);
    const rotationTarget = new THREE.Vector2(INITIAL_ROTATION_X, INITIAL_ROTATION_Y);
    const baseRotation = new THREE.Vector2(INITIAL_ROTATION_X, INITIAL_ROTATION_Y);
    const scrollRotation = new THREE.Vector2(INITIAL_ROTATION_X, INITIAL_ROTATION_Y);
    const desktopRotationOffset = new THREE.Vector2();
    const layerActivity = new Float32Array(layerCount);
    const tempColor = new THREE.Color();
    const tempPoint = new THREE.Vector3();
    const layerIdleColor = new THREE.Color(0x12345b);
    const layerBoostColor = new THREE.Color(0x267ee5);
    const layerIdleEmissive = new THREE.Color(0x0a2647);
    const layerBoostEmissive = new THREE.Color(0x2a7ee0);

    function applyHBMTheme(light) {
      themeLight = light;
      renderer.toneMappingExposure = light ? 1.06 : 1.18;
      ambient.color.set(light ? 0xffffff : 0xd8e8ff);
      ambient.groundColor.set(light ? 0xb8c8dc : 0x030710);
      ambient.intensity = light ? 2.45 : 2.15;
      keyLight.color.set(light ? 0xffffff : 0xf4f8ff);
      keyLight.intensity = light ? 4.2 : 4.6;
      rimLight.color.set(light ? 0x1769d2 : 0x4389ff);
      copperLight.intensity = light ? 7 : 9;

      substrateMaterial.color.set(light ? 0x173451 : 0x09111d);
      interposerMaterial.color.set(light ? 0x1c5590 : 0x0d3159);
      baseMaterial.color.set(light ? 0x1f64ad : 0x123d6c);
      seamMaterial.color.set(light ? 0x0c2946 : 0x02060b);
      layerIdleColor.set(light ? 0x1d5fa8 : 0x12345b);
      layerBoostColor.set(light ? 0x3c8ee8 : 0x267ee5);
      layerIdleEmissive.set(light ? 0x0e3f78 : 0x0a2647);
      layerBoostEmissive.set(light ? 0x2372c4 : 0x2a7ee0);
      layerMaterials.forEach((material) => {
        material.color.copy(layerIdleColor);
        material.emissive.copy(layerIdleEmissive);
      });
      edgeIdle.set(light ? 0x356ca6 : 0x6a93bd);
      edgeActive.set(light ? 0x8abcf2 : 0xc7e2ff);
      tsvMaterial.color.set(light ? 0xb47b38 : 0xd0a269);
      routeMaterial.color.set(light ? 0x0e55b7 : 0x6b9dde);
      routeMaterial.blending = light ? THREE.NormalBlending : THREE.AdditiveBlending;
      routeMaterial.needsUpdate = true;
      particleMaterial.color.set(0xd8eaff);
      particleMaterial.blending = light ? THREE.NormalBlending : THREE.AdditiveBlending;
      particleMaterial.needsUpdate = true;
      particleHaloMaterial.color.set(0x5fa3ff);
      particleHaloMaterial.blending = light ? THREE.NormalBlending : THREE.AdditiveBlending;
      particleHaloMaterial.needsUpdate = true;
      shadowMaterial.uniforms.uOpacity.value = light ? 0.14 : 0.32;
    }

    let reduceMotion = motionPreference.matches;
    let mobile = false;
    let touchNavigation = touchNavigationPreference.matches;
    let visible = true;
    let frameId = 0;
    let lastFrameAt = performance.now();
    let flowTime = 0.18;
    let dragging = false;
    let lastTouchTapAt = 0;
    let lastTouchTapX = 0;
    let lastTouchTapY = 0;
    let scrollRotationFrame = 0;
    let lastScrollAt = 0;
    let particleBoost = 0;
    let particleBoostResetTimer = 0;

    surface.dataset.inspecting = "false";
    surface.dataset.dragging = "false";
    surface.dataset.particleBoost = "false";

    function pointFromClient(clientX, clientY) {
      const bounds = surface.getBoundingClientRect();
      return {
        x: clamp(((clientX - bounds.left) / bounds.width) * 2 - 1, -1, 1),
        y: clamp(-(((clientY - bounds.top) / bounds.height) * 2 - 1), -1, 1),
      };
    }

    function hitsStack(point) {
      pointerNdc.set(point.x, point.y);
      raycaster.setFromCamera(pointerNdc, camera);
      scene.updateMatrixWorld(true);
      return raycaster.intersectObjects(interactionMeshes, false).length > 0;
    }

    function updateInteractionState() {
      surface.dataset.inspecting = String(dragging);
      surface.dataset.dragging = String(dragging);
    }

    function updateLights(point) {
      rimLight.position.x = 4.4 + point.x * 2.2;
      keyLight.position.x = -4.5 + point.x * 1.2;
    }

    function triggerParticleBoost() {
      particleBoost = 1;
      surface.dataset.particleBoost = "true";
      if (particleBoostResetTimer) window.clearTimeout(particleBoostResetTimer);
      if (reduceMotion) {
        render(performance.now(), true);
        particleBoostResetTimer = window.setTimeout(() => {
          particleBoost = 0;
          particleBoostResetTimer = 0;
          surface.dataset.particleBoost = "false";
          render(performance.now(), true);
        }, 850);
      } else {
        start();
      }
    }

    function renderDirectlyWhenReduced() {
      if (!reduceMotion) return;
      rotationCurrent.copy(rotationTarget);
      render(performance.now(), true);
    }

    function wrapAngle(angle) {
      return Math.atan2(Math.sin(angle), Math.cos(angle));
    }

    function resetRotation() {
      dragging = false;
      desktopRotationOffset.set(0, 0);
      updateScrollRotation();
      updateLights({ x: 0, y: 0 });
      updateInteractionState();
      renderDirectlyWhenReduced();
    }

    function resetHeroFromTouch() {
      resetRotation();
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: reduceMotion ? "auto" : "smooth",
      });
    }

    function registerTouchTap(event) {
      triggerParticleBoost();
      const now = performance.now();
      const closeToPrevious = Math.hypot(
        event.clientX - lastTouchTapX,
        event.clientY - lastTouchTapY,
      ) <= 48;

      if (now - lastTouchTapAt <= 330 && closeToPrevious) {
        lastTouchTapAt = 0;
        resetHeroFromTouch();
        return;
      }

      lastTouchTapAt = now;
      lastTouchTapX = event.clientX;
      lastTouchTapY = event.clientY;
    }

    function commitRotation() {
      const wrappedYaw = wrapAngle(rotationTarget.y);
      rotationCurrent.y += wrappedYaw - rotationTarget.y;
      rotationTarget.y = wrappedYaw;
      if (!touchNavigation) {
        desktopRotationOffset.set(
          rotationTarget.x - scrollRotation.x,
          rotationTarget.y - scrollRotation.y,
        );
      }
      baseRotation.copy(rotationTarget);
    }

    function setDirectRotation(tracked, event) {
      const bounds = surface.getBoundingClientRect();
      const dx = event.clientX - tracked.startX;
      const dy = event.clientY - tracked.startY;
      const point = pointFromClient(event.clientX, event.clientY);
      const touchInput = tracked.type === "touch";
      const pitchDelta = touchInput
        ? dy * (Math.PI / 60)
        : (dy / bounds.height) * Math.PI * 0.62;
      const yawDelta = touchInput
        ? dx * (Math.PI / 36)
        : (dx / bounds.width) * Math.PI * 2;

      dragging = true;
      const pitch = tracked.startRotation.x + pitchDelta;
      rotationTarget.set(
        clamp(pitch, touchInput ? -0.7 : -0.3, touchInput ? 0.8 : 0.42),
        tracked.startRotation.y + yawDelta,
      );
      updateLights(point);
      updateInteractionState();
      renderDirectlyWhenReduced();
    }

    function endDraggingState() {
      dragging = [...activePointers.values()].some((pointer) => pointer.mode === "rotate");
      updateInteractionState();
    }

    function enterMultiTouchMode() {
      if ([...activePointers.values()].some((pointer) => pointer.mode === "rotate")) commitRotation();
      activePointers.forEach((pointer) => { pointer.mode = "multi"; });
      dragging = false;
      rotationTarget.copy(baseRotation);
      updateInteractionState();

      activePointers.forEach((_, pointerId) => {
        if (surface.hasPointerCapture(pointerId)) {
          try { surface.releasePointerCapture(pointerId); } catch {}
        }
      });
    }

    function updateScrollRotation() {
      const travel = Math.max(1, hero.offsetHeight - (heroFrame?.offsetHeight ?? window.innerHeight));
      const rawProgress = clamp(-hero.getBoundingClientRect().top / travel, 0, 1);
      const reveal = reduceMotion ? 0 : smoothstep(clamp(rawProgress / 0.82, 0, 1));
      scrollRotation.set(
        INITIAL_ROTATION_X + (SCROLL_REVEAL_ROTATION_X - INITIAL_ROTATION_X) * reveal,
        INITIAL_ROTATION_Y + (SCROLL_REVEAL_ROTATION_Y - INITIAL_ROTATION_Y) * reveal,
      );
      if (dragging) return;
      rotationTarget.set(
        scrollRotation.x + (touchNavigation ? 0 : desktopRotationOffset.x),
        scrollRotation.y + (touchNavigation ? 0 : desktopRotationOffset.y),
      );
      baseRotation.copy(rotationTarget);
    }

    function render(now = performance.now(), force = false) {
      frameId = 0;
      const scrollingModel = now - lastScrollAt < 140;
      const mobileFrameInterval = dragging || scrollingModel ? 0 : 31;
      if (!force && mobile && now - lastFrameAt < mobileFrameInterval) {
        frameId = requestAnimationFrame(render);
        return;
      }

      const delta = clamp((now - lastFrameAt) / 1000, 0, 0.05);
      lastFrameAt = now;
      if (!reduceMotion) particleBoost = Math.max(0, particleBoost - delta * 0.72);
      if (particleBoost <= 0.001 && surface.dataset.particleBoost !== "false") {
        particleBoost = 0;
        surface.dataset.particleBoost = "false";
      }
      const boostAmount = smoothstep(particleBoost);
      const inspectAmount = dragging ? 1 : 0;
      const speed = 0.085 + inspectAmount * 0.022 + boostAmount * 0.31;

      if (!reduceMotion) {
        flowTime = (flowTime + delta * speed) % 1;
        if (mobile && dragging) rotationCurrent.copy(rotationTarget);
        else rotationCurrent.lerp(rotationTarget, dragging ? 0.34 : 0.115);
      } else {
        rotationCurrent.copy(rotationTarget);
      }

      stackRoot.rotation.x = rotationCurrent.x;
      stackRoot.rotation.y = rotationCurrent.y;
      layerActivity.fill(0);

      particleMeta.forEach((meta, index) => {
        const progress = reduceMotion
          ? (meta.phase + 0.19) % 1
          : (flowTime + meta.phase) % 1;
        routes[meta.lane].getPointAt(progress, tempPoint);
        const entrance = smoothstep(progress * 10);
        const exit = smoothstep((1 - progress) * 12);
        const pulse = 0.74 + 0.26 * Math.sin((progress * Math.PI * 12) + meta.lane);
        const scale = Math.max(0.001, entrance * exit * pulse);

        helper.position.copy(tempPoint);
        helper.rotation.set(0, 0, 0);
        helper.scale.setScalar(scale * (themeLight ? 1.18 : 1) * (1 + boostAmount * 0.48));
        helper.updateMatrix();
        particles.setMatrixAt(index, helper.matrix);

        helper.scale.setScalar(scale * ((themeLight ? 1.45 : 1.18) + boostAmount * 1.15));
        helper.updateMatrix();
        particleHalos.setMatrixAt(index, helper.matrix);

        const verticalStart = verticalStarts[meta.lane];
        if (progress >= verticalStart) {
          const verticalProgress = clamp((progress - verticalStart) / (1 - verticalStart), 0, 0.999);
          const layerPosition = verticalProgress * layerCount;
          const layerIndex = clamp(Math.floor(layerPosition), 0, layerCount - 1);
          const proximity = 1 - Math.abs(layerPosition - layerIndex - 0.5) * 1.45;
          layerActivity[layerIndex] = Math.max(layerActivity[layerIndex], clamp(proximity, 0, 1) * scale);
        }
      });
      particles.instanceMatrix.needsUpdate = true;
      particleHalos.instanceMatrix.needsUpdate = true;

      for (let index = 0; index < layerCount; index += 1) {
        const activity = clamp(layerActivity[index], 0, 1);
        const layerGlow = clamp(activity + boostAmount * 0.85, 0, 1);
        tempColor.copy(edgeIdle).lerp(edgeActive, layerGlow);
        edgeStrips.setColorAt(index, tempColor);
        layerMaterials[index].color.copy(layerIdleColor).lerp(layerBoostColor, boostAmount);
        layerMaterials[index].emissive.copy(layerIdleEmissive).lerp(layerBoostEmissive, boostAmount);
        layerMaterials[index].emissiveIntensity = (themeLight ? 0.08 : 0.14)
          + activity * 0.48
          + boostAmount * (themeLight ? 0.62 : 0.9);
      }
      edgeStrips.instanceColor.needsUpdate = true;

      tsvMaterial.emissiveIntensity = (themeLight ? 0.08 : 0.2) + inspectAmount * 0.18 + boostAmount * 0.32;
      routeMaterial.opacity = (themeLight ? 0.64 : 0.27) + inspectAmount * 0.1 + boostAmount * 0.18;
      particleMaterial.opacity = (themeLight ? 0.95 : 0.9) + boostAmount * 0.05;
      particleHaloMaterial.opacity = (themeLight ? 0.28 : 0.2) + boostAmount * 0.5;
      rimLight.intensity = (themeLight ? 23 : 31) + inspectAmount * 6 + boostAmount * 13;

      renderer.render(scene, camera);
      if (!force && !reduceMotion && visible && !document.hidden) frameId = requestAnimationFrame(render);
    }

    function resize() {
      const bounds = surface.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      const wasMobile = mobile;
      const wasTouchNavigation = touchNavigation;
      mobile = window.innerWidth <= 780
        || (!finePointer && window.innerWidth <= 960 && window.innerHeight <= 480);
      touchNavigation = window.innerWidth <= 780 || touchNavigationPreference.matches;
      surface.dataset.touchNavigation = String(touchNavigation);
      stackRoot.position.y = mobile ? 0.68 : -0.38;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobile ? 1.05 : finePointer ? 1.3 : 1.15));
      renderer.setSize(bounds.width, bounds.height, false);

      const aspect = bounds.width / bounds.height;
      const viewHeight = mobile
        ? Math.max(7.05 / 0.94, 7.4 / (aspect * 0.94))
        : Math.max(3.62 / 0.78, 6.45 / (aspect * 0.9));
      camera.left = -viewHeight * aspect / 2;
      camera.right = viewHeight * aspect / 2;
      camera.top = viewHeight / 2;
      camera.bottom = -viewHeight / 2;
      camera.position.set(0, 1.6, 12);
      camera.lookAt(0, -0.08, 0);
      camera.updateProjectionMatrix();
      if (wasMobile !== mobile || wasTouchNavigation !== touchNavigation) {
        desktopRotationOffset.set(0, 0);
      }
      updateScrollRotation();
      render(performance.now(), true);
    }

    surface.addEventListener("pointermove", (event) => {
      if (touchNavigation) {
        const tap = mobileTapPointers.get(event.pointerId);
        if (tap && Math.hypot(event.clientX - tap.startX, event.clientY - tap.startY) > 10) {
          mobileTapPointers.delete(event.pointerId);
        }
        return;
      }
      const tracked = activePointers.get(event.pointerId);

      if (tracked) {
        if (tracked.type !== "touch" && event.buttons === 0) {
          releasePointer(event);
          return;
        }
        tracked.lastX = event.clientX;
        tracked.lastY = event.clientY;
        if ((tracked.type !== "touch" && !tracked.hit) || tracked.mode === "multi") return;

        const dx = event.clientX - tracked.startX;
        const dy = event.clientY - tracked.startY;
        const distance = Math.hypot(dx, dy);

        if (tracked.mode === "pending") {
          if (distance < 4) return;
          tracked.mode = "rotate";
          tracked.startRotation.copy(rotationCurrent);
          try { surface.setPointerCapture(event.pointerId); } catch {}
        } else if (tracked.mode === "pressed") {
          if (distance < 3) return;
          tracked.mode = "rotate";
          tracked.startRotation.copy(rotationCurrent);
          tracked.startX = event.clientX;
          tracked.startY = event.clientY;
        }

        if (tracked.mode === "rotate") {
          const activeTouchCount = [...activePointers.values()]
            .filter((pointer) => pointer.type === "touch").length;
          if (tracked.type === "touch" && activeTouchCount === 1 && event.cancelable) {
            event.preventDefault();
          }
          setDirectRotation(tracked, event);
        }
      }
    }, { passive: false });

    surface.addEventListener("pointerdown", (event) => {
      if (touchNavigation) {
        if (event.pointerType === "touch") {
          const point = pointFromClient(event.clientX, event.clientY);
          if (hitsStack(point)) {
            mobileTapPointers.set(event.pointerId, {
              startX: event.clientX,
              startY: event.clientY,
            });
          }
        }
        return;
      }
      if (event.button !== undefined && event.button !== 0) return;
      const point = pointFromClient(event.clientX, event.clientY);
      const hit = hitsStack(point);
      if (!hit) return;

      activePointers.set(event.pointerId, {
        type: event.pointerType,
        hit,
        startX: event.clientX,
        startY: event.clientY,
        lastX: event.clientX,
        lastY: event.clientY,
        startRotation: rotationCurrent.clone(),
        mode: event.pointerType === "touch" ? "pending" : "pressed",
      });

      const activeTouchCount = [...activePointers.values()]
        .filter((pointer) => pointer.type === "touch").length;
      if (event.pointerType === "touch" && activeTouchCount > 1) {
        enterMultiTouchMode();
        return;
      }

      if (event.pointerType !== "touch" && hit) {
        try { surface.setPointerCapture(event.pointerId); } catch {}
      }
    });

    function releasePointer(event) {
      const mobileTap = mobileTapPointers.get(event.pointerId);
      if (mobileTap) {
        mobileTapPointers.delete(event.pointerId);
        if (event.type === "pointerup") registerTouchTap(event);
        return;
      }
      const tracked = activePointers.get(event.pointerId);
      if (!tracked) return;

      if (tracked.mode === "rotate") commitRotation();
      if (event.type === "pointerup" && tracked.mode === "pressed") {
        triggerParticleBoost();
      }
      if (event.type === "pointerup" && tracked.type === "touch" && tracked.mode === "pending") {
        registerTouchTap(event);
      }

      activePointers.delete(event.pointerId);
      if (surface.hasPointerCapture(event.pointerId)) {
        try { surface.releasePointerCapture(event.pointerId); } catch {}
      }
      endDraggingState();

      if (tracked.mode === "multi") {
        const remainingTouches = [...activePointers.values()]
          .filter((pointer) => pointer.type === "touch");
        if (remainingTouches.length === 1) {
          const [remaining] = remainingTouches;
          const point = pointFromClient(remaining.lastX, remaining.lastY);
          remaining.hit = hitsStack(point);
          remaining.mode = "pending";
          remaining.startX = remaining.lastX;
          remaining.startY = remaining.lastY;
          remaining.startRotation.copy(rotationCurrent);
        }
      }

      if (!activePointers.size) {
        dragging = false;
        rotationTarget.copy(baseRotation);
        updateLights({ x: 0, y: 0 });
        updateInteractionState();
        renderDirectlyWhenReduced();
      }
    }

    window.addEventListener("pointerup", releasePointer);
    window.addEventListener("pointercancel", releasePointer);
    surface.addEventListener("lostpointercapture", (event) => {
      const tracked = activePointers.get(event.pointerId);
      if (tracked && tracked.mode !== "multi") releasePointer(event);
    });
    surface.addEventListener("dblclick", (event) => {
      if (touchNavigation) return;
      const point = pointFromClient(event.clientX, event.clientY);
      if (!hitsStack(point)) return;
      event.preventDefault();
      resetRotation();
    });

    function scheduleScrollRotation() {
      if (scrollRotationFrame) return;
      scrollRotationFrame = requestAnimationFrame(() => {
        scrollRotationFrame = 0;
        lastScrollAt = performance.now();
        updateScrollRotation();
        if (reduceMotion) render(performance.now(), true);
        else start();
      });
    }

    window.addEventListener("scroll", scheduleScrollRotation, { passive: true });
    window.addEventListener("pageshow", scheduleScrollRotation);

    function start() {
      if (frameId || reduceMotion || !visible || document.hidden) return;
      lastFrameAt = performance.now();
      frameId = requestAnimationFrame(render);
    }

    function stop() {
      if (!frameId) return;
      cancelAnimationFrame(frameId);
      frameId = 0;
    }

    new ResizeObserver(resize).observe(surface);
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) start();
      else stop();
    }, { rootMargin: "100px" }).observe(hero);

    document.addEventListener("visibilitychange", () => {
      if ([...activePointers.values()].some((pointer) => pointer.mode === "rotate")) commitRotation();
      activePointers.clear();
      mobileTapPointers.clear();
      dragging = false;
      rotationTarget.copy(baseRotation);
      updateLights({ x: 0, y: 0 });
      updateInteractionState();
      if (document.hidden) stop();
      else start();
    });
    window.addEventListener("blur", () => {
      if ([...activePointers.values()].some((pointer) => pointer.mode === "rotate")) commitRotation();
      activePointers.clear();
      mobileTapPointers.clear();
      dragging = false;
      rotationTarget.copy(baseRotation);
      updateLights({ x: 0, y: 0 });
      updateInteractionState();
      renderDirectlyWhenReduced();
    });
    window.addEventListener("orientationchange", () => {
      if ([...activePointers.values()].some((pointer) => pointer.mode === "rotate")) commitRotation();
      activePointers.clear();
      mobileTapPointers.clear();
      dragging = false;
      rotationTarget.copy(baseRotation);
      updateLights({ x: 0, y: 0 });
      updateInteractionState();
      renderDirectlyWhenReduced();
      resize();
    });

    canvas.addEventListener("webglcontextlost", (event) => {
      event.preventDefault();
      stop();
      hero.classList.remove("webgl-ready");
    });

    motionPreference.addEventListener("change", (event) => {
      reduceMotion = event.matches;
      if (reduceMotion && particleBoostResetTimer) {
        window.clearTimeout(particleBoostResetTimer);
        particleBoostResetTimer = 0;
      }
      if (reduceMotion) {
        particleBoost = 0;
        surface.dataset.particleBoost = "false";
      }
      updateScrollRotation();
      if (reduceMotion) {
        render(performance.now(), true);
        stop();
      } else {
        start();
      }
    });

    window.addEventListener("sfmemo:themechange", (event) => {
      applyHBMTheme(event.detail?.theme === "light");
      if (reduceMotion) render(performance.now(), true);
      else start();
    });

    applyHBMTheme(themeLight);
    resize();
    hero.classList.add("webgl-ready");
    render(performance.now(), true);
    start();
  } catch (error) {
    console.warn("SF Memory HBM stack fallback enabled.", error);
  }
}
