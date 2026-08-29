'use client';

import { useEffect, useRef, useState } from 'react';

export function useRealtimeAlerts(intervalMs = 30000) {
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    function tick() {
      setLastUpdated(new Date());
    }
    timerRef.current = window.setInterval(tick, intervalMs);
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [intervalMs]);

  return { lastUpdated };
}
