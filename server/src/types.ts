// Shared types between server and client

export interface SessionConfig {
  id: string;
  name: string;
  command: string;
  args: string[];
  cwd: string;
  env?: Record<string, string>;
}

export type SessionStatus = "running" | "stopped" | "error";

export interface SessionMeta {
  id: string;
  name: string;
  command: string;
  args: string[];
  cwd: string;
  env: Record<string, string>;
  status: SessionStatus;
  pid: number | null;
  createdAt: string;
  lastActiveAt: string;
  clientCount: number;
}

export interface CreateSessionRequest {
  id: string;
  name: string;
  command: string;
  args?: string[];
  cwd?: string;
  env?: Record<string, string>;
}

// WebSocket message types
export type WSClientMessage =
  | { type: "input"; data: string }
  | { type: "resize"; cols: number; rows: number };

export type WSServerMessage =
  | { type: "output"; data: string }
  | { type: "status"; status: string; cols?: number; rows?: number }
  | { type: "error"; message: string };
