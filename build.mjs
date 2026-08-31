import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { feature } from "topojson-client";

await rm("dist", { recursive: true, force: true });
await mkdir("dist/client", { recursive: true });
await mkdir("dist/server", { recursive: true });
await mkdir("dist/client/vendor", { recursive: true });

const publicFiles = ["index.html", "styles.css", "visual.js", "hbm-stack.js", "systolic-array.js", "vision-map.js", "favicon.svg", "og-sfmemo-wordmark-2026.png", "robots.txt", "sitemap.xml"];

const mapBounds = { minX: -124.5, minY: 35.8, maxX: -120.2, maxY: 39.4 };

function clipRingToBounds(ring, bounds) {
  let points = ring.slice(0, -1);
  const clipEdge = (input, inside, intersect) => {
    if (!input.length) return [];
    const output = [];
    let previous = input[input.length - 1];
    let previousInside = inside(previous);
    input.forEach((current) => {
      const currentInside = inside(current);
      if (currentInside !== previousInside) output.push(intersect(previous, current));
      if (currentInside) output.push(current);
      previous = current;
      previousInside = currentInside;
    });
    return output;
  };
  const verticalIntersection = (x) => (start, end) => {
    const amount = (x - start[0]) / (end[0] - start[0]);
    return [x, start[1] + (end[1] - start[1]) * amount];
  };
  const horizontalIntersection = (y) => (start, end) => {
    const amount = (y - start[1]) / (end[1] - start[1]);
    return [start[0] + (end[0] - start[0]) * amount, y];
  };
  points = clipEdge(points, ([x]) => x >= bounds.minX, verticalIntersection(bounds.minX));
  points = clipEdge(points, ([x]) => x <= bounds.maxX, verticalIntersection(bounds.maxX));
  points = clipEdge(points, ([, y]) => y >= bounds.minY, horizontalIntersection(bounds.minY));
  points = clipEdge(points, ([, y]) => y <= bounds.maxY, horizontalIntersection(bounds.maxY));
  if (points.length < 3) return [];
  points.push([...points[0]]);
  return points;
}

const worldTopology = JSON.parse(await readFile("node_modules/world-atlas/land-10m.json", "utf8"));
const worldLand = feature(worldTopology, worldTopology.objects.land);
const sourceGeometries = worldLand.type === "FeatureCollection"
  ? worldLand.features.map((item) => item.geometry).filter(Boolean)
  : [worldLand.geometry].filter(Boolean);
const clippedPolygons = [];
sourceGeometries.forEach((geometry) => {
  const polygons = geometry.type === "MultiPolygon" ? geometry.coordinates : [geometry.coordinates];
  polygons.forEach((polygon) => {
    const rings = polygon.map((ring) => clipRingToBounds(ring, mapBounds)).filter((ring) => ring.length);
    if (rings.length) clippedPolygons.push(rings);
  });
});
const bayAreaLand = {
  type: "Feature",
  properties: {},
  geometry: { type: "MultiPolygon", coordinates: clippedPolygons },
};
await writeFile("dist/client/world-land.json", JSON.stringify(bayAreaLand));

await Promise.all([
  ...publicFiles.map((file) => copyFile(file, `dist/client/${file}`)),
  copyFile("worker/index.js", "dist/server/index.js"),
  copyFile("node_modules/three/build/three.module.min.js", "dist/client/vendor/three.module.js"),
  copyFile("node_modules/three/build/three.core.min.js", "dist/client/vendor/three.core.min.js"),
]);
