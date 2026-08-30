import { copyFile, mkdir, rm } from "node:fs/promises";

await rm("dist", { recursive: true, force: true });
await mkdir("dist/client", { recursive: true });
await mkdir("dist/server", { recursive: true });

const publicFiles = ["index.html", "favicon.svg", "robots.txt", "sitemap.xml"];

await Promise.all([
  ...publicFiles.map((file) => copyFile(file, `dist/client/${file}`)),
  copyFile("worker/index.js", "dist/server/index.js"),
]);

try {
  await copyFile("og.png", "dist/client/og.png");
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
}
