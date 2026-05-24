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
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="28" height="28" rx="8" fill="url(#termai-gradient)" />
            <path d="M8 14L12 10L16 14" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <path d="M16 14L20 18" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            <defs>
              <linearGradient id="termai-gradient" x1="0" y1="0" x2="28" y2="28" gradientUnits="userSpaceOnUse">
                <stop stopColor="#3B82F6" />
                <stop offset="1" stopColor="#2563EB" />
              </linearGradient>
            </defs>
          </svg>
          <span
            className="hidden sm:inline"
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
