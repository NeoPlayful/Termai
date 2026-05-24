import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

interface Config {
  port: number;
  host: string;
  authToken: string | null;
  maxSessions: number;
  dbPath: string;
  scrollbackSize: number;
  webDir: string;
  templatesPath: string;
}

function loadConfig(): Config {
  const configPath = resolve(process.cwd(), "config.json");
  const defaults: Config = {
    port: 6688,
    host: "0.0.0.0",
    authToken: null,
    maxSessions: 10,
    dbPath: resolve(process.cwd(), "data", "sessions.db"),
    scrollbackSize: 100000,
    webDir: resolve(process.cwd(), "..", "web", "dist"),
    templatesPath: "templates.json",
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
