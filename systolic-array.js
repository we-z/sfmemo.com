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
    scene.add(arrayRoot);

    scene.add(new THREE.HemisphereLight(0xd8e9ff, 0x02050b, 2.25));
    const keyLight = new THREE.DirectionalLight(0xf3f8ff, 4.3);
    keyLight.position.set(-4.8, 7.4, 6.2);
    scene.add(keyLight);
    const rimLight = new THREE.PointLight(0x367dff, 24, 18, 2);
    rimLight.position.set(4.7, 2.1, 4.2);
    scene.add(rimLight);

    const clamp = (value, minimum = 0, maximum = 1) => Math.min(maximum, Math.max(minimum, value));
    const fract = (value) => value - Math.floor(value);
    const smoothstep = (minimum, maximum, value) => {
      const amount = clamp((value - minimum) / (maximum - minimum), 0, 1);
      return amount * amount * (3 - 2 * amount);
    };

    function createSlab(width, depth, height, chamfer) {
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
    }

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
      color: 0x061a2b,
      metalness: 0.5,
      roughness: 0.32,
      clearcoat: 0.4,
      clearcoatRoughness: 0.25,
      emissive: 0x020914,
      emissiveIntensity: 0.08,
    });
    const cellMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x0d2b49,
      metalness: 0.32,
      roughness: 0.3,
      clearcoat: 0.48,
      clearcoatRoughness: 0.24,
      emissive: 0x020d18,
      emissiveIntensity: 0.11,
    });
    const coreMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
    const activationMaterial = new THREE.MeshBasicMaterial({
      color: 0x7fb8d8,
      transparent: true,
      opacity: 0.13,
      depthWrite: false,
      toneMapped: false,
    });
    const aMaterial = new THREE.MeshBasicMaterial({
      color: 0x4cc9f5,
      transparent: true,
      opacity: 0.46,
      toneMapped: false,
    });
    const bMaterial = new THREE.MeshBasicMaterial({
      color: 0xa88cff,
      transparent: true,
      opacity: 0.4,
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
    const pitch = 0.59;
    const gridSpan = (gridSize - 1) * pitch;
    const first = -gridSpan / 2;
    const helper = new THREE.Object3D();
    const cellMesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.43, 0.11, 0.43),
      cellMaterial,
      gridSize * gridSize,
    );
    const coreMesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.25, 0.045, 0.25),
      coreMaterial,
      gridSize * gridSize,
    );
    const activationMesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.36, 0.018, 0.36),
      activationMaterial,
      gridSize * gridSize,
    );
    cellMesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    coreMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    activationMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    const offCoreDark = new THREE.Color(0x183e5d);
    const activeCoreDark = new THREE.Color(0x3f7b9f);
    const boostCoreDark = new THREE.Color(0x5590b5);
    const offCoreLight = new THREE.Color(0x285f86);
    const activeCoreLight = new THREE.Color(0x2a72a1);
    const boostCoreLight = new THREE.Color(0x22638f);
    const activeCapDark = new THREE.Color(0x75aac8);
    const activeCapLight = new THREE.Color(0x266f9e);
    const coreColorScratch = new THREE.Color();
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
        coreMesh.setColorAt(index, offCoreDark);

        helper.position.set(x, 0.205, z);
        helper.scale.set(0.001, 0.001, 0.001);
        helper.updateMatrix();
        activationMesh.setMatrixAt(index, helper.matrix);
        activationMesh.setColorAt(index, activeCapDark);
      }
    }
    cellMesh.instanceMatrix.needsUpdate = true;
    coreMesh.instanceMatrix.needsUpdate = true;
    coreMesh.instanceColor.needsUpdate = true;
    activationMesh.instanceMatrix.needsUpdate = true;
    activationMesh.instanceColor.needsUpdate = true;
    arrayRoot.add(cellMesh, coreMesh, activationMesh);

    const lanePositions = Array.from({ length: gridSize }, (_, index) => first + index * pitch);
    const traceVertices = [];
    lanePositions.forEach((lane) => {
      traceVertices.push(-2.72, -0.015, lane, 2.72, -0.015, lane);
      traceVertices.push(lane, -0.005, -2.72, lane, -0.005, 2.72);
    });
    const traceGeometry = new THREE.BufferGeometry();
    traceGeometry.setAttribute("position", new THREE.Float32BufferAttribute(traceVertices, 3));
    const traceMaterial = new THREE.LineBasicMaterial({ color: 0x4e94d6, transparent: true, opacity: 0.18 });
    arrayRoot.add(new THREE.LineSegments(traceGeometry, traceMaterial));

    const aTokens = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.42, 0.024, 0.1),
      aMaterial,
      gridSize,
    );
    const bTokens = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.1, 0.028, 0.42),
      bMaterial,
      gridSize,
    );
    aTokens.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    bTokens.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    arrayRoot.add(aTokens, bTokens);

    const hbmBaseMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x071b31,
      metalness: 0.58,
      roughness: 0.34,
      clearcoat: 0.42,
      clearcoatRoughness: 0.24,
      emissive: 0x020a12,
      emissiveIntensity: 0.12,
    });
    const hbmInterposerMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x0b3155,
      metalness: 0.5,
      roughness: 0.3,
      clearcoat: 0.46,
      emissive: 0x031426,
      emissiveIntensity: 0.12,
    });
    const hbmLayerMaterials = [0x123f70, 0x195083].map((color) => new THREE.MeshPhysicalMaterial({
      color,
      metalness: 0.24,
      roughness: 0.28,
      clearcoat: 0.52,
      clearcoatRoughness: 0.21,
      emissive: 0x05182e,
      emissiveIntensity: 0.14,
    }));
    const hbmTopMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x0f416d,
      metalness: 0.22,
      roughness: 0.24,
      clearcoat: 0.55,
      clearcoatRoughness: 0.17,
      iridescence: 0.26,
      iridescenceIOR: 1.36,
      iridescenceThicknessRange: [170, 280],
      sheen: 0.12,
      sheenColor: new THREE.Color(0x5257a8),
      sheenRoughness: 0.52,
      emissive: 0x031520,
      emissiveIntensity: 0.05,
    });
    const hbmBankMaterials = [0x1b7087, 0x4b5fa8].map((color) => new THREE.MeshBasicMaterial({
      color,
      toneMapped: false,
    }));
    const hbmPhyMaterial = new THREE.MeshBasicMaterial({ color: 0x66539c, toneMapped: false });
    const hbmGridMaterial = new THREE.MeshBasicMaterial({
      color: 0x8bc2d2,
      transparent: true,
      opacity: 0.72,
      toneMapped: false,
    });
    const hbmSealMaterial = new THREE.MeshStandardMaterial({
      color: 0x668daa,
      metalness: 0.58,
      roughness: 0.34,
      emissive: 0x071821,
      emissiveIntensity: 0.04,
    });
    const hbmRdlMaterial = new THREE.MeshStandardMaterial({
      color: 0xa7cfda,
      metalness: 0.72,
      roughness: 0.29,
      emissive: 0x091d25,
      emissiveIntensity: 0.05,
    });
    const hbmViaMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xc9944a,
      metalness: 0.82,
      roughness: 0.19,
      emissive: 0x3d210a,
      emissiveIntensity: 0.1,
    });
    const hbmViaRingMaterial = new THREE.MeshStandardMaterial({
      color: 0xe2b45a,
      metalness: 0.8,
      roughness: 0.24,
      emissive: 0x2a1604,
      emissiveIntensity: 0.04,
    });

    function addTopStrip(group, x, z, stripWidth, stripDepth, y, material) {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(stripWidth, 0.006, stripDepth), material);
      strip.position.set(x, y, z);
      group.add(strip);
    }

    function addSealRing(group, ringWidth, ringDepth, y) {
      const stroke = 0.016;
      addTopStrip(group, 0, -ringDepth / 2, ringWidth, stroke, y, hbmSealMaterial);
      addTopStrip(group, 0, ringDepth / 2, ringWidth, stroke, y, hbmSealMaterial);
      addTopStrip(group, -ringWidth / 2, 0, stroke, ringDepth, y, hbmSealMaterial);
      addTopStrip(group, ringWidth / 2, 0, stroke, ringDepth, y, hbmSealMaterial);
    }

    function createHbmPackage() {
      const packageGroup = new THREE.Group();
      const base = new THREE.Mesh(createSlab(5.86, 1.36, 0.1, 0.07), hbmBaseMaterial);
      base.position.y = -0.015;
      packageGroup.add(base);
      const packageInterposer = new THREE.Mesh(createSlab(5.72, 1.27, 0.045, 0.065), hbmInterposerMaterial);
      packageInterposer.position.y = 0.05;
      packageGroup.add(packageInterposer);

      const layerCount = 8;
      const firstLayerY = 0.1;
      const layerPitch = 0.072;
      const layerHeight = 0.034;
      const layerGeometry = createSlab(5.62, 1.18, layerHeight, 0.055);
      for (let layer = 0; layer < layerCount; layer += 1) {
        const die = new THREE.Mesh(layerGeometry, hbmLayerMaterials[layer % 2]);
        die.position.y = firstLayerY + layer * layerPitch;
        packageGroup.add(die);
      }

      const topY = firstLayerY + (layerCount - 1) * layerPitch + layerHeight / 2;
      const passivation = new THREE.Mesh(createSlab(5.58, 1.13, 0.018, 0.052), hbmTopMaterial);
      passivation.position.y = topY + 0.014;
      packageGroup.add(passivation);
      const featureY = topY + 0.03;

      const bankXs = [-2.3, -1.72, -1.14, -0.56, 0.02, 0.6, 1.18, 1.76];
      const bankZs = [-0.27, 0.08];
      bankZs.forEach((z, row) => {
        bankXs.forEach((x, column) => {
          const bank = new THREE.Mesh(
            new THREE.BoxGeometry(0.49, 0.008, 0.27),
            hbmBankMaterials[(row + column) % 2],
          );
          bank.position.set(x, featureY, z);
          packageGroup.add(bank);
          [-0.12, 0, 0.12].forEach((offset) => {
            addTopStrip(packageGroup, x + offset, z, 0.011, 0.235, featureY + 0.007, hbmGridMaterial);
          });
          [-0.04, 0.04].forEach((offset) => {
            addTopStrip(packageGroup, x, z + offset * 1.75, 0.45, 0.01, featureY + 0.007, hbmGridMaterial);
          });
        });
      });

      const viaXs = [2.08, 2.28, 2.48, 2.68];
      viaXs.forEach((x) => {
        const phy = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.008, 0.09), hbmPhyMaterial);
        phy.position.set(x, featureY, 0.41);
        packageGroup.add(phy);
        addTopStrip(packageGroup, x, 0.49, 0.022, 0.16, featureY + 0.008, hbmRdlMaterial);

        const viaHeight = topY - 0.055;
        const via = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, viaHeight, 14), hbmViaMaterial);
        via.position.set(x, 0.055 + viaHeight / 2, 0.52);
        packageGroup.add(via);

        [firstLayerY, topY].forEach((ringY) => {
          const ringGeometry = new THREE.TorusGeometry(0.05, 0.01, 7, 18);
          ringGeometry.rotateX(Math.PI / 2);
          const ring = new THREE.Mesh(ringGeometry, hbmViaRingMaterial);
          ring.position.set(x, ringY + 0.02, 0.52);
          packageGroup.add(ring);
        });
      });

      addTopStrip(packageGroup, -0.26, 0.315, 4.55, 0.018, featureY + 0.008, hbmRdlMaterial);
      bankXs.forEach((x) => {
        addTopStrip(packageGroup, x, 0.2, 0.014, 0.22, featureY + 0.008, hbmRdlMaterial);
      });
      addSealRing(packageGroup, 5.34, 1.02, featureY + 0.009);
      addSealRing(packageGroup, 5.18, 0.9, featureY + 0.0095);
      return packageGroup;
    }

    const hbmPositions = [
      { x: 0, z: -3.42, rotation: 0 },
      { x: 0, z: 3.42, rotation: Math.PI },
      { x: -3.42, z: 0, rotation: Math.PI / 2 },
      { x: 3.42, z: 0, rotation: -Math.PI / 2 },
    ];
    const packagePrototype = createHbmPackage();
    hbmPositions.forEach(({ x, z, rotation }, index) => {
      const packageGroup = index === 0 ? packagePrototype : packagePrototype.clone(true);
      packageGroup.position.set(x, 0, z);
      packageGroup.rotation.y = rotation;
      arrayRoot.add(packageGroup);
    });

    const baseColors = {
      substrateDark: new THREE.Color(0x07111f),
      substrateLight: new THREE.Color(0x15304d),
      interposerDark: new THREE.Color(0x061a2b),
      interposerLight: new THREE.Color(0x173b5b),
      hbmBaseDark: new THREE.Color(0x071b31),
      hbmBaseLight: new THREE.Color(0x1c527f),
      hbmLayersDark: [new THREE.Color(0x123f70), new THREE.Color(0x195083)],
      hbmLayersLight: [new THREE.Color(0x286d9e), new THREE.Color(0x347caf)],
      hbmTopDark: new THREE.Color(0x0f416d),
      hbmTopLight: new THREE.Color(0x255f88),
      aDark: new THREE.Color(0x4cc9f5),
      aLight: new THREE.Color(0x147bb9),
      bDark: new THREE.Color(0xa88cff),
      bLight: new THREE.Color(0x6f50bd),
      viaDark: new THREE.Color(0xc9944a),
      viaLight: new THREE.Color(0x9c6f37),
    };
    const boostColors = {
      substrateDark: new THREE.Color(0x12335a),
      substrateLight: new THREE.Color(0x2c6595),
      interposerDark: new THREE.Color(0x1b568a),
      interposerLight: new THREE.Color(0x3b7fb1),
      hbmBaseDark: new THREE.Color(0x153e68),
      hbmBaseLight: new THREE.Color(0x2d6897),
      hbmLayersDark: [new THREE.Color(0x235b94), new THREE.Color(0x2b6aa1)],
      hbmLayersLight: [new THREE.Color(0x367eac), new THREE.Color(0x438bb9)],
      hbmTopDark: new THREE.Color(0x1e5c8f),
      hbmTopLight: new THREE.Color(0x32739f),
      a: new THREE.Color(0x9ee9ff),
      b: new THREE.Color(0xcbbcff),
      via: new THREE.Color(0xe3b769),
    };

    let lightTheme = document.documentElement.dataset.theme === "light";
    let visible = true;
    let animationFrame = 0;
    let previousTime = performance.now();
    let simulationTime = 0.18;
    let boostUntil = 0;
    let reducedMotion = motionPreference.matches;

    function applyTheme() {
      lightTheme = document.documentElement.dataset.theme === "light";
      renderer.toneMappingExposure = lightTheme ? 1 : 1.18;
      substrateMaterial.emissive.setHex(lightTheme ? 0x07182b : 0x020813);
      interposerMaterial.emissive.setHex(lightTheme ? 0x051729 : 0x020914);
      substrateEdgeMaterial.color.setHex(lightTheme ? 0x1559c5 : 0x3977b8);
      substrateEdgeMaterial.opacity = lightTheme ? 0.68 : 0.54;
      traceMaterial.color.setHex(lightTheme ? 0x1769b3 : 0x4e94d6);
      traceMaterial.opacity = lightTheme ? 0.27 : 0.18;
      cellMaterial.color.setHex(lightTheme ? 0x1c4d72 : 0x0d2b49);
      cellMaterial.emissive.setHex(lightTheme ? 0x061d31 : 0x020d18);
      hbmInterposerMaterial.color.setHex(lightTheme ? 0x24658e : 0x0b3155);
      hbmBankMaterials[0].color.setHex(lightTheme ? 0x217986 : 0x1b7087);
      hbmBankMaterials[1].color.setHex(lightTheme ? 0x465b94 : 0x4b5fa8);
      hbmPhyMaterial.color.setHex(lightTheme ? 0x5d4d86 : 0x66539c);
      hbmGridMaterial.color.setHex(lightTheme ? 0x315f75 : 0x8bc2d2);
      hbmSealMaterial.color.setHex(lightTheme ? 0x4f7591 : 0x668daa);
      hbmRdlMaterial.color.setHex(lightTheme ? 0x2a6476 : 0xa7cfda);
      hbmViaRingMaterial.color.setHex(lightTheme ? 0xa47434 : 0xe2b45a);
      if (reducedMotion) requestRender();
    }

    function updateSystolicState(boost) {
      const progress = reducedMotion ? 0.52 : fract(simulationTime);
      const easedProgress = smoothstep(0, 1, progress);
      const travelStart = -2.82;
      const travelEnd = 2.82;
      const horizontalPosition = travelStart + (travelEnd - travelStart) * easedProgress;
      const verticalPosition = travelStart + (travelEnd - travelStart) * easedProgress;
      const edgeFade = smoothstep(0, 0.12, progress) * (1 - smoothstep(0.88, 1, progress));

      cellPositions.forEach(({ row, column, x, z }, index) => {
        const horizontalWave = clamp(1 - Math.abs(x - horizontalPosition) / (pitch * 0.82));
        const verticalWave = clamp(1 - Math.abs(z - verticalPosition) / (pitch * 0.82));
        const overlap = Math.min(horizontalWave, verticalWave);
        const activity = Math.max(horizontalWave, verticalWave) * 0.18 + overlap * 0.12;
        const offColor = lightTheme ? offCoreLight : offCoreDark;
        const activeColor = lightTheme ? activeCoreLight : activeCoreDark;
        const boostColor = lightTheme ? boostCoreLight : boostCoreDark;
        coreColorScratch.copy(offColor).lerp(activeColor, activity);
        if (boost > 0.01) coreColorScratch.lerp(boostColor, activity * boost * 0.12);

        helper.position.set(x, 0.13, z);
        helper.rotation.set(0, 0, 0);
        helper.scale.set(1, 1, 1);
        helper.updateMatrix();
        coreMesh.setMatrixAt(index, helper.matrix);
        coreMesh.setColorAt(index, coreColorScratch);

        helper.position.set(x, 0.205, z);
        const overlapScale = overlap > 0.04 ? overlap * 0.72 : 0.001;
        helper.scale.set(overlapScale, 1, overlapScale);
        helper.updateMatrix();
        activationMesh.setMatrixAt(index, helper.matrix);
        activationMesh.setColorAt(index, lightTheme ? activeCapLight : activeCapDark);
      });
      coreMesh.instanceMatrix.needsUpdate = true;
      coreMesh.instanceColor.needsUpdate = true;
      activationMesh.instanceMatrix.needsUpdate = true;
      activationMesh.instanceColor.needsUpdate = true;

      lanePositions.forEach((lane, index) => {
        helper.position.set(horizontalPosition, 0.205, lane - 0.1);
        helper.rotation.set(0, 0, 0);
        helper.scale.set(edgeFade, edgeFade, edgeFade);
        helper.updateMatrix();
        aTokens.setMatrixAt(index, helper.matrix);

        helper.position.set(lane + 0.1, 0.215, verticalPosition);
        helper.updateMatrix();
        bTokens.setMatrixAt(index, helper.matrix);
      });
      aTokens.instanceMatrix.needsUpdate = true;
      bTokens.instanceMatrix.needsUpdate = true;
    }

    function updateColors(boost) {
      const themeSubstrate = lightTheme ? baseColors.substrateLight : baseColors.substrateDark;
      const themeInterposer = lightTheme ? baseColors.interposerLight : baseColors.interposerDark;
      const themeHbmBase = lightTheme ? baseColors.hbmBaseLight : baseColors.hbmBaseDark;
      const themeHbmLayers = lightTheme ? baseColors.hbmLayersLight : baseColors.hbmLayersDark;
      const themeHbmTop = lightTheme ? baseColors.hbmTopLight : baseColors.hbmTopDark;

      substrateMaterial.color.copy(themeSubstrate).lerp(
        lightTheme ? boostColors.substrateLight : boostColors.substrateDark,
        boost * 0.42,
      );
      interposerMaterial.color.copy(themeInterposer).lerp(
        lightTheme ? boostColors.interposerLight : boostColors.interposerDark,
        boost * 0.5,
      );
      hbmBaseMaterial.color.copy(themeHbmBase).lerp(
        lightTheme ? boostColors.hbmBaseLight : boostColors.hbmBaseDark,
        boost * 0.42,
      );
      hbmLayerMaterials.forEach((material, index) => {
        material.color.copy(themeHbmLayers[index]).lerp(
          lightTheme ? boostColors.hbmLayersLight[index] : boostColors.hbmLayersDark[index],
          boost * 0.44,
        );
      });
      hbmTopMaterial.color.copy(themeHbmTop).lerp(
        lightTheme ? boostColors.hbmTopLight : boostColors.hbmTopDark,
        boost * 0.4,
      );
      hbmTopMaterial.iridescence = 0.26 + boost * 0.1;
      aMaterial.color.copy(lightTheme ? baseColors.aLight : baseColors.aDark).lerp(boostColors.a, boost * 0.25);
      bMaterial.color.copy(lightTheme ? baseColors.bLight : baseColors.bDark).lerp(boostColors.b, boost * 0.25);
      hbmViaMaterial.color.copy(lightTheme ? baseColors.viaLight : baseColors.viaDark).lerp(boostColors.via, boost * 0.28);

      renderer.toneMappingExposure = (lightTheme ? 1 : 1.18) + boost * 0.14;
      cellMaterial.emissiveIntensity = (lightTheme ? 0.1 : 0.11) + boost * 0.06;
      activationMaterial.opacity = 0.1 + boost * 0.025;
      substrateEdgeMaterial.opacity = (lightTheme ? 0.68 : 0.54) + boost * 0.16;
      traceMaterial.opacity = (lightTheme ? 0.27 : 0.18) + boost * 0.08;
      hbmBaseMaterial.emissiveIntensity = (lightTheme ? 0.12 : 0.14) + boost * 0.18;
      hbmLayerMaterials.forEach((material) => {
        material.emissiveIntensity = (lightTheme ? 0.12 : 0.14) + boost * 0.22;
      });
      hbmTopMaterial.emissiveIntensity = 0.05 + boost * 0.1;
      hbmViaMaterial.emissiveIntensity = 0.1 + boost * 0.18;
      rimLight.intensity = 21 + boost * 7;
    }

    function renderFrame(time) {
      animationFrame = reducedMotion ? 0 : requestAnimationFrame(renderFrame);
      const elapsed = Math.min(0.05, Math.max(0, (time - previousTime) / 1000));
      previousTime = time;
      if (!visible && !reducedMotion) return;
      const boost = reducedMotion ? 0 : clamp((boostUntil - time) / 900, 0, 1);
      if (!reducedMotion) simulationTime += elapsed * (0.13 + boost * 0.16);

      updateSystolicState(boost);
      updateColors(boost);
      renderer.render(scene, camera);
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
      const viewHeight = Math.max(9.6, 9.1 / Math.max(aspect, 0.4));
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

    canvas.addEventListener("pointerdown", () => {
      boostUntil = performance.now() + 1400;
      requestRender();
    });

    new ResizeObserver(resize).observe(surface);
    new IntersectionObserver((entries) => {
      visible = entries.some((entry) => entry.isIntersecting);
      if (visible) requestRender();
    }, { rootMargin: "180px" }).observe(surface);

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
