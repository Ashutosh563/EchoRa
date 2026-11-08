import { render, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AuroraBackground } from '../src/components/AuroraBackground';
import { TrackCard } from '../src/components/TrackCard';
import { getMoodTheme } from '../src/lib/moodTheme';
import { initPerfMetrics, getPerfSnapshot } from '../src/utils/perfMetrics';
import type { Track } from '../src/types';

const SAMPLE_TRACK: Track = {
  id: 'perf-track-1',
  name: 'Liquid Horizon',
  artists: ['Solaris'],
  album: 'Aether',
  albumArtUrl: 'https://example.com/cover.jpg',
  durationMs: 215000,
  spotifyUrl: 'https://open.spotify.com/track/perf-track-1',
  previewUrl: 'https://example.com/preview.mp3',
};

describe('UI Performance Optimizations', () => {
  beforeEach(() => {
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb: FrameRequestCallback) => {
      cb(16);
      return 1;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('AuroraBackground uses compositor-friendly radial gradients without live SVG feTurbulence filters', () => {
    const theme = getMoodTheme(undefined, 'peaceful');
    const { container } = render(<AuroraBackground theme={theme} />);

    // Verify no expensive live SVG feTurbulence filter is mounted
    expect(container.querySelector('feTurbulence')).toBeNull();

    // Verify strict CSS containment is applied on the background root
    const bgRoot = container.firstElementChild as HTMLElement;
    expect(bgRoot.style.contain).toBe('strict');
  });

  it('TrackCard updates 3D tilt via CSS custom properties (--rx, --ry) without synchronous layout thrashing', () => {
    const onTogglePreview = vi.fn();
    const onSelectTrack = vi.fn();

    const { container } = render(
      <TrackCard
        track={SAMPLE_TRACK}
        isPreviewPlaying={false}
        previewProgress={0}
        onTogglePreview={onTogglePreview}
        onSelectTrack={onSelectTrack}
      />
    );

    const cardWrapper = container.firstElementChild as HTMLElement;
    expect(cardWrapper.className).toContain('tilt-card');
    expect(cardWrapper.className).not.toContain('conic-active');

    // Mock bounding rect once on mouseEnter
    const rectSpy = vi.spyOn(cardWrapper, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      width: 300,
      height: 100,
      right: 300,
      bottom: 100,
      x: 0,
      y: 0,
      toJSON: () => {},
    });

    fireEvent.mouseEnter(cardWrapper);
    expect(rectSpy).toHaveBeenCalledTimes(1);

    // Multiple mouseMove events reuse the cached rect and set CSS variables
    fireEvent.mouseMove(cardWrapper, { clientX: 225, clientY: 25 });
    fireEvent.mouseMove(cardWrapper, { clientX: 250, clientY: 10 });
    expect(rectSpy).toHaveBeenCalledTimes(1);
    expect(cardWrapper.style.getPropertyValue('--rx')).not.toBe('');
    expect(cardWrapper.style.getPropertyValue('--ry')).not.toBe('');

    // MouseLeave resets CSS variables to 0deg
    fireEvent.mouseLeave(cardWrapper);
    expect(cardWrapper.style.getPropertyValue('--rx')).toBe('0deg');
    expect(cardWrapper.style.getPropertyValue('--ry')).toBe('0deg');

    // Lazy image loading attributes are present
    const img = container.querySelector('img');
    expect(img?.getAttribute('loading')).toBe('lazy');
    expect(img?.getAttribute('decoding')).toBe('async');
  });

  it('initPerfMetrics registers window.__ECHORA_PERF__ snapshot provider and cleans up', () => {
    const cleanup = initPerfMetrics();
    expect(window.__ECHORA_PERF__).toBeDefined();

    const snapshot = getPerfSnapshot();
    expect(snapshot.fps).toBeGreaterThan(0);
    expect(snapshot.longTasksCount).toBeGreaterThanOrEqual(0);

    cleanup();
  });
});
