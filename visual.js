import * as THREE from "./vendor/three.module.js";

const canvas = document.querySelector("#memory-canvas");
const shell = document.querySelector("#memory-visual");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (canvas && shell) {
  try {
    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x05070a, 0.035);

    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    camera.position.set(9.2, 7.5, 11.5);

    const world = new THREE.Group();
    world.rotation.set(-0.05, -0.42, -0.015);
    scene.add(world);

    const colors = {
      base: 0x08111c,
      interposer: 0x0a2340,
      edge: 0x60a5fa,
      cyan: 0x67e8f9,
      blue: 0x3b82f6,
      die: 0x174f9e,
      stack: 0x0b315c,
      line: 0x243142,
    };

    const materials = {
      base: new THREE.MeshStandardMaterial({ color: colors.base, metalness: 0.58, roughness: 0.42 }),
      interposer: new THREE.MeshStandardMaterial({ color: colors.interposer, emissive: 0x061326, emissiveIntensity: 0.8, metalness: 0.5, roughness: 0.38 }),
      die: new THREE.MeshStandardMaterial({ color: colors.die, emissive: 0x0d3a77, emissiveIntensity: 0.65, metalness: 0.64, roughness: 0.24 }),
      stack: new THREE.MeshStandardMaterial({ color: colors.stack, emissive: 0x07182d, emissiveIntensity: 0.72, metalness: 0.52, roughness: 0.3 }),
      baseDie: new THREE.MeshStandardMaterial({ color: 0x102a49, emissive: 0x07182d, emissiveIntensity: 0.45, metalness: 0.56, roughness: 0.34 }),
    };

    function box(width, height, depth, material, edgeColor = colors.line, edgeOpacity = 0.9) {
      const geometry = new THREE.BoxGeometry(width, height, depth);
      const mesh = new THREE.Mesh(geometry, material);
      const edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(geometry),
        new THREE.LineBasicMaterial({ color: edgeColor, transparent: true, opacity: edgeOpacity })
      );
      mesh.add(edges);
      return mesh;
    }

    const substrate = box(9.4, 0.34, 6.7, materials.base, colors.line, 0.78);
    substrate.position.y = -1.45;
    world.add(substrate);

    const interposer = box(8.15, 0.18, 5.65, materials.interposer, colors.blue, 0.82);
    interposer.position.y = -1.13;
    world.add(interposer);

    const accelerator = box(2.9, 0.72, 2.72, materials.die, colors.cyan, 1);
    accelerator.position.y = -0.67;
    world.add(accelerator);

    const dieTop = new THREE.Mesh(
      new THREE.PlaneGeometry(2.2, 2.02),
      new THREE.MeshBasicMaterial({ color: colors.cyan, transparent: true, opacity: 0.1, side: THREE.DoubleSide })
    );
    dieTop.rotation.x = -Math.PI / 2;
    dieTop.position.y = -0.3;
    accelerator.add(dieTop);

    const stackPositions = [
      [-3.05, -1.82],
      [3.05, -1.82],
      [-3.05, 1.82],
      [3.05, 1.82],
    ];
    const stackGroups = [];

    stackPositions.forEach(([x, z], stackIndex) => {
      const group = new THREE.Group();
      group.position.set(x, 0, z);

      const baseDie = box(1.65, 0.2, 1.42, materials.baseDie, colors.blue, 0.94);
      baseDie.position.y = -0.86;
      group.add(baseDie);

      for (let layer = 0; layer < 5; layer += 1) {
        const memoryDie = box(1.52, 0.18, 1.28, materials.stack, colors.edge, 0.96);
        memoryDie.position.y = -0.56 + layer * 0.31;
        memoryDie.position.x = layer * 0.018;
        memoryDie.position.z = -layer * 0.012;
        group.add(memoryDie);
      }

      group.userData.phase = stackIndex * 0.42;
      stackGroups.push(group);
      world.add(group);
    });

    const pathMaterial = new THREE.LineBasicMaterial({ color: colors.cyan, transparent: true, opacity: 0.56 });
    const pulseMaterial = new THREE.MeshBasicMaterial({ color: colors.cyan });
    const pulseGeometry = new THREE.SphereGeometry(0.055, 14, 14);
    const paths = [];

    stackPositions.forEach(([x, z], index) => {
      const points = [
        new THREE.Vector3(Math.sign(x) * 1.52, -0.26, Math.sign(z) * 0.68),
        new THREE.Vector3(Math.sign(x) * 2.05, -0.26, Math.sign(z) * 0.68),
        new THREE.Vector3(Math.sign(x) * 2.05, -0.26, z),
        new THREE.Vector3(x, -0.26, z),
      ];
      const curve = new THREE.CatmullRomCurve3(points, false, "catmullrom", 0.08);
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(36)), pathMaterial);
      world.add(line);

      const pulse = new THREE.Mesh(pulseGeometry, pulseMaterial);
      pulse.userData.offset = index * 0.21;
      world.add(pulse);
      paths.push({ curve, pulse });
    });

    const particleGeometry = new THREE.BufferGeometry();
    const particleCount = 120;
    const particlePositions = new Float32Array(particleCount * 3);
    for (let index = 0; index < particleCount; index += 1) {
      particlePositions[index * 3] = (Math.random() - 0.5) * 18;
      particlePositions[index * 3 + 1] = (Math.random() - 0.5) * 7;
      particlePositions[index * 3 + 2] = (Math.random() - 0.5) * 13;
    }
    particleGeometry.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));
    const particles = new THREE.Points(
      particleGeometry,
      new THREE.PointsMaterial({ color: colors.edge, size: 0.025, transparent: true, opacity: 0.32, sizeAttenuation: true })
    );
    scene.add(particles);

    scene.add(new THREE.HemisphereLight(0xbcdcff, 0x020407, 1.7));

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.4);
    keyLight.position.set(4, 9, 6);
    scene.add(keyLight);

    const blueLight = new THREE.PointLight(colors.blue, 22, 20, 2.1);
    blueLight.position.set(-4.5, 2.8, 3.5);
    scene.add(blueLight);

    const cyanLight = new THREE.PointLight(colors.cyan, 15, 16, 2.3);
    cyanLight.position.set(4.5, 1.8, -3.5);
    scene.add(cyanLight);

    const startTime = performance.now();
    const pointer = new THREE.Vector2(0, 0);
    const pointerTarget = new THREE.Vector2(0, 0);
    let isVisible = true;
    let frameId = 0;

    function resize() {
      const { width, height } = shell.getBoundingClientRect();
      if (!width || !height) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }

    function render() {
      const elapsed = (performance.now() - startTime) / 1000;
      pointer.lerp(pointerTarget, 0.045);

      const reveal = Math.min(1, elapsed / 1.45);
      const easedReveal = 1 - Math.pow(1 - reveal, 3);
      world.scale.setScalar(0.86 + easedReveal * 0.14);
      world.position.y = -0.35 + easedReveal * 0.35;

      if (!reduceMotion) {
        world.rotation.y = -0.42 + pointer.x * 0.13 + Math.sin(elapsed * 0.16) * 0.025;
        world.rotation.x = -0.05 + pointer.y * 0.06 + Math.sin(elapsed * 0.22) * 0.012;
        particles.rotation.y = elapsed * 0.006;
        particles.rotation.x = elapsed * 0.003;

        stackGroups.forEach((group) => {
          group.position.y = Math.sin(elapsed * 0.75 + group.userData.phase) * 0.025;
        });

        paths.forEach(({ curve, pulse }) => {
          const travel = (elapsed * 0.18 + pulse.userData.offset) % 1;
          pulse.position.copy(curve.getPointAt(travel));
        });
      } else {
        paths.forEach(({ curve, pulse }, index) => pulse.position.copy(curve.getPointAt(0.25 + index * 0.13)));
      }

      camera.lookAt(0, -0.3, 0);
      renderer.render(scene, camera);

      if (!reduceMotion && isVisible && !document.hidden) frameId = requestAnimationFrame(render);
    }

    function start() {
      if (reduceMotion || frameId || !isVisible || document.hidden) return;
      frameId = requestAnimationFrame(render);
    }

    function stop() {
      if (!frameId) return;
      cancelAnimationFrame(frameId);
      frameId = 0;
    }

    new ResizeObserver(resize).observe(shell);

    new IntersectionObserver(([entry]) => {
      isVisible = entry.isIntersecting;
      if (isVisible) start();
      else stop();
    }, { rootMargin: "120px" }).observe(shell);

    shell.addEventListener("pointermove", (event) => {
      const rect = shell.getBoundingClientRect();
      pointerTarget.set(
        ((event.clientX - rect.left) / rect.width - 0.5) * 2,
        ((event.clientY - rect.top) / rect.height - 0.5) * 2
      );
    });
    shell.addEventListener("pointerleave", () => pointerTarget.set(0, 0));

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) stop();
      else start();
    });

    resize();
    render();
    shell.classList.add("webgl-ready");
  } catch (error) {
    shell.classList.add("webgl-fallback");
    console.warn("SF Memory visual fallback enabled.", error);
  }
}
