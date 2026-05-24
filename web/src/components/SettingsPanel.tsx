import { settingsStore, useT } from "../stores/settingsStore.ts";
import type { Language } from "../i18n/messages.ts";

interface SettingsPanelProps {
  onClose: () => void;
}

const LANGUAGES: { value: Language; labelKey: string }[] = [
  { value: "zh-CN", labelKey: "中文" },
  { value: "en", labelKey: "English" },
];

export function SettingsPanel({ onClose }: SettingsPanelProps) {
  const language = settingsStore((s) => s.language);
  const theme = settingsStore((s) => s.theme);
  const setLanguage = settingsStore((s) => s.setLanguage);
  const setTheme = settingsStore((s) => s.setTheme);
  const t = useT();

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-gray-800 dark:bg-gray-800 bg-white rounded-lg p-5 w-80 border border-gray-700 dark:border-gray-700 border-gray-200 shadow-xl"
      >
        <h2 className="text-sm font-semibold text-gray-100 dark:text-gray-100 text-gray-800 mb-4">
          ⚙️ {t("settings.title")}
        </h2>

        {/* Language */}
        <div className="mb-4">
          <div className="text-xs text-gray-400 dark:text-gray-400 text-gray-500 mb-2">{t("settings.language")}</div>
          <div className="flex gap-2">
            {LANGUAGES.map((l) => (
              <button
                key={l.value}
                onClick={() => setLanguage(l.value)}
                className={`flex-1 px-3 py-1.5 rounded text-sm transition-colors ${
                  language === l.value
                    ? "bg-blue-600 text-white"
                    : "bg-gray-700 dark:bg-gray-700 bg-gray-100 text-gray-300 dark:text-gray-300 text-gray-600 hover:bg-gray-600"
                }`}
              >
                {l.labelKey}
              </button>
            ))}
          </div>
        </div>

        {/* Theme */}
        <div className="mb-2">
          <div className="text-xs text-gray-400 dark:text-gray-400 text-gray-500 mb-2">{t("settings.theme")}</div>
          <div className="space-y-1">
            {(["dark", "light", "system"] as const).map((th) => (
              <button
                key={th}
                onClick={() => setTheme(th)}
                className={`w-full flex items-center gap-2 px-3 py-1.5 rounded text-sm transition-colors ${
                  theme === th
                    ? "bg-blue-600 text-white"
                    : "bg-gray-700 dark:bg-gray-700 bg-gray-100 text-gray-300 dark:text-gray-300 text-gray-600 hover:bg-gray-600"
                }`}
              >
                <span>{th === "dark" ? "🌙" : th === "light" ? "☀️" : "🖥️"}</span>
                <span>{t(`settings.${th}`)}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
