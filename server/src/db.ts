import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { config } from "./config.js";
import type { SessionMeta, SessionStatus } from "./types.js";

const dbDir = dirname(config.dbPath);
mkdirSync(dbDir, { recursive: true });

const db = new Database(config.dbPath);
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    command TEXT NOT NULL,
    args TEXT NOT NULL DEFAULT '[]',
    cwd TEXT NOT NULL DEFAULT '/root',
    env TEXT NOT NULL DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'stopped',
    pid INTEGER,
    created_at TEXT NOT NULL,
    last_active_at TEXT NOT NULL
  )
`);

const insertStmt = db.prepare(`
  INSERT OR REPLACE INTO sessions (id, name, command, args, cwd, env, status, pid, created_at, last_active_at)
  VALUES (@id, @name, @command, @args, @cwd, @env, @status, @pid, @created_at, @last_active_at)
`);

export function upsertSession(meta: SessionMeta): void {
  insertStmt.run({
    id: meta.id,
    name: meta.name,
    command: meta.command,
    args: JSON.stringify(meta.args),
    cwd: meta.cwd,
    env: JSON.stringify(meta.env),
    status: meta.status,
    pid: meta.pid,
    created_at: meta.createdAt,
    last_active_at: meta.lastActiveAt,
  });
}

export function updateSessionStatus(id: string, status: SessionStatus, pid: number | null): void {
  db.prepare("UPDATE sessions SET status = ?, pid = ?, last_active_at = ? WHERE id = ?").run(
    status,
    pid,
    new Date().toISOString(),
    id
  );
}

export function getSession(id: string): SessionMeta | null {
  const row = db.prepare("SELECT * FROM sessions WHERE id = ?").get(id) as Record<string, unknown> | undefined;
  if (!row) return null;
  return rowToMeta(row);
}

export function getAllSessions(): SessionMeta[] {
  const rows = db.prepare("SELECT * FROM sessions ORDER BY last_active_at DESC").all() as Record<string, unknown>[];
  return rows.map(rowToMeta);
}

export function deleteSession(id: string): void {
  db.prepare("DELETE FROM sessions WHERE id = ?").run(id);
}

function rowToMeta(row: Record<string, unknown>): SessionMeta {
  return {
    id: row.id as string,
    name: row.name as string,
    command: row.command as string,
    args: JSON.parse(row.args as string),
    cwd: row.cwd as string,
    env: JSON.parse(row.env as string),
    status: row.status as SessionStatus,
    pid: row.pid as number | null,
    createdAt: row.created_at as string,
    lastActiveAt: row.last_active_at as string,
    clientCount: 0,
  };
}

// db instance used internally; imports use named exports above
