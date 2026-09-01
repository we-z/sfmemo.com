import * as THREE from "./vendor/three.module.js";

const surface = document.querySelector(".approach-systolic");
const canvas = document.querySelector("#systolic-canvas");
const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
const coarsePointer = window.matchMedia("(hover: none) and (pointer: coarse)");
const mobileViewport = window.matchMedia("(max-width: 780px)");

const INITIAL_PITCH = 0;
const INITIAL_YAW = 0;
const SCROLL_END_PITCH = -Math.PI / 4;
const SCROLL_END_YAW = 0;
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
      color: 0x144b70,
      metalness: 0.2,
      roughness: 0.27,
      clearcoat: 0.58,
      clearcoatRoughness: 0.18,
      iridescence: 0.24,
      iridescenceIOR: 1.38,
      iridescenceThicknessRange: [170, 280],
      sheen: 0.12,
      sheenColor: new THREE.Color(0x5458a3),
      sheenRoughness: 0.5,
      emissive: 0x031522,
      emissiveIntensity: 0.06,
    });
    const hbmBankMaterials = [0x298f9d, 0x5868b2].map((color) => new THREE.MeshBasicMaterial({
      color,
      toneMapped: false,
    }));
    const hbmGridMaterial = new THREE.MeshBasicMaterial({
      color: 0x9bc7d5,
      transparent: true,
      opacity: 0.64,
      toneMapped: false,
    });
    const hbmSealMaterial = new THREE.MeshStandardMaterial({
      color: 0x79a2bb,
      metalness: 0.62,
      roughness: 0.32,
      emissive: 0x071722,
      emissiveIntensity: 0.04,
    });
    const hbmSealLineMaterial = new THREE.LineBasicMaterial({
      color: 0x79a2bb,
      transparent: true,
      opacity: 0.72,
    });
    const hbmViaMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xc98f3e,
      metalness: 0.84,
      roughness: 0.18,
      emissive: 0x2a1604,
      emissiveIntensity: 0.11,
    });
    const hbmViaRingMaterial = new THREE.MeshStandardMaterial({
      color: 0xe0b15a,
      metalness: 0.78,
      roughness: 0.23,
      emissive: 0x231203,
      emissiveIntensity: 0.06,
    });

    const hbmLayerGeometry = createSlab(4.3, 1.18, 0.065, 0.08);
    const hbmBankGeometry = new THREE.BoxGeometry(0.88, 0.012, 0.66);
    const hbmGridVertical = new THREE.BoxGeometry(0.012, 0.007, 0.56);
    const hbmGridHorizontal = new THREE.BoxGeometry(0.78, 0.007, 0.012);
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

      const topDieY = firstLayerY + (layerCount - 1) * layerPitch;
      const passivation = new THREE.Mesh(createSlab(4.16, 1.06, 0.024, 0.075), hbmTopMaterial);
      passivation.position.y = topDieY + 0.05;
      stack.add(passivation);

      const featureY = topDieY + 0.067;
      const bankXs = [-1.55, -0.52, 0.52, 1.55];
      hbmBankMaterials.forEach((material, tone) => {
        const toneXs = bankXs.filter((_, index) => index % 2 === tone);
        const banks = new THREE.InstancedMesh(hbmBankGeometry, material, toneXs.length);
        toneXs.forEach((x, index) => setHbmInstance(banks, index, x, featureY, -0.05));
        banks.instanceMatrix.needsUpdate = true;
        banks.frustumCulled = false;
        stack.add(banks);
      });

      const verticalGrids = new THREE.InstancedMesh(hbmGridVertical, hbmGridMaterial, bankXs.length * 3);
      const horizontalGrids = new THREE.InstancedMesh(hbmGridHorizontal, hbmGridMaterial, bankXs.length * 2);
      let verticalIndex = 0;
      let horizontalIndex = 0;
      bankXs.forEach((x) => {
        [-0.21, 0, 0.21].forEach((offset) => {
          setHbmInstance(verticalGrids, verticalIndex, x + offset, featureY + 0.01, -0.05);
          verticalIndex += 1;
        });
        [-0.18, 0.18].forEach((offset) => {
          setHbmInstance(horizontalGrids, horizontalIndex, x, featureY + 0.01, -0.05 + offset);
          horizontalIndex += 1;
        });
      });
      verticalGrids.instanceMatrix.needsUpdate = true;
      horizontalGrids.instanceMatrix.needsUpdate = true;
      verticalGrids.frustumCulled = false;
      horizontalGrids.frustumCulled = false;
      stack.add(verticalGrids, horizontalGrids);

      const sealOuter = new THREE.LineSegments(
        new THREE.EdgesGeometry(createSlab(4.18, 1.08, 0.026, 0.075), 20),
        hbmSealLineMaterial,
      );
      sealOuter.position.y = topDieY + 0.05;
      stack.add(sealOuter);

      const viaHeight = topDieY - 0.1;
      const viaXs = [-1.48, -0.5, 0.5, 1.48];
      const vias = new THREE.InstancedMesh(viaGeometry, hbmViaMaterial, viaXs.length);
      const viaRings = new THREE.InstancedMesh(viaRingGeometry, hbmViaRingMaterial, viaXs.length * layerCount);
      let ringIndex = 0;
      viaXs.forEach((x, viaIndex) => {
        setHbmInstance(vias, viaIndex, x, 0.15 + viaHeight / 2, 0.54, viaHeight / 1.02);
        for (let layer = 0; layer < layerCount; layer += 1) {
          setHbmInstance(viaRings, ringIndex, x, firstLayerY + layer * layerPitch + 0.036, 0.54);
          ringIndex += 1;
        }
      });
      vias.instanceMatrix.needsUpdate = true;
      viaRings.instanceMatrix.needsUpdate = true;
      vias.frustumCulled = false;
      viaRings.frustumCulled = false;
      stack.add(vias, viaRings);

      const rdl = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.014, 0.025), hbmSealMaterial);
      rdl.position.set(0, featureY + 0.012, 0.42);
      stack.add(rdl);
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
      color: 0xffffff,
      toneMapped: false,
      vertexColors: true,
    });
    const peLitMaterial = new THREE.MeshBasicMaterial({
      color: 0x72d4ff,
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
    const peLitCores = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.23, 0.026, 0.23),
      peLitMaterial,
      peCount,
    );
    peCores.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    peLitCores.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    peBases.frustumCulled = false;
    peCores.frustumCulled = false;
    peLitCores.frustumCulled = false;
    const pePositions = [];
    const peOffDark = new THREE.Color(0x1c405c);
    const peFilledDark = new THREE.Color(0x72d4ff);
    const peAfterglowDark = new THREE.Color(0x4d7f9d);
    const peRowDark = new THREE.Color(0x8de8ff);
    const peColumnDark = new THREE.Color(0xb5a9ff);
    const peActiveDark = new THREE.Color(0xc8edff);
    const peOffLight = new THREE.Color(0x356b86);
    const peFilledLight = new THREE.Color(0x69c8ef);
    const peAfterglowLight = new THREE.Color(0x3f7895);
    const peRowLight = new THREE.Color(0x8de5ff);
    const peColumnLight = new THREE.Color(0xb1a7ff);
    const peActiveLight = new THREE.Color(0xeaf8ff);
    const colorScratch = new THREE.Color();
    const brightCore = new THREE.Color(0xbfe8ff);

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
        peCores.setColorAt(index, peOffDark);
        helper.position.y = -3;
        helper.scale.setScalar(0.001);
        helper.updateMatrix();
        peLitCores.setMatrixAt(index, helper.matrix);
      }
    }
    peBases.instanceMatrix.needsUpdate = true;
    peCores.instanceMatrix.needsUpdate = true;
    peCores.instanceColor.needsUpdate = true;
    peLitCores.instanceMatrix.needsUpdate = true;
    model.add(peBases, peCores, peLitCores);

    const rowTokenMaterial = new THREE.MeshBasicMaterial({
      color: 0x48bce2,
      transparent: true,
      opacity: 0.78,
      toneMapped: false,
    });
    const columnTokenMaterial = new THREE.MeshBasicMaterial({
      color: 0x8876d9,
      transparent: true,
      opacity: 0.74,
      toneMapped: false,
    });
    const tokenTailLength = 3;
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
    const stepDuration = 0.29;
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
      hbmTopMaterial.color.setHex(lightTheme ? 0x286881 : 0x144b70);
      hbmTopMaterial.emissive.setHex(lightTheme ? 0x08212c : 0x031522);
      hbmBankMaterials[0].color.setHex(lightTheme ? 0x167f8b : 0x298f9d);
      hbmBankMaterials[1].color.setHex(lightTheme ? 0x514a9b : 0x5868b2);
      hbmGridMaterial.color.setHex(lightTheme ? 0x315f75 : 0x9bc7d5);
      hbmSealMaterial.color.setHex(lightTheme ? 0x436b82 : 0x79a2bb);
      hbmSealLineMaterial.color.setHex(lightTheme ? 0x436b82 : 0x79a2bb);
      hbmSealLineMaterial.opacity = lightTheme ? 0.78 : 0.72;
      hbmViaMaterial.color.setHex(lightTheme ? 0x9d6c2f : 0xc98f3e);
      hbmViaRingMaterial.color.setHex(lightTheme ? 0xa87935 : 0xe0b15a);
      peBaseMaterial.color.setHex(lightTheme ? 0x437b9b : 0x17496d);
      peBaseMaterial.emissive.setHex(lightTheme ? 0x0c3148 : 0x08253b);
      peBaseMaterial.emissiveIntensity = lightTheme ? 0.2 : 0.24;
      peLitMaterial.color.setHex(lightTheme ? 0x69c8ef : 0x72d4ff);
      rowTokenMaterial.color.setHex(lightTheme ? 0x147bae : 0x48bce2);
      columnTokenMaterial.color.setHex(lightTheme ? 0x624db1 : 0x8876d9);
      lastClockStep = -1;
      lastBoostBucket = -1;
      requestRender();
    }

    function updateClockState(step, boostAmount) {
      const diagonalCount = gridSize * 2 - 1;
      const cycleStep = step % (diagonalCount * 2);
      const filling = cycleStep < diagonalCount;
      const waveStep = filling ? cycleStep : cycleStep - diagonalCount;
      const tokenWaveStep = filling ? waveStep : -1;
      const offColor = lightTheme ? peOffLight : peOffDark;
      const filledColor = lightTheme ? peFilledLight : peFilledDark;
      const afterglowColor = lightTheme ? peAfterglowLight : peAfterglowDark;
      const rowColor = lightTheme ? peRowLight : peRowDark;
      const columnColor = lightTheme ? peColumnLight : peColumnDark;
      const activeColor = lightTheme ? peActiveLight : peActiveDark;

      pePositions.forEach(({ row, column, x, z }, index) => {
        const cellStep = row + column;
        const filled = filling ? cellStep <= waveStep : cellStep > waveStep;
        const intersection = filling && cellStep === waveStep;
        const drainBoundary = !filling && cellStep === waveStep + 1;
        const rowHead = tokenWaveStep - row;
        const columnHead = tokenWaveStep - column;
        const rowPath = rowHead >= 0
          && rowHead < gridSize
          && column < rowHead
          && column >= Math.max(0, rowHead - 3);
        const columnPath = columnHead >= 0
          && columnHead < gridSize
          && row < columnHead
          && row >= Math.max(0, columnHead - 3);
        colorScratch.copy(filled ? filledColor : offColor);
        if (drainBoundary) colorScratch.copy(afterglowColor);
        if (rowPath) colorScratch.copy(rowColor);
        if (columnPath) colorScratch.copy(columnColor);
        if (rowPath && columnPath) colorScratch.copy(rowColor).lerp(columnColor, 0.5);
        if (intersection) colorScratch.copy(activeColor).lerp(brightCore, 0.2 + boostAmount * 0.22);
        peCores.setColorAt(index, colorScratch);
        const coreScale = intersection
          ? 1.16 + boostAmount * 0.08
          : rowPath || columnPath
            ? 1.07
            : drainBoundary
              ? 1.03
              : filled
                ? 1.08
                : 1;
        helper.position.set(x, 0.415 + (coreScale - 1) * 0.025, z);
        helper.rotation.set(0, 0, 0);
        helper.scale.set(coreScale, 1, coreScale);
        helper.updateMatrix();
        peCores.setMatrixAt(index, helper.matrix);

        if (filled) {
          helper.position.set(x, 0.477, z);
          helper.scale.setScalar(intersection ? 1.1 : 1);
        } else {
          helper.position.set(0, -3, 0);
          helper.scale.setScalar(0.001);
        }
        helper.updateMatrix();
        peLitCores.setMatrixAt(index, helper.matrix);
      });
      peCores.instanceMatrix.needsUpdate = true;
      peCores.instanceColor.needsUpdate = true;
      peLitCores.instanceMatrix.needsUpdate = true;

      for (let lane = 0; lane < gridSize; lane += 1) {
        for (let tail = 0; tail < tokenTailLength; tail += 1) {
          const tokenIndex = lane * tokenTailLength + tail;
          const tailScale = 1 - tail * 0.22;
          const rowColumn = tokenWaveStep - lane - tail;
          helper.rotation.set(0, 0, 0);
          if (rowColumn >= 0 && rowColumn < gridSize) {
            helper.position.set(gridFirst + rowColumn * gridPitch, 0.56, gridFirst + lane * gridPitch - 0.1);
            helper.scale.set(tailScale, 1, 1);
          } else {
            helper.position.set(0, -3, 0);
            helper.scale.setScalar(0.001);
          }
          helper.updateMatrix();
          rowTokens.setMatrixAt(tokenIndex, helper.matrix);

          const columnRow = tokenWaveStep - lane - tail;
          if (columnRow >= 0 && columnRow < gridSize) {
            helper.position.set(gridFirst + lane * gridPitch + 0.1, 0.57, gridFirst + columnRow * gridPitch);
            helper.scale.set(1, 1, tailScale);
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
      hbmLayerMaterials.forEach((material, index) => {
        material.color.setHex((lightTheme ? lightBaseLayers : darkBaseLayers)[index]).lerp(boostTarget, boostAmount * 0.38);
        material.emissiveIntensity = 0.09 + boostAmount * 0.18;
      });
      hbmTopMaterial.emissiveIntensity = 0.06 + boostAmount * 0.16;
      hbmViaMaterial.emissiveIntensity = 0.11 + boostAmount * 0.22;
      hbmViaRingMaterial.emissiveIntensity = 0.06 + boostAmount * 0.16;
      peLitMaterial.color
        .setHex(lightTheme ? 0x69c8ef : 0x72d4ff)
        .lerp(brightCore, boostAmount * 0.14);
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
      const progress = reducedMotion
        ? 0
        : smoothstep(clamp((viewportTrigger - bounds.top) / travel));
      scrollRotation.set(
        INITIAL_PITCH + (SCROLL_END_PITCH - INITIAL_PITCH) * progress,
        INITIAL_YAW + (SCROLL_END_YAW - INITIAL_YAW) * progress,
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
