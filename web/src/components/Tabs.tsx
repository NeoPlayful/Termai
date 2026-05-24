import { memo } from "react";
import { useTerminalStore } from "../stores/terminalStore.ts";
import { useT } from "../stores/settingsStore.ts";

export const Tabs = memo(function Tabs() {
  const { tabs, activeSessionId, openTab, closeTab, setActiveTab } = useTerminalStore();
  const t = useT();

  if (tabs.length === 0) {
    return (
      <div className="h-8 bg-gray-800 dark:bg-gray-800 bg-gray-50 border-b border-gray-700 dark:border-gray-700 border-gray-200 flex items-center px-3">
        <span className="text-xs text-gray-500">{t("tabs.empty")}</span>
      </div>
    );
  }

  return (
    <div className="h-8 bg-gray-800 dark:bg-gray-800 bg-gray-50 border-b border-gray-700 dark:border-gray-700 border-gray-200 flex items-stretch overflow-x-auto">
      {tabs.map((tab) => (
        <div
          key={tab.sessionId}
          onClick={() => setActiveTab(tab.sessionId)}
          className={`
            flex items-center gap-1.5 px-3 text-xs cursor-pointer border-r border-gray-700 dark:border-gray-700 border-gray-200
            whitespace-nowrap select-none
            ${
              activeSessionId === tab.sessionId
                ? "bg-gray-700 dark:bg-gray-700 bg-gray-200 text-white dark:text-white text-gray-800"
                : "text-gray-400 dark:text-gray-400 text-gray-500 hover:text-gray-200 dark:hover:text-gray-200 hover:text-gray-700"
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
