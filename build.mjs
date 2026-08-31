import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { feature } from "topojson-client";

await rm("dist", { recursive: true, force: true });
await mkdir("dist/client", { recursive: true });
await mkdir("dist/server", { recursive: true });
await mkdir("dist/client/vendor", { recursive: true });

const publicFiles = ["index.html", "styles.css", "visual.js", "hbm-stack.js", "systolic-array.js", "vision-map.js", "favicon.svg", "og-sfmemo-wordmark-2026.png", "robots.txt", "sitemap.xml"];

const worldTopology = JSON.parse(await readFile("node_modules/world-atlas/land-110m.json", "utf8"));
const worldLand = feature(worldTopology, worldTopology.objects.land);
await writeFile("dist/client/world-land.json", JSON.stringify(worldLand));

await Promise.all([
  ...publicFiles.map((file) => copyFile(file, `dist/client/${file}`)),
  copyFile("worker/index.js", "dist/server/index.js"),
  copyFile("node_modules/three/build/three.module.min.js", "dist/client/vendor/three.module.js"),
  copyFile("node_modules/three/build/three.core.min.js", "dist/client/vendor/three.core.min.js"),
]);
