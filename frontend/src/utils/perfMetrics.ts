export interface PerfMetricsSnapshot {
  fps: number;
  fcpMs: number | null;
  lcpMs: number | null;
  longTasksCount: number;
  maxLongTaskMs: number;
  lastInteractionMs: number | null;
}

declare global {
  interface Window {
    __ECHORA_PERF__?: {
      getSnapshot: () => PerfMetricsSnapshot;
    };
  }
}

const state: PerfMetricsSnapshot = {
  fps: 60,
  fcpMs: null,
  lcpMs: null,
  longTasksCount: 0,
  maxLongTaskMs: 0,
  lastInteractionMs: null,
};

/**
 * Initializes non-intrusive browser performance telemetry (FCP, LCP, Long Tasks,
 * and optional FPS counter when `?perf=1` is present in the URL).
 */
export function initPerfMetrics(): () => void {
  if (typeof window === 'undefined' || typeof PerformanceObserver === 'undefined') {
    return () => {};
  }

  const observers: PerformanceObserver[] = [];
  let rafId: number | null = null;

  const tryObserve = (type: string, callback: (entries: PerformanceEntryList) => void) => {
    try {
      const supported = PerformanceObserver.supportedEntryTypes;
      if (supported && !supported.includes(type)) return;
      const obs = new PerformanceObserver((list) => callback(list.getEntries()));
      obs.observe({ type, buffered: true } as PerformanceObserverInit);
      observers.push(obs);
    } catch {
      // Ignore unsupported entry types in older/test environments
    }
  };

  tryObserve('paint', (entries) => {
    for (const entry of entries) {
      if (entry.name === 'first-contentful-paint') {
        state.fcpMs = Math.round(entry.startTime);
      }
    }
  });

  tryObserve('largest-contentful-paint', (entries) => {
    const last = entries[entries.length - 1];
    if (last) {
      state.lcpMs = Math.round(last.startTime);
    }
  });

  tryObserve('longtask', (entries) => {
    for (const entry of entries) {
      state.longTasksCount += 1;
      if (entry.duration > state.maxLongTaskMs) {
        state.maxLongTaskMs = Math.round(entry.duration);
      }
    }
  });

  tryObserve('event', (entries) => {
    for (const entry of entries) {
      if (entry.duration > 16) {
        state.lastInteractionMs = Math.round(entry.duration);
      }
    }
  });

  // Optional active FPS sampling when ?perf=1 is in the query string
  const params = new URLSearchParams(window.location.search);
  if (params.get('perf') === '1') {
    let frames = 0;
    let lastTime = performance.now();

    const tick = (now: number) => {
      frames += 1;
      const elapsed = now - lastTime;
      if (elapsed >= 1000) {
        state.fps = Math.round((frames * 1000) / elapsed);
        frames = 0;
        lastTime = now;
      }
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
  }

  window.__ECHORA_PERF__ = {
    getSnapshot: () => ({ ...state }),
  };

  return () => {
    observers.forEach((o) => o.disconnect());
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
    }
  };
}

export function getPerfSnapshot(): PerfMetricsSnapshot {
  return { ...state };
}

