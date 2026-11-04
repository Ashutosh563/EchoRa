import { useState, useRef, useEffect, useCallback } from "react";
import type { StagePlaylist } from "../types/transition";
import type { Track } from "../types/api";

export interface QueueItem {
  track: Track;
  stageNumber: number;
  stageMood: string;
}

function safePlay(audio: HTMLAudioElement, onPlaying: () => void, onError: () => void) {
  try {
    const playPromise = audio.play();
    if (playPromise && typeof playPromise.then === "function") {
      playPromise.then(onPlaying).catch(onError);
    } else {
      onPlaying();
    }
  } catch {
    onError();
  }
}

export function useTransitionPlayback() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(-1);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const currentItem = currentIndex >= 0 && currentIndex < queue.length ? queue[currentIndex] : null;
  const activeTrackId = currentItem?.track.id ?? null;
  const activeStageNumber = currentItem?.stageNumber ?? null;

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsPlaying(false);
    setProgress(0);
  }, []);

  const playIndex = useCallback(
    (index: number, currentQueue = queue) => {
      if (index < 0 || index >= currentQueue.length) {
        stopAudio();
        setCurrentIndex(-1);
        return;
      }

      stopAudio();
      setCurrentIndex(index);

      const item = currentQueue[index];
      if (!item?.track.previewUrl) {
        // Track doesn't have an audio preview
        setIsPlaying(false);
        return;
      }

      const audio = new Audio(item.track.previewUrl);
      audioRef.current = audio;

      audio.ontimeupdate = () => {
        if (audio.duration) {
          setProgress(audio.currentTime / audio.duration);
        }
      };

      audio.onended = () => {
        // Automatically advance to the next track in the continuous queue
        playIndex(index + 1, currentQueue);
      };

      audio.onerror = () => {
        // On error, stop playing
        setIsPlaying(false);
      };

      safePlay(
        audio,
        () => setIsPlaying(true),
        () => setIsPlaying(false),
      );
    },
    [queue, stopAudio],
  );

  const playEntireJourney = useCallback(
    (stages: StagePlaylist[]) => {
      const fullQueue: QueueItem[] = [];
      for (const stage of stages) {
        for (const track of stage.tracks) {
          fullQueue.push({
            track,
            stageNumber: stage.stage,
            stageMood: stage.mood,
          });
        }
      }

      if (fullQueue.length === 0) return;
      setQueue(fullQueue);
      playIndex(0, fullQueue);
    },
    [playIndex],
  );

  const playStage = useCallback(
    (stage: StagePlaylist) => {
      const stageQueue: QueueItem[] = stage.tracks.map((track) => ({
        track,
        stageNumber: stage.stage,
        stageMood: stage.mood,
      }));

      if (stageQueue.length === 0) return;
      setQueue(stageQueue);
      playIndex(0, stageQueue);
    },
    [playIndex],
  );

  const playTrackInQueue = useCallback(
    (track: Track, stageNumber: number, stageMood: string, allStages?: StagePlaylist[]) => {
      // If allStages provided, use the entire journey as queue and find track's index
      if (allStages) {
        const fullQueue: QueueItem[] = [];
        let targetIndex = -1;
        for (const stage of allStages) {
          for (const t of stage.tracks) {
            if (t.id === track.id) {
              targetIndex = fullQueue.length;
            }
            fullQueue.push({
              track: t,
              stageNumber: stage.stage,
              stageMood: stage.mood,
            });
          }
        }
        setQueue(fullQueue);
        playIndex(targetIndex >= 0 ? targetIndex : 0, fullQueue);
      } else {
        // Toggle if already playing
        if (activeTrackId === track.id) {
          if (isPlaying && audioRef.current) {
            audioRef.current.pause();
            setIsPlaying(false);
          } else if (audioRef.current) {
            safePlay(
              audioRef.current,
              () => setIsPlaying(true),
              () => setIsPlaying(false),
            );
          }
        } else {
          const single: QueueItem[] = [{ track, stageNumber, stageMood }];
          setQueue(single);
          playIndex(0, single);
        }
      }
    },
    [activeTrackId, isPlaying, playIndex],
  );

  const togglePlay = useCallback(() => {
    if (!audioRef.current) {
      if (currentIndex >= 0 && currentIndex < queue.length) {
        playIndex(currentIndex);
      }
      return;
    }

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      safePlay(
        audioRef.current,
        () => setIsPlaying(true),
        () => setIsPlaying(false),
      );
    }
  }, [currentIndex, isPlaying, playIndex, queue]);

  const skipNext = useCallback(() => {
    if (currentIndex + 1 < queue.length) {
      playIndex(currentIndex + 1);
    }
  }, [currentIndex, playIndex, queue.length]);

  const skipPrev = useCallback(() => {
    if (currentIndex - 1 >= 0) {
      playIndex(currentIndex - 1);
    }
  }, [currentIndex, playIndex]);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  return {
    queue,
    currentItem,
    activeTrackId,
    activeStageNumber,
    isPlaying,
    progress,
    playEntireJourney,
    playStage,
    playTrackInQueue,
    togglePlay,
    skipNext,
    skipPrev,
    stopAudio,
  };
}
