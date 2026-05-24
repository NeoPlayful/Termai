import { useEffect, useState } from "react";
import type { SessionMeta } from "../types.ts";

interface StatusBarProps {
  session: SessionMeta;
}

function formatUptime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function StatusBar({ session }: StatusBarProps) {
  const [uptime, setUptime] = useState(() =>
    formatUptime(Date.now() - new Date(session.createdAt).getTime())
  );

  useEffect(() => {
    const id = setInterval(() => {
      setUptime(formatUptime(Date.now() - new Date(session.createdAt).getTime()));
    }, 1000);
    return () => clearInterval(id);
  }, [session.createdAt]);

  return (
    <div className="h-5 bg-gray-850 border-t border-gray-700 flex items-center px-3 text-2xs text-gray-500 gap-3 shrink-0">
      <span>{session.id}</span>
      {session.pid && <span>PID: {session.pid}</span>}
      <span>CWD: {session.cwd}</span>
      <span className="ml-auto">{uptime}</span>
    </div>
  );
}
