import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

const androidDirectory = path.resolve("android");
const gradleCommand = process.platform === "win32" ? "gradlew.bat" : "./gradlew";
const environment = { ...process.env };

if (process.platform === "darwin") {
  const androidStudioJava = "/Applications/Android Studio.app/Contents/jbr/Contents/Home";

  if (existsSync(androidStudioJava)) {
    environment.JAVA_HOME = androidStudioJava;
  }
}

const result = spawnSync(
  gradleCommand,
  ["assembleDebug", "--no-daemon", "--console=plain"],
  {
    cwd: androidDirectory,
    env: environment,
    stdio: "inherit",
    shell: process.platform === "win32",
  },
);

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
