import * as THREE from "./vendor/three.module.js";

const surface = document.querySelector(".approach-systolic");
const canvas = document.querySelector("#systolic-canvas");
const equationReadout = document.querySelector(".systolic-equation");
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

    const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));
    const fract = (value) => value - Math.floor(value);
    const modulo = (value, length) => ((value % length) + length) % length;
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

    function createLabelTexture(text, accent, compact = false) {
      const labelCanvas = document.createElement("canvas");
      labelCanvas.width = compact ? 128 : 384;
      labelCanvas.height = compact ? 72 : 112;
      const context = labelCanvas.getContext("2d");
      context.clearRect(0, 0, labelCanvas.width, labelCanvas.height);
      context.fillStyle = compact ? accent : "rgba(9, 35, 64, 0.94)";
      context.globalAlpha = compact ? 0.82 : 1;
      context.beginPath();
      context.roundRect(3, 3, labelCanvas.width - 6, labelCanvas.height - 6, compact ? 18 : 24);
      context.fill();
      context.globalAlpha = 1;
      if (!compact) {
        context.strokeStyle = accent;
        context.lineWidth = 4;
        context.stroke();
      }
      context.fillStyle = "#eef8ff";
      context.font = `${compact ? 600 : 550} ${compact ? 40 : 48}px ui-monospace, SFMono-Regular, Menlo, monospace`;
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(text, labelCanvas.width / 2, labelCanvas.height / 2 + 1);
      const texture = new THREE.CanvasTexture(labelCanvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.needsUpdate = true;
      return texture;
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
    const coreMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
    const activationMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.52,
      depthWrite: false,
      toneMapped: false,
    });
    const aMaterial = new THREE.MeshBasicMaterial({ color: 0x4cc9f5, toneMapped: false });
    const bMaterial = new THREE.MeshBasicMaterial({ color: 0xa88cff, toneMapped: false });

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
    const scheduleLength = gridSize * 3 - 2;
    const pitch = 0.72;
    const gridSpan = (gridSize - 1) * pitch;
    const first = -gridSpan / 2;
    const helper = new THREE.Object3D();
    const cellMesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.52, 0.13, 0.52),
      cellMaterial,
      gridSize * gridSize,
    );
    const coreMesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.3, 0.055, 0.3),
      coreMaterial,
      gridSize * gridSize,
    );
    const activationMesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.46, 0.028, 0.46),
      activationMaterial,
      gridSize * gridSize,
    );
    cellMesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    coreMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    activationMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    const offCoreDark = new THREE.Color(0x24577f);
    const activeCoreDark = new THREE.Color(0xbfeeff);
    const boostCoreDark = new THREE.Color(0xe0f7ff);
    const offCoreLight = new THREE.Color(0x2e6f9f);
    const activeCoreLight = new THREE.Color(0x0b6fd1);
    const boostCoreLight = new THREE.Color(0x0b57b1);
    const activeCapDark = new THREE.Color(0xd8f5ff);
    const activeCapLight = new THREE.Color(0x2588df);
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
      traceVertices.push(-3.28, -0.015, lane, 3.28, -0.015, lane);
      traceVertices.push(lane, -0.005, -3.28, lane, -0.005, 3.28);
    });
    const traceGeometry = new THREE.BufferGeometry();
    traceGeometry.setAttribute("position", new THREE.Float32BufferAttribute(traceVertices, 3));
    const traceMaterial = new THREE.LineBasicMaterial({ color: 0x4e94d6, transparent: true, opacity: 0.3 });
    arrayRoot.add(new THREE.LineSegments(traceGeometry, traceMaterial));

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
        helper.scale.set(1, 1, 1);
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

    const aTokens = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.44, 0.035, 0.11),
      aMaterial,
      gridSize * gridSize,
    );
    const bTokens = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.11, 0.045, 0.44),
      bMaterial,
      gridSize * gridSize,
    );
    aTokens.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    bTokens.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    arrayRoot.add(aTokens, bTokens);

    const matrixA = Array.from({ length: gridSize }, (_, row) => (
      Array.from({ length: gridSize }, (_, k) => ((row * 3 + k * 2) % 5) + 1)
    ));
    const matrixB = Array.from({ length: gridSize }, (_, k) => (
      Array.from({ length: gridSize }, (_, column) => ((k * 2 + column * 3) % 5) + 1)
    ));

    const valueTexturesA = Array.from({ length: 5 }, (_, index) => createLabelTexture(String(index + 1), "#4cc9f5", true));
    const valueTexturesB = Array.from({ length: 5 }, (_, index) => createLabelTexture(String(index + 1), "#a88cff", true));
    const rowLabels = Array.from({ length: gridSize }, () => {
      const material = new THREE.SpriteMaterial({ transparent: true, depthWrite: false, depthTest: false });
      const sprite = new THREE.Sprite(material);
      sprite.scale.set(0.31, 0.17, 1);
      sprite.renderOrder = 20;
      sprite.userData.k = 0;
      arrayRoot.add(sprite);
      return sprite;
    });
    const columnLabels = Array.from({ length: gridSize }, () => {
      const material = new THREE.SpriteMaterial({ transparent: true, depthWrite: false, depthTest: false });
      const sprite = new THREE.Sprite(material);
      sprite.scale.set(0.31, 0.17, 1);
      sprite.renderOrder = 20;
      sprite.userData.k = 0;
      arrayRoot.add(sprite);
      return sprite;
    });
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
      const base = new THREE.Mesh(createSlab(3.16, 1.18, 0.09, 0.07), hbmBaseMaterial);
      base.position.y = -0.015;
      packageGroup.add(base);
      const packageInterposer = new THREE.Mesh(createSlab(3.02, 1.08, 0.04, 0.065), hbmInterposerMaterial);
      packageInterposer.position.y = 0.05;
      packageGroup.add(packageInterposer);

      const layerCount = 8;
      const firstLayerY = 0.095;
      const layerPitch = 0.068;
      const layerHeight = 0.032;
      const layerGeometry = createSlab(2.94, 0.98, layerHeight, 0.055);
      for (let layer = 0; layer < layerCount; layer += 1) {
        const die = new THREE.Mesh(layerGeometry, hbmLayerMaterials[layer % 2]);
        die.position.y = firstLayerY + layer * layerPitch;
        packageGroup.add(die);
      }

      const topY = firstLayerY + (layerCount - 1) * layerPitch + layerHeight / 2;
      const passivation = new THREE.Mesh(createSlab(2.9, 0.94, 0.018, 0.052), hbmTopMaterial);
      passivation.position.y = topY + 0.014;
      packageGroup.add(passivation);
      const featureY = topY + 0.03;

      const bankXs = [-0.95, -0.32, 0.32, 0.95];
      const bankZs = [-0.2, 0.02];
      bankZs.forEach((z, row) => {
        bankXs.forEach((x, column) => {
          const bank = new THREE.Mesh(
            new THREE.BoxGeometry(0.48, 0.008, 0.16),
            hbmBankMaterials[(row + column) % 2],
          );
          bank.position.set(x, featureY, z);
          packageGroup.add(bank);
          [-0.12, 0, 0.12].forEach((offset) => {
            addTopStrip(packageGroup, x + offset, z, 0.011, 0.135, featureY + 0.007, hbmGridMaterial);
          });
          [-0.04, 0.04].forEach((offset) => {
            addTopStrip(packageGroup, x, z + offset, 0.44, 0.01, featureY + 0.007, hbmGridMaterial);
          });
        });
      });

      const viaXs = [-0.9, -0.3, 0.3, 0.9];
      viaXs.forEach((x) => {
        const phy = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.008, 0.09), hbmPhyMaterial);
        phy.position.set(x, featureY, 0.25);
        packageGroup.add(phy);
        addTopStrip(packageGroup, x, 0.3375, 0.022, 0.085, featureY + 0.008, hbmRdlMaterial);

        const viaHeight = topY - 0.055;
        const via = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, viaHeight, 14), hbmViaMaterial);
        via.position.set(x, 0.055 + viaHeight / 2, 0.38);
        packageGroup.add(via);

        [firstLayerY, topY].forEach((ringY) => {
          const ringGeometry = new THREE.TorusGeometry(0.05, 0.01, 7, 18);
          ringGeometry.rotateX(Math.PI / 2);
          const ring = new THREE.Mesh(ringGeometry, hbmViaRingMaterial);
          ring.position.set(x, ringY + 0.02, 0.38);
          packageGroup.add(ring);
        });
      });

      addSealRing(packageGroup, 2.74, 0.79, featureY + 0.009);
      return packageGroup;
    }

    const hbmPositions = [
      { x: 0, z: -3.54, rotation: 0 },
      { x: 0, z: 3.54, rotation: Math.PI },
      { x: -3.54, z: 0, rotation: Math.PI / 2 },
      { x: 3.54, z: 0, rotation: -Math.PI / 2 },
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
      interposerDark: new THREE.Color(0x0a2a4c),
      interposerLight: new THREE.Color(0x225f91),
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
    let simulationTime = 8.36;
    let boostUntil = 0;
    let reducedMotion = motionPreference.matches;
    let lastTick = -1;

    function applyTheme() {
      lightTheme = document.documentElement.dataset.theme === "light";
      renderer.toneMappingExposure = lightTheme ? 1 : 1.18;
      substrateMaterial.emissive.setHex(lightTheme ? 0x07182b : 0x020813);
      interposerMaterial.emissive.setHex(lightTheme ? 0x0a3158 : 0x031326);
      substrateEdgeMaterial.color.setHex(lightTheme ? 0x1559c5 : 0x3977b8);
      substrateEdgeMaterial.opacity = lightTheme ? 0.68 : 0.54;
      traceMaterial.color.setHex(lightTheme ? 0x1769b3 : 0x4e94d6);
      traceMaterial.opacity = lightTheme ? 0.44 : 0.3;
      padMaterial.color.setHex(lightTheme ? 0x2b74a8 : 0x6da9d7);
      padMaterial.emissive.setHex(lightTheme ? 0x0e3f70 : 0x0d3154);
      cellMaterial.color.setHex(lightTheme ? 0x235f92 : 0x123d69);
      cellMaterial.emissive.setHex(lightTheme ? 0x0b3156 : 0x041525);
      hbmInterposerMaterial.color.setHex(lightTheme ? 0x24658e : 0x0b3155);
      hbmBankMaterials[0].color.setHex(lightTheme ? 0x217986 : 0x1b7087);
      hbmBankMaterials[1].color.setHex(lightTheme ? 0x465b94 : 0x4b5fa8);
      hbmPhyMaterial.color.setHex(lightTheme ? 0x5d4d86 : 0x66539c);
      hbmGridMaterial.color.setHex(lightTheme ? 0x315f75 : 0x8bc2d2);
      hbmSealMaterial.color.setHex(lightTheme ? 0x4f7591 : 0x668daa);
      hbmRdlMaterial.color.setHex(lightTheme ? 0x2a6476 : 0xa7cfda);
      hbmViaRingMaterial.color.setHex(lightTheme ? 0xa47434 : 0xe2b45a);
      lastTick = -1;
      if (reducedMotion) requestRender();
    }

    function updateEquationLayout(tick) {
      const activeCells = cellPositions
        .filter(({ row, column }) => {
          const k = tick - row - column;
          return k >= 0 && k < gridSize;
        })
        .sort((left, right) => (
          Math.hypot(left.row - 3.5, left.column - 3.5)
          - Math.hypot(right.row - 3.5, right.column - 3.5)
        ));

      const leadCell = activeCells[0];
      if (leadCell && equationReadout) {
        const k = tick - leadCell.row - leadCell.column;
        const left = matrixA[leadCell.row][k];
        const right = matrixB[k][leadCell.column];
        equationReadout.textContent = `${left} × ${right} = ${left * right}`;
      }

      rowLabels.forEach((sprite, row) => {
        const k = modulo(tick - row, gridSize);
        sprite.userData.k = k;
        sprite.material.map = valueTexturesA[matrixA[row][k] - 1];
        sprite.material.needsUpdate = true;
      });
      columnLabels.forEach((sprite, column) => {
        const k = modulo(tick - column, gridSize);
        sprite.userData.k = k;
        sprite.material.map = valueTexturesB[matrixB[k][column] - 1];
        sprite.material.needsUpdate = true;
      });
    }

    function updateSystolicState(boost) {
      const clock = reducedMotion ? 8.46 : simulationTime;
      const tick = Math.floor(clock) % scheduleLength;
      const phase = fract(clock);
      const move = smoothstep(0, 0.34, phase);
      const timeline = tick - 1 + move;
      const latched = phase >= 0.22 && phase < 0.88;

      if (tick !== lastTick) {
        updateEquationLayout(tick);
        lastTick = tick;
      }

      cellPositions.forEach(({ row, column, x, z }, index) => {
        const k = tick - row - column;
        const active = latched && k >= 0 && k < gridSize;
        coreColorScratch.copy(active
          ? (lightTheme ? activeCoreLight : activeCoreDark)
          : (lightTheme ? offCoreLight : offCoreDark));
        if (active && boost > 0.01) {
          coreColorScratch.copy(lightTheme ? activeCoreLight : activeCoreDark)
            .lerp(lightTheme ? boostCoreLight : boostCoreDark, boost * 0.58);
        }

        helper.position.set(x, active ? 0.165 : 0.13, z);
        helper.rotation.set(0, 0, 0);
        helper.scale.set(active ? 1.12 : 1, active ? 2.15 : 1, active ? 1.12 : 1);
        helper.updateMatrix();
        coreMesh.setMatrixAt(index, helper.matrix);
        coreMesh.setColorAt(index, coreColorScratch);

        helper.position.set(x, 0.235, z);
        helper.scale.set(active ? 1.08 : 0.001, active ? 1 : 0.001, active ? 1.08 : 0.001);
        helper.updateMatrix();
        activationMesh.setMatrixAt(index, helper.matrix);
        activationMesh.setColorAt(index, lightTheme ? activeCapLight : activeCapDark);
      });
      coreMesh.instanceMatrix.needsUpdate = true;
      coreMesh.instanceColor.needsUpdate = true;
      activationMesh.instanceMatrix.needsUpdate = true;
      activationMesh.instanceColor.needsUpdate = true;

      for (let row = 0; row < gridSize; row += 1) {
        for (let k = 0; k < gridSize; k += 1) {
          const index = row * gridSize + k;
          const columnFloat = timeline - row - k;
          const inRange = columnFloat >= -1.1 && columnFloat <= 8.1;
          helper.position.set(first + columnFloat * pitch, 0.205, first + row * pitch - 0.16);
          helper.scale.set(inRange ? 1 : 0.001, inRange ? 1 : 0.001, inRange ? 1 : 0.001);
          helper.updateMatrix();
          aTokens.setMatrixAt(index, helper.matrix);
        }
      }
      for (let k = 0; k < gridSize; k += 1) {
        for (let column = 0; column < gridSize; column += 1) {
          const index = k * gridSize + column;
          const rowFloat = timeline - k - column;
          const inRange = rowFloat >= -1.1 && rowFloat <= 8.1;
          helper.position.set(first + column * pitch + 0.16, 0.245, first + rowFloat * pitch);
          helper.scale.set(inRange ? 1 : 0.001, inRange ? 1 : 0.001, inRange ? 1 : 0.001);
          helper.updateMatrix();
          bTokens.setMatrixAt(index, helper.matrix);
        }
      }
      aTokens.instanceMatrix.needsUpdate = true;
      bTokens.instanceMatrix.needsUpdate = true;

      rowLabels.forEach((sprite, row) => {
        const columnFloat = timeline - row - sprite.userData.k;
        sprite.visible = columnFloat >= -0.85 && columnFloat <= 7.85;
        sprite.position.set(first + columnFloat * pitch, 0.46, first + row * pitch - 0.16);
      });
      columnLabels.forEach((sprite, column) => {
        const rowFloat = timeline - sprite.userData.k - column;
        sprite.visible = rowFloat >= -0.85 && rowFloat <= 7.85;
        sprite.position.set(first + column * pitch + 0.16, 0.5, first + rowFloat * pitch);
      });
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
      cellMaterial.emissiveIntensity = (lightTheme ? 0.18 : 0.2) + boost * 0.22;
      activationMaterial.opacity = 0.54 + boost * 0.18;
      substrateEdgeMaterial.opacity = (lightTheme ? 0.68 : 0.54) + boost * 0.16;
      traceMaterial.opacity = (lightTheme ? 0.44 : 0.3) + boost * 0.3;
      hbmBaseMaterial.emissiveIntensity = (lightTheme ? 0.12 : 0.14) + boost * 0.18;
      hbmLayerMaterials.forEach((material) => {
        material.emissiveIntensity = (lightTheme ? 0.12 : 0.14) + boost * 0.22;
      });
      hbmTopMaterial.emissiveIntensity = 0.05 + boost * 0.1;
      hbmViaMaterial.emissiveIntensity = 0.1 + boost * 0.18;
      rimLight.intensity = 24 + boost * 18;
    }

    function renderFrame(time) {
      animationFrame = reducedMotion ? 0 : requestAnimationFrame(renderFrame);
      const elapsed = Math.min(0.05, Math.max(0, (time - previousTime) / 1000));
      previousTime = time;
      if (!visible && !reducedMotion) return;
      const boost = reducedMotion ? 0 : clamp((boostUntil - time) / 900, 0, 1);
      if (!reducedMotion) simulationTime += elapsed * (5 + boost * 3.2);

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
      lastTick = -1;
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
