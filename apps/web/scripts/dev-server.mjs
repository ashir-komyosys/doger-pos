import { resolve } from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { loadRootEnv } from "../../../scripts/load-root-env.mjs";

const appDir = resolve(fileURLToPath(new URL("..", import.meta.url)));

loadRootEnv();
const port = process.env.DEV_PORT ?? "3030";
if (!/^\d{1,5}$/.test(port) || Number(port) < 1 || Number(port) > 65535) {
  throw new Error(`DEV_PORT must be a valid TCP port. Received: ${port}`);
}

const nextCli = resolve(appDir, "node_modules/next/dist/bin/next");
const child = spawn(process.execPath, [nextCli, "dev", "--port", port], {
  cwd: appDir,
  env: process.env,
  stdio: "inherit",
});

child.on("error", (error) => {
  console.error("Could not start the Next.js development server:", error);
  process.exitCode = 1;
});
child.on("exit", (code, signal) => {
  process.exitCode = code ?? (signal ? 1 : 0);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill(signal));
}
