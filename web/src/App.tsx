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
  const { activeSessionId, tabs, openTab } = useTerminalStore();
  const sessions = useSessionStore((s) => s.sessions);
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
            {tabs.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm" style={{color: 'var(--text-muted)'}}>
                Select or create a session to begin
              </div>
            ) : (
              tabs.map(({ sessionId }) => {
                const session = sessions.find((s) => s.id === sessionId) ?? null;
                return (
                  <div key={sessionId} style={{ display: sessionId === activeSessionId ? "flex" : "none", flexDirection: "column", height: "100%" }}>
                    <TerminalView sessionId={sessionId} session={session} isActive={sessionId === activeSessionId} />
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
