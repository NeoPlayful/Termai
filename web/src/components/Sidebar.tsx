import { useState } from "react";
import { Cog6ToothIcon } from "@heroicons/react/24/outline";
import { useSessionStore } from "../stores/sessionStore.ts";
import { useTerminalStore } from "../stores/terminalStore.ts";
import { TemplatePicker } from "./TemplatePicker.tsx";
import { SettingsPanel } from "./SettingsPanel.tsx";
import { useT } from "../stores/settingsStore.ts";

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

interface SidebarProps {
  onSelectSession: (id: string, name: string) => void;
  activeSessionId: string | null;
}

export function Sidebar({ onSelectSession, activeSessionId }: SidebarProps) {
  const { sessions, loading, createSession, deleteSession } = useSessionStore();
  const openTab = useTerminalStore((s) => s.openTab);
  const [showCreate, setShowCreate] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [mode, setMode] = useState<"picker" | "form">("picker");
  const [form, setForm] = useState({ id: "", name: "", command: "", cwd: "" });
  const t = useT();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.id || !form.name) return;
    await createSession({
      id: form.id,
      name: form.name,
      command: form.command,
      cwd: form.cwd || undefined,
    });
    setForm({ id: "", name: "", command: "", cwd: "" });
    setShowCreate(false);
    setMode("picker");
    openTab(form.id, form.name);
  };

  const handleTemplateSelect = async (tpl: SessionTemplate) => {
    setShowCreate(false);
    setMode("picker");
    // Check if session with same id already exists
    if (sessions.some((s) => s.id === tpl.id)) {
      const newId = `${tpl.id}-${Date.now().toString(36)}`;
      await createSession({
        id: newId,
        name: tpl.name,
        command: tpl.command,
        args: tpl.args,
        cwd: tpl.cwd,
      });
      openTab(newId, tpl.name);
    } else {
      await createSession({
        id: tpl.id,
        name: tpl.name,
        command: tpl.command,
        args: tpl.args,
        cwd: tpl.cwd,
      });
      openTab(tpl.id, tpl.name);
    }
  };

  const openCreate = () => {
    setMode("picker");
    setShowCreate(true);
  };

  const closeCreate = () => {
    setShowCreate(false);
    setMode("picker");
  };

  return (
    <aside className="w-64 flex flex-col h-full" style={{backgroundColor: 'var(--bg-sidebar)', borderRight: '1px solid var(--border-default)'}}>
      {/* Header */}
      <div className="p-3 flex items-center justify-between" style={{borderBottom: '1px solid var(--border-default)'}}>
        <h1 className="text-sm font-semibold" style={{color: 'var(--text-primary)'}}>Termai</h1>
        <button
          onClick={openCreate}
          className="text-xs bg-blue-600 hover:bg-blue-500 px-2 py-1 rounded"
        >
          + New
        </button>
      </div>

      {/* Session List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {loading && (
          <div className="text-xs text-gray-400 text-center py-4">Loading...</div>
        )}
        {!loading && sessions.length === 0 && (
          <div className="text-xs text-gray-500 text-center py-4">
            No sessions. Create one to get started.
          </div>
        )}
        {sessions.map((s) => (
          <div
            key={s.id}
            onClick={() => onSelectSession(s.id, s.name)}
            style={{
              backgroundColor: activeSessionId === s.id ? 'var(--bg-session-active)' : undefined,
            }}
            className={`
              flex items-center justify-between px-2 py-1.5 rounded cursor-pointer text-sm
              ${activeSessionId === s.id ? 'text-gray-900' : 'hover:bg-[var(--bg-session-hover)]'}
            `}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{backgroundColor: s.status === 'running' ? 'var(--status-green)' : 'var(--text-muted)'}}
              />
              <span className="truncate" style={{color: 'var(--text-primary)'}}>{s.name}</span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteSession(s.id);
              }}
              className="text-xs ml-2 shrink-0 hover:text-red-400 transition-colors"
              title={t("sidebar.delete")}
              style={{color: 'var(--text-muted)'}}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {/* Settings bar */}
      <div className="p-2 flex items-center justify-between shrink-0" style={{borderTop: '1px solid var(--border-default)'}}>
        <button
          onClick={() => setShowSettings(true)}
          className="transition-colors hover:opacity-80"
          style={{color: 'var(--text-muted)'}}
          title={t("sidebar.settings")}
        >
          <Cog6ToothIcon className="w-5 h-5" />
        </button>
        <span className="text-3xs" style={{color: 'var(--text-muted)'}}>v0.1.3</span>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={closeCreate}>
          <div onClick={(e) => e.stopPropagation()}>
            {mode === "picker" ? (
              <TemplatePicker
                onSelect={handleTemplateSelect}
                onCustom={() => setMode("form")}
              />
            ) : (
              <form
                onSubmit={handleCreate}
                className="rounded-lg p-4 w-80 space-y-3 shadow-xl"
                style={{backgroundColor: 'var(--bg-sidebar)', border: '1px solid var(--border-default)'}}
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold" style={{color: 'var(--text-primary)'}}>Custom Session</h2>
                  <button
                    type="button"
                    onClick={() => setMode("picker")}
                    className="text-xs transition-colors"
                    style={{color: 'var(--brand-blue)'}}
                  >
                    ← Templates
                  </button>
                </div>
                <input
                  placeholder="Session ID (e.g. my-shell)"
                  value={form.id}
                  onChange={(e) => setForm({ ...form, id: e.target.value })}
                  className="w-full rounded px-2 py-1.5 text-sm outline-none focus:ring-1 transition-colors"
                  style={{backgroundColor: 'var(--bg-surface-hover)', color: 'var(--text-primary)', border: '1px solid var(--border-default)'}}
                  required
                />
                <input
                  placeholder="Display Name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded px-2 py-1.5 text-sm outline-none focus:ring-1 transition-colors"
                  style={{backgroundColor: 'var(--bg-surface-hover)', color: 'var(--text-primary)', border: '1px solid var(--border-default)'}}
                  required
                />
                <input
                  placeholder="Command (e.g. cmd.exe, powershell, bash)"
                  value={form.command}
                  onChange={(e) => setForm({ ...form, command: e.target.value })}
                  className="w-full rounded px-2 py-1.5 text-sm outline-none focus:ring-1 transition-colors"
                  style={{backgroundColor: 'var(--bg-surface-hover)', color: 'var(--text-primary)', border: '1px solid var(--border-default)'}}
                />
                <input
                  placeholder="Working directory (optional)"
                  value={form.cwd}
                  onChange={(e) => setForm({ ...form, cwd: e.target.value })}
                  className="w-full rounded px-2 py-1.5 text-sm outline-none focus:ring-1 transition-colors"
                  style={{backgroundColor: 'var(--bg-surface-hover)', color: 'var(--text-primary)', border: '1px solid var(--border-default)'}}
                />
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => { setShowCreate(false); setMode("picker"); }}
                    className="text-xs px-2 py-1 transition-colors"
                    style={{color: 'var(--text-muted)'}}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="text-xs px-3 py-1 rounded text-white transition-colors"
                    style={{backgroundColor: 'var(--brand-blue)'}}
                  >
                    Create
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
    </aside>
  );
}
