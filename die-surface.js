import * as THREE from "./vendor/three.module.js";

// Baked surface shading follows the silicon as it rotates and costs no work per frame.
const oxideTones = [0x305bc0, 0x7050c1, 0xbe5ba7, 0xe99a60, 0xe8ce78, 0x70bdb4, 0x417cc5].map((hex) => new THREE.Color(hex));
const shade = new THREE.Color();

export function dieSurfaceTint(u, v, phase = 0) {
  const opticalPath = u * 0.68 + v * 0.32 + 0.055 * Math.sin((v * 1.5 + phase) * Math.PI);
  const sweep = THREE.MathUtils.clamp(opticalPath, 0, 1) * (oxideTones.length - 1);
  const band = Math.min(Math.floor(sweep), oxideTones.length - 2);
  const blend = THREE.MathUtils.smoothstep(sweep - band, 0, 1);
  shade.copy(oxideTones[band]).lerp(oxideTones[band + 1], blend);
  const reflection = 0.85 + 0.15 * Math.cos((u * 1.6 - v + phase) * Math.PI);
  return shade.multiplyScalar(reflection * 1.3);
}

export function shadeDieGeometry(geometry, phase = 0) {
  // Straight extruded caps otherwise sample the gradient only at their corners.
  // Three midpoint passes add smooth bands without adding per-frame work.
  if (geometry.type === "ExtrudeGeometry") {
    if (geometry.index) geometry = geometry.toNonIndexed();
    for (let pass = 0; pass < 3; pass += 1) {
      for (const [name, attribute] of Object.entries(geometry.attributes)) {
        const size = attribute.itemSize;
        const source = attribute.array;
        const expanded = new Float32Array(source.length * 4);
        const corners = [[0, 0], [0, 1], [2, 0], [0, 1], [1, 1], [1, 2], [2, 0], [1, 2], [2, 2], [0, 1], [1, 2], [2, 0]];
        for (let triangle = 0; triangle < attribute.count / 3; triangle += 1) {
          corners.forEach(([a, b], vertex) => {
            for (let component = 0; component < size; component += 1) {
              expanded[(triangle * 12 + vertex) * size + component] =
                (source[(triangle * 3 + a) * size + component] + source[(triangle * 3 + b) * size + component]) * 0.5;
            }
          });
        }
        geometry.setAttribute(name, new THREE.BufferAttribute(expanded, size));
      }
    }
    geometry.clearGroups();
    geometry.normalizeNormals();
  }
  geometry.computeBoundingBox();
  const { min, max } = geometry.boundingBox;
  const positions = geometry.attributes.position;
  const colors = new Float32Array(positions.count * 3);
  for (let index = 0; index < positions.count; index += 1) {
    const u = (positions.getX(index) - min.x) / Math.max(max.x - min.x, 0.001);
    const v = (positions.getZ(index) - min.z) / Math.max(max.z - min.z, 0.001);
    const surfaceColor = dieSurfaceTint(u, v, phase);
    // Exposed silicon carries the spectrum; cut edges remain darker and metallic.
    const face = Math.abs(geometry.attributes.normal.getY(index));
    surfaceColor.multiplyScalar(0.4 + face * 0.6).toArray(colors, index * 3);
  }
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  return geometry;
}
