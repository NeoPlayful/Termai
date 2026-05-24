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

const LIGHT_THEME: ITheme = {
  background: "#ffffff", foreground: "#1c1c1e", cursor: "#007aff",
  selectionBackground: "#bfdaff",
  black: "#1c1c1e", red: "#ff3b30", green: "#34c759",
  yellow: "#ff9500", blue: "#007aff", magenta: "#af52de",
  cyan: "#34aadc", white: "#f5f5f7",
  brightBlack: "#8e8e93", brightRed: "#ff3b30", brightGreen: "#28cd41",
  brightYellow: "#ff9500", brightBlue: "#007aff", brightMagenta: "#af52de",
  brightCyan: "#34aadc", brightWhite: "#ffffff",
};

interface TerminalViewProps {
  sessionId: string;
  session: SessionMeta | null;
}

export const TerminalView = memo(function TerminalView({ sessionId, session }: TerminalViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const [status, setStatus] = useState("connecting");
  const currentTheme = settingsStore((s) => s.theme);
  const currentFontSize = settingsStore((s) => s.fontSize);

  const onOutput = useCallback((data: string) => {
    xtermRef.current?.write(data);
  }, []);

  const onStatus = useCallback((s: string) => {
    setStatus(s);
    if (s === "connected") {
      xtermRef.current?.focus();
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
      fontSize: currentFontSize,
      scrollback: 100000,
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace",
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

    // Fit terminal to container
    const fit = () => {
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
        fitAddon.fit();
        const dims = fitAddon.proposeDimensions();
        if (dims) {
          send({ type: "resize", cols: dims.cols, rows: dims.rows });
        }
      }, 100);
    };

    const observer = new ResizeObserver(onResize);
    observer.observe(containerRef.current);

    // Send initial resize after connect
    setTimeout(fit, 200);

    // Input handler
    term.onData((data) => {
      send({ type: "input", data });
    });

    return () => {
      clearTimeout(resizeTimer);
      observer.disconnect();
      term.dispose();
      xtermRef.current = null;
    };
  }, [sessionId, send]);

  // Sync xterm theme when settings theme changes
  useEffect(() => {
    const term = xtermRef.current;
    if (!term) return;
    term.options.theme = currentTheme === "dark" || currentTheme === "system"
      ? DARK_THEME : LIGHT_THEME;
  }, [currentTheme]);

  // Sync xterm font size when settings change
  useEffect(() => {
    const term = xtermRef.current;
    if (!term) return;
    term.options.fontSize = currentFontSize;
    fitAddonRef.current?.fit();
  }, [currentFontSize]);

  return (
    <div className="flex flex-col h-full">
      {/* Status bar */}
      <div className="h-6 bg-gray-800 border-b border-gray-700 flex items-center px-3 text-xs">
        <span
          className={`w-2 h-2 rounded-full mr-2 ${
            status === "connected"
              ? "bg-green-500"
              : "bg-gray-600"
          }`}
        />
        <span className="text-gray-400">{sessionId}</span>
        <span className="ml-auto text-gray-500">{status === "connected" ? "connected" : status}</span>
      </div>
      {/* Terminal - bg matches xterm theme to prevent white flash on init */}
      <div ref={containerRef} className="flex-1 bg-[#1a1b26]" />
      {session && <StatusBar session={session} />}
    </div>
  );
});
