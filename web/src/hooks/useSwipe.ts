import { useRef, useCallback } from "react";

interface SwipeHandlers {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
}

const SWIPE_THRESHOLD = 50;

export function useSwipe(elementRef: React.RefObject<HTMLElement | null>, { onSwipeLeft, onSwipeRight }: SwipeHandlers) {
  const startX = useRef(0);
  const startY = useRef(0);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    const dx = e.changedTouches[0].clientX - startX.current;
    const dy = e.changedTouches[0].clientY - startY.current;

    // Ignore if vertical swipe (scroll)
    if (Math.abs(dy) > Math.abs(dx)) return;
    if (Math.abs(dx) < SWIPE_THRESHOLD) return;

    if (dx > 0 && onSwipeRight) onSwipeRight();
    else if (dx < 0 && onSwipeLeft) onSwipeLeft();
  }, [onSwipeLeft, onSwipeRight]);

  const attach = useCallback(() => {
    const el = elementRef.current;
    if (!el) return;
    el.addEventListener("touchstart", handleTouchStart, { passive: true });
    el.addEventListener("touchend", handleTouchEnd, { passive: true });
  }, [elementRef, handleTouchStart, handleTouchEnd]);

  const detach = useCallback(() => {
    const el = elementRef.current;
    if (!el) return;
    el.removeEventListener("touchstart", handleTouchStart);
    el.removeEventListener("touchend", handleTouchEnd);
  }, [elementRef, handleTouchStart, handleTouchEnd]);

  return { attach, detach };
}
