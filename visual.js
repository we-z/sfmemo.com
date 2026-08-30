import * as THREE from "./vendor/three.module.js";

const hero = document.querySelector(".hero-horizon");
const heroSurface = hero?.querySelector(".hero-frame") ?? hero;
const canvas = document.querySelector("#hero-canvas");
const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
let reduceMotion = motionPreference.matches;
const finePointer = window.matchMedia("(pointer: fine)").matches;
let setPrismTheme = () => {};

if (hero && heroSurface && canvas) {
  try {
    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: false,
      powerPreference: "high-performance",
    });

    renderer.setClearColor(0x05070a, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, finePointer ? 1.35 : 1.1));
    renderer.autoClear = false;

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const pointers = [new THREE.Vector2(0.22, 0.66), new THREE.Vector2(0.3, 0.6)];
    const pointerTargets = [new THREE.Vector2(0.22, 0.66), new THREE.Vector2(0.3, 0.6)];
    const pointerActive = [0, 0];
    const rippleOrigins = [new THREE.Vector2(0.76, 0.62), new THREE.Vector2(0.68, 0.64)];
    const rippleStartedAt = [-1, -1];
    const touchSlots = new Map();
    let visible = true;
    let frameId = 0;
    let scrollProgress = 0;

    const uniforms = {
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uPointer: { value: pointers[0] },
      uPointer2: { value: pointers[1] },
      uPointerActive: { value: pointerActive[0] },
      uPointer2Active: { value: pointerActive[1] },
      uRippleOrigin: { value: rippleOrigins[0] },
      uRippleOrigin2: { value: rippleOrigins[1] },
      uRipple: { value: -1 },
      uRipple2: { value: -1 },
      uScroll: { value: 0 },
      uMobile: { value: 0 },
      uTheme: { value: 0 },
    };

    const material = new THREE.ShaderMaterial({
      uniforms,
      transparent: true,
      depthWrite: false,
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        precision highp float;

        varying vec2 vUv;
        uniform float uTime;
        uniform vec2 uResolution;
        uniform vec2 uPointer;
        uniform vec2 uPointer2;
        uniform float uPointerActive;
        uniform float uPointer2Active;
        uniform vec2 uRippleOrigin;
        uniform vec2 uRippleOrigin2;
        uniform float uRipple;
        uniform float uRipple2;
        uniform float uScroll;
        uniform float uMobile;
        uniform float uTheme;

        float hash(vec2 p) {
          p = fract(p * vec2(123.34, 456.21));
          p += dot(p, p + 45.32);
          return fract(p.x * p.y);
        }

        void main() {
          vec2 uv = vUv;
          float aspect = uResolution.x / max(uResolution.y, 1.0);
          float mobile = uMobile;
          float pointerFalloff = exp(-pow((uv.x - uPointer.x) * 2.7, 2.0)) * uPointerActive;
          float pointerFalloff2 = exp(-pow((uv.x - uPointer2.x) * 2.7, 2.0)) * uPointer2Active;
          float baseY = mix(0.54, 0.44, mobile);
          float horizon = baseY
            + sin(uv.x * 3.45 + uTime * 0.11) * 0.035
            + sin(uv.x * 8.2 - uTime * 0.07) * 0.012
            + (uPointer.y - 0.5) * 0.105 * pointerFalloff
            + (uPointer2.y - 0.5) * 0.105 * pointerFalloff2
            - uScroll * mix(0.10, 0.05, mobile);

          if (uRipple >= 0.0 && uRipple <= 1.25) {
            vec2 rippleScale = vec2(aspect, 0.92);
            float distanceFromTap = length((uv - uRippleOrigin) * rippleScale);
            float radius = uRipple * 0.9;
            float ring = sin((distanceFromTap - radius) * 44.0)
              * exp(-abs(distanceFromTap - radius) * 19.0)
              * (1.0 - smoothstep(0.0, 1.2, uRipple));
            horizon += ring * 0.072;
          }

          if (uRipple2 >= 0.0 && uRipple2 <= 1.25) {
            vec2 rippleScale = vec2(aspect, 0.92);
            float distanceFromTap = length((uv - uRippleOrigin2) * rippleScale);
            float radius = uRipple2 * 0.9;
            float ring = sin((distanceFromTap - radius) * 44.0)
              * exp(-abs(distanceFromTap - radius) * 19.0)
              * (1.0 - smoothstep(0.0, 1.2, uRipple2));
            horizon += ring * 0.072;
          }

          float d = uv.y - horizon;
          float revealStart = mix(0.28, 0.02, mobile);
          float rightMask = smoothstep(revealStart, mix(0.72, 0.34, mobile), uv.x);
          float edgeFade = smoothstep(1.08, 0.82, uv.x);
          float fieldMask = rightMask * edgeFade;
          vec3 cobalt = mix(vec3(0.055, 0.205, 0.62), vec3(0.02, 0.18, 0.72), uTheme);
          vec3 blue = mix(vec3(0.16, 0.46, 0.96), vec3(0.04, 0.34, 0.96), uTheme);
          vec3 ice = mix(vec3(0.66, 0.82, 1.0), vec3(0.34, 0.62, 1.0), uTheme);
          vec3 color = vec3(0.0);
          float deepField = smoothstep(0.34, -0.24, d);
          float depthFade = smoothstep(-0.5, 0.04, d);
          color += mix(cobalt * 0.22, blue * 0.58, depthFade) * deepField * fieldMask;
          float leadingEdge = exp(-abs(d) * 42.0);
          color += mix(blue, ice, smoothstep(0.48, 0.94, uv.x)) * leadingEdge * fieldMask * 0.9;

          for (int index = 0; index < 9; index++) {
            float layer = float(index);
            float layerY = horizon - 0.032 - layer * 0.027
              + sin(uv.x * (5.2 + layer * 0.18) + layer * 0.62 - uTime * 0.035) * 0.006;
            float strand = exp(-abs(uv.y - layerY) * mix(135.0, 94.0, layer / 8.0));
            float strandFade = 1.0 - layer / 11.0;
            color += mix(cobalt, blue, 0.28 + uv.x * 0.38) * strand * fieldMask * strandFade * 0.34;
          }

          float glassSheen = exp(-pow(d * 5.8, 2.0))
            * smoothstep(0.38, 0.78, uv.x)
            * smoothstep(1.02, 0.72, uv.x);
          color += ice * glassSheen * 0.12;
          float lowerGlow = exp(-pow((d + 0.19) * 4.0, 2.0)) * fieldMask;
          color += cobalt * lowerGlow * 0.16;
          float grain = hash(gl_FragCoord.xy + floor(uTime * 8.0)) - 0.5;
          color += grain * 0.012;
          float alpha = clamp((deepField * 0.82 + leadingEdge + glassSheen * 0.2) * fieldMask, 0.0, mix(0.94, 0.72, uTheme));
          gl_FragColor = vec4(max(color, 0.0), alpha);
        }
      `,
    });

    scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material));

    const backdropTarget = new THREE.WebGLRenderTarget(1, 1, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      depthBuffer: false,
      stencilBuffer: false,
    });
    backdropTarget.texture.generateMipmaps = false;
    const glassDrawingBufferSize = new THREE.Vector2();

    const prismScene = new THREE.Scene();
    const prismCamera = new THREE.PerspectiveCamera(35, 1, 0.1, 30);
    prismCamera.position.set(0, 0, 7);

    const prismUniforms = {
      uBackdrop: { value: backdropTarget.texture },
      uGlassResolution: { value: new THREE.Vector2(1, 1) },
      uLightPosition: { value: new THREE.Vector3(2.5, 1.5, 3) },
      uTheme: { value: 0 },
    };

    const prismMaterial = new THREE.ShaderMaterial({
      uniforms: prismUniforms,
      transparent: false,
      depthWrite: true,
      side: THREE.FrontSide,
      vertexShader: `
        varying vec3 vWorldPosition;
        varying vec3 vWorldNormal;
        varying vec3 vLocalPosition;

        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          vWorldNormal = normalize(mat3(modelMatrix) * normal);
          vLocalPosition = position;
          gl_Position = projectionMatrix * viewMatrix * worldPosition;
        }
      `,
      fragmentShader: `
        precision highp float;

        varying vec3 vWorldPosition;
        varying vec3 vWorldNormal;
        varying vec3 vLocalPosition;
        uniform sampler2D uBackdrop;
        uniform vec2 uGlassResolution;
        uniform vec3 uLightPosition;
        uniform float uTheme;

        vec2 refractionOffset(vec3 incident, vec3 surfaceNormal, float ior) {
          vec3 transmitted = refract(incident, surfaceNormal, 1.0 / ior);
          vec2 straightSlope = incident.xy / max(abs(incident.z), 0.2);
          vec2 transmittedSlope = transmitted.xy / max(abs(transmitted.z), 0.2);
          return clamp((transmittedSlope - straightSlope) * 0.055, vec2(-0.055), vec2(0.055));
        }

        vec3 compositeBackdrop(vec4 sampleColor) {
          vec3 pageColor = mix(vec3(0.0196, 0.0275, 0.0392), vec3(0.9294, 0.9529, 0.9843), uTheme);
          return sampleColor.rgb + pageColor * (1.0 - sampleColor.a);
        }

        void main() {
          vec3 normal = normalize(vWorldNormal);
          vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
          vec3 lightDirection = normalize(uLightPosition - vWorldPosition);
          vec3 halfVector = normalize(lightDirection + viewDirection);
          float facing = clamp(abs(dot(normal, viewDirection)), 0.0, 1.0);
          float fresnel = 0.043 + 0.957 * pow(1.0 - facing, 5.0);
          float specular = pow(max(dot(normal, halfVector), 0.0), 118.0);
          float broadSpecular = pow(max(dot(normal, halfVector), 0.0), 18.0);

          vec2 screenUv = gl_FragCoord.xy / max(uGlassResolution, vec2(1.0));
          vec3 incidentDirection = -viewDirection;
          vec2 redUv = clamp(screenUv + refractionOffset(incidentDirection, normal, 1.504), vec2(0.002), vec2(0.998));
          vec2 greenUv = clamp(screenUv + refractionOffset(incidentDirection, normal, 1.516), vec2(0.002), vec2(0.998));
          vec2 blueUv = clamp(screenUv + refractionOffset(incidentDirection, normal, 1.528), vec2(0.002), vec2(0.998));
          vec3 redSample = compositeBackdrop(texture2D(uBackdrop, redUv));
          vec3 greenSample = compositeBackdrop(texture2D(uBackdrop, greenUv));
          vec3 blueSample = compositeBackdrop(texture2D(uBackdrop, blueUv));
          vec3 refracted = vec3(
            redSample.r,
            greenSample.g,
            blueSample.b
          );

          float edgeDepth = smoothstep(0.18, 0.92, fresnel);
          float internalCaustic = pow(max(dot(refract(-lightDirection, normal, 1.0 / 1.52), -viewDirection), 0.0), 11.0);
          float baseCaustic = exp(-abs(vLocalPosition.y + 0.69) * 18.0) * (0.35 + 0.65 * facing);
          vec3 glassTint = mix(vec3(0.16, 0.46, 0.88), vec3(0.035, 0.22, 0.58), uTheme);
          vec3 rimTint = mix(vec3(0.66, 0.88, 1.0), vec3(0.06, 0.3, 0.82), uTheme);

          vec3 color = refracted * mix(0.94, 0.78, edgeDepth);
          color += glassTint * (0.035 + edgeDepth * 0.16 + baseCaustic * 0.06);
          color += rimTint * fresnel * 0.42;
          color += vec3(1.0) * (specular * 1.65 + broadSpecular * 0.075 + internalCaustic * 0.16);

          gl_FragColor = vec4(color, 1.0);
        }
      `,
    });

    const prismShape = new THREE.Shape();
    prismShape.moveTo(-0.98, -0.58);
    prismShape.lineTo(0.98, -0.58);
    prismShape.lineTo(0, 1.02);
    prismShape.closePath();

    const prismGeometry = new THREE.ExtrudeGeometry(prismShape, {
      depth: 0.78,
      steps: 1,
      bevelEnabled: true,
      bevelSegments: 5,
      bevelSize: 0.055,
      bevelThickness: 0.055,
    });
    prismGeometry.center();
    prismGeometry.computeVertexNormals();

    const prismGroup = new THREE.Group();
    prismGroup.rotation.set(0, -0.22, 0);

    const contactShadow = new THREE.Mesh(
      new THREE.PlaneGeometry(2.25, 0.42),
      new THREE.ShaderMaterial({
        uniforms: { uTheme: prismUniforms.uTheme },
        transparent: true,
        depthTest: true,
        depthWrite: false,
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          precision highp float;
          varying vec2 vUv;
          uniform float uTheme;
          void main() {
            vec2 p = (vUv - 0.5) * vec2(2.0, 5.2);
            float falloff = exp(-dot(p, p) * 1.45);
            vec3 shadowColor = mix(vec3(0.0, 0.025, 0.08), vec3(0.08, 0.18, 0.34), uTheme);
            gl_FragColor = vec4(shadowColor, falloff * mix(0.34, 0.16, uTheme));
          }
        `,
      }),
    );
    contactShadow.position.set(0, -0.84, -0.18);
    contactShadow.renderOrder = 1;
    prismGroup.add(contactShadow);

    const prismMesh = new THREE.Mesh(prismGeometry, prismMaterial);
    prismMesh.renderOrder = 4;
    prismGroup.add(prismMesh);

    const prismEdges = new THREE.LineSegments(
      new THREE.EdgesGeometry(prismGeometry, 18),
      new THREE.LineBasicMaterial({
        color: 0x9bc7ff,
        transparent: true,
        opacity: 0.07,
        blending: THREE.AdditiveBlending,
        depthTest: true,
      }),
    );
    prismEdges.renderOrder = 5;
    prismGroup.add(prismEdges);
    prismScene.add(prismGroup);

    function dynamicBand(color, opacity = 0.35, blending = THREE.AdditiveBlending, renderOrder = 2) {
      const positions = new Float32Array(18);
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      const band = new THREE.Mesh(
        geometry,
        new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity,
          blending,
          depthTest: false,
          depthWrite: false,
          side: THREE.DoubleSide,
        }),
      );
      band.renderOrder = renderOrder;
      band.frustumCulled = false;
      prismScene.add(band);
      return band;
    }

    function updateBand(band, startPoint, endPoint, startWidth, endWidth) {
      const deltaX = endPoint.x - startPoint.x;
      const deltaY = endPoint.y - startPoint.y;
      const length = Math.max(Math.hypot(deltaX, deltaY), 0.001);
      const normalX = -deltaY / length;
      const normalY = deltaX / length;
      const positions = band.geometry.attributes.position.array;
      const startAX = startPoint.x - normalX * startWidth;
      const startAY = startPoint.y - normalY * startWidth;
      const startBX = startPoint.x + normalX * startWidth;
      const startBY = startPoint.y + normalY * startWidth;
      const endAX = endPoint.x - normalX * endWidth;
      const endAY = endPoint.y - normalY * endWidth;
      const endBX = endPoint.x + normalX * endWidth;
      const endBY = endPoint.y + normalY * endWidth;

      positions.set([
        startAX, startAY, startPoint.z,
        endAX, endAY, endPoint.z,
        endBX, endBY, endPoint.z,
        startAX, startAY, startPoint.z,
        endBX, endBY, endPoint.z,
        startBX, startBY, startPoint.z,
      ]);
      band.geometry.attributes.position.needsUpdate = true;
    }

    function makeSpectrumFan() {
      const positions = new Float32Array(18);
      const uvs = new Float32Array([
        0, 0,
        1, 0,
        1, 1,
        0, 0,
        1, 1,
        0, 1,
      ]);
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
      const fan = new THREE.Mesh(
        geometry,
        new THREE.ShaderMaterial({
          uniforms: {
            uOpacity: { value: 0.42 },
          },
          transparent: true,
          depthTest: false,
          depthWrite: false,
          side: THREE.DoubleSide,
          blending: THREE.AdditiveBlending,
          vertexShader: `
            varying vec2 vUv;
            void main() {
              vUv = uv;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `,
          fragmentShader: `
            precision highp float;
            varying vec2 vUv;
            uniform float uOpacity;

            vec3 spectrum(float position) {
              float p = clamp(position, 0.0, 1.0) * 6.0;
              if (p < 1.0) return mix(vec3(1.0, 0.15, 0.34), vec3(1.0, 0.42, 0.16), p);
              if (p < 2.0) return mix(vec3(1.0, 0.42, 0.16), vec3(1.0, 0.82, 0.2), p - 1.0);
              if (p < 3.0) return mix(vec3(1.0, 0.82, 0.2), vec3(0.28, 0.88, 0.45), p - 2.0);
              if (p < 4.0) return mix(vec3(0.28, 0.88, 0.45), vec3(0.16, 0.78, 0.96), p - 3.0);
              if (p < 5.0) return mix(vec3(0.16, 0.78, 0.96), vec3(0.25, 0.38, 1.0), p - 4.0);
              return mix(vec3(0.25, 0.38, 1.0), vec3(0.68, 0.27, 1.0), p - 5.0);
            }

            void main() {
              float edgeFeather = smoothstep(0.0, 0.055, vUv.y) * (1.0 - smoothstep(0.945, 1.0, vUv.y));
              float sourceFade = smoothstep(0.0, 0.015, vUv.x);
              float distanceFade = 1.0 - smoothstep(0.8, 1.0, vUv.x);
              float body = edgeFeather * sourceFade * distanceFade;
              vec3 color = spectrum(1.0 - vUv.y);
              gl_FragColor = vec4(color, body * uOpacity);
            }
          `,
        }),
      );
      fan.renderOrder = 3;
      fan.frustumCulled = false;
      prismScene.add(fan);
      return fan;
    }

    function updateSpectrumFan(fan, startPoint, endX, startHalfWidth, endHalfWidth, endCenterY, z) {
      const positions = fan.geometry.attributes.position.array;
      positions.set([
        startPoint.x, startPoint.y - startHalfWidth, startPoint.z,
        endX, endCenterY - endHalfWidth, z,
        endX, endCenterY + endHalfWidth, z,
        startPoint.x, startPoint.y - startHalfWidth, startPoint.z,
        endX, endCenterY + endHalfWidth, z,
        startPoint.x, startPoint.y + startHalfWidth, startPoint.z,
      ]);
      fan.geometry.attributes.position.needsUpdate = true;
    }

    const incidentBeams = pointers.map((_, pointerIndex) => ({
      glow: dynamicBand(pointerIndex === 0 ? 0x8fc8ff : 0x5baeff, 0.26, THREE.AdditiveBlending, 2),
      core: dynamicBand(pointerIndex === 0 ? 0xf4fbff : 0xbfe3ff, 0.82, THREE.AdditiveBlending, 2),
    }));
    const internalBeams = pointers.map((_, pointerIndex) =>
      dynamicBand(pointerIndex === 0 ? 0xeaf7ff : 0x91d3ff, 0.34, THREE.AdditiveBlending, 5));
    const spectrumFans = pointers.map(() => makeSpectrumFan());

    const flareCanvas = document.createElement("canvas");
    flareCanvas.width = 128;
    flareCanvas.height = 128;
    const flareContext = flareCanvas.getContext("2d");
    const flareGradient = flareContext.createRadialGradient(64, 64, 0, 64, 64, 64);
    flareGradient.addColorStop(0, "rgba(255,255,255,1)");
    flareGradient.addColorStop(0.08, "rgba(214,239,255,0.95)");
    flareGradient.addColorStop(0.28, "rgba(89,169,255,0.34)");
    flareGradient.addColorStop(1, "rgba(30,103,255,0)");
    flareContext.fillStyle = flareGradient;
    flareContext.fillRect(0, 0, 128, 128);
    const flareTexture = new THREE.CanvasTexture(flareCanvas);
    flareTexture.colorSpace = THREE.SRGBColorSpace;

    const lightSources = pointers.map(() => {
      const source = new THREE.Sprite(new THREE.SpriteMaterial({
        map: flareTexture,
        color: 0xffffff,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthTest: false,
        depthWrite: false,
      }));
      source.renderOrder = 6;
      source.frustumCulled = false;
      prismScene.add(source);
      return source;
    });

    const prismCenter = new THREE.Vector3();
    const sourcePoint = new THREE.Vector3();
    const entryPoint = new THREE.Vector3();
    const exitPoint = new THREE.Vector3();

    function updatePrism() {
      const surfaceBounds = heroSurface.getBoundingClientRect();
      const aspect = surfaceBounds.width / Math.max(surfaceBounds.height, 1);
      const verticalSpan = 2 * prismCamera.position.z * Math.tan(THREE.MathUtils.degToRad(prismCamera.fov * 0.5));
      const horizontalSpan = verticalSpan * aspect;
      const isMobile = surfaceBounds.width <= 780;
      const compactMobile = isMobile && surfaceBounds.height <= 760;

      prismGroup.position.set(
        compactMobile ? -horizontalSpan * 0.18 : (isMobile ? -horizontalSpan * 0.1 : horizontalSpan * 0.13),
        compactMobile ? -verticalSpan * 0.34 : (isMobile ? -verticalSpan * 0.27 : -0.05),
        0,
      );
      prismGroup.scale.setScalar(compactMobile ? 0.36 : (isMobile ? 0.52 : Math.min(1.08, 0.9 + aspect * 0.075)));
      prismGroup.updateMatrixWorld(true);
      prismGroup.getWorldPosition(prismCenter);

      pointerTargets.forEach((pointer, pointerIndex) => {
        const active = pointerActive[pointerIndex];
        const beamStrength = pointerIndex === 0 ? Math.max(active, 0.42) : active;
        const sourceX = pointerIndex === 0 && !active ? (compactMobile ? 0.035 : (isMobile ? 0.07 : 0.42)) : pointer.x;
        const sourceY = pointerIndex === 0 && !active ? (isMobile ? 0.5 + prismCenter.y / verticalSpan : 0.54) : pointer.y;
        sourcePoint.set(
          (sourceX - 0.5) * horizontalSpan,
          (sourceY - 0.5) * verticalSpan,
          1.15,
        );

        const entersFromLeft = sourcePoint.x <= prismCenter.x;
        entryPoint.set(entersFromLeft ? -0.42 : 0.42, 0, 0.43);
        exitPoint.set(entersFromLeft ? 0.42 : -0.42, 0, 0.43);
        prismGroup.localToWorld(entryPoint);
        prismGroup.localToWorld(exitPoint);

        lightSources[pointerIndex].position.copy(sourcePoint);
        lightSources[pointerIndex].scale.setScalar(compactMobile ? 0.17 : (isMobile ? 0.22 : 0.28));
        lightSources[pointerIndex].material.opacity = active * (pointerIndex === 0 ? 0.9 : 0.7);
        incidentBeams[pointerIndex].glow.material.opacity = beamStrength * (pointerIndex === 0 ? 0.24 : 0.16);
        incidentBeams[pointerIndex].core.material.opacity = beamStrength * (pointerIndex === 0 ? 0.86 : 0.64);
        internalBeams[pointerIndex].material.opacity = beamStrength * (pointerIndex === 0 ? 0.36 : 0.26);
        updateBand(incidentBeams[pointerIndex].glow, sourcePoint, entryPoint, 0.008, isMobile ? 0.028 : 0.035);
        updateBand(incidentBeams[pointerIndex].core, sourcePoint, entryPoint, 0.0015, isMobile ? 0.005 : 0.0065);
        updateBand(internalBeams[pointerIndex], entryPoint, exitPoint, 0.006, 0.009);

        const exitDirection = entersFromLeft ? 1 : -1;
        const edgePadding = horizontalSpan * (isMobile ? 0.025 : 0.035);
        const outputDistance = Math.max(
          horizontalSpan * 0.12,
          entersFromLeft
            ? horizontalSpan * 0.5 - exitPoint.x - edgePadding
            : exitPoint.x + horizontalSpan * 0.5 - edgePadding,
        );
        const inputDeltaX = entryPoint.x - sourcePoint.x;
        const safeInputDeltaX = Math.abs(inputDeltaX) < 0.16
          ? (inputDeltaX < 0 ? -0.16 : 0.16)
          : inputDeltaX;
        const inputSlope = (entryPoint.y - sourcePoint.y) / safeInputDeltaX;
        const outputDeltaX = exitDirection * outputDistance;
        const directionalLift = THREE.MathUtils.clamp(
          inputSlope * outputDeltaX * 0.62,
          -verticalSpan * 0.2,
          verticalSpan * 0.2,
        );
        const spectralHalfSpread = verticalSpan * (compactMobile ? 0.03 : (isMobile ? 0.065 : 0.085));
        const spectrumStartHalfWidth = verticalSpan * 0.0035;
        const spectrumEndX = exitPoint.x + outputDeltaX;
        spectrumFans[pointerIndex].material.uniforms.uOpacity.value = beamStrength * (pointerIndex === 0 ? 0.74 : 0.52);
        updateSpectrumFan(
          spectrumFans[pointerIndex],
          exitPoint,
          spectrumEndX,
          spectrumStartHalfWidth,
          spectralHalfSpread,
          exitPoint.y + directionalLift - spectralHalfSpread,
          0.16,
        );
      });

      prismUniforms.uLightPosition.value.copy(lightSources[0].position);
    }

    setPrismTheme = (light) => {
      const themeValue = light ? 1 : 0;
      uniforms.uTheme.value = themeValue;
      prismUniforms.uTheme.value = themeValue;
      prismEdges.material.color.set(light ? 0x155eef : 0x9bc7ff);
      prismEdges.material.opacity = light ? 0.09 : 0.07;
      incidentBeams.forEach((beam, index) => {
        beam.glow.material.color.set(light ? (index === 0 ? 0x3c74c9 : 0x4b7ed1) : (index === 0 ? 0x8fc8ff : 0x5baeff));
        beam.core.material.color.set(light ? (index === 0 ? 0x164d9d : 0x2862ad) : (index === 0 ? 0xf4fbff : 0xbfe3ff));
        beam.glow.material.blending = light ? THREE.NormalBlending : THREE.AdditiveBlending;
        beam.core.material.blending = light ? THREE.NormalBlending : THREE.AdditiveBlending;
        beam.glow.material.needsUpdate = true;
        beam.core.material.needsUpdate = true;
      });
      internalBeams.forEach((beam) => {
        beam.material.color.set(light ? 0x1d4f9d : 0xeaf7ff);
        beam.material.blending = light ? THREE.NormalBlending : THREE.AdditiveBlending;
        beam.material.needsUpdate = true;
      });
      spectrumFans.forEach((fan) => {
        fan.material.blending = light ? THREE.NormalBlending : THREE.AdditiveBlending;
        fan.material.needsUpdate = true;
      });
      lightSources.forEach((source) => source.material.color.set(light ? 0x155eef : 0xffffff));
      render(performance.now(), true);
    };

    function render(now = performance.now(), force = false) {
      frameId = 0;
      pointers[0].lerp(pointerTargets[0], reduceMotion ? 1 : 0.055);
      pointers[1].lerp(pointerTargets[1], reduceMotion ? 1 : 0.055);
      uniforms.uTime.value = reduceMotion ? 0 : now / 1000;
      uniforms.uScroll.value += (scrollProgress - uniforms.uScroll.value) * (reduceMotion ? 1 : 0.06);
      uniforms.uPointerActive.value = pointerActive[0];
      uniforms.uPointer2Active.value = pointerActive[1];
      uniforms.uRipple.value = rippleStartedAt[0] < 0 ? -1 : (now - rippleStartedAt[0]) / 1700;
      uniforms.uRipple2.value = rippleStartedAt[1] < 0 ? -1 : (now - rippleStartedAt[1]) / 1700;
      updatePrism();
      renderer.setRenderTarget(backdropTarget);
      renderer.clear();
      renderer.render(scene, camera);
      renderer.setRenderTarget(null);
      renderer.clear();
      renderer.render(scene, camera);
      renderer.clearDepth();
      renderer.render(prismScene, prismCamera);
      if (!force && !reduceMotion && visible && !document.hidden) frameId = requestAnimationFrame(render);
    }

    function resize() {
      const bounds = heroSurface.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      renderer.setSize(bounds.width, bounds.height, false);
      uniforms.uResolution.value.set(bounds.width, bounds.height);
      uniforms.uMobile.value = bounds.width <= 780 ? 1 : 0;
      renderer.getDrawingBufferSize(glassDrawingBufferSize);
      backdropTarget.setSize(glassDrawingBufferSize.x, glassDrawingBufferSize.y);
      prismUniforms.uGlassResolution.value.copy(glassDrawingBufferSize);
      prismCamera.aspect = bounds.width / Math.max(bounds.height, 1);
      prismCamera.updateProjectionMatrix();
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
        x: THREE.MathUtils.clamp((clientX - bounds.left) / bounds.width, 0, 1),
        y: THREE.MathUtils.clamp(1 - (clientY - bounds.top) / bounds.height, 0, 1),
      };
    }

    function pointFromEvent(event) {
      return pointFromClient(event.clientX, event.clientY);
    }

    function setTouchPoint(touch, startRipple = false) {
      let slot = touchSlots.get(touch.identifier);
      if (slot === undefined) {
        const usedSlots = new Set(touchSlots.values());
        slot = usedSlots.has(0) ? (usedSlots.has(1) ? -1 : 1) : 0;
        if (slot < 0) return;
        touchSlots.set(touch.identifier, slot);
      }

      const point = pointFromClient(touch.clientX, touch.clientY);
      pointerActive[slot] = 1;
      pointerTargets[slot].set(point.x, point.y);

      if (startRipple) {
        pointers[slot].set(point.x, point.y);
        rippleOrigins[slot].set(point.x, point.y);
        rippleStartedAt[slot] = performance.now();
      }
    }

    function releaseTouch(touch) {
      const slot = touchSlots.get(touch.identifier);
      if (slot === undefined) return;
      touchSlots.delete(touch.identifier);
      pointerActive[slot] = 0;
    }

    function renderOnReducedMotion() {
      if (reduceMotion) render(performance.now(), true);
    }

    heroSurface.addEventListener("pointermove", (event) => {
      if (!finePointer || event.pointerType === "touch") return;
      const point = pointFromEvent(event);
      pointerActive[0] = 1;
      pointerTargets[0].set(point.x, point.y);
      renderOnReducedMotion();
    });

    heroSurface.addEventListener("pointerleave", (event) => {
      if (event.pointerType === "touch") return;
      pointerActive[0] = 0;
      pointerTargets[0].set(0.22, 0.66);
      renderOnReducedMotion();
    });

    heroSurface.addEventListener("pointerdown", (event) => {
      if (event.pointerType === "touch") return;
      if (event.button !== undefined && event.button !== 0) return;
      const point = pointFromEvent(event);
      pointerActive[0] = 1;
      rippleOrigins[0].set(point.x, point.y);
      pointerTargets[0].set(point.x, point.y);
      rippleStartedAt[0] = performance.now();
      renderOnReducedMotion();
    });

    heroSurface.addEventListener("touchstart", (event) => {
      Array.from(event.changedTouches).forEach((touch) => setTouchPoint(touch, true));
      renderOnReducedMotion();
      start();
    }, { passive: true });

    heroSurface.addEventListener("touchmove", (event) => {
      Array.from(event.changedTouches).forEach((touch) => setTouchPoint(touch));
      renderOnReducedMotion();
    }, { passive: true });

    heroSurface.addEventListener("touchend", (event) => {
      Array.from(event.changedTouches).forEach(releaseTouch);
      renderOnReducedMotion();
    }, { passive: true });

    heroSurface.addEventListener("touchcancel", (event) => {
      Array.from(event.changedTouches).forEach(releaseTouch);
      renderOnReducedMotion();
    }, { passive: true });

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
    resize();
    hero.classList.add("webgl-ready");
    render(performance.now(), true);
    start();
  } catch (error) {
    console.warn("SF Memory light field fallback enabled.", error);
  }
}

const fieldToggle = document.querySelector(".field-toggle");
const themeColor = document.querySelector('meta[name="theme-color"]');

function applyFieldTheme(light) {
  document.body.classList.toggle("theme-light", light);
  fieldToggle?.setAttribute("aria-pressed", String(light));
  fieldToggle?.setAttribute("aria-label", light ? "Switch to dark field" : "Switch to light field");
  const label = fieldToggle?.querySelector("span");
  if (label) label.textContent = light ? "Dark field" : "Light field";
  themeColor?.setAttribute("content", light ? "#edf3fb" : "#05070a");
  setPrismTheme(light);
}

fieldToggle?.addEventListener("click", () => {
  const nextLight = !document.body.classList.contains("theme-light");
  const bounds = fieldToggle.getBoundingClientRect();
  document.documentElement.style.setProperty("--flip-x", `${bounds.left + bounds.width / 2}px`);
  document.documentElement.style.setProperty("--flip-y", `${bounds.top + bounds.height / 2}px`);

  const commitTheme = () => applyFieldTheme(nextLight);
  if (document.startViewTransition && !reduceMotion) document.startViewTransition(commitTheme);
  else commitTheme();
});

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
    setMotionVariable("--hero-canvas-y", px(-22 * departure * amplitude), motionScenes.hero);
    setMotionVariable("--hero-canvas-scale", unit(1 + departure * (mobile ? 0.045 : 0.13)), motionScenes.hero);
    setMotionVariable("--hero-slit-x", px(viewportWidth * (0.1 + heroProgress * 1.22)), motionScenes.hero);
    setMotionVariable("--hero-slit-opacity", unit(Math.sin(heroProgress * Math.PI) * 0.72), motionScenes.hero);
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
