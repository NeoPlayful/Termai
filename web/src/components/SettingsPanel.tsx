import { settingsStore, useT } from "../stores/settingsStore.ts";
import type { Language } from "../i18n/messages.ts";
import { Cog6ToothIcon, MoonIcon, SunIcon, ComputerDesktopIcon } from "@heroicons/react/24/outline";

interface SettingsPanelProps {
  onClose: () => void;
}

const LANGUAGES: { value: Language; labelKey: string }[] = [
  { value: "zh-CN", labelKey: "中文" },
  { value: "en", labelKey: "English" },
];

const THEME_ICONS: Record<string, React.ReactNode> = {
  dark: <MoonIcon className="w-4 h-4" />,
  light: <SunIcon className="w-4 h-4" />,
  system: <ComputerDesktopIcon className="w-4 h-4" />,
};

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
        className="bg-gray-800 rounded-lg p-5 w-80 border border-gray-700 shadow-xl"
      >
        <h2 className="text-sm font-semibold text-gray-100 mb-4 flex items-center gap-2">
          <Cog6ToothIcon className="w-4 h-4" />
          {t("settings.title")}
        </h2>

        <div className="mb-4">
          <div className="text-xs text-gray-400 mb-2">{t("settings.language")}</div>
          <div className="flex gap-2">
            {LANGUAGES.map((l) => (
              <button
                key={l.value}
                onClick={() => setLanguage(l.value)}
                className={`flex-1 px-3 py-1.5 rounded text-sm transition-colors ${
                  language === l.value
                    ? "bg-blue-600 text-white"
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                }`}
              >
                {l.labelKey}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-2">
          <div className="text-xs text-gray-400 mb-2">{t("settings.theme")}</div>
          <div className="space-y-1">
            {(["dark", "light", "system"] as const).map((th) => (
              <button
                key={th}
                onClick={() => setTheme(th)}
                className={`w-full flex items-center gap-2 px-3 py-1.5 rounded text-sm transition-colors ${
                  theme === th
                    ? "bg-blue-600 text-white"
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                }`}
              >
                <span className="w-5 h-5 flex items-center justify-center">{THEME_ICONS[th]}</span>
                <span>{t(`settings.${th}`)}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
