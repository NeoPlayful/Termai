import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = resolve(fileURLToPath(import.meta.url), "..");

interface Config {
  port: number;
  host: string;
  authToken: string | null;
  maxSessions: number;
  dbPath: string;
  scrollbackSize: number;
  webDir: string;
}

function loadConfig(): Config {
  const configPath = resolve(__dirname, "config.json");
  const defaults: Config = {
    port: 6688,
    host: "0.0.0.0",
    authToken: null,
    maxSessions: 10,
    dbPath: resolve(__dirname, "data", "sessions.db"),
    scrollbackSize: 2000,
    webDir: resolve(__dirname, "..", "web", "dist"),
  };

  if (existsSync(configPath)) {
    const user = JSON.parse(readFileSync(configPath, "utf-8"));
    return { ...defaults, ...user };
  }

  // Auto-create config.json on first run
  writeFileSync(configPath, JSON.stringify(defaults, null, 2));
  return defaults;
}

export const config = loadConfig();
