import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { VibeRefinementBar } from '../src/components/VibeRefinementBar';
import { TrackGrid } from '../src/components/TrackGrid';
import type { Track } from '../src/types';

const mockTrack: Track = {
  id: 't1',
  name: 'Sudno',
  artists: ['Molchat Doma'],
  album: 'Etazhi',
  albumArtUrl: null,
  previewUrl: null,
  durationMs: 140000,
  spotifyUrl: 'https://open.spotify.com/track/t1',
};

describe('Continuous Discovery & Vibe Refinement UI', () => {
  describe('VibeRefinementBar Component', () => {
    it('renders interactive refinement chips on Page 1', () => {
      const onRefine = vi.fn();
      render(
        <VibeRefinementBar
          page={1}
          totalTracks={10}
          activeMood="melancholic"
          onRefine={onRefine}
        />
      );

      expect(screen.getByText(/Refine Vibe/i)).toBeInTheDocument();
      expect(screen.getByText(/More Acoustic/i)).toBeInTheDocument();
      expect(screen.getByText(/Darker Tone/i)).toBeInTheDocument();
      expect(screen.getByText(/Higher Energy/i)).toBeInTheDocument();

      fireEvent.click(screen.getByText(/More Acoustic/i));
      expect(onRefine).toHaveBeenCalledWith(
        'acoustic',
        'More Acoustic',
        'acoustic unplugged organic sound'
      );
    });

    it('removes the vibe refinement bar completely once page > 1', () => {
      const onRefine = vi.fn();
      const { container } = render(
        <VibeRefinementBar
          page={2}
          totalTracks={20}
          activeMood="melancholic"
          onRefine={onRefine}
        />
      );

      expect(container).toBeEmptyDOMElement();
      expect(screen.queryByText(/Continuous Discovery Active/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Vibe locked for playlist cohesion/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/More Acoustic/i)).not.toBeInTheDocument();
    });
  });

  describe('TrackGrid Load More Action', () => {
    it('renders Load More button and triggers onLoadMore on click', () => {
      const onLoadMore = vi.fn();
      render(
        <TrackGrid
          tracks={[mockTrack]}
          page={1}
          hasMore={true}
          isLoadingMore={false}
          onLoadMore={onLoadMore}
        />
      );

      const loadMoreBtn = screen.getByRole('button', { name: /Load More Tracks/i });
      expect(loadMoreBtn).toBeInTheDocument();

      fireEvent.click(loadMoreBtn);
      expect(onLoadMore).toHaveBeenCalledTimes(1);
    });

    it('shows loading state when isLoadingMore is true', () => {
      render(
        <TrackGrid
          tracks={[mockTrack]}
          page={2}
          hasMore={true}
          isLoadingMore={true}
          onLoadMore={() => { }}
        />
      );

      expect(screen.getByText(/Mining next tracks.../i)).toBeInTheDocument();
    });

    it('completely removes Load More button once 25+ tracks are assembled', () => {
      const twentyFiveTracks = Array.from({ length: 25 }, (_, i) => ({
        ...mockTrack,
        id: `track-${i}`,
      }));

      render(
        <TrackGrid
          tracks={twentyFiveTracks}
          page={3}
          hasMore={true}
          isLoadingMore={false}
          onLoadMore={() => { }}
        />
      );

      expect(screen.queryByText(/Full sonic journey assembled/i)).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Load More Tracks/i })).not.toBeInTheDocument();
    });
  });
});
