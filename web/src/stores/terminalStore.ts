import { create } from "zustand";

interface TerminalTab {
  sessionId: string;
  name: string;
}

interface TerminalState {
  activeSessionId: string | null;
  tabs: TerminalTab[];
  openTab: (sessionId: string, name: string) => void;
  closeTab: (sessionId: string) => void;
  setActiveTab: (sessionId: string) => void;
}

export const useTerminalStore = create<TerminalState>((set) => ({
  activeSessionId: null,
  tabs: [],

  openTab: (sessionId, name) => {
    set((state) => {
      const exists = state.tabs.some((t) => t.sessionId === sessionId);
      if (exists) {
        return { activeSessionId: sessionId };
      }
      return {
        tabs: [...state.tabs, { sessionId, name }],
        activeSessionId: sessionId,
      };
    });
  },

  closeTab: (sessionId) => {
    set((state) => {
      const tabs = state.tabs.filter((t) => t.sessionId !== sessionId);
      let activeSessionId = state.activeSessionId;
      if (activeSessionId === sessionId) {
        // Switch to the last remaining tab or null
        activeSessionId = tabs.length > 0 ? tabs[tabs.length - 1].sessionId : null;
      }
      return { tabs, activeSessionId };
    });
  },

  setActiveTab: (sessionId) => {
    set({ activeSessionId: sessionId });
  },
}));
