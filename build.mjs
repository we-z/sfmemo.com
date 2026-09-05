import { copyFile, mkdir, rm } from "node:fs/promises";

await rm("dist", { recursive: true, force: true });
await mkdir("dist/client", { recursive: true });
await mkdir("dist/server", { recursive: true });

const publicFiles = [
  "index.html",
  "favicon.svg",
  "og-sfmemo-wordmark-2026.png",
  "robots.txt",
  "sitemap.xml",
  "llms.txt",
  "160c7627b72757bd5b12aab96bca9324.txt",
];

await Promise.all([
  ...publicFiles.map((file) => copyFile(file, `dist/client/${file}`)),
  copyFile("index.html", "dist/client/_document.txt"),
  copyFile("worker/index.js", "dist/server/index.js"),
]);
