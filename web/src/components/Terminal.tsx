import { useEffect, useRef, useCallback, useState, memo } from "react";
import { Terminal as XTerm } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import { useWebSocket } from "../hooks/useWebSocket.ts";
import { StatusBar } from "./StatusBar.tsx";
import { settingsStore } from "../stores/settingsStore.ts";
import type { SessionMeta } from "../types.ts";
import type { ITheme } from "@xterm/xterm";

const DARK_THEME: ITheme = {
  background: "#1c1c1e", foreground: "#f5f5f7", cursor: "#ffffff",
  selectionBackground: "#007aff",
  black: "#1c1c1e", red: "#ff453a", green: "#32d74b",
  yellow: "#ffd60a", blue: "#007aff", magenta: "#bf5af2",
  cyan: "#64d2ff", white: "#f5f5f7",
  brightBlack: "#3a3a3c", brightRed: "#ff453a", brightGreen: "#30d158",
  brightYellow: "#ffd60a", brightBlue: "#0a84ff", brightMagenta: "#bf5af2",
  brightCyan: "#64d2ff", brightWhite: "#ffffff",
};

interface TerminalViewProps {
  sessionId: string;
  session: SessionMeta | null;
  isActive?: boolean;
}

export const TerminalView = memo(function TerminalView({ sessionId, session, isActive }: TerminalViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const [status, setStatus] = useState("connecting");
  const currentTheme = settingsStore((s) => s.theme);
  const currentFontSize = settingsStore((s) => s.fontSize);
  const isMobile = typeof window !== "undefined" && window.innerWidth < 640;
  const displayFontSize = isMobile ? Math.min(currentFontSize, 14) : currentFontSize;

  const onOutput = useCallback((data: string) => {
    xtermRef.current?.write(data);
  }, []);

  const onStatus = useCallback((s: string, cols?: number, rows?: number) => {
    setStatus(s);
    if (s === "connected") {
      const term = xtermRef.current;
      if (term && cols && rows) {
        // Use server PTY size to keep all clients in sync
        term.resize(cols, rows);
      }
      term?.focus();
    }
  }, []);

  const onError = useCallback((message: string) => {
    xtermRef.current?.writeln(`\x1b[31mError: ${message}\x1b[0m`);
  }, []);

  const { send } = useWebSocket({
    sessionId,
    onOutput,
    onStatus,
    onError,
  });

  // Initialize xterm.js
  useEffect(() => {
    if (!containerRef.current) return;

    const term = new XTerm({
      cursorBlink: true,
      cursorStyle: "block",
      fontSize: displayFontSize,
      scrollback: 100000,
      fontFamily: "'JetBrains Mono', 'Cascadia Code', 'Fira Code', Consolas, monospace",
      theme: {
        background: "#1a1b26",
        foreground: "#a9b1d6",
        cursor: "#c0caf5",
        selectionBackground: "#33467c",
        black: "#1d202f",
        red: "#f7768e",
        green: "#9ece6a",
        yellow: "#e0af68",
        blue: "#7aa2f7",
        magenta: "#bb9af7",
        cyan: "#7dcfff",
        white: "#a9b1d6",
        brightBlack: "#414868",
        brightRed: "#f7768e",
        brightGreen: "#9ece6a",
        brightYellow: "#e0af68",
        brightBlue: "#7aa2f7",
        brightMagenta: "#bb9af7",
        brightCyan: "#7dcfff",
        brightWhite: "#c0caf5",
      },
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    fitAddonRef.current = fitAddon;

    term.open(containerRef.current);
    xtermRef.current = term;

    const isTouchDevice = navigator.maxTouchPoints > 0;

    // Fit terminal to container (desktop only)
    const fit = () => {
      if (isTouchDevice) return;
      try {
        fitAddon.fit();
      } catch {
        // container may not be in DOM yet
      }
    };
    fit();

    // Debounced resize handler
    let resizeTimer: ReturnType<typeof setTimeout>;
    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (isTouchDevice) return;
        const dims = fitAddon.proposeDimensions();
        if (!dims || dims.cols <= 0 || dims.rows <= 0) return;
        fitAddon.fit();
        send({ type: "resize", cols: dims.cols, rows: dims.rows });
      }, 100);
    };

    const observer = new ResizeObserver(onResize);
    observer.observe(containerRef.current);

    // Send initial resize after connect
    setTimeout(fit, 200);

    // Input handler - block all escape sequences xterm auto-sends (DA queries etc.)
    term.onData((data) => {
      // Block any data starting with ESC that isn't user-typed
      // DA responses: \x1b[>1;2c, \x1b[?...c, \x1b[c
      // Also block \x1b[>0c \x1bP...\x1b\\ etc.
      if (data.startsWith("\x1b[") && data.endsWith("c")) return;
      if (data.startsWith("\x1b[>")) return;
      if (data.startsWith("\x1bP")) return;
      // Block CPR responses: ESC[row;colR (cursor position report)
      if (data.startsWith("\x1b[") && data.endsWith("R") && /^\x1b\[\d+;\d+R$/.test(data)) return;
      send({ type: "input", data });
    });

    return () => {
      clearTimeout(resizeTimer);
      observer.disconnect();
      term.dispose();
      xtermRef.current = null;
    };
  }, [sessionId, send]);

  // Terminal always uses dark theme regardless of UI theme
  useEffect(() => {
    const term = xtermRef.current;
    if (!term) return;
    term.options.theme = DARK_THEME;
  }, [currentTheme]);

  // Re-fit when tab becomes active (was hidden, now visible)
  const prevActiveRef = useRef(false);
  useEffect(() => {
    const wasActive = prevActiveRef.current;
    prevActiveRef.current = !!isActive;
    if (!isActive || wasActive) return;
    const fit = fitAddonRef.current;
    if (!fit) return;
    const dims = fit.proposeDimensions();
    if (!dims || dims.cols <= 0 || dims.rows <= 0) return;
    fit.fit();
    send({ type: "resize", cols: dims.cols, rows: dims.rows });
  }, [isActive, send]);

  // Sync xterm font size when settings change
  useEffect(() => {
    const term = xtermRef.current;
    if (!term) return;
    term.options.fontSize = displayFontSize;
    fitAddonRef.current?.fit();
  }, [currentFontSize]);

  // Mobile: handle virtual keyboard showing/hiding
  useEffect(() => {
    const vp = (window as unknown as { visualViewport?: { height: number } }).visualViewport;
    if (!vp) return;
    const handler = () => {
      if (!containerRef.current) return;
      const diff = window.innerHeight - vp.height;
      containerRef.current.style.marginBottom = diff > 100 ? diff + "px" : "0";
    };
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Status bar */}
      <div className="h-6 flex items-center px-3 text-xs" style={{
        backgroundColor: 'var(--bg-tab-bar)',
        borderBottom: '1px solid var(--border-default)',
        color: 'var(--text-muted)',
      }}>
        <span className="w-2 h-2 rounded-full mr-2" style={{backgroundColor: status === "connected" ? 'var(--status-green)' : 'var(--text-muted)'}} />
        <span style={{color: 'var(--text-secondary)'}}>{sessionId}</span>
        <span className="ml-auto" style={{color: 'var(--text-muted)'}}>{status === "connected" ? "connected" : status}</span>
      </div>
      {/* Terminal - horizontal scroll wrapper */}
      <div className="flex-1 overflow-x-auto" style={{backgroundColor: 'var(--bg-terminal)'}}>
        <div ref={containerRef} style={{backgroundColor: 'var(--bg-terminal)', minWidth: 480, height: '100%'}} />
      </div>
      {session && <StatusBar session={session} />}
    </div>
  );
});
