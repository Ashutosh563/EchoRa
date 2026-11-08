import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import React from "react";
import { AudioPlayerProvider, useAudioPlayer } from "../src/context/AudioPlayerContext";
import type { Track } from "../src/types";

function createMockTrack(id: string, name: string): Track {
  return {
    id,
    name,
    artists: ["Test Artist"],
    album: "Test Album",
    albumArtUrl: null,
    durationMs: 200000,
    spotifyUrl: `https://open.spotify.com/track/${id}`,
    previewUrl: null,
  };
}

describe("AudioPlayerContext queue & loop behavior", () => {
  beforeEach(() => {
    // Mock global fetch for youtube-stream
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ videoId: "mockVideo123" }),
    }) as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("loops back to song 1 by default when reaching queue end (Discover Mode behavior)", async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AudioPlayerProvider>{children}</AudioPlayerProvider>
    );
    const { result } = renderHook(() => useAudioPlayer(), { wrapper });

    const tracks = [
      createMockTrack("t1", "Track 1"),
      createMockTrack("t2", "Track 2"),
    ];

    // Play track 1 with default loopAtEnd: true
    await act(async () => {
      await result.current.playTrack(tracks[0], tracks);
    });

    expect(result.current.currentTrack?.id).toBe("t1");

    // Advance to track 2
    act(() => {
      result.current.playNext();
    });
    expect(result.current.currentTrack?.id).toBe("t2");

    // Advance past end -> should loop back to track 1
    act(() => {
      result.current.playNext();
    });
    expect(result.current.currentTrack?.id).toBe("t1");
  });

  it("stops playback when reaching the 20th song in Transition Mode (loopAtEnd: false)", async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AudioPlayerProvider>{children}</AudioPlayerProvider>
    );
    const { result } = renderHook(() => useAudioPlayer(), { wrapper });

    // Generate 20 transition tracks
    const twentyTracks = Array.from({ length: 20 }, (_, i) =>
      createMockTrack(`trans-${i + 1}`, `Transition Song ${i + 1}`)
    );

    // Start playback on 19th track with loopAtEnd: false
    await act(async () => {
      await result.current.playTrack(twentyTracks[18], twentyTracks, { loopAtEnd: false });
    });

    expect(result.current.currentTrack?.id).toBe("trans-19");

    // Advance to 20th track
    act(() => {
      result.current.playNext();
    });
    expect(result.current.currentTrack?.id).toBe("trans-20");

    // Advance past 20th track -> must STOP and NOT loop back to song 1
    act(() => {
      result.current.playNext();
    });

    // Should still stay on track 20 (or stopped), isPlaying should be false, not loop to trans-1
    expect(result.current.isPlaying).toBe(false);
    expect(result.current.currentTrack?.id).toBe("trans-20");
  });
});

