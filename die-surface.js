import * as THREE from "./vendor/three.module.js";

// Local shading belongs to each circuit block, never to the whole green die.
export function shadeDieGeometry(geometry) {
  geometry.computeBoundingBox();
  const { min, max } = geometry.boundingBox;
  const positions = geometry.attributes.position;
  const colors = new Float32Array(positions.count * 3);
  const cool = new THREE.Color(0x889bb9);
  const warm = new THREE.Color(0xffefd5);
  const shade = new THREE.Color();
  for (let index = 0; index < positions.count; index += 1) {
    const u = (positions.getX(index) - min.x) / Math.max(max.x - min.x, 0.001);
    const v = (positions.getZ(index) - min.z) / Math.max(max.z - min.z, 0.001);
    const blend = THREE.MathUtils.smoothstep(u * 0.35 + v * 0.65, 0, 1);
    shade.copy(cool).lerp(warm, blend);
    const topFace = Math.abs(geometry.attributes.normal.getY(index));
    shade.multiplyScalar(0.55 + topFace * 0.45).toArray(colors, index * 3);
  }
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  return geometry;
}

export function partitionMemoryBanks(banks) {
  const families = [[0, 1], [3, 4], [2, 1], [4, 3]];
  return banks.flatMap((bank, bankIndex) => {
    const blocks = [];
    const columns = 4;
    const rows = 2;
    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        blocks.push({
          x: bank.x - bank.width / 2 + bank.width * (column + 0.5) / columns,
          z: bank.z - bank.depth / 2 + bank.depth * (row + 0.5) / rows,
          width: bank.width / columns,
          depth: bank.depth / rows,
          tone: families[bankIndex % families.length][(column + row) % 2],
        });
      }
    }
    return blocks;
  });
}
