import Fastify from "fastify";
import cors from "@fastify/cors";
import fastifyWs from "@fastify/websocket";
import staticFiles from "@fastify/static";
import { existsSync } from "node:fs";
import { config } from "./config.js";
import { sessionManager } from "./session-manager.js";
import { registerTerminalWS } from "./terminal-ws.js";
import { getTemplates } from "./templates.js";
import type { CreateSessionRequest } from "./types.js";

const fastify = Fastify({ logger: true });

// CORS for development
await fastify.register(cors, { origin: true });

// WebSocket
await fastify.register(fastifyWs);
registerTerminalWS(fastify);

// Serve static web build in production
if (existsSync(config.webDir)) {
  await fastify.register(staticFiles, {
    root: config.webDir,
    prefix: "/",
  });
}

// ---- REST API ----

// GET /api/sessions
fastify.get("/api/sessions", async () => {
  return sessionManager.list();
});

// POST /api/sessions
fastify.post<{ Body: CreateSessionRequest }>(
  "/api/sessions",
  async (req, reply) => {
    const { id, name, command, args, cwd, env } = req.body;

    if (!id || !name || !command) {
      return reply.status(400).send({ error: "id, name, and command are required" });
    }

    try {
      sessionManager.create({
        id,
        name,
        command,
        args: args ?? [],
        cwd: cwd ?? (process.env.HOME || process.env.USERPROFILE || "/root"),
        env: env ?? {},
      });
      const meta = sessionManager.list().find((s) => s.id === id)!;
      return reply.status(201).send(meta);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return reply.status(409).send({ error: message });
    }
  }
);

// DELETE /api/sessions/:id
fastify.delete<{ Params: { id: string } }>(
  "/api/sessions/:id",
  async (req, reply) => {
    const session = sessionManager.get(req.params.id);
    if (!session) {
      return reply.status(404).send({ error: "Session not found" });
    }
    sessionManager.delete(req.params.id);
    return reply.status(204).send();
  }
);

// POST /api/sessions/:id/restart
fastify.post<{ Params: { id: string } }>(
  "/api/sessions/:id/restart",
  async (req, reply) => {
    const session = sessionManager.get(req.params.id);
    if (!session) {
      return reply.status(404).send({ error: "Session not found" });
    }
    sessionManager.restart(req.params.id);
    return { status: "restarted" };
  }
);

// GET /api/templates
fastify.get("/api/templates", async () => {
  return getTemplates();
});

// GET /api/sessions/:id
fastify.get<{ Params: { id: string } }>(
  "/api/sessions/:id",
  async (req, reply) => {
    const session = sessionManager.list().find((s) => s.id === req.params.id);
    if (!session) {
      return reply.status(404).send({ error: "Session not found" });
    }
    return session;
  }
);

// ---- Start Server ----

try {
  await fastify.listen({ port: config.port, host: config.host });
  fastify.log.info(`Termai server running on http://${config.host}:${config.port}`);
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
