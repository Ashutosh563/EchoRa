import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import type { Track } from '../types';

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

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Live refs to guarantee immediate access in event listeners without stale closures
  const queueRef = useRef<Track[]>([]);
  const currentTrackRef = useRef<Track | null>(null);
  const loopAtEndRef = useRef<boolean>(true);

  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  useEffect(() => {
    currentTrackRef.current = currentTrack;
  }, [currentTrack]);

  // Initialize native HTML5 Audio element once
  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'auto';
    audio.volume = 0.85;
    audioRef.current = audio;

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const onDurationChange = () => {
      if (audio.duration && !isNaN(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    const onWaiting = () => {
      setIsBuffering(true);
    };

    const onPlaying = () => {
      setIsBuffering(false);
      setIsPlaying(true);
    };

    const onPause = () => {
      setIsPlaying(false);
      setIsBuffering(false);
    };

    const onEnded = () => {
      handleAutoNext();
    };

    const onError = (e: Event) => {
      console.warn('[Echora Audio] Stream notice/recovering:', e);
      setIsBuffering(false);
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('durationchange', onDurationChange);
    audio.addEventListener('waiting', onWaiting);
    audio.addEventListener('playing', onPlaying);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('durationchange', onDurationChange);
      audio.removeEventListener('waiting', onWaiting);
      audio.removeEventListener('playing', onPlaying);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
      audio.pause();
      audio.src = '';
    };
  }, []);

  const playTrack = useCallback(
    async (track: Track, newQueue?: Track[], options?: { loopAtEnd?: boolean }) => {
      if (options?.loopAtEnd !== undefined) {
        loopAtEndRef.current = options.loopAtEnd;
      } else if (newQueue) {
        loopAtEndRef.current = true;
      }

      setCurrentTrack(track);
      currentTrackRef.current = track;
      setIsBuffering(true);
      setCurrentTime(0);
      setDuration(track.durationMs ? track.durationMs / 1000 : 0);

      if (newQueue && newQueue.length > 0) {
        setQueue(newQueue);
        queueRef.current = newQueue;
      } else if (queueRef.current.length === 0) {
        setQueue([track]);
        queueRef.current = [track];
      }

      const audio = audioRef.current;
      if (!audio) return;

      try {
        const artist = track.artists?.join(' ') || '';
        const streamUrl = `/api/music/stream?track=${encodeURIComponent(track.name)}&artist=${encodeURIComponent(artist)}`;

        audio.src = streamUrl;
        audio.load();
        await audio.play();
        setIsPlaying(true);
        setIsBuffering(false);

        // Update OS Media Session (Lock screen, Mac Control Center, AirPods)
        if ('mediaSession' in navigator) {
          navigator.mediaSession.metadata = new MediaMetadata({
            title: track.name,
            artist: track.artists?.join(', ') || 'Unknown Artist',
            album: track.album || 'EchoRa Stream',
            artwork: track.albumArtUrl
              ? [{ src: track.albumArtUrl, sizes: '512x512', type: 'image/jpeg' }]
              : [],
          });
        }
      } catch (err: unknown) {
        console.warn('[Echora Audio] Autoplay deferred until user interaction:', err);
        setIsBuffering(false);
      }
    },
    [],
  );

  const togglePlayPause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (audio.paused) {
      audio.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  }, []);

  const seekTo = useCallback((seconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    try {
      audio.currentTime = seconds;
      setCurrentTime(seconds);
    } catch {
      // ignore
    }
  }, []);

  const setVolume = useCallback((newVol: number) => {
    const clamped = Math.max(0, Math.min(1, newVol));
    setVolumeState(clamped);
    setIsMuted(clamped === 0);
    const audio = audioRef.current;
    if (audio) {
      audio.volume = clamped;
    }
  }, []);

  const toggleMute = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isMuted) {
      audio.muted = false;
      audio.volume = volume;
      setIsMuted(false);
    } else {
      audio.muted = true;
      setIsMuted(true);
    }
  }, [isMuted, volume]);

  const playNext = useCallback(() => {
    const activeQueue = queueRef.current;
    const activeTrack = currentTrackRef.current;
    if (!activeTrack || activeQueue.length === 0) return;

    const currentIndex = activeQueue.findIndex((t) => t.id === activeTrack.id);
    if (currentIndex !== -1 && currentIndex + 1 < activeQueue.length) {
      void playTrack(activeQueue[currentIndex + 1]);
    } else if (loopAtEndRef.current && activeQueue.length > 0) {
      void playTrack(activeQueue[0]);
    } else {
      setIsPlaying(false);
      setIsBuffering(false);
      if (audioRef.current) {
        audioRef.current.pause();
      }
    }
  }, [playTrack]);

  const handleAutoNext = useCallback(() => {
    const activeQueue = queueRef.current;
    const activeTrack = currentTrackRef.current;
    if (!activeTrack || activeQueue.length === 0) return;

    const currentIndex = activeQueue.findIndex((t) => t.id === activeTrack.id);
    if (currentIndex !== -1 && currentIndex + 1 < activeQueue.length) {
      void playTrack(activeQueue[currentIndex + 1]);
    } else if (loopAtEndRef.current && activeQueue.length > 0) {
      void playTrack(activeQueue[0]);
    } else {
      setIsPlaying(false);
      setIsBuffering(false);
    }
  }, [playTrack]);

  const playPrevious = useCallback(() => {
    const activeQueue = queueRef.current;
    const activeTrack = currentTrackRef.current;
    const audio = audioRef.current;

    // If song is past 3 seconds, replay from beginning
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0;
      setCurrentTime(0);
      return;
    }

    if (!activeTrack || activeQueue.length === 0) return;

    const currentIndex = activeQueue.findIndex((t) => t.id === activeTrack.id);
    if (currentIndex > 0) {
      void playTrack(activeQueue[currentIndex - 1]);
    } else if (loopAtEndRef.current && activeQueue.length > 0) {
      void playTrack(activeQueue[activeQueue.length - 1]);
    }
  }, [playTrack]);

  const appendQueue = useCallback((newTracks: Track[]) => {
    if (!newTracks || newTracks.length === 0) return;
    setQueue((prev) => {
      const existingIds = new Set(prev.map((t) => t.id));
      const filtered = newTracks.filter((t) => !existingIds.has(t.id));
      const updated = [...prev, ...filtered];
      queueRef.current = updated;
      return updated;
    });
  }, []);

  const closePlayer = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.src = '';
    }
    setCurrentTrack(null);
    currentTrackRef.current = null;
    setIsPlaying(false);
    setIsBuffering(false);
    setCurrentTime(0);
    setDuration(0);
    setQueue([]);
    queueRef.current = [];
  }, []);

  // Set up OS media controls
  useEffect(() => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('play', () => togglePlayPause());
      navigator.mediaSession.setActionHandler('pause', () => togglePlayPause());
      navigator.mediaSession.setActionHandler('previoustrack', () => playPrevious());
      navigator.mediaSession.setActionHandler('nexttrack', () => playNext());
    }
  }, [togglePlayPause, playPrevious, playNext]);

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
