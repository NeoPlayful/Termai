import { useState, useEffect, useCallback } from "react";

type Breakpoint = "sm" | "md" | "lg";

interface ResponsiveState {
  breakpoint: Breakpoint;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

function getBreakpoint(width: number): Breakpoint {
  if (width < 640) return "sm";
  if (width < 1024) return "md";
  return "lg";
}

const smQuery = window.matchMedia("(max-width: 639px)");
const mdQuery = window.matchMedia("(min-width: 640px) and (max-width: 1023px)");

export function useResponsive(): ResponsiveState {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>(() =>
    getBreakpoint(window.innerWidth)
  );
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const handler = () => setBreakpoint(getBreakpoint(window.innerWidth));
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  // Close sidebar when going from md to lg (desktop)
  useEffect(() => {
    if (breakpoint === "lg") setSidebarOpen(false);
  }, [breakpoint]);

  const isMobile = breakpoint === "sm";
  const isTablet = breakpoint === "md";
  const isDesktop = breakpoint === "lg";

  return { breakpoint, isMobile, isTablet, isDesktop, sidebarOpen, setSidebarOpen };
}
