import type { FastifyInstance } from "fastify";
import { WebSocket } from "ws";
import { sessionManager } from "./session-manager.js";
import type { WSClientMessage } from "./types.js";

export function registerTerminalWS(fastify: FastifyInstance): void {
  fastify.get(
    "/ws/terminal",
    { websocket: true },
    (socket: WebSocket, req) => {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const sessionId = url.searchParams.get("session");

      if (!sessionId || !sessionManager.get(sessionId)) {
        socket.send(
          JSON.stringify({ type: "error", message: "Invalid or missing session" })
        );
        socket.close();
        return;
      }

      const client = {
        send: (msg: string) => {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(msg);
          }
        },
      };

      sessionManager.attachClient(sessionId, client);

      socket.on("message", (raw: Buffer) => {
        try {
          const msg: WSClientMessage = JSON.parse(raw.toString());

          switch (msg.type) {
            case "input":
              sessionManager.write(sessionId, msg.data);
              break;
            case "resize":
              sessionManager.resize(sessionId, msg.cols, msg.rows);
              break;
          }
        } catch {
          socket.send(JSON.stringify({ type: "error", message: "Invalid message" }));
        }
      });

      socket.on("close", () => {
        sessionManager.detachClient(sessionId, client);
      });

      socket.on("error", () => {
        sessionManager.detachClient(sessionId, client);
      });
    }
  );
}
