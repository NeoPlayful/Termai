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
        className="rounded-lg p-5 w-80 shadow-xl"
        style={{
          backgroundColor: 'var(--bg-sidebar)',
          border: '1px solid var(--border-default)',
        }}
      >
        <h2 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{color: 'var(--text-primary)'}}>
          <Cog6ToothIcon className="w-4 h-4" />
          {t("settings.title")}
        </h2>

        <div className="mb-4">
          <div className="text-xs mb-2" style={{color: 'var(--text-secondary)'}}>{t("settings.language")}</div>
          <div className="flex gap-2">
            {LANGUAGES.map((l) => (
              <button
                key={l.value}
                onClick={() => setLanguage(l.value)}
                className={`flex-1 px-3 py-1.5 rounded text-sm transition-colors ${
                  language === l.value
                    ? "bg-blue-600 text-white"
                    : "hover:opacity-80"
                }`}
                style={{
                  backgroundColor: language === l.value ? 'var(--brand-blue)' : 'var(--bg-surface)',
                  color: language === l.value ? '#ffffff' : 'var(--text-secondary)',
                }}>
                {l.labelKey}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-2">
          <div className="text-xs mb-2" style={{color: 'var(--text-secondary)'}}>{t("settings.theme")}</div>
          <div className="space-y-1">
            {(["dark", "light", "system"] as const).map((th) => (
              <button
                key={th}
                onClick={() => setTheme(th)}
                className={`w-full flex items-center gap-2 px-3 py-1.5 rounded text-sm transition-colors ${
                  theme === th
                  ? "text-white"
                    : "hover:opacity-80"
                }`}
                style={{
                  backgroundColor: theme === th ? 'var(--brand-blue)' : 'var(--bg-surface)',
                  color: theme === th ? '#ffffff' : 'var(--text-secondary)',
                }}
              >
                <span className="w-5 h-5 flex items-center justify-center">{THEME_ICONS[th]}</span>
                <span>{t(`settings.${th}`)}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Font Size */}
        <div>
          <div className="text-xs mb-2" style={{color: 'var(--text-secondary)'}}>{t("settings.font_size")}</div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setFontSize(Math.max(10, fontSize - 1))}
              disabled={fontSize <= 10}
              className="p-1 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              style={{color: 'var(--text-muted)'}}
            >
              <MinusIcon className="w-4 h-4" />
            </button>
            <span className="text-sm w-10 text-center tabular-nums" style={{color: 'var(--text-primary)'}}>{fontSize}px</span>
            <button
              onClick={() => setFontSize(Math.min(24, fontSize + 1))}
              disabled={fontSize >= 24}
              className="p-1 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              style={{color: 'var(--text-muted)'}}
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
              className="text-2xs transition-colors shrink-0"
              style={{color: 'var(--text-muted)'}}
            >
              {t("settings.font_reset")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
