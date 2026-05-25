import { useEffect, useCallback } from "react";
import { useSessionStore } from "./stores/sessionStore.ts";
import { useTerminalStore } from "./stores/terminalStore.ts";
import { Sidebar } from "./components/Sidebar.tsx";
import { Tabs } from "./components/Tabs.tsx";
import { TerminalView } from "./components/Terminal.tsx";
import { TopNav } from "./components/TopNav.tsx";
import { useResponsive } from "./hooks/useResponsive.ts";
import { useUIActions } from "./stores/uiActionsStore.ts";

export default function App() {
  const fetchSessions = useSessionStore((s) => s.fetchSessions);
  const fetchSessionsInitial = useSessionStore((s) => s.fetchSessionsInitial);
  const { activeSessionId, openTab } = useTerminalStore();
  const activeSession = useSessionStore((s) =>
    activeSessionId ? s.sessions.find((sess) => sess.id === activeSessionId) ?? null : null
  );
  const { isMobile, isDesktop, sidebarOpen, setSidebarOpen } = useResponsive();

  useEffect(() => {
    fetchSessionsInitial();
    const interval = setInterval(fetchSessions, 5000);
    return () => clearInterval(interval);
  }, [fetchSessionsInitial, fetchSessions]);

  const handleSelectSession = useCallback((id: string, name: string) => {
    openTab(id, name);
    if (!isDesktop) setSidebarOpen(false);
  }, [openTab, isDesktop, setSidebarOpen]);

  const isCompact = !isDesktop;

  return (
    <div className="h-full flex flex-col" style={{backgroundColor: 'var(--bg-page)', color: 'var(--text-primary)'}}>
      {/* Mobile Top Nav */}
      {isMobile && (
        <TopNav
          onToggleSidebar={() => setSidebarOpen(true)}
          onNewSession={() => useUIActions.getState().signalCreate()}
          onSearch={() => {}}
        />
      )}

      {/* Content area */}
      <div className="flex flex-1 min-h-0">
        {/* Sidebar - drawer on mobile, fixed on desktop */}
        <Sidebar
          onSelectSession={handleSelectSession}
          activeSessionId={activeSessionId}
          isOpen={isDesktop || sidebarOpen}
          isDrawer={isCompact}
          onClose={() => setSidebarOpen(false)}
        />

        {/* Overlay for mobile drawer */}
        {isCompact && sidebarOpen && (
          <div className="fixed inset-0 z-10" style={{backgroundColor: 'rgba(0,0,0,0.4)'}}
            onClick={() => setSidebarOpen(false)} />
        )}

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
    </div>
  );
}
