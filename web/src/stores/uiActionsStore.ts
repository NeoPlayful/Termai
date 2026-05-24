import { create } from "zustand";

interface UIActionsState {
  triggerCreate: number;
  triggerSettings: number;
  signalCreate: () => void;
  signalSettings: () => void;
}

export const useUIActions = create<UIActionsState>((set) => ({
  triggerCreate: 0,
  triggerSettings: 0,
  signalCreate: () => set((s) => ({ triggerCreate: s.triggerCreate + 1 })),
  signalSettings: () => set((s) => ({ triggerSettings: s.triggerSettings + 1 })),
}));
