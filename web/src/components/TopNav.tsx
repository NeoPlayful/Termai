import { Bars3Icon, PlusIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";

interface TopNavProps {
  onToggleSidebar: () => void;
  onNewSession: () => void;
  onSearch: () => void;
}

export function TopNav({ onToggleSidebar, onNewSession, onSearch }: TopNavProps) {
  return (
    <header
      className="flex items-center justify-between px-3 shrink-0"
      style={{
        height: 64,
        paddingTop: "env(safe-area-inset-top, 0)",
        backgroundColor: "#0B1020",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        backdropFilter: "blur(18px)",
        WebkitBackdropFilter: "blur(18px)",
      }}
    >
      {/* Left: Hamburger + Brand */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="flex items-center justify-center rounded-lg transition-colors"
          style={{ width: 48, height: 48, color: "#9CA3AF" }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.06)"}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
          aria-label="Toggle sidebar"
        >
          <Bars3Icon className="w-5 h-5" />
        </button>

        {/* Logo + Brand */}
        <div className="flex items-center gap-3">
          <img src="/icons/logo.png" width="28" height="28" alt="Termai" style={{borderRadius: 8}} />
          <span
            style={{
              fontFamily: "Inter, system-ui, sans-serif",
              fontWeight: 600,
              letterSpacing: "-0.02em",
              color: "#F9FAFB",
              fontSize: 18,
            }}
          >
            Termai
          </span>
        </div>
      </div>

      {/* Right: Search + New */}
      <div className="flex items-center gap-2">
        <button
          onClick={onSearch}
          className="flex items-center justify-center rounded-lg transition-colors"
          style={{ width: 40, height: 40, color: "#9CA3AF" }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.06)"}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
          aria-label="Search"
        >
          <MagnifyingGlassIcon className="w-4 h-4" />
        </button>

        <button
          onClick={onNewSession}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-colors"
          style={{
            color: "#3B82F6",
            border: "1px solid rgba(59,130,246,0.35)",
            backgroundColor: "transparent",
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "rgba(59,130,246,0.12)"}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
        >
          <PlusIcon className="w-4 h-4" />
          <span>New</span>
        </button>
      </div>
    </header>
  );
}
