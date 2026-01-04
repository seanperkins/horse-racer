'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Sound effect types
export type SoundEffect =
  | 'button_click'
  | 'purchase'
  | 'sell'
  | 'bet_place'
  | 'race_start'
  | 'race_finish'
  | 'stumble'
  | 'surge'
  | 'victory'
  | 'defeat'
  | 'ready_up';

export type MusicTrack = 'lobby' | 'shop' | 'race';

interface AudioState {
  // Settings
  musicVolume: number;
  sfxVolume: number;
  musicEnabled: boolean;
  sfxEnabled: boolean;

  // Current playback
  currentMusic: MusicTrack | null;
  musicAudio: HTMLAudioElement | null;

  // Sound effects pool
  sfxPool: Map<SoundEffect, HTMLAudioElement[]>;

  // Actions
  setMusicVolume: (volume: number) => void;
  setSfxVolume: (volume: number) => void;
  setMusicEnabled: (enabled: boolean) => void;
  setSfxEnabled: (enabled: boolean) => void;
  toggleMusic: () => void;
  toggleSfx: () => void;

  // Playback
  playMusic: (track: MusicTrack) => void;
  stopMusic: () => void;
  playSfx: (effect: SoundEffect) => void;

  // Initialization
  initAudio: () => void;
}

const MUSIC_PATHS: Record<MusicTrack, string> = {
  lobby: '/audio/music/lobby.mp3',
  shop: '/audio/music/shop.mp3',
  race: '/audio/music/race.mp3',
};

const SFX_PATHS: Record<SoundEffect, string> = {
  button_click: '/audio/sfx/button_click.mp3',
  purchase: '/audio/sfx/purchase.mp3',
  sell: '/audio/sfx/sell.mp3',
  bet_place: '/audio/sfx/bet_place.mp3',
  race_start: '/audio/sfx/race_start.mp3',
  race_finish: '/audio/sfx/race_finish.mp3',
  stumble: '/audio/sfx/stumble.mp3',
  surge: '/audio/sfx/surge.mp3',
  victory: '/audio/sfx/victory.mp3',
  defeat: '/audio/sfx/defeat.mp3',
  ready_up: '/audio/sfx/ready_up.mp3',
};

// Create a pool of audio elements for simultaneous sound effects
function createSfxPool(src: string, poolSize: number = 3): HTMLAudioElement[] {
  const pool: HTMLAudioElement[] = [];
  for (let i = 0; i < poolSize; i++) {
    const audio = new Audio(src);
    pool.push(audio);
  }
  return pool;
}

export const useAudioStore = create<AudioState>()(
  persist(
    (set, get) => ({
      musicVolume: 0.5,
      sfxVolume: 0.7,
      musicEnabled: true,
      sfxEnabled: true,
      currentMusic: null,
      musicAudio: null,
      sfxPool: new Map(),

      setMusicVolume: (volume: number) => {
        const clamped = Math.max(0, Math.min(1, volume));
        set({ musicVolume: clamped });
        const { musicAudio } = get();
        if (musicAudio) {
          musicAudio.volume = clamped;
        }
      },

      setSfxVolume: (volume: number) => {
        const clamped = Math.max(0, Math.min(1, volume));
        set({ sfxVolume: clamped });
        // Update all SFX in pool
        const { sfxPool } = get();
        sfxPool.forEach((pool) => {
          pool.forEach((audio) => {
            audio.volume = clamped;
          });
        });
      },

      setMusicEnabled: (enabled: boolean) => {
        set({ musicEnabled: enabled });
        if (!enabled) {
          get().stopMusic();
        } else {
          const { currentMusic } = get();
          if (currentMusic) {
            get().playMusic(currentMusic);
          }
        }
      },

      setSfxEnabled: (enabled: boolean) => {
        set({ sfxEnabled: enabled });
      },

      toggleMusic: () => {
        const { musicEnabled } = get();
        get().setMusicEnabled(!musicEnabled);
      },

      toggleSfx: () => {
        const { sfxEnabled } = get();
        get().setSfxEnabled(!sfxEnabled);
      },

      playMusic: (track: MusicTrack) => {
        const { musicEnabled, musicVolume, musicAudio, currentMusic } = get();

        if (!musicEnabled) return;

        // If same track is already playing, do nothing
        if (currentMusic === track && musicAudio && !musicAudio.paused) {
          return;
        }

        // Stop current music
        if (musicAudio) {
          musicAudio.pause();
          musicAudio.currentTime = 0;
        }

        // Create new audio element
        const newAudio = new Audio(MUSIC_PATHS[track]);
        newAudio.volume = musicVolume;
        newAudio.loop = true;

        newAudio.play().catch((error) => {
          console.warn('Music playback prevented:', error);
        });

        set({ currentMusic: track, musicAudio: newAudio });
      },

      stopMusic: () => {
        const { musicAudio } = get();
        if (musicAudio) {
          musicAudio.pause();
          musicAudio.currentTime = 0;
        }
        set({ currentMusic: null, musicAudio: null });
      },

      playSfx: (effect: SoundEffect) => {
        const { sfxEnabled, sfxVolume, sfxPool } = get();

        if (!sfxEnabled) return;

        // Get or create pool for this effect
        let pool = sfxPool.get(effect);
        if (!pool) {
          pool = createSfxPool(SFX_PATHS[effect]);
          sfxPool.set(effect, pool);
          set({ sfxPool });
        }

        // Find available audio element
        const audio = pool.find((a) => a.paused || a.ended);
        if (audio) {
          audio.volume = sfxVolume;
          audio.currentTime = 0;
          audio.play().catch((error) => {
            console.warn('SFX playback prevented:', error);
          });
        }
      },

      initAudio: () => {
        // Pre-load music tracks
        Object.values(MUSIC_PATHS).forEach((path) => {
          const audio = new Audio(path);
          audio.preload = 'auto';
        });

        // Pre-load sound effects
        const sfxPool = new Map<SoundEffect, HTMLAudioElement[]>();
        Object.entries(SFX_PATHS).forEach(([effect, path]) => {
          sfxPool.set(effect as SoundEffect, createSfxPool(path));
        });

        set({ sfxPool });
      },
    }),
    {
      name: 'audio-settings',
      partialize: (state) => ({
        musicVolume: state.musicVolume,
        sfxVolume: state.sfxVolume,
        musicEnabled: state.musicEnabled,
        sfxEnabled: state.sfxEnabled,
      }),
    }
  )
);
