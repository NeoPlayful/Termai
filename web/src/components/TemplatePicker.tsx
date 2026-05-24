import { useEffect } from "react";
import { PencilIcon } from "@heroicons/react/24/outline";
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

  const groups = new Map<string, SessionTemplate[]>();
  for (const tpl of templates) {
    const g = tpl.group ?? "Other";
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g)!.push(tpl);
  }
  const sortedGroups = [...groups.entries()].sort(
    (a, b) => GROUP_ORDER.indexOf(a[0]) - GROUP_ORDER.indexOf(b[0])
  );

  return (
    <div className="bg-gray-800 rounded-lg p-4 w-96 border border-gray-700">
      <h2 className="text-sm font-semibold text-gray-100 mb-3">{t("modal.create")}</h2>

      {loading && (
        <div className="text-xs text-gray-400 text-center py-8">{t("terminal.connecting")}</div>
      )}

      {!loading && templates.length === 0 && (
        <div className="text-xs text-gray-500 text-center py-8">
          {t("sidebar.no_sessions")}
        </div>
      )}

      {!loading && sortedGroups.map(([group, items]) => (
        <div key={group} className="mb-3">
          <div className="text-2xs text-gray-500 uppercase tracking-wider mb-1 px-1">
            {t("group." + group)}
          </div>
          <div className="grid grid-cols-1 gap-1">
            {items.map((tpl) => (
              <button
                key={tpl.id}
                onClick={() => onSelect(tpl)}
                className="flex items-center gap-2 px-2 py-1.5 rounded text-sm text-left
                  text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                title={tpl.description}
              >
                <span className="text-base">{tpl.icon ?? "▹"}</span>
                <span>{tpl.name}</span>
              </button>
            ))}
          </div>
        </div>
      ))}

      <div className="border-t border-gray-700 pt-2 mt-1">
        <button
          onClick={onCustom}
          className="flex items-center gap-2 px-2 py-1.5 rounded text-sm text-gray-400
            hover:bg-gray-700 hover:text-white transition-colors w-full"
        >
          <PencilIcon className="w-4 h-4" />
          <span>{t("modal.custom")}</span>
        </button>
      </div>
    </div>
  );
}
