"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { RadioMood } from "@/generated/prisma/enums";
import { api, type RouterOutputs } from "@/trpc/react";

type RadioTrack = RouterOutputs["radio"]["listActive"][number];

type RadioPlayerContextValue = {
  currentTrack: RadioTrack | null;
  hasTracks: boolean;
  isError: boolean;
  isLoading: boolean;
  isPlaying: boolean;
  moodTracks: RadioTrack[];
  playbackError: string | null;
  progress: number;
  selectedMood: RadioMood;
  tracksByMood: Record<RadioMood, RadioTrack[]>;
  setMood: (mood: RadioMood) => void;
  togglePlayback: () => void;
};

const moods = [RadioMood.RELAX, RadioMood.ENERGETIC, RadioMood.FUN] as const;
const emptyTracks: RadioTrack[] = [];
const RadioPlayerContext = createContext<RadioPlayerContextValue | null>(null);

export function RadioProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isPlayingRef = useRef(false);
  const loadedTrackIdRef = useRef<string | null>(null);
  const [selectedMood, setSelectedMood] = useState<RadioMood>(RadioMood.RELAX);
  const [trackIndex, setTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const { data, isError, isLoading } = api.radio.listActive.useQuery();
  const tracks = data ?? emptyTracks;
  const hasTracks = tracks.length > 0;

  const tracksByMood = useMemo(
    () =>
      moods.reduce(
        (accumulator, mood) => {
          accumulator[mood] = tracks.filter((track) => track.mood === mood);
          return accumulator;
        },
        {
          [RadioMood.RELAX]: [],
          [RadioMood.ENERGETIC]: [],
          [RadioMood.FUN]: [],
        } as Record<RadioMood, RadioTrack[]>,
      ),
    [tracks],
  );
  const moodTracks = tracksByMood[selectedMood];
  const currentTrack = moodTracks[trackIndex] ?? null;
  const fallbackMood = moods.find((mood) => tracksByMood[mood].length > 0);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    if (isLoading || isError || moodTracks.length > 0 || !fallbackMood) return;
    setSelectedMood(fallbackMood);
  }, [fallbackMood, isError, isLoading, moodTracks.length]);

  useEffect(() => {
    if (trackIndex < moodTracks.length) return;
    setTrackIndex(0);
  }, [moodTracks.length, trackIndex]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!currentTrack) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      loadedTrackIdRef.current = null;
      setIsPlaying(false);
      setPlaybackError(null);
      setProgress(0);
      return;
    }

    if (loadedTrackIdRef.current === currentTrack.id) return;

    loadedTrackIdRef.current = currentTrack.id;
    setPlaybackError(null);
    audio.src = currentTrack.audioUrl;
    audio.currentTime = 0;
    audio.load();
    setProgress(0);

    if (isPlayingRef.current) {
      void audio.play().catch(() => {
        setIsPlaying(false);
        setPlaybackError("Не удалось включить трек. Попробуйте ещё раз.");
      });
    }
  }, [currentTrack]);

  const playCurrentTrack = () => {
    const audio = audioRef.current;
    if (!audio || !currentTrack || isLoading) return;

    if (loadedTrackIdRef.current !== currentTrack.id) {
      loadedTrackIdRef.current = currentTrack.id;
      audio.src = currentTrack.audioUrl;
      audio.currentTime = 0;
      audio.load();
    }

    setPlaybackError(null);
    void audio
      .play()
      .then(() => setIsPlaying(true))
      .catch(() => {
        setIsPlaying(false);
        setPlaybackError("Не удалось включить трек. Попробуйте ещё раз.");
      });
  };

  const pauseCurrentTrack = () => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.pause();
    setIsPlaying(false);
  };

  const togglePlayback = () => {
    if (isPlayingRef.current) {
      pauseCurrentTrack();
      return;
    }

    playCurrentTrack();
  };

  const setMood = (mood: RadioMood) => {
    setSelectedMood(mood);
    setTrackIndex(0);
  };

  const getNextTrackIndex = () => {
    if (moodTracks.length <= 1) return 0;

    return (trackIndex + 1) % moodTracks.length;
  };

  const handleEnded = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (moodTracks.length <= 1) {
      audio.currentTime = 0;
      setProgress(0);
      if (isPlayingRef.current) {
        void audio.play().catch(() => {
          setIsPlaying(false);
          setPlaybackError("Не удалось включить трек. Попробуйте ещё раз.");
        });
      }
      return;
    }

    setTrackIndex(getNextTrackIndex());
  };

  const updateProgress = () => {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(audio.duration) || audio.duration <= 0) {
      setProgress(0);
      return;
    }

    setProgress(Math.min(audio.currentTime / audio.duration, 1));
  };

  const handleAudioError = () => {
    if (!currentTrack) return;
    setIsPlaying(false);
    setPlaybackError("Не удалось загрузить аудио. Попробуйте ещё раз.");
  };

  const value = {
    currentTrack,
    hasTracks,
    isError,
    isLoading,
    isPlaying,
    moodTracks,
    playbackError,
    progress,
    selectedMood,
    tracksByMood,
    setMood,
    togglePlayback,
  } satisfies RadioPlayerContextValue;

  return (
    <RadioPlayerContext.Provider value={value}>
      <audio
        ref={audioRef}
        onEnded={handleEnded}
        onError={handleAudioError}
        onLoadedMetadata={updateProgress}
        onTimeUpdate={updateProgress}
        preload="none"
      />
      {children}
    </RadioPlayerContext.Provider>
  );
}

export function useRadioPlayer() {
  const value = useContext(RadioPlayerContext);
  if (!value) {
    throw new Error("useRadioPlayer must be used within RadioProvider");
  }

  return value;
}
