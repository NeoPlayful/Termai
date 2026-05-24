import { useRef, useEffect, useCallback } from "react";
import type { WSServerMessage, WSClientMessage } from "../types.ts";

interface UseWebSocketOptions {
  sessionId: string | null;
  onOutput: (data: string) => void;
  onStatus: (status: string) => void;
  onError: (message: string) => void;
}

export function useWebSocket({ sessionId, onOutput, onStatus, onError }: UseWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const onOutputRef = useRef(onOutput);
  const onStatusRef = useRef(onStatus);
  const onErrorRef = useRef(onError);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const sessionIdRef = useRef(sessionId);

  onOutputRef.current = onOutput;
  onStatusRef.current = onStatus;
  onErrorRef.current = onError;
  sessionIdRef.current = sessionId;

  const send = useCallback((msg: WSClientMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  const connect = useCallback(() => {
    if (!sessionIdRef.current) return;
    const id = sessionIdRef.current;

    const existing = wsRef.current;
    if (existing && (existing.readyState === WebSocket.OPEN || existing.readyState === WebSocket.CONNECTING)) {
      return;
    }

    existing?.close();
    wsRef.current = null;

    const protocol = location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//${location.host}/ws/terminal?session=${id}`);
    wsRef.current = ws;

    ws.onopen = () => {
      onStatusRef.current("connected");
    };

    ws.onmessage = (event) => {
      try {
        const msg: WSServerMessage = JSON.parse(event.data);
        switch (msg.type) {
          case "output":
            onOutputRef.current(msg.data);
            break;
          case "status":
            onStatusRef.current(msg.status);
            break;
          case "error":
            onErrorRef.current(msg.message);
            break;
        }
      } catch {
        // binary data not expected
      }
    };

    ws.onclose = () => {
      onStatusRef.current("disconnected");
      reconnectTimer.current = setTimeout(connect, 2000);
    };

    ws.onerror = () => {
      // onclose will fire after this
    };
  }, []);

  const disconnect = useCallback(() => {
    clearTimeout(reconnectTimer.current);
    wsRef.current?.close();
    wsRef.current = null;
  }, []);

  useEffect(() => {
    if (sessionId) {
      connect();
    } else {
      disconnect();
    }
    return () => {
      disconnect();
    };
  }, [sessionId, connect, disconnect]);

  return { send, readyState: wsRef.current?.readyState ?? WebSocket.CLOSED };
}
