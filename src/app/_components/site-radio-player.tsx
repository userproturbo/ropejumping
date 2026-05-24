"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";

import { RadioMood } from "@/generated/prisma/enums";
import { radioMoodLabels } from "@/lib/validation/radio";
import { api, type RouterOutputs } from "@/trpc/react";

type RadioTrack = RouterOutputs["radio"]["listActive"][number];

const moods = [RadioMood.RELAX, RadioMood.ENERGETIC, RadioMood.FUN] as const;

export function SiteRadioPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [selectedMood, setSelectedMood] = useState<RadioMood>(RadioMood.RELAX);
  const [trackIndex, setTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const { data: tracks = [], isLoading } = api.radio.listActive.useQuery();

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

  useEffect(() => {
    setTrackIndex(0);
  }, [selectedMood]);

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
      setIsPlaying(false);
      return;
    }

    audio.src = currentTrack.audioUrl;
    audio.load();

    if (isPlaying) {
      void audio.play().catch(() => setIsPlaying(false));
    }
  }, [currentTrack, isPlaying]);

  const handleTogglePlayback = () => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      return;
    }

    void audio
      .play()
      .then(() => setIsPlaying(true))
      .catch(() => setIsPlaying(false));
  };

  const handleMoodChange = (mood: RadioMood) => {
    setSelectedMood(mood);
  };

  const handleEnded = () => {
    if (moodTracks.length <= 1) {
      const audio = audioRef.current;
      if (!audio) return;

      audio.currentTime = 0;
      if (isPlaying) {
        void audio.play().catch(() => setIsPlaying(false));
      }
      return;
    }

    setTrackIndex((currentIndex) => (currentIndex + 1) % moodTracks.length);
  };

  return (
    <section
      aria-label="Радио"
      className="hidden min-w-[320px] shrink w-full max-w-[460px] items-center gap-3 border border-[var(--app-border)] bg-[var(--app-surface)] p-2 text-[var(--app-text)] lg:flex"
    >
      <audio ref={audioRef} onEnded={handleEnded} preload="none" />
      <TrackCover track={currentTrack} />

      <button
        type="button"
        onClick={handleTogglePlayback}
        disabled={!currentTrack}
        className="flex h-10 w-10 shrink-0 items-center justify-center border border-[var(--app-border-strong)] bg-[var(--app-bg)] text-sm font-medium text-[var(--app-text)] hover:bg-[var(--app-surface-muted)] disabled:cursor-not-allowed disabled:opacity-45"
        aria-label={isPlaying ? "Поставить радио на паузу" : "Включить радио"}
      >
        {isPlaying ? "II" : "▶"}
      </button>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-[var(--app-text)]">
          {isLoading
            ? "Загрузка..."
            : currentTrack
              ? getTrackTitle(currentTrack)
              : "Нет треков"}
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {moods.map((mood) => (
            <button
              key={mood}
              type="button"
              onClick={() => handleMoodChange(mood)}
              className={
                mood === selectedMood
                  ? "border border-[var(--app-text)] bg-[var(--app-text)] px-2 py-1 text-xs font-medium text-[var(--app-bg)]"
                  : "border border-[var(--app-border-strong)] bg-transparent px-2 py-1 text-xs text-[var(--app-text-secondary)] hover:text-[var(--app-text)]"
              }
            >
              {radioMoodLabels[mood]}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function TrackCover({ track }: { track: RadioTrack | null }) {
  const imageStyle = track?.coverUrl
    ? ({
        backgroundImage: `url(${JSON.stringify(track.coverUrl)})`,
      } satisfies CSSProperties)
    : undefined;

  return (
    <span
      aria-hidden="true"
      className="flex h-12 w-12 shrink-0 items-center justify-center border border-[var(--app-border-strong)] bg-[var(--app-surface-muted)] bg-cover bg-center text-sm font-medium text-[var(--app-text-muted)]"
      style={imageStyle}
    >
      {track?.coverUrl ? null : "♪"}
    </span>
  );
}

function getTrackTitle(track: RadioTrack) {
  return track.artist ? `${track.artist} — ${track.title}` : track.title;
}
