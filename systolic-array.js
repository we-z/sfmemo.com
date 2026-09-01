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
      color: 0x0a2a4c,
      metalness: 0.5,
      roughness: 0.32,
      clearcoat: 0.4,
      clearcoatRoughness: 0.25,
      emissive: 0x031326,
      emissiveIntensity: 0.14,
    });
    const cellMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x123d69,
      metalness: 0.32,
      roughness: 0.3,
      clearcoat: 0.48,
      clearcoatRoughness: 0.24,
      emissive: 0x041525,
      emissiveIntensity: 0.2,
    });
    const coreMaterial = new THREE.MeshBasicMaterial({
      color: 0x246b9d,
      toneMapped: false,
    });
    const waveMaterial = new THREE.MeshBasicMaterial({
      color: 0xa5e2ff,
      transparent: true,
      opacity: 0.82,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
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
    const waveGeometry = new THREE.BoxGeometry(0.46, 0.055, 0.46);
    const cellMesh = new THREE.InstancedMesh(cellGeometry, cellMaterial, gridSize * gridSize);
    const coreMesh = new THREE.InstancedMesh(coreGeometry, coreMaterial, gridSize * gridSize);
    const waveMesh = new THREE.InstancedMesh(waveGeometry, waveMaterial, gridSize * gridSize);
    cellMesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    coreMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    waveMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

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
        helper.scale.set(1, 1, 1);
        helper.updateMatrix();
        coreMesh.setMatrixAt(index, helper.matrix);

        helper.position.set(x, 0.176, z);
        helper.scale.set(0.001, 0.001, 0.001);
        helper.updateMatrix();
        waveMesh.setMatrixAt(index, helper.matrix);
      }
    }
    cellMesh.instanceMatrix.needsUpdate = true;
    coreMesh.instanceMatrix.needsUpdate = true;
    waveMesh.instanceMatrix.needsUpdate = true;
    arrayRoot.add(cellMesh, coreMesh, waveMesh);

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
      color: 0x123b59,
      metalness: 0.22,
      roughness: 0.3,
      clearcoat: 0.56,
      clearcoatRoughness: 0.18,
      iridescence: 0.3,
      iridescenceIOR: 1.38,
      iridescenceThicknessRange: [180, 270],
      sheen: 0.14,
      sheenColor: new THREE.Color(0x5257a8),
      sheenRoughness: 0.52,
      emissive: 0x031520,
      emissiveIntensity: 0.05,
    });
    const hbmViaMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xc39252,
      metalness: 0.82,
      roughness: 0.22,
      emissive: 0x3d210a,
      emissiveIntensity: 0.12,
    });
    const hbmBankMaterials = [0x2a95a0, 0x5368b4].map((color) => new THREE.MeshBasicMaterial({
      color,
      toneMapped: false,
    }));
    const hbmPhyMaterials = [0x6b55a3, 0x855b92].map((color) => new THREE.MeshBasicMaterial({
      color,
      toneMapped: false,
    }));
    const hbmSealMaterial = new THREE.MeshStandardMaterial({
      color: 0x668daa,
      metalness: 0.58,
      roughness: 0.34,
      emissive: 0x071821,
      emissiveIntensity: 0.04,
    });
    const hbmGridMaterial = new THREE.MeshBasicMaterial({
      color: 0x83b7cc,
      transparent: true,
      opacity: 0.72,
      toneMapped: false,
    });
    const hbmRdlMaterial = new THREE.MeshStandardMaterial({
      color: 0xa7cfda,
      metalness: 0.72,
      roughness: 0.29,
      emissive: 0x091d25,
      emissiveIntensity: 0.05,
    });
    const hbmViaRingMaterial = new THREE.MeshStandardMaterial({
      color: 0xe2b45a,
      metalness: 0.8,
      roughness: 0.24,
      emissive: 0x2a1604,
      emissiveIntensity: 0.04,
    });

    function addTopStrip(group, x, z, width, depth, y, material) {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(width, 0.006, depth), material);
      strip.position.set(x, y, z);
      group.add(strip);
    }

    function addSealRing(group, width, depth, y) {
      const stroke = 0.014;
      addTopStrip(group, 0, -depth / 2, width, stroke, y, hbmSealMaterial);
      addTopStrip(group, 0, depth / 2, width, stroke, y, hbmSealMaterial);
      addTopStrip(group, -width / 2, 0, stroke, depth, y, hbmSealMaterial);
      addTopStrip(group, width / 2, 0, stroke, depth, y, hbmSealMaterial);
    }

    function createCompactHbmPackage() {
      const packageGroup = new THREE.Group();
      const base = new THREE.Mesh(createSlab(2.38, 0.9, 0.08, 0.06), hbmBaseMaterial);
      base.position.y = -0.014;
      packageGroup.add(base);

      const layerCount = 6;
      const firstLayerY = 0.06;
      const layerPitch = 0.065;
      const layerHeight = 0.045;
      const layerGeometry = createSlab(2.2, 0.76, layerHeight, 0.05);
      for (let layer = 0; layer < layerCount; layer += 1) {
        const die = new THREE.Mesh(layerGeometry, hbmLayerMaterial);
        die.position.y = firstLayerY + layer * layerPitch;
        packageGroup.add(die);
      }

      const topY = firstLayerY + (layerCount - 1) * layerPitch + layerHeight / 2;
      const passivationHeight = 0.014;
      const passivation = new THREE.Mesh(createSlab(2.1, 0.68, passivationHeight, 0.045), hbmTopMaterial);
      passivation.position.y = topY + passivationHeight / 2 + 0.003;
      packageGroup.add(passivation);

      const featureY = topY + passivationHeight + 0.009;
      const bankXs = [-0.62, 0, 0.62];
      const bankZs = [-0.15, 0.075];
      bankZs.forEach((z, row) => {
        bankXs.forEach((x, column) => {
          const bank = new THREE.Mesh(
            new THREE.BoxGeometry(0.47, 0.007, 0.16),
            hbmBankMaterials[(row + column) % hbmBankMaterials.length],
          );
          bank.position.set(x, featureY, z);
          packageGroup.add(bank);
          [-0.12, 0, 0.12].forEach((offset) => {
            addTopStrip(packageGroup, x + offset, z, 0.012, 0.14, featureY + 0.006, hbmGridMaterial);
          });
          [-0.04, 0.04].forEach((offset) => {
            addTopStrip(packageGroup, x, z + offset, 0.45, 0.012, featureY + 0.006, hbmGridMaterial);
          });
        });
      });

      const viaXs = [-0.66, -0.22, 0.22, 0.66];
      viaXs.forEach((x, index) => {
        const phy = new THREE.Mesh(
          new THREE.BoxGeometry(0.34, 0.007, 0.075),
          hbmPhyMaterials[index % hbmPhyMaterials.length],
        );
        phy.position.set(x, featureY, 0.225);
        packageGroup.add(phy);
        addTopStrip(packageGroup, x, 0.275, 0.02, 0.09, featureY + 0.008, hbmRdlMaterial);

        const via = new THREE.Mesh(
          new THREE.CylinderGeometry(0.026, 0.026, topY - 0.025, 14),
          hbmViaMaterial,
        );
        via.position.set(x, topY / 2 + 0.015, 0.31);
        packageGroup.add(via);

        const ringGeometry = new THREE.TorusGeometry(0.043, 0.009, 7, 18);
        ringGeometry.rotateX(Math.PI / 2);
        const ring = new THREE.Mesh(ringGeometry, hbmViaRingMaterial);
        ring.position.set(x, featureY + 0.012, 0.31);
        packageGroup.add(ring);
      });

      addSealRing(packageGroup, 2.0, 0.58, featureY + 0.009);
      addSealRing(packageGroup, 1.91, 0.51, featureY + 0.009);
      return packageGroup;
    }

    const hbmPositions = [
      { x: 0, z: -3.5, rotation: 0 },
      { x: 0, z: 3.5, rotation: Math.PI },
      { x: -3.5, z: 0, rotation: Math.PI / 2 },
      { x: 3.5, z: 0, rotation: -Math.PI / 2 },
    ];
    const packagePrototype = createCompactHbmPackage();
    hbmPositions.forEach(({ x, z, rotation }, index) => {
      const packageGroup = index === 0 ? packagePrototype : packagePrototype.clone(true);
      packageGroup.position.set(x, 0, z);
      packageGroup.rotation.y = rotation;
      packageGroup.scale.set(1.34, 1.24, 1.34);
      arrayRoot.add(packageGroup);
    });

    const boostBlueDark = new THREE.Color(0x4c9ff0);
    const boostBlueLight = new THREE.Color(0x2b78c6);
    const boostTopDark = new THREE.Color(0x77c6ff);
    const boostTopLight = new THREE.Color(0x3d8fd0);
    const boostHbmTopDark = new THREE.Color(0x3e8bc7);
    const boostHbmTopLight = new THREE.Color(0x377eb5);
    const boostSubstrateDark = new THREE.Color(0x123b69);
    const boostSubstrateLight = new THREE.Color(0x397db3);
    const boostInterposerDark = new THREE.Color(0x246ea9);
    const boostInterposerLight = new THREE.Color(0x4a92c9);
    const boostGold = new THREE.Color(0xf1c777);
    const boostBankDark = [new THREE.Color(0x43a9b4), new THREE.Color(0x687ac5)];
    const boostBankLight = [new THREE.Color(0x318fa2), new THREE.Color(0x586da7)];
    const boostPhyDark = [new THREE.Color(0x806ab8), new THREE.Color(0x9b6ca8)];
    const boostPhyLight = [new THREE.Color(0x725b9a), new THREE.Color(0x8c647f)];
    const boostGridDark = new THREE.Color(0xb8e0ef);
    const boostGridLight = new THREE.Color(0x43809a);
    const boostRdlDark = new THREE.Color(0xd0eff5);
    const boostRdlLight = new THREE.Color(0x3e8296);

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
      cellMaterial.color.setHex(lightTheme ? 0x235f92 : 0x123d69);
      cellMaterial.emissive.setHex(lightTheme ? 0x0b3156 : 0x041525);
      coreMaterial.color.setHex(lightTheme ? 0x266fa5 : 0x246b9d);
      waveMaterial.color.setHex(lightTheme ? 0x176fc8 : 0xa5e2ff);
      hbmBaseMaterial.color.setHex(lightTheme ? 0x1c527f : 0x0a294a);
      hbmBaseMaterial.emissive.setHex(lightTheme ? 0x0a3158 : 0x031326);
      hbmLayerMaterial.color.setHex(lightTheme ? 0x2b75aa : 0x164d80);
      hbmLayerMaterial.emissive.setHex(lightTheme ? 0x10426f : 0x061e38);
      hbmTopMaterial.color.setHex(lightTheme ? 0x255f88 : 0x123b59);
      hbmTopMaterial.emissive.setHex(lightTheme ? 0x0b3147 : 0x031520);
      hbmViaMaterial.color.setHex(lightTheme ? 0x9c6f37 : 0xc39252);
      hbmViaMaterial.emissive.setHex(lightTheme ? 0x3b220b : 0x3d210a);
      hbmBankMaterials[0].color.setHex(lightTheme ? 0x217986 : 0x2a95a0);
      hbmBankMaterials[1].color.setHex(lightTheme ? 0x465b94 : 0x5368b4);
      hbmPhyMaterials[0].color.setHex(lightTheme ? 0x5d4d86 : 0x6b55a3);
      hbmPhyMaterials[1].color.setHex(lightTheme ? 0x76546f : 0x855b92);
      hbmSealMaterial.color.setHex(lightTheme ? 0x4f7591 : 0x668daa);
      hbmGridMaterial.color.setHex(lightTheme ? 0x315f75 : 0x83b7cc);
      hbmRdlMaterial.color.setHex(lightTheme ? 0x2a6476 : 0xa7cfda);
      hbmViaRingMaterial.color.setHex(lightTheme ? 0xa47434 : 0xe2b45a);
      if (reducedMotion) renderFrame(performance.now());
    }

    function updateColors(boost) {
      const waveTime = reducedMotion ? 7.3 : simulationTime;
      const cycleLength = gridSize * 2 - 1;
      const wavePosition = fract(waveTime * 0.34) * cycleLength - 0.5;

      cellPositions.forEach(({ row, column, x, z }, index) => {
        const diagonal = row + column;
        const leadingWave = Math.exp(-Math.pow(diagonal - wavePosition, 2) * 0.5);
        const trailingWave = Math.exp(-Math.pow(diagonal - (wavePosition - 2.35), 2) * 0.72) * 0.48;
        const wave = Math.min(1, leadingWave + trailingWave);
        const hovered = index === hoveredCell ? 0.78 : 0;
        const hoverLane = hoveredCell >= 0 && (
          row === Math.floor(hoveredCell / gridSize) || column === hoveredCell % gridSize
        ) ? 0.16 : 0;
        const activation = clamp(wave * (1.02 + boost * 0.42) + hovered + hoverLane, 0, 1);

        helper.position.set(x, 0.13 + activation * 0.03, z);
        helper.rotation.set(0, 0, 0);
        helper.scale.set(1 + activation * 0.13, 1 + activation * 0.72, 1 + activation * 0.13);
        helper.updateMatrix();
        coreMesh.setMatrixAt(index, helper.matrix);

        const lightScale = Math.max(0.001, Math.pow(activation, 0.58));
        helper.position.set(x, 0.188 + activation * 0.045, z);
        helper.scale.set(lightScale, 0.9 + activation * 1.7, lightScale);
        helper.updateMatrix();
        waveMesh.setMatrixAt(index, helper.matrix);
      });
      coreMesh.instanceMatrix.needsUpdate = true;
      waveMesh.instanceMatrix.needsUpdate = true;

      renderer.toneMappingExposure = (lightTheme ? 1 : 1.18) + boost * 0.18;
      cellMaterial.emissiveIntensity = (lightTheme ? 0.18 : 0.2) + boost * 0.24;
      coreMaterial.color
        .setHex(lightTheme ? 0x266fa5 : 0x246b9d)
        .lerp(lightTheme ? boostTopLight : boostTopDark, boost * 0.46);
      waveMaterial.opacity = 0.92 + boost * 0.08;

      substrateMaterial.color
        .setHex(lightTheme ? 0x15304d : 0x07111f)
        .lerp(lightTheme ? boostSubstrateLight : boostSubstrateDark, boost * 0.5);
      interposerMaterial.color
        .setHex(lightTheme ? 0x225f91 : 0x0a2a4c)
        .lerp(lightTheme ? boostInterposerLight : boostInterposerDark, boost * 0.62);
      padMaterial.color
        .setHex(lightTheme ? 0x2b74a8 : 0x6da9d7)
        .lerp(lightTheme ? boostTopLight : boostTopDark, boost * 0.52);
      hbmBaseMaterial.color
        .setHex(lightTheme ? 0x1c527f : 0x0a294a)
        .lerp(lightTheme ? boostBlueLight : boostBlueDark, boost * 0.56);
      hbmLayerMaterial.color
        .setHex(lightTheme ? 0x2b75aa : 0x164d80)
        .lerp(lightTheme ? boostBlueLight : boostBlueDark, boost * 0.72);
      hbmTopMaterial.color
        .setHex(lightTheme ? 0x255f88 : 0x123b59)
        .lerp(lightTheme ? boostHbmTopLight : boostHbmTopDark, boost * 0.46);
      hbmViaMaterial.color
        .setHex(lightTheme ? 0x9c6f37 : 0xc39252)
        .lerp(boostGold, boost * 0.46);
      hbmBankMaterials[0].color
        .setHex(lightTheme ? 0x217986 : 0x2a95a0)
        .lerp(lightTheme ? boostBankLight[0] : boostBankDark[0], boost * 0.3);
      hbmBankMaterials[1].color
        .setHex(lightTheme ? 0x465b94 : 0x5368b4)
        .lerp(lightTheme ? boostBankLight[1] : boostBankDark[1], boost * 0.3);
      hbmPhyMaterials[0].color
        .setHex(lightTheme ? 0x5d4d86 : 0x6b55a3)
        .lerp(lightTheme ? boostPhyLight[0] : boostPhyDark[0], boost * 0.26);
      hbmPhyMaterials[1].color
        .setHex(lightTheme ? 0x76546f : 0x855b92)
        .lerp(lightTheme ? boostPhyLight[1] : boostPhyDark[1], boost * 0.26);
      hbmGridMaterial.color
        .setHex(lightTheme ? 0x315f75 : 0x83b7cc)
        .lerp(lightTheme ? boostGridLight : boostGridDark, boost * 0.38);
      hbmRdlMaterial.color
        .setHex(lightTheme ? 0x2a6476 : 0xa7cfda)
        .lerp(lightTheme ? boostRdlLight : boostRdlDark, boost * 0.34);
      hbmViaRingMaterial.color
        .setHex(lightTheme ? 0xa47434 : 0xe2b45a)
        .lerp(boostGold, boost * 0.4);

      substrateEdgeMaterial.opacity = (lightTheme ? 0.68 : 0.54) + boost * 0.22;
      traceMaterial.opacity = (lightTheme ? 0.42 : 0.3) + boost * 0.36;
      hbmBaseMaterial.emissiveIntensity = (lightTheme ? 0.12 : 0.14) + boost * 0.3;
      hbmLayerMaterial.emissiveIntensity = (lightTheme ? 0.14 : 0.16) + boost * 0.42;
      hbmTopMaterial.emissiveIntensity = (lightTheme ? 0.05 : 0.05) + boost * 0.18;
      hbmViaMaterial.emissiveIntensity = 0.12 + boost * 0.3;
      hbmGridMaterial.opacity = 0.72 + boost * 0.2;
      hbmRdlMaterial.emissiveIntensity = 0.05 + boost * 0.16;
      hbmViaRingMaterial.emissiveIntensity = 0.04 + boost * 0.18;
      interposerMaterial.emissiveIntensity = (lightTheme ? 0.12 : 0.15) + boost * 0.34;
      rimLight.intensity = 24 + boost * 22;
    }

    function renderFrame(time) {
      animationFrame = reducedMotion ? 0 : requestAnimationFrame(renderFrame);
      const elapsed = Math.min(0.05, Math.max(0, (time - previousTime) / 1000));
      previousTime = time;
      if (!visible && !reducedMotion) return;
      const boost = reducedMotion ? 0 : clamp((boostUntil - time) / 900, 0, 1);
      if (!reducedMotion) simulationTime += elapsed * (1 + boost * 1.9);

      arrayRoot.rotation.x += (targetRotation.x - arrayRoot.rotation.x) * 0.09;
      arrayRoot.rotation.y += (targetRotation.y - arrayRoot.rotation.y) * 0.09;
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

    canvas.addEventListener("pointermove", (event) => {
      updateHover(event);
      requestRender();
    });
    canvas.addEventListener("click", () => {
      boostUntil = performance.now() + 1350;
      requestRender();
    });
    canvas.addEventListener("pointerleave", (event) => {
      hoveredCell = -1;
      if (event.pointerType === "mouse") requestRender();
    });

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(surface);
    const visibilityObserver = new IntersectionObserver((entries) => {
      visible = entries.some((entry) => entry.isIntersecting);
      if (visible) requestRender();
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
