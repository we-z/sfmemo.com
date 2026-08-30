import * as THREE from "./vendor/three.module.js";

const hero = document.querySelector(".hero-horizon");
const surface = hero?.querySelector(".hero-visual");
const canvas = document.querySelector("#hero-canvas");
const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
const finePointer = window.matchMedia("(pointer: fine)").matches;

if (hero && surface && canvas) {
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
    renderer.toneMappingExposure = 1.18;

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-4, 4, 3, -3, 0.1, 40);
    camera.up.set(0, 1, 0);
    camera.position.set(0, 1.6, 12);

    const stackRoot = new THREE.Group();
    stackRoot.rotation.set(-0.14, -0.3, 0);
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

    const layerCount = 8;
    const layerWidth = 4.94;
    const layerDepth = 2.5;
    const layerHeight = 0.15;
    const layerPitch = 0.325;
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

    const particleHalos = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.095, 10, 7),
      new THREE.MeshBasicMaterial({
        color: 0x5fa3ff,
        transparent: true,
        opacity: 0.2,
        blending: THREE.AdditiveBlending,
        depthTest: false,
        depthWrite: false,
        toneMapped: false,
      }),
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

    const hitArea = new THREE.Mesh(
      new THREE.BoxGeometry(7, 4.2, 4),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false }),
    );
    hitArea.position.y = 0.08;
    stackRoot.add(hitArea);

    const raycaster = new THREE.Raycaster();
    const pointerNdc = new THREE.Vector2();
    const activePointers = new Map();
    const pointerStarts = new Map();
    const rotationCurrent = new THREE.Vector2(-0.14, -0.3);
    const rotationTarget = new THREE.Vector2(-0.14, -0.3);
    const baseRotation = new THREE.Vector2(-0.14, -0.3);
    const layerActivity = new Float32Array(layerCount);
    const tempColor = new THREE.Color();
    const tempPoint = new THREE.Vector3();

    let reduceMotion = motionPreference.matches;
    let mobile = false;
    let visible = true;
    let hovering = false;
    let frameId = 0;
    let lastFrameAt = performance.now();
    let flowTime = 0.18;
    let burstStartedAt = -1;
    let multiTouchSequence = false;
    let horizontalTouch = false;

    surface.dataset.inspecting = "false";
    surface.dataset.burstCount = "0";

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
      return raycaster.intersectObject(hitArea, false).length > 0;
    }

    function setInspection(point, active) {
      hovering = active;
      surface.dataset.inspecting = String(active);
      if (!active || reduceMotion) {
        rotationTarget.copy(baseRotation);
      } else {
        rotationTarget.set(
          baseRotation.x + point.y * 0.16,
          baseRotation.y + point.x * 0.7,
        );
      }
      rimLight.position.x = 4.4 + point.x * 2.2;
      keyLight.position.x = -4.5 + point.x * 1.2;
      if (reduceMotion) render(performance.now(), true);
    }

    function triggerBurst() {
      burstStartedAt = performance.now();
      surface.dataset.burstCount = String(Number(surface.dataset.burstCount) + 1);
      start();
      if (reduceMotion) render(performance.now(), true);
    }

    function render(now = performance.now(), force = false) {
      frameId = 0;
      if (!force && mobile && now - lastFrameAt < 31) {
        frameId = requestAnimationFrame(render);
        return;
      }

      const delta = clamp((now - lastFrameAt) / 1000, 0, 0.05);
      lastFrameAt = now;
      const burstAge = burstStartedAt < 0 ? 2 : (now - burstStartedAt) / 950;
      const burstEnvelope = burstAge < 1 ? Math.sin(Math.PI * burstAge) : 0;
      const inspectAmount = hovering ? 1 : 0;
      const speed = 0.085 + inspectAmount * 0.022 + burstEnvelope * 0.11;

      if (!reduceMotion) {
        flowTime = (flowTime + delta * speed) % 1;
        rotationCurrent.lerp(rotationTarget, 0.115);
      } else {
        rotationCurrent.copy(baseRotation);
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
        const scale = Math.max(0.001, entrance * exit * pulse * (1 + burstEnvelope * 0.55));

        helper.position.copy(tempPoint);
        helper.rotation.set(0, 0, 0);
        helper.scale.setScalar(scale);
        helper.updateMatrix();
        particles.setMatrixAt(index, helper.matrix);

        helper.scale.setScalar(scale * (1.18 + burstEnvelope * 0.22));
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
        const activity = clamp(layerActivity[index] + burstEnvelope * 0.08, 0, 1);
        tempColor.copy(edgeIdle).lerp(edgeActive, activity);
        edgeStrips.setColorAt(index, tempColor);
        layerMaterials[index].emissiveIntensity = 0.14 + activity * 0.48;
      }
      edgeStrips.instanceColor.needsUpdate = true;

      tsvMaterial.emissiveIntensity = 0.2 + inspectAmount * 0.18 + burstEnvelope * 0.42;
      routeMaterial.opacity = 0.27 + inspectAmount * 0.1 + burstEnvelope * 0.2;
      particleMaterial.opacity = 0.9 + burstEnvelope * 0.08;
      rimLight.intensity = 31 + inspectAmount * 6 + burstEnvelope * 10;

      renderer.render(scene, camera);
      if (!force && !reduceMotion && visible && !document.hidden) frameId = requestAnimationFrame(render);
    }

    function resize() {
      const bounds = surface.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      mobile = window.innerWidth <= 780;
      stackRoot.position.y = mobile ? 0.34 : 0;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobile ? 1.05 : finePointer ? 1.3 : 1.15));
      renderer.setSize(bounds.width, bounds.height, false);

      const aspect = bounds.width / bounds.height;
      const expandedWidth = 6.45;
      const expandedHeight = 3.62;
      const viewHeight = Math.max(expandedHeight / 0.78, expandedWidth / (aspect * 0.9));
      camera.left = -viewHeight * aspect / 2;
      camera.right = viewHeight * aspect / 2;
      camera.top = viewHeight / 2;
      camera.bottom = -viewHeight / 2;
      camera.position.set(0, 1.6, 12);
      camera.lookAt(0, -0.08, 0);
      camera.updateProjectionMatrix();
      render(performance.now(), true);
    }

    surface.addEventListener("pointermove", (event) => {
      const point = pointFromClient(event.clientX, event.clientY);
      const tracked = activePointers.get(event.pointerId);

      if (tracked) {
        tracked.point = point;
        tracked.clientX = event.clientX;
        tracked.clientY = event.clientY;
        if (event.pointerType === "touch") {
          const dx = event.clientX - tracked.startX;
          const dy = event.clientY - tracked.startY;
          if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.15) horizontalTouch = true;
          if (horizontalTouch) setInspection(point, true);
        } else {
          setInspection(point, tracked.hit);
        }
      } else if (event.pointerType !== "touch") {
        setInspection(point, hitsStack(point));
      }
    });

    surface.addEventListener("pointerleave", (event) => {
      if (event.pointerType !== "touch") setInspection({ x: 0, y: 0 }, false);
    });

    surface.addEventListener("pointerdown", (event) => {
      if (event.button !== undefined && event.button !== 0) return;
      const point = pointFromClient(event.clientX, event.clientY);
      const hit = hitsStack(point);
      activePointers.set(event.pointerId, {
        point,
        hit,
        startX: event.clientX,
        startY: event.clientY,
        clientX: event.clientX,
        clientY: event.clientY,
      });
      pointerStarts.set(event.pointerId, { x: event.clientX, y: event.clientY, hit });
      if (event.pointerType === "touch" && activePointers.size > 1) multiTouchSequence = true;
      if (event.pointerType !== "touch" && hit) {
        try { surface.setPointerCapture(event.pointerId); } catch {}
      }
      if (hit) setInspection(point, true);
    });

    function releasePointer(event, allowBurst) {
      const startPoint = pointerStarts.get(event.pointerId);
      const tracked = activePointers.get(event.pointerId);
      const movement = startPoint
        ? Math.hypot(event.clientX - startPoint.x, event.clientY - startPoint.y)
        : Infinity;
      const singlePointer = activePointers.size === 1;

      if (allowBurst && startPoint?.hit && tracked?.hit && movement <= 8 && singlePointer && !multiTouchSequence) {
        triggerBurst();
      }

      activePointers.delete(event.pointerId);
      pointerStarts.delete(event.pointerId);
      if (surface.hasPointerCapture(event.pointerId)) surface.releasePointerCapture(event.pointerId);

      if (!activePointers.size) {
        multiTouchSequence = false;
        horizontalTouch = false;
        if (event.pointerType === "touch") setInspection({ x: 0, y: 0 }, false);
      }
    }

    surface.addEventListener("pointerup", (event) => releasePointer(event, true));
    surface.addEventListener("pointercancel", (event) => releasePointer(event, false));
    surface.addEventListener("lostpointercapture", (event) => {
      if (activePointers.has(event.pointerId)) releasePointer(event, false);
    });

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
      activePointers.clear();
      pointerStarts.clear();
      if (document.hidden) stop();
      else start();
    });
    window.addEventListener("blur", () => {
      activePointers.clear();
      pointerStarts.clear();
      setInspection({ x: 0, y: 0 }, false);
    });
    window.addEventListener("orientationchange", () => {
      activePointers.clear();
      pointerStarts.clear();
      setInspection({ x: 0, y: 0 }, false);
      resize();
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

    resize();
    hero.classList.add("webgl-ready");
    render(performance.now(), true);
    start();
  } catch (error) {
    console.warn("SF Memory HBM stack fallback enabled.", error);
  }
}
