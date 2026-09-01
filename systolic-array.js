import * as THREE from "./vendor/three.module.js";

const surface = document.querySelector(".approach-systolic");
const canvas = document.querySelector("#systolic-canvas");
const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
const coarsePointer = window.matchMedia("(hover: none) and (pointer: coarse)");
const mobileViewport = window.matchMedia("(max-width: 780px)");

const INITIAL_PITCH = 0;
const INITIAL_YAW = 0;
const SCROLL_END_PITCH = -Math.PI / 3;
const SCROLL_END_YAW = Math.PI / 6;
const MIN_PITCH = -Math.PI / 2 + 0.08;
const MAX_PITCH = Math.PI / 2 - 0.08;
const CAMERA_DIRECTION = new THREE.Vector3(0, 1, 0);

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
    const camera = new THREE.PerspectiveCamera(39, 1, 0.1, 80);
    camera.up.set(0, 0, -1);

    const rotationRoot = new THREE.Group();
    const model = new THREE.Group();
    rotationRoot.add(model);
    scene.add(rotationRoot);

    const clamp = (value, minimum = 0, maximum = 1) => Math.min(maximum, Math.max(minimum, value));
    const smoothstep = (value) => {
      const amount = clamp(value);
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

    function addBox(group, geometry, material, x, y, z) {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, y, z);
      group.add(mesh);
      return mesh;
    }

    const hemisphere = new THREE.HemisphereLight(0xdcecff, 0x02050b, 2.2);
    scene.add(hemisphere);
    const keyLight = new THREE.DirectionalLight(0xf4f8ff, 4.5);
    keyLight.position.set(-6, 9, 8);
    scene.add(keyLight);
    const rimLight = new THREE.PointLight(0x3f86ff, 30, 24, 2);
    rimLight.position.set(6.5, 3.5, 5.5);
    scene.add(rimLight);
    const fillLight = new THREE.PointLight(0x5d57b8, 13, 18, 2);
    fillLight.position.set(-5.5, 2.5, -5.5);
    scene.add(fillLight);

    const substrateMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x07101d,
      metalness: 0.58,
      roughness: 0.42,
      clearcoat: 0.28,
      clearcoatRoughness: 0.35,
      emissive: 0x020710,
      emissiveIntensity: 0.08,
    });
    const interposerMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x092744,
      metalness: 0.52,
      roughness: 0.34,
      clearcoat: 0.44,
      clearcoatRoughness: 0.27,
      emissive: 0x03101f,
      emissiveIntensity: 0.1,
    });
    const logicMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x0c3154,
      metalness: 0.38,
      roughness: 0.3,
      clearcoat: 0.54,
      clearcoatRoughness: 0.22,
      emissive: 0x031322,
      emissiveIntensity: 0.09,
    });
    const logicEdgeMaterial = new THREE.LineBasicMaterial({
      color: 0x5d9ee0,
      transparent: true,
      opacity: 0.45,
    });
    const traceMaterial = new THREE.MeshBasicMaterial({
      color: 0x4a94d8,
      transparent: true,
      opacity: 0.26,
      toneMapped: false,
    });

    const substrate = new THREE.Mesh(createSlab(9.4, 9.4, 0.24, 0.28), substrateMaterial);
    substrate.position.y = -0.27;
    model.add(substrate);
    const interposer = new THREE.Mesh(createSlab(9.05, 9.05, 0.12, 0.25), interposerMaterial);
    interposer.position.y = -0.08;
    model.add(interposer);

    const interposerEdges = new THREE.LineSegments(
      new THREE.EdgesGeometry(createSlab(9.06, 9.06, 0.125, 0.25), 21),
      logicEdgeMaterial,
    );
    interposerEdges.position.y = -0.078;
    model.add(interposerEdges);

    const logicDie = new THREE.Mesh(createSlab(5.35, 5.35, 0.2, 0.18), logicMaterial);
    logicDie.position.y = 0.08;
    model.add(logicDie);
    const logicEdges = new THREE.LineSegments(
      new THREE.EdgesGeometry(createSlab(5.36, 5.36, 0.205, 0.18), 21),
      logicEdgeMaterial,
    );
    logicEdges.position.y = 0.082;
    model.add(logicEdges);

    const traceGeometryHorizontal = new THREE.BoxGeometry(1.16, 0.012, 0.025);
    const traceGeometryVertical = new THREE.BoxGeometry(0.025, 0.012, 1.16);
    const traceLanes = [-1.78, -0.6, 0.6, 1.78];
    traceLanes.forEach((lane) => {
      addBox(model, traceGeometryHorizontal, traceMaterial, -3.24, 0.025, lane);
      addBox(model, traceGeometryHorizontal, traceMaterial, 3.24, 0.025, lane);
      addBox(model, traceGeometryVertical, traceMaterial, lane, 0.026, -3.24);
      addBox(model, traceGeometryVertical, traceMaterial, lane, 0.026, 3.24);
    });

    const hbmBaseMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x0a2440,
      metalness: 0.55,
      roughness: 0.34,
      clearcoat: 0.42,
      clearcoatRoughness: 0.28,
      emissive: 0x020b15,
      emissiveIntensity: 0.1,
    });
    const hbmInterposerMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x0c3b67,
      metalness: 0.46,
      roughness: 0.3,
      clearcoat: 0.48,
      clearcoatRoughness: 0.23,
      emissive: 0x03172a,
      emissiveIntensity: 0.12,
    });
    const hbmLayerMaterials = [0x12385f, 0x16446f, 0x194c7a, 0x1d5586].map((color, index) => (
      new THREE.MeshPhysicalMaterial({
        color,
        metalness: 0.2,
        roughness: 0.33 + index * 0.018,
        clearcoat: 0.42,
        clearcoatRoughness: 0.27,
        emissive: 0x041426,
        emissiveIntensity: 0.09,
      })
    ));
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
      emissive: 0x031522,
      emissiveIntensity: 0.045,
    });
    const createHbmFeatureMaterial = (color) => new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.82,
      toneMapped: false,
    });
    const hbmBankMaterials = [0x2a95a0, 0x5368b4].map(createHbmFeatureMaterial);
    const hbmPhyMaterials = [0x6b55a3, 0x855b92].map(createHbmFeatureMaterial);
    const hbmGridMaterial = new THREE.MeshStandardMaterial({
      color: 0x83b7cc,
      metalness: 0.64,
      roughness: 0.34,
      emissive: 0x071821,
      emissiveIntensity: 0.04,
    });
    const hbmRdlMaterial = new THREE.MeshStandardMaterial({
      color: 0xa7cfda,
      metalness: 0.72,
      roughness: 0.29,
      emissive: 0x091d25,
      emissiveIntensity: 0.045,
    });
    const hbmViaMaterial = new THREE.MeshStandardMaterial({
      color: 0xd09a43,
      metalness: 0.82,
      roughness: 0.27,
      emissive: 0x2a1604,
      emissiveIntensity: 0.045,
    });
    const hbmViaRingMaterial = new THREE.MeshStandardMaterial({
      color: 0xe2b45a,
      metalness: 0.8,
      roughness: 0.24,
      emissive: 0x2a1604,
      emissiveIntensity: 0.035,
    });
    const hbmTopIdleColors = {
      dark: new THREE.Color(0x123b59),
      light: new THREE.Color(0x215e78),
    };
    const hbmTopBoostTargets = {
      dark: new THREE.Color(0x235982),
      light: new THREE.Color(0x317da0),
    };
    const hbmTopIdleEmissives = {
      dark: new THREE.Color(0x031520),
      light: new THREE.Color(0x071c25),
    };
    const hbmFeatureIdlePalettes = {
      dark: {
        bank: [new THREE.Color(0x2a95a0), new THREE.Color(0x5368b4)],
        phy: [new THREE.Color(0x6b55a3), new THREE.Color(0x855b92)],
      },
      light: {
        bank: [new THREE.Color(0x217986), new THREE.Color(0x465b94)],
        phy: [new THREE.Color(0x5d4d86), new THREE.Color(0x76546f)],
      },
    };
    const hbmFeatureBoostTargets = {
      dark: new THREE.Color(0x376a91),
      light: new THREE.Color(0x4386a2),
    };
    const hbmBoostScratch = new THREE.Color();

    const hbmLayerGeometry = createSlab(4.3, 1.18, 0.065, 0.08);
    const hbmFeatureGeometry = new THREE.BoxGeometry(1, 0.006, 1);
    const hbmTraceGeometry = new THREE.BoxGeometry(1, 0.004, 1);
    const viaGeometry = new THREE.CylinderGeometry(0.05, 0.05, 1.02, 16);
    const viaRingGeometry = new THREE.TorusGeometry(0.07, 0.014, 8, 20);
    viaRingGeometry.rotateX(Math.PI / 2);
    const hbmInstanceHelper = new THREE.Object3D();

    function setHbmInstance(mesh, index, x, y, z, scaleY = 1) {
      hbmInstanceHelper.position.set(x, y, z);
      hbmInstanceHelper.rotation.set(0, 0, 0);
      hbmInstanceHelper.scale.set(1, scaleY, 1);
      hbmInstanceHelper.updateMatrix();
      mesh.setMatrixAt(index, hbmInstanceHelper.matrix);
    }

    function createHbmStack() {
      const stack = new THREE.Group();
      const base = new THREE.Mesh(createSlab(4.55, 1.42, 0.13, 0.1), hbmBaseMaterial);
      base.position.y = 0.03;
      stack.add(base);
      const localInterposer = new THREE.Mesh(createSlab(4.42, 1.32, 0.07, 0.09), hbmInterposerMaterial);
      localInterposer.position.y = 0.13;
      stack.add(localInterposer);

      const layerCount = 8;
      const layerHeight = 0.065;
      const firstLayerY = 0.25;
      const layerPitch = 0.125;
      hbmLayerMaterials.forEach((material, materialIndex) => {
        const layerIndices = [materialIndex, materialIndex + hbmLayerMaterials.length]
          .filter((layer) => layer < layerCount);
        const layers = new THREE.InstancedMesh(hbmLayerGeometry, material, layerIndices.length);
        layerIndices.forEach((layer, instanceIndex) => {
          setHbmInstance(layers, instanceIndex, 0, firstLayerY + layer * layerPitch, 0);
        });
        layers.instanceMatrix.needsUpdate = true;
        layers.frustumCulled = false;
        stack.add(layers);
      });

      const topWidth = 4.16;
      const topDepth = 1.06;
      const topScaleX = topWidth / 4.76;
      const topScaleZ = topDepth / 2.32;
      const topDieSurfaceY = firstLayerY + (layerCount - 1) * layerPitch + layerHeight / 2;
      const topPassivationHeight = 0.01;
      const passivation = new THREE.Mesh(
        createSlab(topWidth, topDepth, topPassivationHeight, 0.075),
        hbmTopMaterial,
      );
      passivation.position.y = topDieSurfaceY + topPassivationHeight / 2 + 0.001;
      stack.add(passivation);

      const memoryBanks = [];
      [-0.48, 0.3].forEach((z, row) => {
        [-1.03, 1.03].forEach((x, column) => {
          memoryBanks.push({
            x: x * topScaleX,
            z: z * topScaleZ,
            width: 1.92 * topScaleX,
            depth: 0.7 * topScaleZ,
            tone: (row + column) % 2,
          });
        });
      });

      const viaXs = [1.04, 1.31, 1.58, 1.85].map((x) => x * topScaleX);
      const viaZ = 1.14 * topScaleZ;
      const peripheralBlocks = viaXs.map((x, index) => ({
        x,
        z: 0.82 * topScaleZ,
        width: 0.18 * topScaleX,
        depth: 0.16 * topScaleZ,
        tone: index % 2,
      }));
      const surfaceFeatures = [
        ...memoryBanks.map((feature) => ({ ...feature, kind: "bank" })),
        ...peripheralBlocks.map((feature) => ({ ...feature, kind: "phy" })),
      ];
      const featureY = topDieSurfaceY + topPassivationHeight + 0.005;
      surfaceFeatures.forEach((feature) => {
        const materials = feature.kind === "bank" ? hbmBankMaterials : hbmPhyMaterials;
        const mesh = new THREE.Mesh(hbmFeatureGeometry, materials[feature.tone]);
        mesh.position.set(feature.x, featureY, feature.z);
        mesh.scale.set(
          feature.width - 0.045 * topScaleX,
          1,
          feature.depth - 0.045 * topScaleZ,
        );
        stack.add(mesh);
      });

      const topTraceY = topDieSurfaceY + topPassivationHeight + 0.009;
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

      addTraceRectangle(addGridTrace, {
        x: 0,
        z: 0,
        width: 4.36 * topScaleX,
        depth: 2.04 * topScaleZ,
      });
      addTraceRectangle(addGridTrace, {
        x: 0,
        z: 0,
        width: 4.18 * topScaleX,
        depth: 1.88 * topScaleZ,
      });
      memoryBanks.forEach((bank) => {
        addTraceRectangle(addGridTrace, bank);
        [-0.25, 0, 0.25].forEach((offset) => {
          addGridTrace(
            bank.x + bank.width * offset,
            bank.z - bank.depth / 2,
            bank.x + bank.width * offset,
            bank.z + bank.depth / 2,
          );
          addGridTrace(
            bank.x - bank.width / 2,
            bank.z + bank.depth * offset,
            bank.x + bank.width / 2,
            bank.z + bank.depth * offset,
          );
        });
      });
      peripheralBlocks.forEach((block, index) => {
        addTraceRectangle(addGridTrace, block);
        addGridTrace(
          block.x - block.width / 6,
          block.z - block.depth / 2,
          block.x - block.width / 6,
          block.z + block.depth / 2,
        );
        addGridTrace(
          block.x + block.width / 6,
          block.z - block.depth / 2,
          block.x + block.width / 6,
          block.z + block.depth / 2,
        );
        addRdlTrace(block.x, block.z + block.depth / 2, viaXs[index], viaZ);
      });

      const createTopTraceMesh = (segments, material, width) => {
        const mesh = new THREE.InstancedMesh(
          hbmTraceGeometry,
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
          hbmInstanceHelper.position.set((x1 + x2) / 2, y1, (z1 + z2) / 2);
          hbmInstanceHelper.rotation.set(0, -Math.atan2(dz, dx), 0);
          hbmInstanceHelper.scale.set(Math.hypot(dx, dz), 1, width);
          hbmInstanceHelper.updateMatrix();
          mesh.setMatrixAt(index / 6, hbmInstanceHelper.matrix);
        }
        mesh.instanceMatrix.needsUpdate = true;
        mesh.frustumCulled = false;
        return mesh;
      };
      stack.add(
        createTopTraceMesh(topGridSegments, hbmGridMaterial, 0.012),
        createTopTraceMesh(topRdlSegments, hbmRdlMaterial, 0.022),
      );

      const viaBottom = 0.14;
      const viaTop = topDieSurfaceY + topPassivationHeight + 0.011;
      const viaHeight = viaTop - viaBottom;
      const vias = new THREE.InstancedMesh(viaGeometry, hbmViaMaterial, viaXs.length);
      const viaRings = new THREE.InstancedMesh(viaRingGeometry, hbmViaRingMaterial, viaXs.length * layerCount);
      let ringIndex = 0;
      viaXs.forEach((x, viaIndex) => {
        setHbmInstance(vias, viaIndex, x, viaBottom + viaHeight / 2, viaZ, viaHeight / 1.02);
        for (let layer = 0; layer < layerCount; layer += 1) {
          setHbmInstance(
            viaRings,
            ringIndex,
            x,
            firstLayerY + layer * layerPitch + layerHeight / 2
              + (layer === layerCount - 1 ? topPassivationHeight + 0.011 : 0.004),
            viaZ,
          );
          ringIndex += 1;
        }
      });
      vias.instanceMatrix.needsUpdate = true;
      viaRings.instanceMatrix.needsUpdate = true;
      vias.frustumCulled = false;
      viaRings.frustumCulled = false;
      stack.add(vias, viaRings);
      return stack;
    }

    const hbmPrototype = createHbmStack();
    const hbmLocations = [
      { x: 0, z: 3.55, rotation: 0 },
      { x: 0, z: -3.55, rotation: Math.PI },
      { x: 3.55, z: 0, rotation: Math.PI / 2 },
      { x: -3.55, z: 0, rotation: -Math.PI / 2 },
    ];
    hbmLocations.forEach(({ x, z, rotation }, index) => {
      const stack = index === 0 ? hbmPrototype : hbmPrototype.clone(true);
      stack.position.set(x, 0, z);
      stack.rotation.y = rotation;
      model.add(stack);
    });

    const gridSize = 8;
    const gridPitch = 0.57;
    const gridFirst = -((gridSize - 1) * gridPitch) / 2;
    const peCount = gridSize * gridSize;
    const helper = new THREE.Object3D();
    const peBaseMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x09233d,
      metalness: 0.34,
      roughness: 0.34,
      clearcoat: 0.38,
      emissive: 0x020b14,
      emissiveIntensity: 0.08,
    });
    const peCoreMaterial = new THREE.MeshBasicMaterial({
      color: 0x1c405c,
      toneMapped: false,
    });
    const peHorizontalMaterial = new THREE.MeshBasicMaterial({
      color: 0x32b5ff,
      toneMapped: false,
    });
    const peVerticalMaterial = new THREE.MeshBasicMaterial({
      color: 0xff4c68,
      toneMapped: false,
    });
    const peIntersectionMaterial = new THREE.MeshBasicMaterial({
      color: 0xc77dff,
      toneMapped: false,
    });
    const peBases = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.43, 0.16, 0.43),
      peBaseMaterial,
      peCount,
    );
    const peCores = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.27, 0.09, 0.27),
      peCoreMaterial,
      peCount,
    );
    const peFaceGeometry = new THREE.BoxGeometry(0.265, 0.028, 0.265);
    const peHorizontalFaces = new THREE.InstancedMesh(
      peFaceGeometry,
      peHorizontalMaterial,
      peCount,
    );
    const peVerticalFaces = new THREE.InstancedMesh(
      peFaceGeometry,
      peVerticalMaterial,
      peCount,
    );
    const peIntersectionFaces = new THREE.InstancedMesh(
      peFaceGeometry,
      peIntersectionMaterial,
      peCount,
    );
    peCores.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    peHorizontalFaces.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    peVerticalFaces.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    peIntersectionFaces.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    peBases.frustumCulled = false;
    peCores.frustumCulled = false;
    peHorizontalFaces.frustumCulled = false;
    peVerticalFaces.frustumCulled = false;
    peIntersectionFaces.frustumCulled = false;
    const pePositions = [];
    const peOffDark = new THREE.Color(0x1c405c);
    const peOffLight = new THREE.Color(0x356b86);
    const peBlackout = new THREE.Color(0x000000);
    const peHorizontalBoost = new THREE.Color(0xb9ebff);
    const peVerticalBoost = new THREE.Color(0xffc4cf);
    const peIntersectionBoost = new THREE.Color(0xf1d7ff);

    for (let row = 0; row < gridSize; row += 1) {
      for (let column = 0; column < gridSize; column += 1) {
        const index = row * gridSize + column;
        const x = gridFirst + column * gridPitch;
        const z = gridFirst + row * gridPitch;
        pePositions.push({ row, column, x, z });
        helper.position.set(x, 0.29, z);
        helper.rotation.set(0, 0, 0);
        helper.scale.set(1, 1, 1);
        helper.updateMatrix();
        peBases.setMatrixAt(index, helper.matrix);
        helper.position.y = 0.415;
        helper.updateMatrix();
        peCores.setMatrixAt(index, helper.matrix);
        helper.position.y = -3;
        helper.scale.setScalar(0.001);
        helper.updateMatrix();
        peHorizontalFaces.setMatrixAt(index, helper.matrix);
        peVerticalFaces.setMatrixAt(index, helper.matrix);
        peIntersectionFaces.setMatrixAt(index, helper.matrix);
      }
    }
    peBases.instanceMatrix.needsUpdate = true;
    peCores.instanceMatrix.needsUpdate = true;
    peHorizontalFaces.instanceMatrix.needsUpdate = true;
    peVerticalFaces.instanceMatrix.needsUpdate = true;
    peIntersectionFaces.instanceMatrix.needsUpdate = true;
    model.add(peBases, peCores, peHorizontalFaces, peVerticalFaces, peIntersectionFaces);

    const rowTokenMaterial = new THREE.MeshBasicMaterial({
      color: 0x3aaeff,
      transparent: true,
      opacity: 0.78,
      toneMapped: false,
    });
    const columnTokenMaterial = new THREE.MeshBasicMaterial({
      color: 0xff536a,
      transparent: true,
      opacity: 0.74,
      toneMapped: false,
    });
    const tokenTailLength = 1;
    const rowTokens = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.36, 0.04, 0.1),
      rowTokenMaterial,
      gridSize * tokenTailLength,
    );
    const columnTokens = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.1, 0.045, 0.36),
      columnTokenMaterial,
      gridSize * tokenTailLength,
    );
    rowTokens.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    columnTokens.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    rowTokens.visible = false;
    columnTokens.visible = false;
    model.add(rowTokens, columnTokens);

    const modelBounds = new THREE.Box3().setFromObject(model);
    const modelCenter = modelBounds.getCenter(new THREE.Vector3());
    model.position.sub(modelCenter);
    model.updateMatrixWorld(true);
    const modelSphere = new THREE.Box3().setFromObject(model).getBoundingSphere(new THREE.Sphere());

    const rotationCurrent = new THREE.Vector2(INITIAL_PITCH, INITIAL_YAW);
    const rotationTarget = new THREE.Vector2(INITIAL_PITCH, INITIAL_YAW);
    const scrollRotation = new THREE.Vector2(INITIAL_PITCH, INITIAL_YAW);
    const manualRotation = new THREE.Vector2();
    const activePointers = new Map();
    const passiveTapPointers = new Map();
    let dragging = false;
    let visible = true;
    let reducedMotion = motionPreference.matches;
    let lightTheme = document.documentElement.dataset.theme === "light";
    let animationFrame = 0;
    let previousTime = performance.now();
    let simulationTime = 0;
    let boost = 0;
    let lastClockStep = -1;
    let lastBoostBucket = -1;
    let scrollRotationFrame = 0;
    let lastTap = null;
    const stepDuration = 0.46;
    surface.dataset.dragging = "false";

    function applyTheme() {
      lightTheme = document.documentElement.dataset.theme === "light";
      renderer.toneMappingExposure = lightTheme ? 1.02 : 1.2;
      hemisphere.color.setHex(lightTheme ? 0xffffff : 0xdcecff);
      hemisphere.groundColor.setHex(lightTheme ? 0xb6c6d8 : 0x02050b);
      hemisphere.intensity = lightTheme ? 2.45 : 2.2;
      keyLight.intensity = lightTheme ? 4 : 4.5;
      rimLight.color.setHex(lightTheme ? 0x2169bd : 0x3f86ff);
      fillLight.color.setHex(lightTheme ? 0x6a65a8 : 0x5d57b8);
      substrateMaterial.color.setHex(lightTheme ? 0x18344f : 0x07101d);
      substrateMaterial.emissive.setHex(lightTheme ? 0x071522 : 0x020710);
      interposerMaterial.color.setHex(lightTheme ? 0x245e8f : 0x092744);
      logicMaterial.color.setHex(lightTheme ? 0x24658e : 0x0c3154);
      logicEdgeMaterial.color.setHex(lightTheme ? 0x1559c5 : 0x5d9ee0);
      traceMaterial.color.setHex(lightTheme ? 0x1769b3 : 0x4a94d8);
      traceMaterial.opacity = lightTheme ? 0.42 : 0.26;
      hbmBaseMaterial.color.setHex(lightTheme ? 0x225c87 : 0x0a2440);
      hbmInterposerMaterial.color.setHex(lightTheme ? 0x2d72a0 : 0x0c3b67);
      const lightLayers = [0x2b6794, 0x30719f, 0x357baa, 0x3a85b5];
      const darkLayers = [0x12385f, 0x16446f, 0x194c7a, 0x1d5586];
      hbmLayerMaterials.forEach((material, index) => {
        material.color.setHex((lightTheme ? lightLayers : darkLayers)[index]);
        material.emissive.setHex(lightTheme ? 0x0a2c4c : 0x041426);
      });
      const hbmTheme = lightTheme ? "light" : "dark";
      hbmTopMaterial.color.copy(hbmTopIdleColors[hbmTheme]);
      hbmTopMaterial.emissive.copy(hbmTopIdleEmissives[hbmTheme]);
      hbmTopMaterial.sheenColor.setHex(lightTheme ? 0x477aa1 : 0x5257a8);
      hbmTopMaterial.iridescence = lightTheme ? 0.22 : 0.3;
      hbmBankMaterials.forEach((material, index) => {
        material.color.copy(hbmFeatureIdlePalettes[hbmTheme].bank[index]);
        material.opacity = lightTheme ? 0.74 : 0.82;
      });
      hbmPhyMaterials.forEach((material, index) => {
        material.color.copy(hbmFeatureIdlePalettes[hbmTheme].phy[index]);
        material.opacity = lightTheme ? 0.74 : 0.82;
      });
      hbmGridMaterial.color.setHex(lightTheme ? 0x315f75 : 0x83b7cc);
      hbmGridMaterial.emissive.setHex(lightTheme ? 0x02090c : 0x071821);
      hbmRdlMaterial.color.setHex(lightTheme ? 0x2a6476 : 0xa7cfda);
      hbmRdlMaterial.emissive.setHex(lightTheme ? 0x02090c : 0x091d25);
      hbmViaMaterial.color.setHex(lightTheme ? 0x9a641d : 0xd09a43);
      hbmViaMaterial.emissive.setHex(lightTheme ? 0x1d0d01 : 0x2a1604);
      hbmViaRingMaterial.color.setHex(lightTheme ? 0xa96e20 : 0xe2b45a);
      hbmViaRingMaterial.emissive.setHex(lightTheme ? 0x160a01 : 0x2a1604);
      peBaseMaterial.color.setHex(lightTheme ? 0x437b9b : 0x17496d);
      peBaseMaterial.emissive.setHex(lightTheme ? 0x0c3148 : 0x08253b);
      peBaseMaterial.emissiveIntensity = lightTheme ? 0.2 : 0.24;
      peCoreMaterial.color.setHex(lightTheme ? 0x356b86 : 0x1c405c);
      peHorizontalMaterial.color.setHex(lightTheme ? 0x087fd3 : 0x32b5ff);
      peVerticalMaterial.color.setHex(lightTheme ? 0xd82745 : 0xff4c68);
      peIntersectionMaterial.color.setHex(lightTheme ? 0x783ccc : 0xc77dff);
      rowTokenMaterial.color.setHex(lightTheme ? 0x006ac7 : 0x3aaeff);
      columnTokenMaterial.color.setHex(lightTheme ? 0xc91836 : 0xff536a);
      lastClockStep = -1;
      lastBoostBucket = -1;
      requestRender();
    }

    function updateClockState(step, boostAmount) {
      const fillSteps = gridSize;
      const drainSteps = gridSize - 1;
      const blackoutStep = fillSteps + drainSteps;
      const cycleStep = step % (blackoutStep + 1);
      const filling = cycleStep < fillSteps;
      const draining = cycleStep >= fillSteps && cycleStep < blackoutStep;
      const blackout = cycleStep === blackoutStep;
      const waveStep = filling ? cycleStep : cycleStep - fillSteps;
      peCoreMaterial.color.copy(blackout ? peBlackout : lightTheme ? peOffLight : peOffDark);
      surface.dataset.clockStep = String(cycleStep);
      surface.dataset.clockPhase = filling ? "fill" : draining ? "drain" : "blackout";

      pePositions.forEach(({ row, column, x, z }, index) => {
        const horizontalActive = !blackout && (filling ? row <= waveStep : row > waveStep);
        const verticalActive = !blackout && (filling ? column <= waveStep : column > waveStep);
        const intersection = horizontalActive && verticalActive;
        const active = horizontalActive || verticalActive;
        const coreScale = intersection
          ? 1.16 + boostAmount * 0.08
          : active
            ? 1.07
            : 1;
        helper.position.set(x, 0.415 + (coreScale - 1) * 0.025, z);
        helper.rotation.set(0, 0, 0);
        helper.scale.set(coreScale, 1, coreScale);
        helper.updateMatrix();
        peCores.setMatrixAt(index, helper.matrix);

        const setFaceState = (mesh, show, scale = 1) => {
          if (show) {
            helper.position.set(x, 0.481, z);
            helper.scale.setScalar(scale);
          } else {
            helper.position.set(0, -3, 0);
            helper.scale.setScalar(0.001);
          }
          helper.updateMatrix();
          mesh.setMatrixAt(index, helper.matrix);
        };
        setFaceState(peHorizontalFaces, horizontalActive && !verticalActive);
        setFaceState(peVerticalFaces, verticalActive && !horizontalActive);
        setFaceState(peIntersectionFaces, intersection, 1 + boostAmount * 0.05);
      });
      peCores.instanceMatrix.needsUpdate = true;
      peHorizontalFaces.instanceMatrix.needsUpdate = true;
      peVerticalFaces.instanceMatrix.needsUpdate = true;
      peIntersectionFaces.instanceMatrix.needsUpdate = true;

      for (let lane = 0; lane < gridSize; lane += 1) {
        for (let tail = 0; tail < tokenTailLength; tail += 1) {
          const tokenIndex = lane * tokenTailLength + tail;
          helper.rotation.set(0, 0, 0);
          if (filling) {
            helper.position.set(gridFirst + lane * gridPitch, 0.56, gridFirst + waveStep * gridPitch - 0.1);
            helper.scale.set(1, 1, 1);
          } else {
            helper.position.set(0, -3, 0);
            helper.scale.setScalar(0.001);
          }
          helper.updateMatrix();
          rowTokens.setMatrixAt(tokenIndex, helper.matrix);

          if (filling) {
            helper.position.set(gridFirst + waveStep * gridPitch + 0.1, 0.57, gridFirst + lane * gridPitch);
            helper.scale.set(1, 1, 1);
          } else {
            helper.position.set(0, -3, 0);
            helper.scale.setScalar(0.001);
          }
          helper.updateMatrix();
          columnTokens.setMatrixAt(tokenIndex, helper.matrix);
        }
      }
      rowTokens.instanceMatrix.needsUpdate = true;
      columnTokens.instanceMatrix.needsUpdate = true;
    }

    const darkBaseLayers = [0x12385f, 0x16446f, 0x194c7a, 0x1d5586];
    const lightBaseLayers = [0x2b6794, 0x30719f, 0x357baa, 0x3a85b5];
    const darkBoostTarget = new THREE.Color(0x2d6fa6);
    const lightBoostTarget = new THREE.Color(0x4b91bf);

    function updateBoost(boostAmount) {
      const boostTarget = lightTheme ? lightBoostTarget : darkBoostTarget;
      const hbmTheme = lightTheme ? "light" : "dark";
      hbmLayerMaterials.forEach((material, index) => {
        material.color.setHex((lightTheme ? lightBaseLayers : darkBaseLayers)[index]).lerp(boostTarget, boostAmount * 0.38);
        material.emissiveIntensity = 0.09 + boostAmount * 0.18;
      });
      hbmBoostScratch.copy(hbmTopIdleColors[hbmTheme]).lerp(hbmTopBoostTargets[hbmTheme], 0.36);
      hbmTopMaterial.color.copy(hbmTopIdleColors[hbmTheme]).lerp(hbmBoostScratch, boostAmount);
      hbmTopMaterial.emissive.copy(hbmTopIdleEmissives[hbmTheme]).lerp(
        hbmBoostScratch,
        boostAmount * 0.28,
      );
      hbmTopMaterial.emissiveIntensity = (lightTheme ? 0.025 : 0.045) + boostAmount * 0.055;
      hbmTopMaterial.iridescence = (lightTheme ? 0.22 : 0.3) + boostAmount * 0.07;
      hbmBankMaterials.forEach((material, index) => {
        material.color.copy(hbmFeatureIdlePalettes[hbmTheme].bank[index]).lerp(
          hbmFeatureBoostTargets[hbmTheme],
          boostAmount * 0.16,
        );
        material.opacity = (lightTheme ? 0.74 : 0.82) + boostAmount * 0.1;
      });
      hbmPhyMaterials.forEach((material, index) => {
        material.color.copy(hbmFeatureIdlePalettes[hbmTheme].phy[index]).lerp(
          hbmFeatureBoostTargets[hbmTheme],
          boostAmount * 0.16,
        );
        material.opacity = (lightTheme ? 0.74 : 0.82) + boostAmount * 0.1;
      });
      hbmViaMaterial.emissiveIntensity = (lightTheme ? 0.015 : 0.055) + boostAmount * 0.08;
      hbmViaRingMaterial.emissiveIntensity = (lightTheme ? 0.01 : 0.045) + boostAmount * 0.07;
      const brighten = boostAmount * 0.22;
      peHorizontalMaterial.color.setHex(lightTheme ? 0x087fd3 : 0x32b5ff).lerp(peHorizontalBoost, brighten);
      peVerticalMaterial.color.setHex(lightTheme ? 0xd82745 : 0xff4c68).lerp(peVerticalBoost, brighten);
      peIntersectionMaterial.color.setHex(lightTheme ? 0x783ccc : 0xc77dff).lerp(peIntersectionBoost, brighten);
      rowTokenMaterial.opacity = 0.78 + boostAmount * 0.2;
      columnTokenMaterial.opacity = 0.74 + boostAmount * 0.22;
      rimLight.intensity = 30 + boostAmount * 10;
    }

    function renderFrame(time = performance.now()) {
      animationFrame = 0;
      if (!visible) return;
      const elapsed = Math.min(0.05, Math.max(0, (time - previousTime) / 1000));
      previousTime = time;
      if (!reducedMotion) {
        boost = Math.max(0, boost - elapsed * 0.66);
        simulationTime += elapsed * (1 + smoothstep(boost) * 2.8);
        rotationCurrent.lerp(rotationTarget, dragging ? 0.34 : 0.16);
        if (rotationCurrent.distanceToSquared(rotationTarget) < 0.000001) {
          rotationCurrent.copy(rotationTarget);
        }
      } else {
        rotationCurrent.copy(rotationTarget);
      }

      const boostAmount = smoothstep(boost);
      rotationRoot.rotation.x = rotationCurrent.x;
      rotationRoot.rotation.y = rotationCurrent.y;
      const clockStep = Math.floor(simulationTime / stepDuration);
      const boostBucket = Math.round(boostAmount * 4);
      if (clockStep !== lastClockStep || boostBucket !== lastBoostBucket) {
        updateClockState(clockStep, boostBucket / 4);
        lastClockStep = clockStep;
        lastBoostBucket = boostBucket;
      }
      updateBoost(boostAmount);
      renderer.render(scene, camera);
      if (!reducedMotion) animationFrame = requestAnimationFrame(renderFrame);
    }

    function requestRender() {
      if (animationFrame) return;
      previousTime = performance.now();
      animationFrame = requestAnimationFrame(renderFrame);
    }

    function fitCamera() {
      const bounds = surface.getBoundingClientRect();
      const width = Math.max(1, Math.round(bounds.width));
      const height = Math.max(1, Math.round(bounds.height));
      const aspect = width / height;
      camera.aspect = aspect;
      const reducedRenderQuality = coarsePointer.matches || mobileViewport.matches;
      camera.fov = reducedRenderQuality ? 41 : 39;
      camera.updateProjectionMatrix();
      const verticalFov = THREE.MathUtils.degToRad(camera.fov);
      const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * aspect);
      const limitingFov = Math.min(verticalFov, horizontalFov);
      const margin = reducedRenderQuality ? 1.06 : 1.03;
      const distance = modelSphere.radius / Math.sin(limitingFov / 2) * margin;
      camera.position.copy(CAMERA_DIRECTION).multiplyScalar(distance);
      camera.near = Math.max(0.1, distance - modelSphere.radius * 1.65);
      camera.far = distance + modelSphere.radius * 2.4;
      camera.lookAt(0, 0, 0);
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, reducedRenderQuality ? 1.15 : 1.5));
      renderer.setSize(width, height, false);
      updateScrollRotation();
      requestRender();
    }

    function syncRotationTarget() {
      rotationTarget.set(
        clamp(scrollRotation.x + manualRotation.x, MIN_PITCH, MAX_PITCH),
        scrollRotation.y + manualRotation.y,
      );
    }

    function recenterRotation() {
      manualRotation.set(
        INITIAL_PITCH - scrollRotation.x,
        INITIAL_YAW - scrollRotation.y,
      );
      dragging = false;
      surface.dataset.dragging = "false";
      syncRotationTarget();
      rotationCurrent.copy(rotationTarget);
      requestRender();
    }

    function handleTap(event) {
      const now = performance.now();
      const doubleTap = lastTap
        && lastTap.pointerType === event.pointerType
        && now - lastTap.time <= 320
        && Math.hypot(event.clientX - lastTap.x, event.clientY - lastTap.y) <= 30;
      boost = 1;
      if (doubleTap) {
        lastTap = null;
        if (event.cancelable) event.preventDefault();
        recenterRotation();
        return;
      }
      lastTap = {
        time: now,
        x: event.clientX,
        y: event.clientY,
        pointerType: event.pointerType,
      };
      requestRender();
    }

    function updateScrollRotation() {
      const bounds = surface.getBoundingClientRect();
      const viewportTrigger = window.innerHeight * 0.88;
      const travel = Math.max(1, viewportTrigger + bounds.height);
      const sectionProgress = clamp((viewportTrigger - bounds.top) / travel);
      const tiltProgress = reducedMotion
        ? 0
        : smoothstep(clamp((sectionProgress - 0.3) / 0.54));
      scrollRotation.set(
        INITIAL_PITCH + (SCROLL_END_PITCH - INITIAL_PITCH) * tiltProgress,
        INITIAL_YAW + (SCROLL_END_YAW - INITIAL_YAW) * tiltProgress,
      );
      syncRotationTarget();
      requestRender();
    }

    function scheduleScrollRotation() {
      if (scrollRotationFrame) return;
      scrollRotationFrame = requestAnimationFrame(() => {
        scrollRotationFrame = 0;
        updateScrollRotation();
      });
    }

    function beginPointer(event) {
      if (mobileViewport.matches || event.pointerType === "touch") {
        passiveTapPointers.set(event.pointerId, {
          startX: event.clientX,
          startY: event.clientY,
          moved: false,
        });
        return;
      }
      if (event.pointerType === "mouse" && event.button !== 0) return;
      if (activePointers.size) return;
      activePointers.set(event.pointerId, {
        startX: event.clientX,
        startY: event.clientY,
        startPitch: manualRotation.x,
        startYaw: manualRotation.y,
        moved: false,
      });
      try { canvas.setPointerCapture(event.pointerId); } catch {}
      canvas.focus({ preventScroll: true });
    }

    function movePointer(event) {
      const passiveTap = passiveTapPointers.get(event.pointerId);
      if (passiveTap) {
        if (Math.hypot(event.clientX - passiveTap.startX, event.clientY - passiveTap.startY) > 8) {
          passiveTap.moved = true;
        }
        return;
      }
      const pointer = activePointers.get(event.pointerId);
      if (!pointer) return;
      const dx = event.clientX - pointer.startX;
      const dy = event.clientY - pointer.startY;
      if (!pointer.moved && Math.hypot(dx, dy) < 4) return;
      pointer.moved = true;
      dragging = true;
      surface.dataset.dragging = "true";
      const sensitivity = 0.007;
      manualRotation.set(
        clamp(pointer.startPitch + dy * sensitivity, MIN_PITCH - scrollRotation.x, MAX_PITCH - scrollRotation.x),
        pointer.startYaw + dx * sensitivity,
      );
      syncRotationTarget();
      if (event.cancelable) event.preventDefault();
      requestRender();
    }

    function endPointer(event) {
      const passiveTap = passiveTapPointers.get(event.pointerId);
      if (passiveTap) {
        passiveTapPointers.delete(event.pointerId);
        if (!passiveTap.moved && event.type === "pointerup") {
          handleTap(event);
        } else {
          lastTap = null;
        }
        return;
      }
      const pointer = activePointers.get(event.pointerId);
      if (!pointer) return;
      activePointers.delete(event.pointerId);
      if (!pointer.moved && event.type === "pointerup") {
        handleTap(event);
      } else {
        lastTap = null;
      }
      if (canvas.hasPointerCapture(event.pointerId)) {
        try { canvas.releasePointerCapture(event.pointerId); } catch {}
      }
      dragging = [...activePointers.values()].some((item) => item.moved);
      surface.dataset.dragging = String(dragging);
    }

    canvas.addEventListener("pointerdown", beginPointer);
    canvas.addEventListener("pointermove", movePointer);
    canvas.addEventListener("pointerup", endPointer);
    canvas.addEventListener("pointercancel", endPointer);
    canvas.addEventListener("lostpointercapture", (event) => {
      activePointers.delete(event.pointerId);
      dragging = [...activePointers.values()].some((item) => item.moved);
      surface.dataset.dragging = String(dragging);
    });
    canvas.addEventListener("keydown", (event) => {
      const keyChangesRotation = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key);
      if (keyChangesRotation) {
        event.preventDefault();
        if (event.key === "ArrowLeft") manualRotation.y -= 0.16;
        if (event.key === "ArrowRight") manualRotation.y += 0.16;
        if (event.key === "ArrowUp") manualRotation.x = clamp(manualRotation.x - 0.12, MIN_PITCH - scrollRotation.x, MAX_PITCH - scrollRotation.x);
        if (event.key === "ArrowDown") manualRotation.x = clamp(manualRotation.x + 0.12, MIN_PITCH - scrollRotation.x, MAX_PITCH - scrollRotation.x);
        syncRotationTarget();
        requestRender();
      }
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        boost = 1;
        requestRender();
      }
    });

    new ResizeObserver(fitCamera).observe(surface);
    new IntersectionObserver((entries) => {
      visible = entries.some((entry) => entry.isIntersecting);
      if (visible) requestRender();
    }, { rootMargin: "160px" }).observe(surface);
    window.addEventListener("sfmemo:themechange", applyTheme);
    motionPreference.addEventListener("change", (event) => {
      reducedMotion = event.matches;
      updateScrollRotation();
      requestRender();
    });
    function updateNavigationMode() {
      activePointers.clear();
      passiveTapPointers.clear();
      lastTap = null;
      if (mobileViewport.matches) manualRotation.set(0, 0);
      dragging = false;
      surface.dataset.dragging = "false";
      fitCamera();
    }
    coarsePointer.addEventListener("change", updateNavigationMode);
    mobileViewport.addEventListener("change", updateNavigationMode);
    window.addEventListener("scroll", scheduleScrollRotation, { passive: true });
    window.addEventListener("pageshow", scheduleScrollRotation);

    canvas.tabIndex = 0;
    applyTheme();
    fitCamera();
    updateScrollRotation();
    requestRender();
  } catch (error) {
    console.error("Systolic visualization unavailable", error);
    surface.classList.add("is-unavailable");
  }
}
