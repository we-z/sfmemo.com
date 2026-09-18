import * as THREE from "./vendor/three.module.js";

// Baked surface shading follows the silicon as it rotates and costs no work per frame.
const oxideTones = [0x749a80, 0xc7e9a0, 0x83d9b0, 0xe0f3cc].map((hex) => new THREE.Color(hex));
const shade = new THREE.Color();

export function dieSurfaceTint(u, v, phase = 0) {
  const sweep = THREE.MathUtils.clamp(u * 0.64 + v * 0.36, 0, 1) * (oxideTones.length - 1);
  const band = Math.min(Math.floor(sweep), oxideTones.length - 2);
  shade.copy(oxideTones[band]).lerp(oxideTones[band + 1], sweep - band);
  const reflection = 0.88 + 0.12 * Math.cos((u * 1.6 - v + phase) * Math.PI);
  return shade.multiplyScalar(reflection);
}

export function shadeDieGeometry(geometry, phase = 0) {
  geometry.computeBoundingBox();
  const { min, max } = geometry.boundingBox;
  const positions = geometry.attributes.position;
  const colors = new Float32Array(positions.count * 3);
  for (let index = 0; index < positions.count; index += 1) {
    const u = (positions.getX(index) - min.x) / Math.max(max.x - min.x, 0.001);
    const v = (positions.getZ(index) - min.z) / Math.max(max.z - min.z, 0.001);
    dieSurfaceTint(u, v, phase).toArray(colors, index * 3);
  }
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  return geometry;
}
