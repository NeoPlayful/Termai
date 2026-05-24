import { create } from "zustand";
import type { SessionMeta } from "../types.ts";

function sessionsEqual(a: SessionMeta[], b: SessionMeta[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i].id !== b[i].id || a[i].status !== b[i].status || a[i].clientCount !== b[i].clientCount) {
      return false;
    }
  }
  return true;
}

interface SessionState {
  sessions: SessionMeta[];
  loading: boolean;
  error: string | null;
  fetchSessions: () => Promise<void>;
  fetchSessionsInitial: () => Promise<void>;
  createSession: (req: {
    id: string;
    name: string;
    command: string;
    args?: string[];
    cwd?: string;
  }) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
  restartSession: (id: string) => Promise<void>;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  sessions: [],
  loading: false,
  error: null,

  fetchSessions: async () => {
    try {
      const res = await fetch("/api/sessions");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const sessions: SessionMeta[] = await res.json();
      if (!sessionsEqual(get().sessions, sessions)) {
        set({ sessions });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to fetch sessions";
      set({ error: message });
    }
  },

  fetchSessionsInitial: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetch("/api/sessions");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const sessions: SessionMeta[] = await res.json();
      set({ sessions, loading: false });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to fetch sessions";
      set({ error: message, loading: false });
    }
  },

  createSession: async (req) => {
    set({ error: null });
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      // Refresh list
      const sessions = await fetch("/api/sessions").then((r) => r.json());
      if (!sessionsEqual(get().sessions, sessions)) {
        set({ sessions });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create session";
      set({ error: message });
    }
  },

  deleteSession: async (id) => {
    try {
      await fetch(`/api/sessions/${id}`, { method: "DELETE" });
      set((state) => ({
        sessions: state.sessions.filter((s) => s.id !== id),
      }));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to delete session";
      set({ error: message });
    }
  },

  restartSession: async (id) => {
    try {
      await fetch(`/api/sessions/${id}/restart`, { method: "POST" });
      const sessions = await fetch("/api/sessions").then((r) => r.json());
      if (!sessionsEqual(get().sessions, sessions)) {
        set({ sessions });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to restart session";
      set({ error: message });
    }
  },
}));
