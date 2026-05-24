import { useState } from "react";
import { useSessionStore } from "../stores/sessionStore.ts";
import { useTerminalStore } from "../stores/terminalStore.ts";
import { TemplatePicker } from "./TemplatePicker.tsx";

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
  const [mode, setMode] = useState<"picker" | "form">("picker");
  const [form, setForm] = useState({ id: "", name: "", command: "", cwd: "" });

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
    <aside className="w-64 bg-gray-800 flex flex-col h-full border-r border-gray-700">
      {/* Header */}
      <div className="p-3 border-b border-gray-700 flex items-center justify-between">
        <h1 className="text-sm font-semibold text-gray-200">Termai</h1>
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
            className={`
              flex items-center justify-between px-2 py-1.5 rounded cursor-pointer text-sm
              ${
                activeSessionId === s.id
                  ? "bg-blue-700 text-white"
                  : "text-gray-300 hover:bg-gray-700"
              }
            `}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  s.status === "running" ? "bg-green-400" : "bg-gray-500"
                }`}
              />
              <span className="truncate">{s.name}</span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteSession(s.id);
              }}
              className="text-xs text-gray-400 hover:text-red-400 ml-2 shrink-0"
              title="Delete"
            >
              ×
            </button>
          </div>
        ))}
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
                className="bg-gray-800 rounded-lg p-4 w-80 border border-gray-700 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold">Custom Session</h2>
                  <button
                    type="button"
                    onClick={() => setMode("picker")}
                    className="text-xs text-blue-400 hover:text-blue-300"
                  >
                    ← Templates
                  </button>
                </div>
                <input
                  placeholder="Session ID (e.g. my-shell)"
                  value={form.id}
                  onChange={(e) => setForm({ ...form, id: e.target.value })}
                  className="w-full bg-gray-700 rounded px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-blue-500"
                  required
                />
                <input
                  placeholder="Display Name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-gray-700 rounded px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-blue-500"
                  required
                />
                <input
                  placeholder="Command (e.g. cmd.exe, powershell.exe, bash)"
                  value={form.command}
                  onChange={(e) => setForm({ ...form, command: e.target.value })}
                  className="w-full bg-gray-700 rounded px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-blue-500"
                />
                <input
                  placeholder="Working directory (optional)"
                  value={form.cwd}
                  onChange={(e) => setForm({ ...form, cwd: e.target.value })}
                  className="w-full bg-gray-700 rounded px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-blue-500"
                />
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => { setShowCreate(false); setMode("picker"); }}
                    className="text-xs text-gray-400 hover:text-white px-2 py-1"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="text-xs bg-blue-600 hover:bg-blue-500 px-3 py-1 rounded"
                  >
                    Create
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}
