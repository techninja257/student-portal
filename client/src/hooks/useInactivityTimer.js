import { useEffect, useRef, useCallback } from 'react';

const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
// Only process activity signals at most once per 30 seconds to avoid thrashing
const ACTIVITY_DEBOUNCE_MS = 30_000;

/**
 * Calls onWarning when (timeout - warningBefore) ms of inactivity elapses.
 * Calls onTimeout when timeout ms of inactivity elapses.
 * Exposes resetTimer() so external callers (e.g. API interceptors) can signal activity.
 */
export default function useInactivityTimer({ timeout, warningBefore = 60_000, onWarning, onTimeout, enabled }) {
  const timeoutRef = useRef(null);
  const warningRef = useRef(null);
  const lastActivityRef = useRef(Date.now());
  const debounceRef = useRef(null);

  const clearTimers = useCallback(() => {
    clearTimeout(timeoutRef.current);
    clearTimeout(warningRef.current);
  }, []);

  const resetTimer = useCallback(() => {
    if (!enabled) return;
    lastActivityRef.current = Date.now();
    clearTimers();
    warningRef.current = setTimeout(onWarning, timeout - warningBefore);
    timeoutRef.current = setTimeout(onTimeout, timeout);
  }, [enabled, timeout, warningBefore, onWarning, onTimeout, clearTimers]);

  // Debounced activity handler — ignores events within ACTIVITY_DEBOUNCE_MS of the last one
  const handleActivity = useCallback(() => {
    if (!enabled) return;
    if (debounceRef.current) return;
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
    }, ACTIVITY_DEBOUNCE_MS);
    resetTimer();
  }, [enabled, resetTimer]);

  useEffect(() => {
    if (!enabled) {
      clearTimers();
      return;
    }

    resetTimer();
    ACTIVITY_EVENTS.forEach(e => window.addEventListener(e, handleActivity, { passive: true }));

    return () => {
      clearTimers();
      clearTimeout(debounceRef.current);
      ACTIVITY_EVENTS.forEach(e => window.removeEventListener(e, handleActivity));
    };
  }, [enabled, resetTimer, handleActivity, clearTimers]);

  return { resetTimer };
}
