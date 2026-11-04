import { useMemo } from 'react';
import { getMoodTheme, type MoodTheme } from '../lib/moodTheme';
import type { MusicIntent } from '../types';

export function useMoodTheme(intent?: MusicIntent | null): MoodTheme {
  return useMemo(() => getMoodTheme(intent), [intent]);
}

