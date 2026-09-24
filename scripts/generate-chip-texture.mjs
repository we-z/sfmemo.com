import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCanvas, GlobalFonts, Path2D, loadImage } from '@napi-rs/canvas';

// Offline version of the original canvas artwork from 731be32^:chip-3d.js.
// Keep its 1450 × 1000 layout coordinates, but rasterize every shape and glyph
// directly at the output resolution. Nothing here runs in the site's browser.
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const width = 4096;
const height = 2825;
const output = join(root, 'chip-surface-4k.webp');
if (!GlobalFonts.registerFromPath(join(root, 'chip-marking.ttf'), 'Chip Marking')) {
  throw new Error('Could not load the original Chip Marking font.');
}
const html = await readFile(join(root, 'index.html'), 'utf8');
const matrixSvg = html.match(/<svg\b[^>]*\bclass="hero-chip-matrix"[^>]*>([\s\S]*?)<\/svg>/)?.[1];
const matrixPath = matrixSvg?.match(/<path\b[^>]*\bd="([^"]+)"/)?.[1];
if (!matrixPath) throw new Error('The chip factory marking path is missing.');

const canvas = createCanvas(width, height);
const ctx = canvas.getContext('2d');
ctx.scale(width / 1450, height / 1000);
const gradient = ctx.createLinearGradient(0, 0, 1450, 1000);
gradient.addColorStop(0, '#242526');
gradient.addColorStop(1, '#121314');
ctx.fillStyle = gradient;
ctx.fillRect(0, 0, 1450, 1000);
let seed = 42;
const random = () => {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 4294967296;
};
function grain(amount) {
  // Work in device pixels throughout, independent of the logical drawing scale.
  ctx.save();
  ctx.resetTransform();
  const pixels = ctx.getImageData(0, 0, width, height);
  for (let i = 0; i < pixels.data.length; i += 4) {
    const noise = (random() - 0.5) * amount;
    for (let channel = 0; channel < 3; channel++) pixels.data[i + channel] += noise;
  }
  ctx.putImageData(pixels, 0, 0);
  ctx.restore();
}
grain(10);
ctx.fillStyle = '#73746e';
ctx.textBaseline = 'top';
const label = (text, x, y, size) => {
  const matrix = ctx.getTransform();
  const scale = Math.hypot(matrix.a, matrix.b);
  ctx.save();
  // Draw glyphs at their final pixel size while preserving the marking's rotation.
  ctx.setTransform(matrix.a / scale, matrix.b / scale, matrix.c / scale, matrix.d / scale, matrix.e, matrix.f);
  ctx.font = `${size * scale}px "Chip Marking"`;
  // Skia's top baseline for this font is 0.06 em above the original browser's.
  // Compensate so the baked markings retain their existing package positions.
  ctx.fillText(text, x * scale, (y + size * 0.06) * scale);
  ctx.restore();
};
label('sfmemo', 72, 65, 181);
label('SFM8H256A', 72, 320, 113);
label('CA01 / 2609', 72, 465, 113);
label('DTAHJM0042', 72, 635, 64);
label('Made in California', 135, 856, 73);
ctx.save();
ctx.translate(1390, 395);
ctx.rotate(Math.PI / 2);
label('B4 0836', 0, 0, 121);
ctx.restore();
ctx.save();
ctx.translate(1168, 20);
ctx.scale(260 / 52, 260 / 52);
ctx.fill(new Path2D(matrixPath));
ctx.restore();
const dot = ctx.createRadialGradient(91, 882, 3, 94, 890, 21);
dot.addColorStop(0, '#101112');
dot.addColorStop(0.8, '#171819');
dot.addColorStop(1, '#353737');
ctx.fillStyle = dot;
ctx.beginPath();
ctx.arc(94, 890, 20, 0, Math.PI * 2);
ctx.fill();
grain(7);
ctx.strokeStyle = '#373a3b';
ctx.lineWidth = 7;
ctx.strokeRect(4, 4, 1442, 992);
ctx.strokeStyle = '#101212';
ctx.lineWidth = 5;
ctx.strokeRect(13, 13, 1424, 974);

// The pinned Skia encoder uses lossless WebP at quality 100. Verify the decoded
// pixels, so future dependency changes cannot silently make this asset lossy.
const png = await canvas.encode('png');
const webp = await canvas.encode('webp', 100);
const decoded = await loadImage(webp);
if (decoded.width !== width || decoded.height !== height) {
  throw new Error('Encoded chip texture has incorrect dimensions.');
}
const verification = createCanvas(width, height);
verification.getContext('2d').drawImage(decoded, 0, 0);
const expected = ctx.getImageData(0, 0, width, height).data;
const actual = verification.getContext('2d').getImageData(0, 0, width, height).data;
if (!Buffer.from(expected.buffer).equals(Buffer.from(actual.buffer))) {
  throw new Error('WebP encoding changed the chip texture pixels.');
}
await writeFile(output, webp);
console.log(`chip-surface-4k.webp: ${width} × ${height}, ${webp.length.toLocaleString()} bytes, lossless`);
console.log(`Equivalent PNG: ${png.length.toLocaleString()} bytes; WebP saves ${((1 - webp.length / png.length) * 100).toFixed(1)}%.`);
