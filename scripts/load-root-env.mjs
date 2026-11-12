import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const repoDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export function loadRootEnv() {
  const envFile = resolve(repoDir, ".env");
  if (!existsSync(envFile)) return;

  for (const rawLine of readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator < 1) continue;
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim().replace(/^(['"])(.*)\1$/, "$2");
    if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) process.env[key] ??= value;
  }

  // Keep the current Prisma backend compatible with the shared root .env.
  if (!process.env.DATABASE_URL && process.env.SUPABASE_DATABASE_URL?.trim()) {
    process.env.DATABASE_URL = process.env.SUPABASE_DATABASE_URL;
  }
}
