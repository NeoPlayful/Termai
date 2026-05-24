import { useEffect, useCallback, useMemo } from "react";
import { useSessionStore } from "./stores/sessionStore.ts";
import { useTerminalStore } from "./stores/terminalStore.ts";
import { Sidebar } from "./components/Sidebar.tsx";
import { Tabs } from "./components/Tabs.tsx";
import { TerminalView } from "./components/Terminal.tsx";

export default function App() {
  const fetchSessions = useSessionStore((s) => s.fetchSessions);
  const fetchSessionsInitial = useSessionStore((s) => s.fetchSessionsInitial);
  const { activeSessionId, openTab } = useTerminalStore();
  const activeSession = useSessionStore((s) =>
    activeSessionId ? s.sessions.find((sess) => sess.id === activeSessionId) ?? null : null
  );

  useEffect(() => {
    fetchSessionsInitial();
    const interval = setInterval(fetchSessions, 5000);
    return () => clearInterval(interval);
  }, [fetchSessionsInitial, fetchSessions]);

  const handleSelectSession = useCallback((id: string, name: string) => {
    openTab(id, name);
  }, [openTab]);

  return (
    <div className="h-full flex" style={{backgroundColor: 'var(--bg-page)', color: 'var(--text)'}}>
      {/* Sidebar */}
      <Sidebar
        onSelectSession={handleSelectSession}
        activeSessionId={activeSessionId}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <Tabs />
        <div className="flex-1 min-h-0">
          {activeSessionId ? (
            <TerminalView key={activeSessionId} sessionId={activeSessionId} session={activeSession} />
          ) : (
            <div className="h-full flex items-center justify-center text-sm" style={{color: 'var(--text-muted)'}}>
              Select or create a session to begin
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
