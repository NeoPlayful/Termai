import { settingsStore, useT } from "../stores/settingsStore.ts";
import type { Language } from "../i18n/messages.ts";
import {
  Cog6ToothIcon, MoonIcon, SunIcon, ComputerDesktopIcon,
  MinusIcon, PlusIcon
} from "@heroicons/react/24/outline";

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
  const fontSize = settingsStore((s) => s.fontSize);
  const setLanguage = settingsStore((s) => s.setLanguage);
  const setTheme = settingsStore((s) => s.setTheme);
  const setFontSize = settingsStore((s) => s.setFontSize);
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

        {/* Font Size */}
        <div>
          <div className="text-xs text-gray-400 mb-2">{t("settings.font_size")}</div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setFontSize(Math.max(10, fontSize - 1))}
              disabled={fontSize <= 10}
              className="p-1 rounded text-gray-400 hover:text-gray-100 hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <MinusIcon className="w-4 h-4" />
            </button>
            <span className="text-sm text-gray-100 w-10 text-center tabular-nums">{fontSize}px</span>
            <button
              onClick={() => setFontSize(Math.min(24, fontSize + 1))}
              disabled={fontSize >= 24}
              className="p-1 rounded text-gray-400 hover:text-gray-100 hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <PlusIcon className="w-4 h-4" />
            </button>
            <div className="flex-1 mx-1">
              <input
                type="range"
                min="10"
                max="24"
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                className="w-full accent-blue-500 h-1 cursor-pointer"
              />
            </div>
            <button
              onClick={() => setFontSize(16)}
              className="text-2xs text-gray-500 hover:text-gray-300 transition-colors shrink-0"
            >
              {t("settings.font_reset")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
