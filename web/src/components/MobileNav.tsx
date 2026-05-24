import { useT } from "../stores/settingsStore.ts";
import { Bars3Icon, PlusIcon, Cog6ToothIcon, CodeBracketSquareIcon } from "@heroicons/react/24/outline";

interface MobileNavProps {
  onToggleSidebar: () => void;
  onNewSession: () => void;
  onSettings: () => void;
  hasActiveTab: boolean;
}

export function MobileNav({ onToggleSidebar, onNewSession, onSettings, hasActiveTab }: MobileNavProps) {
  const t = useT();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 h-14 flex items-center justify-around z-40 border-t"
      style={{
        backgroundColor: 'var(--bg-tab-bar)',
        borderColor: 'var(--border-default)',
      }}
    >
      <button onClick={onToggleSidebar} className="flex flex-col items-center gap-0.5 px-4 py-1" style={{color: 'var(--text-muted)'}}>
        <Bars3Icon className="w-5 h-5" />
        <span className="text-2xs">{t("mobile.sessions")}</span>
      </button>

      <button className="flex flex-col items-center gap-0.5 px-4 py-1" style={{color: hasActiveTab ? 'var(--text-primary)' : 'var(--text-muted)'}}>
        <CodeBracketSquareIcon className="w-5 h-5" />
        <span className="text-2xs">{t("mobile.terminal")}</span>
      </button>

      <button onClick={onNewSession} className="flex flex-col items-center gap-0.5 px-4 py-1" style={{color: 'var(--text-muted)'}}>
        <PlusIcon className="w-5 h-5" />
        <span className="text-2xs">{t("mobile.new")}</span>
      </button>

      <button onClick={onSettings} className="flex flex-col items-center gap-0.5 px-4 py-1" style={{color: 'var(--text-muted)'}}>
        <Cog6ToothIcon className="w-5 h-5" />
        <span className="text-2xs">{t("mobile.settings")}</span>
      </button>
    </nav>
  );
}
