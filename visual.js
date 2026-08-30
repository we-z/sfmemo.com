import * as THREE from "./vendor/three.module.js";

const hero = document.querySelector(".hero-horizon");
const heroSurface = hero?.querySelector(".hero-visual") ?? hero;
const canvas = document.querySelector("#hero-canvas");
const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
let reduceMotion = motionPreference.matches;
const finePointer = window.matchMedia("(pointer: fine)").matches;

if (hero && heroSurface && canvas) {
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
    renderer.toneMappingExposure = 0.96;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, finePointer ? 1.3 : 1.05));

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-5, 5, 4, -4, 0.1, 60);
    camera.up.set(0, 0, -1);
    const packageRoot = new THREE.Group();
    scene.add(packageRoot);

    const createChamferedSlab = (width, depth, height, chamfer) => {
      const halfWidth = width / 2;
      const halfDepth = depth / 2;
      const shape = new THREE.Shape();
      shape.moveTo(-halfWidth + chamfer, -halfDepth);
      shape.lineTo(halfWidth - chamfer, -halfDepth);
      shape.lineTo(halfWidth, -halfDepth + chamfer);
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
    };

    const substrateMaterial = new THREE.MeshBasicMaterial({ color: 0x050b14 });
    const interposerMaterial = new THREE.MeshBasicMaterial({ color: 0x102a50 });
    const logicMaterial = new THREE.MeshBasicMaterial({ color: 0x397dcc });
    const logicFrameMaterial = new THREE.MeshBasicMaterial({ color: 0x07101d });

    const substrate = new THREE.Mesh(createChamferedSlab(9.1, 5.8, 0.24, 0.22), substrateMaterial);
    substrate.position.y = -0.12;
    packageRoot.add(substrate);

    const interposerGeometry = createChamferedSlab(8.74, 5.45, 0.14, 0.18);
    const interposer = new THREE.Mesh(interposerGeometry, interposerMaterial);
    interposer.position.y = 0.08;
    packageRoot.add(interposer);

    const packageEdge = new THREE.LineSegments(
      new THREE.EdgesGeometry(interposerGeometry, 24),
      new THREE.LineBasicMaterial({ color: 0x8bbcff, transparent: true, opacity: 0.58 }),
    );
    packageEdge.position.copy(interposer.position);
    packageRoot.add(packageEdge);

    const logicFrame = new THREE.Mesh(createChamferedSlab(3.12, 2.58, 0.12, 0.13), logicFrameMaterial);
    logicFrame.position.y = 0.23;
    packageRoot.add(logicFrame);

    const logicDieGeometry = createChamferedSlab(2.76, 2.22, 0.38, 0.11);
    const logicDie = new THREE.Mesh(logicDieGeometry, logicMaterial);
    logicDie.position.y = 0.47;
    packageRoot.add(logicDie);

    const logicEdgeMaterial = new THREE.LineBasicMaterial({ color: 0xd7eaff, transparent: true, opacity: 0.76 });
    const logicEdge = new THREE.LineSegments(new THREE.EdgesGeometry(logicDieGeometry, 28), logicEdgeMaterial);
    logicEdge.position.copy(logicDie.position);
    packageRoot.add(logicEdge);

    const logicGrooveGeometry = new THREE.BufferGeometry();
    const logicGrooves = [];
    [-0.62, -0.3, 0.3, 0.62].forEach((z) => {
      logicGrooves.push(-0.94, 0.665, z, 0.94, 0.665, z);
    });
    logicGrooveGeometry.setAttribute("position", new THREE.Float32BufferAttribute(logicGrooves, 3));
    packageRoot.add(new THREE.LineSegments(
      logicGrooveGeometry,
      new THREE.LineBasicMaterial({ color: 0x8dbdff, transparent: true, opacity: 0.2 }),
    ));

    const stackCenters = [
      new THREE.Vector3(-3.18, 0, -1.82),
      new THREE.Vector3(-3.18, 0, 1.82),
      new THREE.Vector3(3.18, 0, -1.82),
      new THREE.Vector3(3.18, 0, 1.82),
    ];
    const layerCount = 8;
    const layerThickness = 0.042;
    const layerPitch = 0.05;
    const layerBaseY = 0.28;
    const layerGeometry = createChamferedSlab(1.46, 1.42, layerThickness, 0.075);
    const separatorGeometry = new THREE.PlaneGeometry(1.18, 0.018);
    const stackMeshes = [];
    const stackMaterials = [];
    const separatorMeshes = [];
    const separatorMaterials = [];
    const tsvMaterials = [];
    const stackHighlights = [0, 0, 0, 0];
    const stackHitAreas = [];
    const matrixHelper = new THREE.Object3D();
    const stackIdleColor = new THREE.Color(0x1859c7);
    const stackActiveColor = new THREE.Color(0x5ba0ff);
    const tsvIdleColor = new THREE.Color(0x79acfb);
    const tsvActiveColor = new THREE.Color(0xe3f1ff);
    const logicIdleColor = new THREE.Color(0x397dcc);
    const logicActiveColor = new THREE.Color(0x8ec5ff);
    const towerHeight = layerPitch * (layerCount - 1) + layerThickness;

    stackCenters.forEach((center, stackIndex) => {
      const stackMaterial = new THREE.MeshBasicMaterial({ color: stackIdleColor });
      const stackMesh = new THREE.InstancedMesh(layerGeometry, stackMaterial, layerCount);
      stackMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      stackMesh.userData.stackIndex = stackIndex;
      stackMeshes.push(stackMesh);
      stackMaterials.push(stackMaterial);
      packageRoot.add(stackMesh);

      const separatorMaterial = new THREE.MeshBasicMaterial({
        color: 0xc4dcff,
        transparent: true,
        opacity: 0.28,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const separators = new THREE.InstancedMesh(separatorGeometry, separatorMaterial, layerCount - 1);
      separators.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      separatorMeshes.push(separators);
      separatorMaterials.push(separatorMaterial);
      packageRoot.add(separators);

      const stackBase = new THREE.Mesh(
        createChamferedSlab(1.66, 1.61, 0.1, 0.08),
        logicFrameMaterial,
      );
      stackBase.position.set(center.x, 0.23, center.z);
      packageRoot.add(stackBase);

      const tsvMaterial = new THREE.MeshBasicMaterial({ color: tsvIdleColor });
      const tsvs = new THREE.InstancedMesh(
        new THREE.CylinderGeometry(0.034, 0.034, towerHeight, 10),
        tsvMaterial,
        4,
      );
      [[-0.59, -0.57], [0.59, -0.57], [-0.59, 0.57], [0.59, 0.57]].forEach(([x, z], index) => {
        matrixHelper.position.set(center.x + x, layerBaseY + towerHeight / 2 - 0.03, center.z + z);
        matrixHelper.rotation.set(0, 0, 0);
        matrixHelper.scale.set(1, 1, 1);
        matrixHelper.updateMatrix();
        tsvs.setMatrixAt(index, matrixHelper.matrix);
      });
      tsvMaterials.push(tsvMaterial);
      packageRoot.add(tsvs);

      const hitArea = new THREE.Mesh(
        new THREE.BoxGeometry(1.86, towerHeight + 0.48, 1.82),
        new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false }),
      );
      hitArea.position.set(center.x, layerBaseY + towerHeight / 2, center.z);
      hitArea.userData.stackIndex = stackIndex;
      stackHitAreas.push(hitArea);
      packageRoot.add(hitArea);
    });

    const bumpMaterial = new THREE.MeshBasicMaterial({ color: 0x7198c9 });
    const microBumps = new THREE.InstancedMesh(new THREE.SphereGeometry(0.035, 8, 6), bumpMaterial, 64);
    let bumpIndex = 0;
    stackCenters.forEach((center) => {
      [-0.45, -0.15, 0.15, 0.45].forEach((x) => {
        [-0.45, -0.15, 0.15, 0.45].forEach((z) => {
          matrixHelper.position.set(center.x + x, 0.205, center.z + z);
          matrixHelper.rotation.set(0, 0, 0);
          matrixHelper.scale.set(1, 1, 1);
          matrixHelper.updateMatrix();
          microBumps.setMatrixAt(bumpIndex, matrixHelper.matrix);
          bumpIndex += 1;
        });
      });
    });
    packageRoot.add(microBumps);

    const routeCurves = [];
    const routeMaterials = [];
    stackCenters.forEach((center, stackIndex) => {
      const side = Math.sign(center.x);
      const points = [
        new THREE.Vector3(center.x - side * 0.82, 0.19, center.z),
        new THREE.Vector3(side * 2.36, 0.19, center.z),
        new THREE.Vector3(side * 2.36, 0.19, center.z * 0.68),
        new THREE.Vector3(side * 1.82, 0.19, center.z * 0.68),
        new THREE.Vector3(side * 1.32, 0.19, center.z * 0.42),
      ];
      const route = new THREE.CurvePath();
      for (let index = 0; index < points.length - 1; index += 1) {
        route.add(new THREE.LineCurve3(points[index], points[index + 1]));
      }
      routeCurves.push(route);
      const routeMaterial = new THREE.MeshBasicMaterial({
        color: 0x6aa7ff,
        transparent: true,
        opacity: 0.16,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      routeMaterials.push(routeMaterial);
      packageRoot.add(new THREE.Mesh(
        new THREE.TubeGeometry(route, 32, 0.018, 5, false),
        routeMaterial,
      ));

      const terminals = new THREE.InstancedMesh(
        new THREE.CylinderGeometry(0.075, 0.075, 0.026, 10),
        routeMaterial,
        2,
      );
      [points[0], points.at(-1)].forEach((point, index) => {
        matrixHelper.position.set(point.x, 0.205, point.z);
        matrixHelper.rotation.set(0, 0, 0);
        matrixHelper.scale.set(1, 1, 1);
        matrixHelper.updateMatrix();
        terminals.setMatrixAt(index, matrixHelper.matrix);
      });
      terminals.userData.stackIndex = stackIndex;
      packageRoot.add(terminals);
    });

    const pulseMaterial = new THREE.MeshBasicMaterial({
      color: 0xd3e5ff,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthTest: false,
      depthWrite: false,
    });
    const bandwidthPacket = new THREE.Mesh(new THREE.CircleGeometry(0.095, 18), pulseMaterial);
    bandwidthPacket.rotation.x = -Math.PI / 2;
    bandwidthPacket.position.y = 0.76;
    bandwidthPacket.renderOrder = 14;
    packageRoot.add(bandwidthPacket);

    const lightPoolMaterial = new THREE.ShaderMaterial({
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthTest: false,
      depthWrite: false,
      uniforms: { uStrength: { value: 0.12 } },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        uniform float uStrength;
        void main() {
          float falloff = 1.0 - smoothstep(0.0, 0.5, distance(vUv, vec2(0.5)));
          gl_FragColor = vec4(0.24, 0.54, 1.0, falloff * uStrength);
        }
      `,
    });
    const lightPool = new THREE.Mesh(new THREE.PlaneGeometry(4.8, 4.8), lightPoolMaterial);
    lightPool.rotation.x = -Math.PI / 2;
    lightPool.position.y = 0.72;
    lightPool.renderOrder = 12;
    packageRoot.add(lightPool);

    const pointerTarget = new THREE.Vector2(0, 0.05);
    const pointerCurrent = new THREE.Vector2(0, 0.05);
    const pointerNdc = new THREE.Vector2();
    const activePointers = new Map();
    const pointerStarts = new Map();
    const raycaster = new THREE.Raycaster();
    const lightPoolTarget = new THREE.Vector3();
    const packageTarget = new THREE.Vector3();
    const layoutPosition = new THREE.Vector3();
    let activeStack = -1;
    let burstStack = -1;
    let burstStartedAt = -1;
    let baseScale = 0.78;
    let mobile = false;
    let visible = true;
    let frameId = 0;
    let lastFrameAt = 0;
    let scrollProgress = 0;
    let multiTouchSequence = false;
    const introStartedAt = performance.now();
    heroSurface.dataset.activeStack = "none";
    heroSurface.dataset.traceCount = "0";

    const easeOutCubic = (value) => 1 - ((1 - value) ** 3);
    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

    function updateStackInstances(introSpread) {
      stackCenters.forEach((center, stackIndex) => {
        for (let layer = 0; layer < layerCount; layer += 1) {
          const y = layerBaseY + layer * layerPitch + layer * introSpread * 0.008;
          const nestedScale = 1 + (layerCount - 1 - layer) * 0.016;
          const activeScale = stackHighlights[stackIndex] * 0.022;
          matrixHelper.position.set(center.x, y, center.z);
          matrixHelper.rotation.set(0, 0, 0);
          matrixHelper.scale.set(nestedScale + activeScale, 1, nestedScale + activeScale);
          matrixHelper.updateMatrix();
          stackMeshes[stackIndex].setMatrixAt(layer, matrixHelper.matrix);

          if (layer < layerCount - 1) {
            const lineProgress = layer / (layerCount - 2);
            matrixHelper.position.set(
              center.x,
              layerBaseY + (layerCount - 1) * layerPitch + layerThickness / 2 + 0.008,
              center.z - 0.48 + lineProgress * 0.96,
            );
            matrixHelper.rotation.set(-Math.PI / 2, 0, 0);
            matrixHelper.scale.set(1 + activeScale, 1, 1 + activeScale);
            matrixHelper.updateMatrix();
            separatorMeshes[stackIndex].setMatrixAt(layer, matrixHelper.matrix);
          }
        }
        stackMeshes[stackIndex].instanceMatrix.needsUpdate = true;
        separatorMeshes[stackIndex].instanceMatrix.needsUpdate = true;
      });
    }

    function updatePulse(now) {
      const elapsed = burstStartedAt < 0 ? 2 : (now - burstStartedAt) / 900;
      if (burstStack < 0 || elapsed > 1.18) {
        pulseMaterial.opacity = 0;
        if (elapsed > 1.18) burstStack = -1;
        return 0;
      }

      const curve = routeCurves[burstStack];
      const point = curve.getPoint(clamp(elapsed * 1.08, 0, 1));
      bandwidthPacket.position.set(point.x, 0.76, point.z);
      const envelope = Math.sin(Math.PI * clamp(elapsed / 1.12, 0, 1));
      pulseMaterial.opacity = 0.92 * envelope;
      bandwidthPacket.scale.setScalar(0.78 + envelope * 0.35);
      return envelope;
    }

    function render(now = performance.now(), force = false) {
      frameId = 0;
      if (!force && mobile && now - lastFrameAt < 31) {
        frameId = requestAnimationFrame(render);
        return;
      }
      lastFrameAt = now;

      pointerCurrent.lerp(pointerTarget, reduceMotion ? 1 : 0.075);
      const introProgress = clamp((now - introStartedAt) / 1150, 0, 1);
      const introSpread = reduceMotion ? 0 : 1 - easeOutCubic(introProgress);
      const burstEnvelope = updatePulse(now);

      stackHighlights.forEach((highlightValue, stackIndex) => {
        const pointerActive = [...activePointers.values()].some((pointer) => pointer.stackIndex === stackIndex);
        const target = stackIndex === activeStack || pointerActive ? 1 : 0;
        const burstLift = stackIndex === burstStack ? burstEnvelope * 0.8 : 0;
        stackHighlights[stackIndex] += (Math.max(target, burstLift) - highlightValue) * (reduceMotion ? 1 : 0.14);
        const highlight = clamp(stackHighlights[stackIndex] + burstLift, 0, 1);
        stackMaterials[stackIndex].color.lerpColors(stackIdleColor, stackActiveColor, highlight);
        separatorMaterials[stackIndex].opacity = 0.26 + highlight * 0.62;
        tsvMaterials[stackIndex].color.lerpColors(tsvIdleColor, tsvActiveColor, highlight);
        routeMaterials[stackIndex].opacity = 0.18 + highlight * 0.67;
      });
      updateStackInstances(introSpread);

      logicMaterial.color.lerpColors(logicIdleColor, logicActiveColor, burstEnvelope);
      logicEdgeMaterial.opacity = 0.76 + burstEnvelope * 0.24;
      logicEdge.scale.setScalar(1 + burstEnvelope * 0.035);
      lightPoolTarget.set(pointerCurrent.x * 3.6, 0.72, -pointerCurrent.y * 2.25);
      lightPool.position.lerp(lightPoolTarget, reduceMotion ? 1 : 0.09);
      lightPoolMaterial.uniforms.uStrength.value = 0.105 + burstEnvelope * 0.055;

      packageTarget.set(
        layoutPosition.x + pointerCurrent.x * 0.055,
        layoutPosition.y,
        layoutPosition.z - pointerCurrent.y * 0.055,
      );
      packageRoot.position.lerp(packageTarget, reduceMotion ? 1 : 0.08);
      packageRoot.rotation.set(0, 0, 0);
      const departureScale = 1 - scrollProgress * 0.035;
      packageRoot.scale.setScalar(baseScale * departureScale);

      renderer.render(scene, camera);
      if (!force && !reduceMotion && visible && !document.hidden) frameId = requestAnimationFrame(render);
    }

    function resize() {
      const bounds = heroSurface.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      mobile = window.innerWidth <= 780;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobile ? 1.05 : 1.3));
      renderer.setSize(bounds.width, bounds.height, false);
      const aspect = bounds.width / bounds.height;
      const viewHeight = Math.max(8.35, 9.9 / aspect);
      camera.left = -viewHeight * aspect / 2;
      camera.right = viewHeight * aspect / 2;
      camera.top = viewHeight / 2;
      camera.bottom = -viewHeight / 2;
      if (mobile) {
        camera.position.set(0, 12, 0.001);
        const compactPortrait = window.innerWidth <= 360 && window.innerHeight > window.innerWidth;
        const tabletPortrait = window.innerWidth > 520 && window.innerHeight > window.innerWidth;
        const shortLandscape = window.innerHeight <= 480 && window.innerWidth > window.innerHeight;
        layoutPosition.set(0, 0, compactPortrait ? 1.02 : tabletPortrait ? 1.72 : shortLandscape ? 0 : 0.3);
        baseScale = compactPortrait ? 0.76 : tabletPortrait ? 0.86 : shortLandscape ? 0.94 : 0.96;
      } else {
        camera.position.set(0, 12, 0.001);
        layoutPosition.set(0.12, 0, 0);
        baseScale = window.innerWidth < 1200 ? 0.82 : 0.86;
      }
      camera.lookAt(0, 0, 0);
      camera.updateProjectionMatrix();
      render(performance.now(), true);
    }

    function updateScroll() {
      const bounds = hero.getBoundingClientRect();
      const scrollRange = Math.max(hero.offsetHeight - heroSurface.offsetHeight, hero.offsetHeight * 0.72, 1);
      scrollProgress = THREE.MathUtils.clamp(-bounds.top / scrollRange, 0, 1);
    }

    function pointFromClient(clientX, clientY) {
      const bounds = heroSurface.getBoundingClientRect();
      return {
        x: clamp(((clientX - bounds.left) / bounds.width) * 2 - 1, -1, 1),
        y: clamp(-(((clientY - bounds.top) / bounds.height) * 2 - 1), -1, 1),
      };
    }

    function stackFromPoint(point) {
      pointerNdc.set(point.x, point.y);
      raycaster.setFromCamera(pointerNdc, camera);
      const hit = raycaster.intersectObjects(stackHitAreas, false)[0];
      return hit ? hit.object.userData.stackIndex : -1;
    }

    function updateActiveData() {
      const indices = new Set(
        [...activePointers.values()]
          .map((pointer) => pointer.stackIndex)
          .filter((stackIndex) => stackIndex >= 0),
      );
      if (activeStack >= 0) indices.add(activeStack);
      heroSurface.dataset.activeStack = indices.size
        ? [...indices].sort().map((stackIndex) => stackIndex + 1).join(",")
        : "none";
    }

    function pickStack(point) {
      activeStack = stackFromPoint(point);
      updateActiveData();
    }

    function updatePointerAggregate() {
      const points = [...activePointers.values()];
      if (!points.length) return;
      if (points.length === 1) {
        pointerTarget.set(points[0].x, points[0].y);
        return;
      }
      const first = points[0];
      const second = points[1];
      pointerTarget.set((first.x + second.x) / 2, (first.y + second.y) / 2);
    }

    function triggerBandwidth(stackIndex) {
      if (stackIndex < 0) return;
      const selected = stackIndex;
      activeStack = selected;
      updateActiveData();
      burstStack = selected;
      burstStartedAt = performance.now();
      heroSurface.dataset.lastTrace = String(selected + 1);
      heroSurface.dataset.traceCount = String(Number(heroSurface.dataset.traceCount) + 1);
      start();
      if (reduceMotion) render(performance.now(), true);
    }

    heroSurface.addEventListener("pointermove", (event) => {
      const point = pointFromClient(event.clientX, event.clientY);
      if (activePointers.has(event.pointerId)) {
        activePointers.set(event.pointerId, {
          ...point,
          clientX: event.clientX,
          clientY: event.clientY,
          stackIndex: stackFromPoint(point),
        });
        updatePointerAggregate();
        updateActiveData();
      } else if (event.pointerType !== "touch") {
        pointerTarget.set(point.x, point.y);
        pickStack(point);
      }
      if (reduceMotion) render(performance.now(), true);
    });

    heroSurface.addEventListener("pointerleave", (event) => {
      if (event.pointerType === "touch") return;
      activeStack = -1;
      updateActiveData();
      pointerTarget.set(0, 0.05);
      if (reduceMotion) render(performance.now(), true);
    });

    heroSurface.addEventListener("pointerdown", (event) => {
      if (event.button !== undefined && event.button !== 0) return;
      const point = pointFromClient(event.clientX, event.clientY);
      const stackIndex = stackFromPoint(point);
      activePointers.set(event.pointerId, {
        ...point,
        clientX: event.clientX,
        clientY: event.clientY,
        stackIndex,
      });
      if (event.pointerType === "touch" && activePointers.size >= 2) multiTouchSequence = true;
      pointerStarts.set(event.pointerId, { clientX: event.clientX, clientY: event.clientY });
      try { heroSurface.setPointerCapture(event.pointerId); } catch {}
      updatePointerAggregate();
      if (event.pointerType !== "touch") activeStack = stackIndex;
      updateActiveData();
    });

    const releasePointer = (event) => {
      activePointers.delete(event.pointerId);
      if (!activePointers.size && event.pointerType === "touch") {
        activeStack = -1;
        multiTouchSequence = false;
      } else updatePointerAggregate();
      pointerStarts.delete(event.pointerId);
      if (heroSurface.hasPointerCapture(event.pointerId)) heroSurface.releasePointerCapture(event.pointerId);
      updateActiveData();
      if (reduceMotion) render(performance.now(), true);
    };

    heroSurface.addEventListener("pointerup", (event) => {
      const startPoint = pointerStarts.get(event.pointerId);
      const pointer = activePointers.get(event.pointerId);
      const wasSinglePointer = activePointers.size === 1;
      if (startPoint && wasSinglePointer && !(event.pointerType === "touch" && multiTouchSequence)) {
        const movement = Math.hypot(event.clientX - startPoint.clientX, event.clientY - startPoint.clientY);
        if (movement <= 8) {
          triggerBandwidth(pointer?.stackIndex ?? -1);
        }
      }
      releasePointer(event);
    });
    heroSurface.addEventListener("pointercancel", releasePointer);

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
    new ResizeObserver(resize).observe(heroSurface);
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

    motionPreference.addEventListener("change", (event) => {
      reduceMotion = event.matches;
      if (reduceMotion) {
        render(performance.now(), true);
        stop();
      } else {
        start();
      }
    });

    updateScroll();
    updateStackInstances(0);
    resize();
    hero.classList.add("webgl-ready");
    render(performance.now(), true);
    start();
  } catch (error) {
    console.warn("SF Memory package fallback enabled.", error);
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
