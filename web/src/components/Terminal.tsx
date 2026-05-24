import { useEffect, useRef, useCallback, useState, memo } from "react";
import { Terminal as XTerm } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import { useWebSocket } from "../hooks/useWebSocket.ts";

interface TerminalViewProps {
  sessionId: string;
}

export const TerminalView = memo(function TerminalView({ sessionId }: TerminalViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const [status, setStatus] = useState("connecting");

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
      fontSize: 13,
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
    </div>
  );
});
