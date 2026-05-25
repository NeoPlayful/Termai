import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

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
  const configDir = resolve(__dirname, "..");
  const configPath = resolve(configDir, "config.json");
  const defaults: Config = {
    port: 6688,
    host: "0.0.0.0",
    authToken: null,
    maxSessions: 10,
    dbPath: resolve(configDir, "data", "sessions.db"),
    scrollbackSize: 100000,
    webDir: resolve(configDir, "..", "web", "dist"),
    templatesPath: resolve(configDir, "templates.json"),
  };

  if (existsSync(configPath)) {
    const user = JSON.parse(readFileSync(configPath, "utf-8")) as Partial<Config>;
    // Resolve relative paths from config directory
    for (const key of ["dbPath", "webDir", "templatesPath"] as const) {
      if (typeof user[key] === "string" && !user[key]!.startsWith("/") && !user[key]!.match(/^[A-Za-z]:\\/)) {
        user[key] = resolve(configDir, user[key]!) as Config[typeof key];
      }
    }
    return { ...defaults, ...user };
  }

  // Auto-create config.json with relative paths on first run
  const portable: Record<string, unknown> = { ...defaults };
  portable.dbPath = "data/sessions.db";
  portable.webDir = "../web/dist";
  portable.templatesPath = "templates.json";
  writeFileSync(configPath, JSON.stringify(portable, null, 2) + "\n");
  return defaults;
}

export const config = loadConfig();
