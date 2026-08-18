import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Loads apps/demo-agent/.env.local (written by seed.ts) then the repo-root .env, if present. */
export function loadEnv(): void {
  for (const relative of ["../.env.local", "../../../.env"]) {
    try {
      process.loadEnvFile(path.resolve(__dirname, relative));
    } catch {
      // File doesn't exist yet — fine, env vars may already be exported in the shell.
    }
  }
}
