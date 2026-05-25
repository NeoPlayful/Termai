import { spawn, type IPty } from "node-pty";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { config } from "./config.js";
import * as db from "./db.js";
import type { SessionMeta, SessionConfig, SessionStatus } from "./types.js";

type Client = { send: (msg: string) => void };

interface Session extends SessionMeta {
  pty: IPty | null;
  scrollback: string[];
  clients: Map<Client, { cols: number; rows: number }>;
}

class SessionManager {
  private sessions = new Map<string, Session>();

  constructor() {
    this.restoreSessions();
  }

  private restoreSessions(): void {
    const all = db.getAllSessions();
    for (const meta of all) {
      const session: Session = {
        ...meta,
        status: "stopped",
        pid: null,
        pty: null,
        scrollback: [],
        clients: new Map(),
      };
      // Persist corrected status back to DB
      db.updateSessionStatus(meta.id, "stopped", null);
      this.sessions.set(meta.id, session);
    }
  }

  list(): SessionMeta[] {
    return Array.from(this.sessions.values()).map((s) => ({
      id: s.id,
      name: s.name,
      command: s.command,
      args: s.args,
      cwd: s.cwd,
      env: s.env,
      status: s.status,
      pid: s.pid,
      createdAt: s.createdAt,
      lastActiveAt: s.lastActiveAt,
      clientCount: s.clients.size,
    }));
  }

  get(id: string): Session | undefined {
    return this.sessions.get(id);
  }

  create(cfg: SessionConfig): Session {
    if (this.sessions.has(cfg.id)) {
      throw new Error(`Session "${cfg.id}" already exists`);
    }
    if (this.sessions.size >= config.maxSessions) {
      throw new Error(`Max sessions (${config.maxSessions}) reached`);
    }

    const now = new Date().toISOString();
    const meta: SessionMeta = {
      id: cfg.id,
      name: cfg.name,
      command: cfg.command,
      args: cfg.args ?? [],
      cwd: cfg.cwd ?? homedir(),
      env: cfg.env ?? {},
      status: "stopped",
      pid: null,
      createdAt: now,
      lastActiveAt: now,
      clientCount: 0,
    };

    const session: Session = {
      ...meta,
      pty: null,
      scrollback: [],
      clients: new Map(),
    };

    this.sessions.set(cfg.id, session);
    db.upsertSession(meta);
    this.startPty(cfg.id);
    return session;
  }

  private startPty(id: string): void {
    const session = this.sessions.get(id);
    if (!session) return;

    // Filter dangerous env vars from user-provided env
    const BLOCKED_ENV = new Set(["LD_PRELOAD", "LD_LIBRARY_PATH", "DYLD_INSERT_LIBRARIES", "DYLD_LIBRARY_PATH"]);
    const safeUserEnv = Object.fromEntries(
      Object.entries(session.env).filter(([k]) => !BLOCKED_ENV.has(k))
    );
    const env: Record<string, string | undefined> = {
      ...process.env,
      TERM: "xterm-256color",
      ...safeUserEnv,
    };

    // Ensure PATH is set for node-pty spawn (macOS launchd/IDE may have minimal PATH)
    if (!env.PATH) {
      env.PATH = process.platform === "win32"
        ? "C:\\Windows\\System32;C:\\Windows;C:\\Program Files\\nodejs"
        : "/usr/local/bin:/usr/bin:/bin:/opt/homebrew/bin:/opt/local/bin";
    }

    let pty: IPty;
    let command = session.command;
    let args = session.args;
    let resolvedPath: string | null = null;

    const knownPaths: Record<string, string[]> = process.platform === "win32" ? {
      bash: ["C:\\Program Files\\Git\\bin\\bash.exe", "C:\\msys64\\usr\\bin\\bash.exe"],
      python: ["C:\\Python312\\python.exe", "C:\\Python311\\python.exe", "C:\\Program Files\\Python312\\python.exe"],
      node: ["C:\\Program Files\\nodejs\\node.exe"],
      claude: ["C:\\Program Files\\nodejs\\claude.cmd"],
    } : {
      bash: ["/bin/bash", "/usr/bin/bash", "/usr/local/bin/bash"],
      zsh: ["/bin/zsh", "/usr/bin/zsh", "/usr/local/bin/zsh"],
      sh: ["/bin/sh"],
      fish: ["/usr/local/bin/fish", "/opt/homebrew/bin/fish"],
      python: ["/usr/bin/python3", "/usr/local/bin/python3", "/opt/homebrew/bin/python3"],
      node: ["/usr/local/bin/node", "/opt/homebrew/bin/node"],
      claude: ["/usr/local/bin/claude", "/opt/homebrew/bin/claude"],
      htop: ["/usr/bin/htop", "/usr/local/bin/htop", "/opt/homebrew/bin/htop"],
    };

    // Resolve command path for cross-platform compatibility:
    // - Windows: .cmd scripts need cmd.exe /c wrapper
    // - Unix:    resolve via `which` + known path fallback
    if (process.platform === "win32") {
      try {
        execFileSync("where", [`${session.command}.cmd`], { encoding: "utf8", stdio: "pipe" });
        command = "cmd.exe";
        args = ["/c", session.command, ...session.args];
      } catch { /* not a .cmd, proceed with normal spawn */ }
    } else {
      // Try `which` first
      try {
        resolvedPath = execFileSync("which", [session.command], { encoding: "utf8", stdio: "pipe" }).trim();
      } catch { /* which failed */ }
      // Fallback: common absolute paths for well-known commands
      if (!resolvedPath) {
        const candidates = knownPaths[session.command];
        if (candidates) {
          resolvedPath = candidates.find((p) => existsSync(p)) ?? null;
        }
      }
      if (resolvedPath) command = resolvedPath;
    }

    try {
      pty = spawn(command, args, {
        name: "xterm-256color",
        cols: 80,
        rows: 24,
        cwd: session.cwd,
        env: env as Record<string, string>,
      });
    } catch (err) {
      const msg = JSON.stringify({
        type: "error",
        message: `Failed to start "${session.command}": ${err instanceof Error ? err.message : "Unknown error"}`,
      });
      for (const [client] of session.clients) {
        try { client.send(msg); } catch { /* ignore */ }
      }
      return;
    }

    session.pty = pty;
    session.pid = pty.pid;
    session.status = "running";
    session.lastActiveAt = new Date().toISOString();

    // CPR responses (ESC[row;colR) echoed back by PTY — strip them from output
    const CPR_RE = /\x1b\[\d+;\d+R/g;

    pty.onData((data: string) => {
      const filtered = data.replace(CPR_RE, "");
      if (!filtered) return;
      const msg = JSON.stringify({ type: "output", data: filtered });

      // Broadcast to all connected clients
      for (const [client] of session.clients) {
        try {
          client.send(msg);
        } catch {
          session.clients.delete(client);
        }
      }

      // Maintain scrollback buffer
      session.scrollback.push(filtered);
      if (session.scrollback.length > config.scrollbackSize) {
        session.scrollback.shift();
      }
    });

    pty.onExit(() => {
      session.pty = null;
      session.pid = null;
      session.status = "stopped";
      db.updateSessionStatus(id, "stopped", null);

      // Notify clients
      const exitMsg = JSON.stringify({
        type: "status",
        status: "process_exited",
      });
      for (const [client] of session.clients) {
        try {
          client.send(exitMsg);
        } catch {
          // ignore
        }
      }
    });

    db.updateSessionStatus(id, "running", pty.pid);
  }

  delete(id: string): void {
    const session = this.sessions.get(id);
    if (!session) return;

    // Kill the PTY process
    if (session.pty) {
      try {
        session.pty.kill();
      } catch {
        // process may already be dead
      }
    }

    this.sessions.delete(id);
    db.deleteSession(id);
  }

  restart(id: string): void {
    const session = this.sessions.get(id);
    if (!session) return;

    // Kill existing PTY if running
    if (session.pty) {
      try {
        session.pty.kill();
      } catch {
        // ignore
      }
    }

    session.scrollback = [];
    this.startPty(id);
  }

  write(id: string, data: string): void {
    const session = this.sessions.get(id);
    if (!session?.pty) return;
    session.pty.write(data);
    session.lastActiveAt = new Date().toISOString();
  }

  resize(id: string, client: Client, cols: number, rows: number): void {
    const session = this.sessions.get(id);
    if (!session) return;
    const existing = session.clients.get(client);
    if (existing) {
      existing.cols = cols;
      existing.rows = rows;
    }
    // Only resize PTY when there's a single client — multiple clients would
    // cause SIGWINCH storms and corrupt each other's terminal layout.
    // Exception: in multi-client mode, allow cols-only resize (keep rows stable
    // so TUI programs like Hermes don't re-render their height layout).
    if (!session.pty) return;
    const ptyCols = (session.pty as any).cols ?? 80;
    const ptyRows = (session.pty as any).rows ?? 24;
    if (session.clients.size > 1) {
      if (cols === ptyCols) return; // no change
      try { session.pty.resize(cols, ptyRows); } catch { /* ignore */ }
      return;
    }
    try {
      session.pty.resize(cols, rows);
    } catch { /* ignore resize errors */ }
  }

  attachClient(id: string, client: { send: (msg: string) => void }): void {
    const session = this.sessions.get(id);
    if (!session) return;
    console.log(`[attach] session=${id} clients_before=${session.clients.size}`);

    // Auto-restart PTY if not running
    if (!session.pty) {
      this.startPty(id);
    }

    session.clients.set(client, { cols: 80, rows: 24 });
    db.upsertSession({ ...session, clientCount: session.clients.size });

    // If PTY failed to start, notify client
    if (!session.pty) {
      try {
        client.send(JSON.stringify({
          type: "error",
          message: `Command "${session.command}" not found or failed to start`,
        }));
      } catch { /* ignore */ }
      return;
    }

    // Send PTY size first so client resizes xterm before receiving scrollback
    // multiClient: true tells the new client not to send resize (would cause SIGWINCH on others)
    const isMultiClient = session.clients.size > 1;
    const ptySize = { cols: (session.pty as any).cols ?? 80, rows: (session.pty as any).rows ?? 24 };
    client.send(JSON.stringify({ type: "status", status: "connected", ...ptySize, multiClient: isMultiClient }));

    // Send scrollback history
    for (const chunk of session.scrollback) {
      try {
        client.send(JSON.stringify({ type: "output", data: chunk }));
      } catch {
        break;
      }
    }
  }

  detachClient(id: string, client: { send: (msg: string) => void }): void {
    const session = this.sessions.get(id);
    if (!session) return;
    console.log(`[detach] session=${id} clients_before=${session.clients.size}`);
    session.clients.delete(client);
  }
}

export const sessionManager = new SessionManager();
