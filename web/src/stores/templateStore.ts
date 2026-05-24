import { create } from "zustand";
interface SessionTemplate {
  id: string;
  name: string;
  description?: string;
  command: string;
  args?: string[];
  cwd?: string;
  env?: Record<string, string>;
  icon?: string;
  platform?: string[];
  group?: string;
}

interface TemplateState {
  templates: SessionTemplate[];
  loading: boolean;
  fetchTemplates: () => Promise<void>;
}

export const useTemplateStore = create<TemplateState>((set) => ({
  templates: [],
  loading: false,

  fetchTemplates: async () => {
    set({ loading: true });
    try {
      const res = await fetch("/api/templates");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const templates: SessionTemplate[] = await res.json();
      set({ templates, loading: false });
    } catch {
      set({ loading: false });
    }
  },
}));
