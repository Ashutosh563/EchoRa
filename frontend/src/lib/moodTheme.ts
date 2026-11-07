import type { Energy, MusicIntent } from '../types';

export interface MoodTheme {
  primary: string;
  secondary: string;
  accent1: string;
  accent2: string;
  blobs: [string, string, string, string];
  animationDuration: number; // in seconds
  opacity: number;
}

export function getMoodTheme(intent?: MusicIntent | null, moodOverride?: string): MoodTheme {
  const energy: Energy = intent?.energy ?? 'medium';
  const mood = (moodOverride ?? intent?.mood ?? '').toLowerCase();

  // Energy modifies animation speed & opacity
  let animationDuration = 30;
  let opacity = 0.42;

  if (energy === 'low') {
    animationDuration = 45;
    opacity = 0.35;
  } else if (energy === 'high') {
    animationDuration = 16;
    opacity = 0.52;
  }

  // calm / peaceful / relaxed / chill / serene → cyan + violet
  if (/calm|peaceful|relaxed|chill|serene|tranquil|gentle|zen|ambient/i.test(mood)) {
    return {
      primary: '#22D3EE', // cyan
      secondary: '#8B5CF6', // violet
      accent1: '#38BDF8',
      accent2: '#A78BFA',
      blobs: ['#22D3EE', '#8B5CF6', '#06B6D4', '#7C3AED'],
      animationDuration,
      opacity,
    };
  }

  // happy / upbeat / joyful / cheerful → amber + magenta
  if (/happy|upbeat|joyful|cheerful|excited|sunny|fun|celebration/i.test(mood)) {
    return {
      primary: '#F59E0B', // amber
      secondary: '#EC4899', // magenta
      accent1: '#FB7185',
      accent2: '#FBBF24',
      blobs: ['#F59E0B', '#EC4899', '#F97316', '#DB2777'],
      animationDuration,
      opacity,
    };
  }

  // sad / melancholy / nostalgic / lonely → deep blue-violet + muted magenta
  if (/sad|melanchol|nostalgic|lonely|heartbreak|somber|gloomy|sorrow|depress/i.test(mood)) {
    return {
      primary: '#4338CA', // deep blue-violet
      secondary: '#9D174D', // muted magenta
      accent1: '#1E1B4B',
      accent2: '#6366F1',
      blobs: ['#4338CA', '#831843', '#312E81', '#701A75'],
      animationDuration,
      opacity,
    };
  }

  // angry / intense / aggressive / powerful → magenta + amber (high saturation)
  if (/angry|intense|aggressive|powerful|rage|furious|pumped|hardcore/i.test(mood)) {
    return {
      primary: '#EC4899', // magenta
      secondary: '#F59E0B', // amber
      accent1: '#EF4444',
      accent2: '#F97316',
      blobs: ['#F43F5E', '#F59E0B', '#E11D48', '#EA580C'],
      animationDuration: Math.min(animationDuration, 16),
      opacity: Math.max(opacity, 0.5),
    };
  }

  // romantic / dreamy / sensual → magenta + violet
  if (/romantic|dreamy|sensual|love|intimate|sweet|ethereal/i.test(mood)) {
    return {
      primary: '#EC4899', // magenta
      secondary: '#8B5CF6', // violet
      accent1: '#D946EF',
      accent2: '#C084FC',
      blobs: ['#EC4899', '#8B5CF6', '#D946EF', '#A855F7'],
      animationDuration,
      opacity,
    };
  }

  // focused / studious / concentrated → cyan + violet
  if (/focus|studious|concentrat|study|deep work|coding|read/i.test(mood)) {
    return {
      primary: '#22D3EE', // cyan
      secondary: '#8B5CF6', // violet
      accent1: '#0284C7',
      accent2: '#6D28D9',
      blobs: ['#06B6D4', '#7C3AED', '#0284C7', '#4F46E5'],
      animationDuration,
      opacity,
    };
  }

  // default → violet + cyan
  return {
    primary: '#8B5CF6',
    secondary: '#22D3EE',
    accent1: '#EC4899',
    accent2: '#F59E0B',
    blobs: ['#8B5CF6', '#EC4899', '#22D3EE', '#F59E0B'],
    animationDuration,
    opacity,
  };
}

