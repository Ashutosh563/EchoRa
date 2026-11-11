import type { BrowserContext, BrowserDayPeriod } from '../types/discovery';

export function dayPeriodForHour(hour: number): BrowserDayPeriod {
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'late_night';
}

/** Collects only local clock, locale, timezone, and connection state; requests no permissions. */
export function collectBrowserContext(): BrowserContext | undefined {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return undefined;

  try {
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const languages = [...new Set((navigator.languages?.length ? navigator.languages : [navigator.language])
      .filter((language): language is string => typeof language === 'string' && language.trim().length > 0)
      .map((language) => language.trim().slice(0, 35)))].slice(0, 5);

    return {
      localTime: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
      hour,
      dayOfWeek: dayNames[now.getDay()],
      dayPeriod: dayPeriodForHour(hour),
      languages,
      ...(timeZone ? { timeZone: timeZone.slice(0, 100) } : {}),
      online: navigator.onLine,
    };
  } catch {
    return undefined;
  }
}
