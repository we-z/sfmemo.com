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

    const baseDie = new THREE.Mesh(
      createSlab(5.08, 2.58, 0.23, 0.12),
      baseMaterial,
    );
    baseDie.position.y = -1.05;
    stackRoot.add(baseDie);

    const layerCount = 16;
    const layerWidth = 4.94;
    const layerDepth = 2.5;
    const layerHeight = 0.09;
    const layerPitch = 0.24;
    const firstLayerY = -0.79;
    const layerGeometry = createSlab(layerWidth, layerDepth, layerHeight, 0.11);
    const layerMaterials = [];
    const layerMeshes = [];
    const darkLayerPalette = [0x0e3154, 0x10365b, 0x123a62, 0x143e68];
    const lightLayerPalette = [0x1b5a94, 0x1e619c, 0x2267a3, 0x266daa];
    const darkLayerEmissivePalette = [0x05192d, 0x061d33, 0x072039, 0x08233e];
    const lightLayerEmissivePalette = [0x0a3159, 0x0b3761, 0x0d3d69, 0x0e4270];
    const darkLayerBoostPalette = [0x174a78, 0x195080, 0x1b5688, 0x1d5c90];
    const lightLayerBoostPalette = [0x266da9, 0x2a74b2, 0x2e7bbb, 0x3282c4];

    for (let index = 0; index < layerCount; index += 1) {
      const material = new THREE.MeshPhysicalMaterial({
        color: darkLayerPalette[index % darkLayerPalette.length],
        metalness: 0.14 + (index % 4) * 0.012,
        roughness: 0.38 + ((index + 2) % 5) * 0.022,
        clearcoat: 0.22 + (index % 3) * 0.025,
        clearcoatRoughness: 0.42 + ((index + 1) % 4) * 0.025,
        emissive: darkLayerEmissivePalette[index % darkLayerEmissivePalette.length],
        emissiveIntensity: 0.035,
      });
      const layer = new THREE.Mesh(layerGeometry, material);
      layer.position.y = firstLayerY + index * layerPitch;
      layerMaterials.push(material);
      layerMeshes.push(layer);
      stackRoot.add(layer);
    }

    const helper = new THREE.Object3D();

    const edgeMaterial = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false });
    const frontEdgeSegments = [{ x: 0, width: 4.68 }];
    const edgeStrips = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 0.014, 0.024),
      edgeMaterial,
      layerCount * frontEdgeSegments.length,
    );
    const edgeIdle = new THREE.Color(0x6a93bd);
    const edgeActive = new THREE.Color(0xc7e2ff);
    for (let index = 0; index < layerCount; index += 1) {
      frontEdgeSegments.forEach((segment, segmentIndex) => {
        const instanceIndex = index * frontEdgeSegments.length + segmentIndex;
        helper.position.set(segment.x, firstLayerY + index * layerPitch + layerHeight / 2 + 0.002, 1.258);
        helper.rotation.set(0, 0, 0);
        helper.scale.set(segment.width, 1, 1);
        helper.updateMatrix();
        edgeStrips.setMatrixAt(instanceIndex, helper.matrix);
        edgeStrips.setColorAt(instanceIndex, edgeIdle);
      });
    }
    edgeStrips.instanceColor.needsUpdate = true;
    stackRoot.add(edgeStrips);

    const topDieY = firstLayerY + (layerCount - 1) * layerPitch + layerHeight / 2;
    const memoryBanks = [];

    // A restrained oxide/passivation sheen gives the top die a real silicon
    // character. Patterned regions stay almost coplanar with the die surface.
    const topPassivationMaterial = new THREE.MeshPhysicalMaterial({
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
      emissiveIntensity: 0.045,
    });
    const topPassivationHeight = 0.01;
    const topPassivation = new THREE.Mesh(
      createSlab(4.7, 2.26, topPassivationHeight, 0.09),
      topPassivationMaterial,
    );
    topPassivation.position.y = topDieY + topPassivationHeight / 2 + 0.001;
    stackRoot.add(topPassivation);

    const bankX = [-1.62, -0.93, -0.24, 0.45];
    const bankZ = [-0.46, 0.46];
    bankZ.forEach((z, row) => {
      bankX.forEach((x, column) => {
        memoryBanks.push({
          x,
          z,
          width: 0.54,
          depth: 0.7,
          tone: (row + column) % 2,
        });
      });
    });

    const tsvLaneX = [1.04, 1.31, 1.58, 1.85];
    const tsvLaneZ = 1.16;
    const peripheralBlocks = tsvLaneX.map((x, index) => ({
      x,
      z: 0.56,
      width: 0.2,
      depth: 0.3,
      tone: index % 2,
    }));
    const surfaceFeatures = [
      ...memoryBanks.map((bank) => ({ ...bank, kind: "bank" })),
      ...peripheralBlocks.map((block) => ({ ...block, kind: "phy" })),
    ];
    const topFeatureMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.82,
      toneMapped: false,
    });
    const topFeatureMesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 0.006, 1),
      topFeatureMaterial,
      surfaceFeatures.length,
    );
    const darkTopFeaturePalettes = {
      bank: [0x2a95a0, 0x5368b4],
      phy: [0x6b55a3, 0x855b92],
    };
    const lightTopFeaturePalettes = {
      bank: [0x217986, 0x465b94],
      phy: [0x5d4d86, 0x76546f],
    };
    surfaceFeatures.forEach((feature, index) => {
      helper.position.set(feature.x, topDieY + topPassivationHeight + 0.005, feature.z);
      helper.rotation.set(0, 0, 0);
      helper.scale.set(feature.width - 0.045, 1, feature.depth - 0.045);
      helper.updateMatrix();
      topFeatureMesh.setMatrixAt(index, helper.matrix);
      topFeatureMesh.setColorAt(index, new THREE.Color(
        darkTopFeaturePalettes[feature.kind][feature.tone % darkTopFeaturePalettes[feature.kind].length],
      ));
    });
    topFeatureMesh.instanceMatrix.needsUpdate = true;
    topFeatureMesh.instanceColor.needsUpdate = true;
    stackRoot.add(topFeatureMesh);

    const topTraceY = topDieY + topPassivationHeight + 0.009;
    const topGridSegments = [];
    const topRdlSegments = [];
    const addGridTrace = (x1, z1, x2, z2) => {
      topGridSegments.push(x1, topTraceY, z1, x2, topTraceY, z2);
    };
    const addRdlTrace = (x1, z1, x2, z2) => {
      topRdlSegments.push(x1, topTraceY + 0.001, z1, x2, topTraceY + 0.001, z2);
    };
    const addTraceRectangle = (addTrace, { x, z, width, depth }) => {
      const left = x - width / 2;
      const right = x + width / 2;
      const front = z - depth / 2;
      const back = z + depth / 2;
      addTrace(left, front, right, front);
      addTrace(right, front, right, back);
      addTrace(right, back, left, back);
      addTrace(left, back, left, front);
    };

    // Double seal ring and regular DRAM word-line/bit-line grids.
    addTraceRectangle(addGridTrace, { x: 0, z: 0, width: 4.36, depth: 2.04 });
    addTraceRectangle(addGridTrace, { x: 0, z: 0, width: 4.18, depth: 1.88 });
    memoryBanks.forEach((bank) => {
      addTraceRectangle(addGridTrace, bank);
      [-0.25, 0, 0.25].forEach((offset) => {
        addGridTrace(
          bank.x + bank.width * offset,
          bank.z - bank.depth / 2,
          bank.x + bank.width * offset,
          bank.z + bank.depth / 2,
        );
      });
      [-0.25, 0, 0.25].forEach((offset) => {
        addGridTrace(
          bank.x - bank.width / 2,
          bank.z + bank.depth * offset,
          bank.x + bank.width / 2,
          bank.z + bank.depth * offset,
        );
      });
    });
    peripheralBlocks.forEach((block) => {
      addTraceRectangle(addGridTrace, block);
      addGridTrace(block.x - block.width / 6, block.z - block.depth / 2, block.x - block.width / 6, block.z + block.depth / 2);
      addGridTrace(block.x + block.width / 6, block.z - block.depth / 2, block.x + block.width / 6, block.z + block.depth / 2);
    });

    // One unambiguous redistribution lane connects each PHY block to one TSV.
    peripheralBlocks.forEach((block, index) => {
      addRdlTrace(block.x, block.z + block.depth / 2, tsvLaneX[index], tsvLaneZ);
    });

    const topGridMaterial = new THREE.MeshStandardMaterial({
      color: 0x83b7cc,
      metalness: 0.64,
      roughness: 0.34,
      emissive: 0x071821,
      emissiveIntensity: 0.04,
    });
    const topRdlMaterial = new THREE.MeshStandardMaterial({
      color: 0xa7cfda,
      metalness: 0.72,
      roughness: 0.29,
      emissive: 0x091d25,
      emissiveIntensity: 0.045,
    });
    const createTopTraceMesh = (segments, material, width) => {
      const mesh = new THREE.InstancedMesh(
        new THREE.BoxGeometry(1, 0.004, 1),
        material,
        segments.length / 6,
      );
      for (let index = 0; index < segments.length; index += 6) {
        const x1 = segments[index];
        const y1 = segments[index + 1];
        const z1 = segments[index + 2];
        const x2 = segments[index + 3];
        const z2 = segments[index + 5];
        const dx = x2 - x1;
        const dz = z2 - z1;
        helper.position.set((x1 + x2) / 2, y1, (z1 + z2) / 2);
        helper.rotation.set(0, -Math.atan2(dz, dx), 0);
        helper.scale.set(Math.hypot(dx, dz), 1, width);
        helper.updateMatrix();
        mesh.setMatrixAt(index / 6, helper.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
      return mesh;
    };
    const topGridMesh = createTopTraceMesh(topGridSegments, topGridMaterial, 0.012);
    const topRdlMesh = createTopTraceMesh(topRdlSegments, topRdlMaterial, 0.022);
    stackRoot.add(topGridMesh, topRdlMesh);

    // Each TSV alternates between a thick segment embedded in the front face
    // of a silicon die and a narrower exposed connector in the inter-die gap.
    // The blue slabs remain complete and the conductor visibly traverses all
    // sixteen layers without becoming a detached exterior rail.
    const tsvColumns = tsvLaneX.map((x) => ({ x, z: tsvLaneZ }));
    const tsvMaterial = new THREE.MeshStandardMaterial({
      color: 0xd09a43,
      metalness: 0.82,
      roughness: 0.27,
      emissive: 0x2a1604,
      emissiveIntensity: 0.045,
    });
    const tsvPlugGeometry = new THREE.CylinderGeometry(
      0.055,
      0.055,
      layerHeight + 0.018,
      18,
    );
    const tsvs = new THREE.InstancedMesh(
      tsvPlugGeometry,
      tsvMaterial,
      tsvColumns.length * layerCount,
    );
    let tsvIndex = 0;
    for (let layer = 0; layer < layerCount; layer += 1) {
      tsvColumns.forEach((column) => {
        helper.position.set(column.x, firstLayerY + layer * layerPitch, column.z);
        helper.rotation.set(0, 0, 0);
        helper.scale.set(1, 1, 1);
        helper.updateMatrix();
        tsvs.setMatrixAt(tsvIndex, helper.matrix);
        tsvIndex += 1;
      });
    }
    stackRoot.add(tsvs);

    const viaRingMaterial = new THREE.MeshStandardMaterial({
      color: 0xe2b45a,
      metalness: 0.8,
      roughness: 0.24,
      emissive: 0x2a1604,
      emissiveIntensity: 0.035,
    });
    const viaRingGeometry = new THREE.TorusGeometry(0.074, 0.012, 7, 20);
    viaRingGeometry.rotateX(Math.PI / 2);
    const viaRings = new THREE.InstancedMesh(
      viaRingGeometry,
      viaRingMaterial,
      tsvColumns.length * layerCount,
    );
    let viaRingIndex = 0;
    for (let layer = 0; layer < layerCount; layer += 1) {
      tsvColumns.forEach((column) => {
        helper.position.set(
          column.x,
          firstLayerY + layer * layerPitch + layerHeight / 2
            + (layer === layerCount - 1 ? topPassivationHeight + 0.011 : 0.004),
          column.z,
        );
        helper.rotation.set(0, 0, 0);
        helper.scale.set(1, 1, 1);
        helper.updateMatrix();
        viaRings.setMatrixAt(viaRingIndex, helper.matrix);
        viaRingIndex += 1;
      });
    }
    stackRoot.add(viaRings);

    const connectorCount = tsvColumns.length * layerCount;
    const connectorMaterial = new THREE.MeshStandardMaterial({
      color: 0xb97828,
      metalness: 0.78,
      roughness: 0.31,
      emissive: 0x241204,
      emissiveIntensity: 0.035,
    });
    const connectors = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(
        0.036,
        0.036,
        layerPitch - layerHeight - 0.014,
        16,
      ),
      connectorMaterial,
      connectorCount,
    );
    let connectorIndex = 0;
    const baseTop = baseDie.position.y + 0.23 / 2;
    const firstLayerBottom = firstLayerY - layerHeight / 2;
    tsvColumns.forEach((column) => {
      helper.position.set(column.x, (baseTop + firstLayerBottom) / 2, column.z);
      helper.rotation.set(0, 0, 0);
      helper.scale.set(1, Math.max(0.2, (firstLayerBottom - baseTop) / (layerPitch - layerHeight - 0.014)), 1);
      helper.updateMatrix();
      connectors.setMatrixAt(connectorIndex, helper.matrix);
      connectorIndex += 1;
    });
    for (let layer = 0; layer < layerCount - 1; layer += 1) {
      tsvColumns.forEach((column) => {
        helper.position.set(column.x, firstLayerY + layer * layerPitch + layerPitch / 2, column.z);
        helper.rotation.set(0, 0, 0);
        helper.scale.set(1, 1, 1);
        helper.updateMatrix();
        connectors.setMatrixAt(connectorIndex, helper.matrix);
        connectorIndex += 1;
      });
    }
    stackRoot.add(connectors);

    const routes = [];
    const verticalStarts = [];
    const entryZ = [1.3, 1.17, 1.04, 0.91];

    tsvColumns.forEach((column, index) => {
      const start = new THREE.Vector3(-2.42, -0.9, entryZ[index]);
      const elbow = new THREE.Vector3(column.x, -0.9, entryZ[index]);
      const base = new THREE.Vector3(column.x, -0.9, column.z);
      const top = new THREE.Vector3(column.x, topDieY + 0.002, column.z);
      const route = new THREE.CurvePath();
      route.add(new THREE.LineCurve3(start, elbow));
      route.add(new THREE.LineCurve3(elbow, base));
      route.add(new THREE.LineCurve3(base, top));
      routes.push(route);

      const horizontalLength = start.distanceTo(elbow) + elbow.distanceTo(base);
      const totalLength = horizontalLength + base.distanceTo(top);
      verticalStarts.push(horizontalLength / totalLength);
    });

    const particleCount = 12;
    const particleMaterial = new THREE.MeshBasicMaterial({
      color: 0xd8eaff,
      transparent: true,
      opacity: 0.94,
      blending: THREE.AdditiveBlending,
      depthTest: true,
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
      depthTest: true,
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
      edgeStrips,
      tsvs,
      viaRings,
      connectors,
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
    const layerIdleColors = Array.from({ length: layerCount }, () => new THREE.Color());
    const layerBoostColors = Array.from({ length: layerCount }, () => new THREE.Color());
    const layerIdleEmissives = Array.from({ length: layerCount }, () => new THREE.Color());
    const layerBoostEmissives = Array.from({ length: layerCount }, () => new THREE.Color());
    const topPassivationIdleColor = new THREE.Color();
    const topPassivationBoostColor = new THREE.Color();
    const topPassivationIdleEmissive = new THREE.Color();
    const topPassivationBoostEmissive = new THREE.Color();
    const topFeatureIdleColors = surfaceFeatures.map(() => new THREE.Color());
    const topFeatureBoostColors = surfaceFeatures.map(() => new THREE.Color());

    function applyHBMTheme(light) {
      themeLight = light;
      renderer.toneMappingExposure = light ? 1.06 : 1.18;
      ambient.color.set(light ? 0xffffff : 0xd8e8ff);
      ambient.groundColor.set(light ? 0xb8c8dc : 0x030710);
      ambient.intensity = light ? 2.45 : 2.15;
      keyLight.color.set(light ? 0xffffff : 0xf4f8ff);
      keyLight.intensity = light ? 4.2 : 4.6;
      rimLight.color.set(light ? 0x1769d2 : 0x4389ff);

      substrateMaterial.color.set(light ? 0x173451 : 0x09111d);
      interposerMaterial.color.set(light ? 0x1c5590 : 0x0d3159);
      baseMaterial.color.set(light ? 0x1f64ad : 0x123d6c);
      const layerPalette = light ? lightLayerPalette : darkLayerPalette;
      const emissivePalette = light ? lightLayerEmissivePalette : darkLayerEmissivePalette;
      const boostPalette = light ? lightLayerBoostPalette : darkLayerBoostPalette;
      layerMaterials.forEach((material, index) => {
        const paletteIndex = index % layerPalette.length;
        layerIdleColors[index].setHex(layerPalette[paletteIndex]);
        layerBoostColors[index].setHex(boostPalette[paletteIndex]);
        layerIdleEmissives[index].setHex(emissivePalette[paletteIndex]);
        layerBoostEmissives[index].copy(layerIdleEmissives[index]).lerp(layerBoostColors[index], 0.42);
        material.color.copy(layerIdleColors[index]);
        material.emissive.copy(layerIdleEmissives[index]);
      });
      topPassivationIdleColor.set(light ? 0x215e78 : 0x123b59);
      topPassivationBoostColor.copy(topPassivationIdleColor).lerp(
        tempColor.setHex(light ? 0x317da0 : 0x235982),
        0.36,
      );
      topPassivationIdleEmissive.set(light ? 0x071c25 : 0x031520);
      topPassivationBoostEmissive.copy(topPassivationIdleEmissive).lerp(topPassivationBoostColor, 0.28);
      topPassivationMaterial.color.copy(topPassivationIdleColor);
      topPassivationMaterial.emissive.copy(topPassivationIdleEmissive);
      topPassivationMaterial.sheenColor.set(light ? 0x477aa1 : 0x5257a8);
      topPassivationMaterial.iridescence = light ? 0.22 : 0.3;
      const topFeaturePalettes = light ? lightTopFeaturePalettes : darkTopFeaturePalettes;
      surfaceFeatures.forEach((feature, index) => {
        const palette = topFeaturePalettes[feature.kind];
        topFeatureIdleColors[index].setHex(palette[feature.tone % palette.length]);
        topFeatureBoostColors[index].copy(topFeatureIdleColors[index]).lerp(
          tempColor.setHex(light ? 0x4386a2 : 0x376a91),
          0.16,
        );
        topFeatureMesh.setColorAt(index, topFeatureIdleColors[index]);
      });
      topFeatureMesh.instanceColor.needsUpdate = true;
      topGridMaterial.color.set(light ? 0x315f75 : 0x83b7cc);
      topGridMaterial.emissive.set(light ? 0x02090c : 0x071821);
      topRdlMaterial.color.set(light ? 0x2a6476 : 0xa7cfda);
      topRdlMaterial.emissive.set(light ? 0x02090c : 0x091d25);
      edgeIdle.set(light ? 0x356ca6 : 0x6a93bd);
      edgeActive.set(light ? 0x8abcf2 : 0xc7e2ff);
      tsvMaterial.color.set(light ? 0x9a641d : 0xd09a43);
      tsvMaterial.emissive.set(light ? 0x1d0d01 : 0x2a1604);
      viaRingMaterial.color.set(light ? 0xa96e20 : 0xe2b45a);
      viaRingMaterial.emissive.set(light ? 0x160a01 : 0x2a1604);
      connectorMaterial.color.set(light ? 0x7f5017 : 0xb97828);
      connectorMaterial.emissive.set(light ? 0x120801 : 0x241204);
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
        for (let segmentIndex = 0; segmentIndex < frontEdgeSegments.length; segmentIndex += 1) {
          edgeStrips.setColorAt(index * frontEdgeSegments.length + segmentIndex, tempColor);
        }
        layerMaterials[index].color.copy(layerIdleColors[index]).lerp(layerBoostColors[index], boostAmount);
        layerMaterials[index].emissive.copy(layerIdleEmissives[index]).lerp(layerBoostEmissives[index], boostAmount);
        layerMaterials[index].emissiveIntensity = (themeLight ? 0.02 : 0.035)
          + activity * 0.18
          + boostAmount * 0.22;
      }
      edgeStrips.instanceColor.needsUpdate = true;

      topPassivationMaterial.color.copy(topPassivationIdleColor).lerp(topPassivationBoostColor, boostAmount);
      topPassivationMaterial.emissive.copy(topPassivationIdleEmissive).lerp(topPassivationBoostEmissive, boostAmount);
      topPassivationMaterial.emissiveIntensity = (themeLight ? 0.025 : 0.045) + boostAmount * 0.055;
      topPassivationMaterial.iridescence = (themeLight ? 0.22 : 0.3) + boostAmount * 0.07;
      surfaceFeatures.forEach((_, index) => {
        topFeatureMesh.setColorAt(
          index,
          tempColor.copy(topFeatureIdleColors[index]).lerp(topFeatureBoostColors[index], boostAmount),
        );
      });
      topFeatureMesh.instanceColor.needsUpdate = true;
      topFeatureMaterial.opacity = (themeLight ? 0.74 : 0.82) + boostAmount * 0.1;

      tsvMaterial.emissiveIntensity = (themeLight ? 0.015 : 0.055) + inspectAmount * 0.04 + boostAmount * 0.08;
      viaRingMaterial.emissiveIntensity = (themeLight ? 0.01 : 0.045) + boostAmount * 0.07;
      connectorMaterial.emissiveIntensity = (themeLight ? 0.005 : 0.035) + boostAmount * 0.04;
      particleMaterial.opacity = (themeLight ? 0.95 : 0.9) + boostAmount * 0.05;
      particleHaloMaterial.opacity = (themeLight ? 0.28 : 0.2) + boostAmount * 0.5;
      rimLight.intensity = (themeLight ? 23 : 31) + inspectAmount * 6 + boostAmount * 9;

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
      const shortMobile = mobile && window.innerWidth <= 780 && window.innerHeight <= 720;
      touchNavigation = window.innerWidth <= 780 || touchNavigationPreference.matches;
      surface.dataset.touchNavigation = String(touchNavigation);
      stackRoot.position.y = mobile ? (shortMobile ? -1 : 0) : -0.5;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobile ? 1.05 : finePointer ? 1.3 : 1.15));
      renderer.setSize(bounds.width, bounds.height, false);

      const aspect = bounds.width / bounds.height;
      // Fit the complete rotational envelope, not only the initial angle.
      // This keeps every edge inside the transparent canvas on narrow phones
      // and during full desktop drag rotation.
      const viewHeight = mobile
        ? shortMobile
          ? Math.max(5.9, 7.25 / (aspect * 0.94))
          : Math.max(7.25, 7.5 / (aspect * 0.94))
        : Math.max(8.55, 8.55 / (aspect * 0.94));
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
    console.warn("SF Memo HBM stack fallback enabled.", error);
  }
}
