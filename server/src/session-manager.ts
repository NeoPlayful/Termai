import { spawn, type IPty } from "node-pty";
import { config } from "./config.js";
import * as db from "./db.js";
import type { SessionMeta, SessionConfig, SessionStatus } from "./types.js";

interface Session extends SessionMeta {
  pty: IPty | null;
  scrollback: string[];
  clients: Set<{ send: (msg: string) => void }>;
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
        clients: new Set(),
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
      cwd: cfg.cwd ?? (process.env.HOME || process.env.USERPROFILE || "/root"),
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
      clients: new Set(),
    };

    this.sessions.set(cfg.id, session);
    db.upsertSession(meta);
    this.startPty(cfg.id);
    return session;
  }

  private startPty(id: string): void {
    const session = this.sessions.get(id);
    if (!session) return;

    const env = {
      ...process.env,
      TERM: "xterm-256color",
      ...session.env,
    };

    const pty = spawn(session.command, session.args, {
      name: "xterm-256color",
      cols: 80,
      rows: 24,
      cwd: session.cwd,
      env: env as Record<string, string>,
    });

    session.pty = pty;
    session.pid = pty.pid;
    session.status = "running";
    session.lastActiveAt = new Date().toISOString();

    pty.onData((data: string) => {
      const msg = JSON.stringify({ type: "output", data });

      // Broadcast to all connected clients
      for (const client of session.clients) {
        try {
          client.send(msg);
        } catch {
          session.clients.delete(client);
        }
      }

      // Maintain scrollback buffer
      session.scrollback.push(data);
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
      for (const client of session.clients) {
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

  resize(id: string, cols: number, rows: number): void {
    const session = this.sessions.get(id);
    if (!session?.pty) return;
    try {
      session.pty.resize(cols, rows);
    } catch {
      // ignore resize errors
    }
  }

  attachClient(id: string, client: { send: (msg: string) => void }): void {
    const session = this.sessions.get(id);
    if (!session) return;

    // Auto-restart PTY if not running
    if (!session.pty) {
      this.startPty(id);
    }

    session.clients.add(client);
    db.upsertSession({ ...session, clientCount: session.clients.size });

    // Send scrollback history
    for (const chunk of session.scrollback) {
      try {
        client.send(JSON.stringify({ type: "output", data: chunk }));
      } catch {
        break;
      }
    }

    client.send(JSON.stringify({ type: "status", status: "connected" }));
  }

  detachClient(id: string, client: { send: (msg: string) => void }): void {
    const session = this.sessions.get(id);
    if (!session) return;
    session.clients.delete(client);
  }
}

export const sessionManager = new SessionManager();
