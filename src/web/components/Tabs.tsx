import { memo } from "react";
import { useTerminalStore } from "../stores/terminalStore.ts";

export const Tabs = memo(function Tabs() {
  const { tabs, activeSessionId, closeTab, setActiveTab } = useTerminalStore();

  if (tabs.length === 0) {
    return (
      <div className="h-8 bg-gray-800 border-b border-gray-700 flex items-center px-3">
        <span className="text-xs text-gray-500">
          Select a session from the sidebar
        </span>
      </div>
    );
  }

  return (
    <div className="h-8 bg-gray-800 border-b border-gray-700 flex items-stretch overflow-x-auto">
      {tabs.map((tab) => (
        <div
          key={tab.sessionId}
          onClick={() => setActiveTab(tab.sessionId)}
          className={`
            flex items-center gap-1.5 px-3 text-xs cursor-pointer border-r border-gray-700
            whitespace-nowrap select-none
            ${
              activeSessionId === tab.sessionId
                ? "bg-gray-700 text-white"
                : "text-gray-400 hover:text-gray-200 hover:bg-gray-750"
            }
          `}
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
