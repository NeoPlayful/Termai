import { memo } from "react";
import { useTerminalStore } from "../stores/terminalStore.ts";
import { useT } from "../stores/settingsStore.ts";

export const Tabs = memo(function Tabs() {
  const { tabs, activeSessionId, closeTab, setActiveTab } = useTerminalStore();
  const t = useT();

  if (tabs.length === 0) {
    return (
      <div className="h-8 flex items-center px-3" style={{backgroundColor: 'var(--bg-tab-bar)', borderBottom: '1px solid var(--border-default)'}}>
        <span className="text-xs" style={{color: 'var(--text-muted)'}}>{t("tabs.empty")}</span>
      </div>
    );
  }

  return (
    <div className="h-8 flex items-stretch overflow-x-auto tab-scroll" style={{backgroundColor: 'var(--bg-tab-bar)', borderBottom: '1px solid var(--border-default)'}}>
      {tabs.map((tab) => (
        <div
          key={tab.sessionId}
          onClick={() => setActiveTab(tab.sessionId)}
          className="flex items-center gap-1.5 px-3 text-xs cursor-pointer whitespace-nowrap select-none transition-colors"
          style={{
            backgroundColor: activeSessionId === tab.sessionId ? 'var(--bg-tab-active)' : undefined,
            borderRight: '1px solid var(--border-default)',
            color: activeSessionId === tab.sessionId ? 'var(--text-primary)' : 'var(--text-muted)',
            borderBottom: activeSessionId === tab.sessionId ? '2px solid var(--brand-blue)' : '2px solid transparent',
            marginBottom: '-1px',
          }}
          onMouseEnter={(e) => { if (activeSessionId !== tab.sessionId) e.currentTarget.style.backgroundColor = 'var(--bg-session-hover)'; }}
          onMouseLeave={(e) => { if (activeSessionId !== tab.sessionId) e.currentTarget.style.backgroundColor = ''; }}
        >
          <span>{tab.name}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              closeTab(tab.sessionId);
            }}
            className="text-gray-500 hover:text-red-400 ml-1"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
});
