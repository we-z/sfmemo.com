import { copyFile, mkdir, rm } from "node:fs/promises";

await rm("dist", { recursive: true, force: true });
await mkdir("dist/client", { recursive: true });
await mkdir("dist/server", { recursive: true });
await mkdir("dist/client/vendor", { recursive: true });

const publicFiles = ["index.html", "styles.css", "visual.js", "hbm-stack.js", "systolic-array.js", "favicon.svg", "og-sfmemo-wordmark-2026.png", "robots.txt", "sitemap.xml"];

await Promise.all([
  ...publicFiles.map((file) => copyFile(file, `dist/client/${file}`)),
  copyFile("worker/index.js", "dist/server/index.js"),
  copyFile("node_modules/three/build/three.module.min.js", "dist/client/vendor/three.module.js"),
  copyFile("node_modules/three/build/three.core.min.js", "dist/client/vendor/three.core.min.js"),
]);
