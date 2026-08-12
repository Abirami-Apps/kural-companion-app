import { copyFile, mkdir, readdir, rename } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const workerSource = fileURLToPath(new URL("../worker/index.js", import.meta.url));
const distDirectory = fileURLToPath(new URL("../dist/", import.meta.url));
const clientDirectory = fileURLToPath(new URL("../dist/client/", import.meta.url));
const serverDirectory = fileURLToPath(new URL("../dist/server/", import.meta.url));
const serverEntry = fileURLToPath(new URL("../dist/server/index.js", import.meta.url));

await mkdir(clientDirectory, { recursive: true });

for (const entry of await readdir(distDirectory)) {
  if (entry === "client" || entry === "server") continue;
  await rename(join(distDirectory, entry), join(clientDirectory, entry));
}

await mkdir(serverDirectory, { recursive: true });
await copyFile(workerSource, serverEntry);

console.log(`Prepared Sites worker for ${projectRoot}`);
