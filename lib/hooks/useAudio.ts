'use client';

import { useEffect, useRef, useCallback } from 'react';

interface UseAudioOptions {
  volume?: number;
  loop?: boolean;
  autoplay?: boolean;
}

export function useAudio(src: string, options: UseAudioOptions = {}) {
  const { volume = 1.0, loop = false, autoplay = false } = options;
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Create audio element
    audioRef.current = new Audio(src);
    audioRef.current.volume = volume;
    audioRef.current.loop = loop;

    if (autoplay) {
      audioRef.current.play().catch((error) => {
        console.warn('Autoplay prevented:', error);
      });
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [src, volume, loop, autoplay]);

  const play = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch((error) => {
        console.warn('Play prevented:', error);
      });
    }
  }, []);

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
  }, []);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, []);

  const setVolume = useCallback((newVolume: number) => {
    if (audioRef.current) {
      audioRef.current.volume = Math.max(0, Math.min(1, newVolume));
    }
  }, []);

  return {
    play,
    pause,
    stop,
    setVolume,
  };
}
