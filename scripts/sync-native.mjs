import { spawnSync } from "node:child_process";

const platform = process.argv[2];
if (platform && platform !== "ios" && platform !== "android") {
  console.error("Usage: node scripts/sync-native.mjs [ios|android]");
  process.exit(2);
}

const executable = process.platform === "win32" ? "npm.cmd" : "npm";
const npxExecutable = process.platform === "win32" ? "npx.cmd" : "npx";
const safeEnvironment = {
  ...process.env,
  VITE_NATIVE_BUILD: "true",
  VITE_SUBSCRIPTIONS_ENABLED: "false",
  VITE_CHECKOUT_ENABLED: "false",
  VITE_SITE_URL: "https://kural.abirami.app",
};

const run = (command, args, environment = process.env) => {
  const result = spawnSync(command, args, {
    env: environment,
    stdio: "inherit",
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
};

console.log("Building the native shell with web checkout disabled.");
run(executable, ["run", "build"], safeEnvironment);
run(npxExecutable, ["cap", "sync", ...(platform ? [platform] : [])]);
