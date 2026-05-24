import { create } from "zustand";
import { messages, type Language } from "../i18n/messages.ts";

type Theme = "dark" | "light" | "system";

interface SettingsState {
  language: Language;
  theme: Theme;
  setLanguage: (lang: Language) => void;
  setTheme: (theme: Theme) => void;
}

function getInitialLanguage(): Language {
  const stored = localStorage.getItem("termai-language");
  if (stored === "zh-CN" || stored === "en") return stored;
  return "zh-CN";
}

function getInitialTheme(): Theme {
  const stored = localStorage.getItem("termai-theme");
  if (stored === "dark" || stored === "light" || stored === "system") return stored;
  return "system";
}

function getIsDark(theme: Theme): boolean {
  if (theme === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  }
  return theme === "dark";
}

function applyTheme(theme: Theme): void {
  const isDark = getIsDark(theme);
  document.documentElement.classList.toggle("dark", isDark);
  document.documentElement.classList.toggle("light", !isDark);
}

// Apply on load
applyTheme(getInitialTheme());

// Listen for system theme changes (only relevant in "system" mode)
const mq = window.matchMedia("(prefers-color-scheme: dark)");
mq.addEventListener("change", () => {
  const state = settingsStore.getState();
  if (state.theme === "system") {
    applyTheme("system");
  }
});

export const settingsStore = create<SettingsState>((set) => ({
  language: getInitialLanguage(),
  theme: getInitialTheme(),

  setLanguage: (language) => {
    localStorage.setItem("termai-language", language);
    set({ language });
  },

  setTheme: (theme) => {
    localStorage.setItem("termai-theme", theme);
    set({ theme });
    applyTheme(theme);
  },
}));

export function useT() {
  const language = settingsStore((s) => s.language);
  return (key: string): string => messages[language][key] ?? key;
}
