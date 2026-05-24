# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Termai Manager** — A single-port, multi-session, multi-tab, process-persistent terminal manager. Browser closes, shells keep running. Refresh the page and reattach to the same shells.

### Key Architecture

```
Browser → HTTP/WS → Fastify Server :6688 → Session Manager → node-pty PTY Sessions
                                              ↕
                                           SQLite (sessions.db)
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + TypeScript |
| Shell UI | @xterm/xterm + @xterm/addon-fit |
| State | Zustand |
| Backend | Fastify 5 + TypeScript |
| PTY | node-pty |
| Persistence | better-sqlite3 (WAL mode) |

### Core Design Principles

1. **PTY lifecycle is independent of browser** — WebSocket disconnect does NOT kill the shell. Only explicit DELETE kills a session.
2. **Session Manager** owns all PTY processes in a `Map<sessionId, ptyProcess>`.
3. **WebSocket is just an attach channel** — pipes I/O between browser and PTY, doesn't own the PTY lifetime.
4. **Multi-client**: one session can have multiple WebSocket clients attached simultaneously.
5. **Scrollback buffer**: reconnecting clients receive the last N lines of terminal history.

## Project Structure

```
termai/
├── package.json              — Root workspace (concurrently runs both)
├── src/
│   ├── server/               — Fastify backend
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── config.json
│   │   ├── index.ts              — Fastify entry, REST routes, server start
│   │   ├── config.ts             — Config loading (port, auth, limits)
│   │   ├── db.ts                 — SQLite schema + CRUD
│   │   ├── session-manager.ts    — PTY lifecycle, scrollback, client tracking
│   │   ├── terminal-ws.ts        — WebSocket ↔ PTY bridge
│   │   └── types.ts              — Shared types (SessionMeta, WS messages)
│   └── web/                  — React frontend
│       ├── package.json
│       ├── tsconfig.json
│       ├── vite.config.ts
│       ├── index.html
│       ├── main.tsx              — React entry
│       ├── App.tsx               — Layout: sidebar + tabs + terminal
│       ├── index.css             — Tailwind import
│       ├── types.ts              — Client-side types
│       ├── stores/
│       │   ├── sessionStore.ts   — Session CRUD state
│       │   └── terminalStore.ts  — Tab management state
│       ├── hooks/
│       │   └── useWebSocket.ts   — WebSocket connection + auto-reconnect
│       └── components/
│           ├── Sidebar.tsx       — Session list + create modal
│           ├── Tabs.tsx          — Tab bar for open sessions
│           └── Terminal.tsx      — xterm.js wrapper
└── docs/
    ├── Termai 项目需求技术方案.md
    ├── plan-phase1.md
    └── plan-phase2.md
```

## Development Commands

```bash
# Install all dependencies
cd src/server && npm install
cd ../web && npm install
cd ../..

# Run both server + web in dev mode (Vite proxies API/WS to :6688)
npm run dev

# Or run individually:
npm run dev:server   # tsx watch, port 6688
npm run dev:web      # Vite dev, port 5173

# Build for production
npm run build
npm start            # serves web/dist from Fastify
```

## Key Files to Know

- `src/server/session-manager.ts` — Core business logic: PTY create/kill/restart, scrollback ring buffer, multi-client broadcast
- `src/server/terminal-ws.ts` — WebSocket message routing (input → PTY, PTY output → broadcast)
- `src/server/db.ts` — SQLite schema & prepared statements
- `src/web/hooks/useWebSocket.ts` — WS lifecycle with 2s auto-reconnect
- `src/web/components/Terminal.tsx` — xterm.js init, resize observer, Tokyo Night theme

## Session Data Model

```json
{
  "id": "claude-code",
  "name": "Claude Code",
  "command": "bash",
  "args": [],
  "cwd": "/root/projects/claude",
  "env": {},
  "status": "running",
  "pid": 12345,
  "createdAt": "2026-05-23T10:00:00Z",
  "lastActiveAt": "2026-05-23T10:30:00Z",
  "clientCount": 1
}
```

## REST API

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/sessions` | List sessions |
| POST | `/api/sessions` | Create session |
| DELETE | `/api/sessions/:id` | Delete session (kills process) |
| POST | `/api/sessions/:id/restart` | Restart session |
| WS | `/ws/terminal?session=<id>` | Attach to terminal |

## WebSocket Messages

Client → Server:
- `{ "type": "input", "data": "ls -la\n" }`
- `{ "type": "resize", "cols": 120, "rows": 32 }`

Server → Client:
- `{ "type": "output", "data": "..." }`
- `{ "type": "status", "status": "connected" }`
- `{ "type": "error", "message": "..." }`

## Implementation Roadmap

1. **MVP** ✅ Done — Single port, sidebar + xterm.js, create/delete sessions, WS I/O, scrollback, SQLite persistence, auto-reconnect
2. **Multi-tab** ✅ Done — Tab bar, multiple open sessions, tab switching without restart
3. **Session templates** — Preconfigured sessions (Claude Code, SSH, Bash, etc.)
4. **Security** — Auth token, env-based, HTTPS
5. **Advanced** — Search, history, replay, terminal recording, mobile
