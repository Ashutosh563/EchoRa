import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTransitionPlayback } from "../src/hooks/useTransitionPlayback";
import type { StagePlaylist } from "../src/types/transition";
import type { Track } from "../src/types/api";

function createMockTrack(id: string, name: string): Track {
  return {
    id,
    name,
    artists: ["Artist"],
    album: "Album",
    albumArtUrl: null,
    durationMs: 180000,
    spotifyUrl: `https://open.spotify.com/track/${id}`,
    previewUrl: `https://audio.preview/${id}.mp3`,
  };
}

describe("useTransitionPlayback", () => {
  const sampleStages: StagePlaylist[] = [
    {
      stage: 1,
      mood: "Sad",
      description: "Start",
      musicalCharacteristics: ["acoustic"],
      tracks: [createMockTrack("s1-t1", "Sad Song 1"), createMockTrack("s1-t2", "Sad Song 2")],
    },
    {
      stage: 2,
      mood: "Reflective",
      description: "Middle 1",
      musicalCharacteristics: ["mellow"],
      tracks: [createMockTrack("s2-t1", "Reflective Song 1")],
    },
    {
      stage: 3,
      mood: "Hopeful",
      description: "Middle 2",
      musicalCharacteristics: ["warm"],
      tracks: [createMockTrack("s3-t1", "Hopeful Song 1")],
    },
    {
      stage: 4,
      mood: "Happy",
      description: "End",
      musicalCharacteristics: ["upbeat"],
      tracks: [createMockTrack("s4-t1", "Happy Song 1"), createMockTrack("s4-t2", "Happy Song 2")],
    },
  ];

  it("builds a continuous ordered queue across all stages 1 to 4 on playEntireJourney", () => {
    const { result } = renderHook(() => useTransitionPlayback());

    act(() => {
      result.current.playEntireJourney(sampleStages);
    });

    expect(result.current.queue).toHaveLength(6);
    expect(result.current.queue[0].track.id).toBe("s1-t1");
    expect(result.current.queue[0].stageNumber).toBe(1);

    expect(result.current.queue[2].track.id).toBe("s2-t1");
    expect(result.current.queue[2].stageNumber).toBe(2);

    expect(result.current.queue[3].track.id).toBe("s3-t1");
    expect(result.current.queue[3].stageNumber).toBe(3);

    expect(result.current.queue[5].track.id).toBe("s4-t2");
    expect(result.current.queue[5].stageNumber).toBe(4);
  });

  it("queues only selected stage tracks on playStage", () => {
    const { result } = renderHook(() => useTransitionPlayback());

    act(() => {
      result.current.playStage(sampleStages[0]); // Stage 1
    });

    expect(result.current.queue).toHaveLength(2);
    expect(result.current.queue[0].track.id).toBe("s1-t1");
    expect(result.current.queue[1].track.id).toBe("s1-t2");
    expect(result.current.activeStageNumber).toBe(1);
  });

  it("advances active stage indicator when skipping tracks across stage boundaries", () => {
    const { result } = renderHook(() => useTransitionPlayback());

    act(() => {
      result.current.playEntireJourney(sampleStages);
    });

    expect(result.current.activeStageNumber).toBe(1);

    // Skip to track 2 (still stage 1)
    act(() => {
      result.current.skipNext();
    });
    expect(result.current.activeStageNumber).toBe(1);

    // Skip to track 3 (enters stage 2)
    act(() => {
      result.current.skipNext();
    });
    expect(result.current.activeStageNumber).toBe(2);
    expect(result.current.currentItem?.stageMood).toBe("Reflective");

    // Skip to track 4 (enters stage 3)
    act(() => {
      result.current.skipNext();
    });
    expect(result.current.activeStageNumber).toBe(3);
    expect(result.current.currentItem?.stageMood).toBe("Hopeful");
  });
});

