import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import type { Track } from '../types';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

interface AudioPlayerContextType {
  currentTrack: Track | null;
  isPlaying: boolean;
  isBuffering: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  queue: Track[];
  queueIndex: number;
  playTrack: (track: Track, newQueue?: Track[], options?: { loopAtEnd?: boolean }) => Promise<void>;
  togglePlayPause: () => void;
  seekTo: (seconds: number) => void;
  setVolume: (vol: number) => void;
  toggleMute: () => void;
  playNext: () => void;
  playPrevious: () => void;
  appendQueue: (newTracks: Track[]) => void;
  closePlayer: () => void;
}

const AudioPlayerContext = createContext<AudioPlayerContextType | null>(null);

export function AudioPlayerProvider({ children }: { children: React.ReactNode }) {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);
  const [queue, setQueue] = useState<Track[]>([]);

  const ytPlayerRef = useRef<any>(null);
  const isApiReadyRef = useRef(false);
  const pendingVideoIdRef = useRef<string | null>(null);
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Live refs to guarantee immediate access in YouTube event listeners and avoid stale closures
  const queueRef = useRef<Track[]>([]);
  const currentTrackRef = useRef<Track | null>(null);
  const currentTimeRef = useRef<number>(0);
  const loopAtEndRef = useRef<boolean>(true);

  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  useEffect(() => {
    currentTrackRef.current = currentTrack;
  }, [currentTrack]);

  // Initialize YouTube IFrame API
  useEffect(() => {
    if (window.YT && window.YT.Player) {
      isApiReadyRef.current = true;
      initPlayer();
      return;
    }

    const previousOnReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (previousOnReady) previousOnReady();
      isApiReadyRef.current = true;
      initPlayer();
    };

    if (!document.getElementById('youtube-iframe-api')) {
      const tag = document.createElement('script');
      tag.id = 'youtube-iframe-api';
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
    }
  }, []);

  const initPlayer = () => {
    if (ytPlayerRef.current || !window.YT) return;

    try {
      ytPlayerRef.current = new window.YT.Player('echora-headless-audio-player', {
        height: '1',
        width: '1',
        playerVars: {
          autoplay: 1,
          controls: 0,
          disablekb: 1,
          fs: 0,
          rel: 0,
          playsinline: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: (event: any) => {
            event.target.setVolume(volume * 100);
            if (pendingVideoIdRef.current) {
              const vid = pendingVideoIdRef.current;
              pendingVideoIdRef.current = null;
              event.target.loadVideoById(vid);
              event.target.playVideo();
            }
          },
          onStateChange: (event: any) => {
            // YT.PlayerState: -1 unstarted, 0 ended, 1 playing, 2 paused, 3 buffering, 5 cued
            if (event.data === 1) {
              setIsPlaying(true);
              setIsBuffering(false);
              startProgressTimer();
            } else if (event.data === 2) {
              setIsPlaying(false);
              setIsBuffering(false);
              stopProgressTimer();
            } else if (event.data === 3) {
              setIsBuffering(true);
            } else if (event.data === 0) {
              // Track ended: auto-advance to next song
              stopProgressTimer();
              handleAutoNext();
            }
          },
          onError: () => {
            setIsBuffering(false);
            setIsPlaying(false);
            stopProgressTimer();
          },
        },
      });
    } catch {
      // Graceful fallback
    }
  };

  const startProgressTimer = () => {
    stopProgressTimer();
    progressTimerRef.current = setInterval(() => {
      if (ytPlayerRef.current && typeof ytPlayerRef.current.getCurrentTime === 'function') {
        try {
          const cur = ytPlayerRef.current.getCurrentTime() || 0;
          const dur = ytPlayerRef.current.getDuration() || 0;
          setCurrentTime(cur);
          currentTimeRef.current = cur;
          if (dur > 0) setDuration(dur);
        } catch {
          // ignore
        }
      }
    }, 250);
  };

  const stopProgressTimer = () => {
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
  };

  const playTrack = useCallback(async (track: Track, newQueue?: Track[], options?: { loopAtEnd?: boolean }) => {
    if (options?.loopAtEnd !== undefined) {
      loopAtEndRef.current = options.loopAtEnd;
    } else if (newQueue) {
      loopAtEndRef.current = true;
    }

    setCurrentTrack(track);
    currentTrackRef.current = track;
    setIsBuffering(true);
    setCurrentTime(0);
    currentTimeRef.current = 0;
    setDuration(track.durationMs ? track.durationMs / 1000 : 0);

    if (newQueue && newQueue.length > 0) {
      setQueue(newQueue);
      queueRef.current = newQueue;
    } else if (queueRef.current.length === 0) {
      setQueue([track]);
      queueRef.current = [track];
    }

    try {
      const artist = track.artists?.join(' ') || '';
      const res = await fetch(
        `/api/music/youtube-stream?track=${encodeURIComponent(track.name)}&artist=${encodeURIComponent(artist)}`,
      );
      const data = await res.json();

      if (data?.videoId) {
        if (ytPlayerRef.current && typeof ytPlayerRef.current.loadVideoById === 'function') {
          ytPlayerRef.current.loadVideoById(data.videoId);
          ytPlayerRef.current.playVideo();
          setIsPlaying(true);
        } else {
          pendingVideoIdRef.current = data.videoId;
        }
      } else {
        setIsBuffering(false);
      }
    } catch {
      setIsBuffering(false);
    }
  }, []);

  const togglePlayPause = useCallback(() => {
    if (!ytPlayerRef.current) return;
    try {
      if (isPlaying) {
        ytPlayerRef.current.pauseVideo();
        setIsPlaying(false);
      } else {
        ytPlayerRef.current.playVideo();
        setIsPlaying(true);
      }
    } catch {
      // ignore
    }
  }, [isPlaying]);

  const seekTo = useCallback((seconds: number) => {
    if (!ytPlayerRef.current || typeof ytPlayerRef.current.seekTo !== 'function') return;
    try {
      ytPlayerRef.current.seekTo(seconds, true);
      setCurrentTime(seconds);
      currentTimeRef.current = seconds;
    } catch {
      // ignore
    }
  }, []);

  const setVolume = useCallback((newVol: number) => {
    const clamped = Math.max(0, Math.min(1, newVol));
    setVolumeState(clamped);
    setIsMuted(clamped === 0);
    if (ytPlayerRef.current && typeof ytPlayerRef.current.setVolume === 'function') {
      try {
        ytPlayerRef.current.setVolume(clamped * 100);
      } catch {
        // ignore
      }
    }
  }, []);

  const toggleMute = useCallback(() => {
    if (!ytPlayerRef.current) return;
    try {
      if (isMuted) {
        ytPlayerRef.current.unMute();
        ytPlayerRef.current.setVolume(volume * 100);
        setIsMuted(false);
      } else {
        ytPlayerRef.current.mute();
        setIsMuted(true);
      }
    } catch {
      // ignore
    }
  }, [isMuted, volume]);

  const playNext = useCallback(() => {
    const activeQueue = queueRef.current;
    const activeTrack = currentTrackRef.current;
    if (!activeTrack || activeQueue.length === 0) return;

    const currentIndex = activeQueue.findIndex((t) => t.id === activeTrack.id);
    if (currentIndex !== -1 && currentIndex + 1 < activeQueue.length) {
      // Advance to next song in playlist
      void playTrack(activeQueue[currentIndex + 1]);
    } else if (loopAtEndRef.current && activeQueue.length > 0) {
      // Reached the end: loop back to the start and play playlist again!
      void playTrack(activeQueue[0]);
    } else {
      // Reached the end with loopAtEnd === false (e.g., Transition Mode 20th song): stop playback
      setIsPlaying(false);
      setIsBuffering(false);
      stopProgressTimer();
      if (ytPlayerRef.current && typeof ytPlayerRef.current.pauseVideo === 'function') {
        try {
          ytPlayerRef.current.pauseVideo();
        } catch {
          // ignore
        }
      }
    }
  }, [playTrack]);

  const playPrevious = useCallback(() => {
    const activeQueue = queueRef.current;
    const activeTrack = currentTrackRef.current;
    if (!activeTrack || activeQueue.length === 0) return;

    // If more than 3 seconds in, seek to beginning of current track
    if (currentTimeRef.current > 3) {
      seekTo(0);
      return;
    }

    const currentIndex = activeQueue.findIndex((t) => t.id === activeTrack.id);
    if (currentIndex > 0) {
      void playTrack(activeQueue[currentIndex - 1]);
    } else if (activeQueue.length > 0) {
      // At the start: jump to the last track in the playlist
      void playTrack(activeQueue[activeQueue.length - 1]);
    }
  }, [seekTo, playTrack]);

  const handleAutoNext = useCallback(() => {
    playNext();
  }, [playNext]);

  const appendQueue = useCallback((newTracks: Track[]) => {
    if (!newTracks || newTracks.length === 0) return;
    setQueue((prevQueue) => {
      const existingIds = new Set(prevQueue.map((t) => t.id));
      const freshTracks = newTracks.filter((t) => !existingIds.has(t.id));
      const updatedQueue = [...prevQueue, ...freshTracks];
      queueRef.current = updatedQueue;
      return updatedQueue;
    });
  }, []);

  const closePlayer = useCallback(() => {
    if (ytPlayerRef.current && typeof ytPlayerRef.current.stopVideo === 'function') {
      try {
        ytPlayerRef.current.stopVideo();
      } catch {
        // ignore
      }
    }
    stopProgressTimer();
    setIsPlaying(false);
    setIsBuffering(false);
    setCurrentTrack(null);
    currentTrackRef.current = null;
  }, []);

  const queueIndex = currentTrack ? queue.findIndex((t) => t.id === currentTrack.id) : -1;

  return (
    <AudioPlayerContext.Provider
      value={{
        currentTrack,
        isPlaying,
        isBuffering,
        currentTime,
        duration,
        volume,
        isMuted,
        queue,
        queueIndex,
        playTrack,
        togglePlayPause,
        seekTo,
        setVolume,
        toggleMute,
        playNext,
        playPrevious,
        appendQueue,
        closePlayer,
      }}
    >
      {children}
      {/* Invisible container for headless audio playback via YouTube IFrame API */}
      <div
        id="echora-headless-audio-player-container"
        className="fixed -bottom-20 -right-20 w-1 h-1 opacity-0 pointer-events-none -z-50"
        aria-hidden="true"
      >
        <div id="echora-headless-audio-player" />
      </div>
    </AudioPlayerContext.Provider>
  );
}

export function useAudioPlayer() {
  const ctx = useContext(AudioPlayerContext);
  if (!ctx) {
    throw new Error('useAudioPlayer must be used within an AudioPlayerProvider');
  }
  return ctx;
}
