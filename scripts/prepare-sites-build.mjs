import { copyFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const workerSource = fileURLToPath(new URL("../worker/index.js", import.meta.url));
const serverDirectory = fileURLToPath(new URL("../dist/server/", import.meta.url));
const serverEntry = fileURLToPath(new URL("../dist/server/index.js", import.meta.url));

await mkdir(serverDirectory, { recursive: true });
await copyFile(workerSource, serverEntry);

console.log(`Prepared Sites worker for ${projectRoot}`);
