import { useEffect } from "react";
import { useTemplateStore } from "../stores/templateStore.ts";
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

interface TemplatePickerProps {
  onSelect: (tpl: SessionTemplate) => void;
  onCustom: () => void;
}

const GROUP_ORDER = ["Shells", "AI Tools", "Connections", "Tools"];

export function TemplatePicker({ onSelect, onCustom }: TemplatePickerProps) {
  const { templates, loading, fetchTemplates } = useTemplateStore();
  const t = useT();

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  // Group templates
  const groups = new Map<string, SessionTemplate[]>();
  for (const t of templates) {
    const g = t.group ?? "Other";
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g)!.push(t);
  }
  const sortedGroups = [...groups.entries()].sort(
    (a, b) => GROUP_ORDER.indexOf(a[0]) - GROUP_ORDER.indexOf(b[0])
  );

  return (
    <div className="bg-gray-800 dark:bg-gray-800 bg-white rounded-lg p-4 w-96 border border-gray-700 dark:border-gray-700 border-gray-200">
      <h2 className="text-sm font-semibold text-gray-100 dark:text-gray-100 text-gray-800 mb-3">{t("modal.create")}</h2>

      {loading && (
        <div className="text-xs text-gray-400 dark:text-gray-400 text-gray-500 text-center py-8">{t("terminal.connecting")}</div>
      )}

      {!loading && templates.length === 0 && (
        <div className="text-xs text-gray-500 text-center py-8">
          {t("sidebar.no_sessions")}
        </div>
      )}

      {!loading && sortedGroups.map(([group, items]) => (
        <div key={group} className="mb-3">
          <div className="text-2xs text-gray-500 dark:text-gray-500 text-gray-400 uppercase tracking-wider mb-1 px-1">
            {t("group." + group)}
          </div>
          <div className="grid grid-cols-1 gap-1">
            {items.map((tpl) => (
              <button
                key={tpl.id}
                onClick={() => onSelect(tpl)}
                className="flex items-center gap-2 px-2 py-1.5 rounded text-sm text-left
                  text-gray-300 dark:text-gray-300 text-gray-600 hover:bg-gray-700 dark:hover:bg-gray-700 hover:bg-gray-100 hover:text-white dark:hover:text-white hover:text-gray-900 transition-colors"
                title={tpl.description}
              >
                <span className="text-base">{tpl.icon ?? "▹"}</span>
                <span>{tpl.name}</span>
              </button>
            ))}
          </div>
        </div>
      ))}

      <div className="border-t border-gray-700 dark:border-gray-700 border-gray-200 pt-2 mt-1">
        <button
          onClick={onCustom}
          className="flex items-center gap-2 px-2 py-1.5 rounded text-sm text-gray-400 dark:text-gray-400 text-gray-500
            hover:bg-gray-700 dark:hover:bg-gray-700 hover:bg-gray-100 hover:text-white dark:hover:text-white hover:text-gray-900 transition-colors w-full"
        >
          <span className="text-base">✏️</span>
          <span>{t("modal.custom")}</span>
        </button>
      </div>
    </div>
  );
}
