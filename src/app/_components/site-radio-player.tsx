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
  const iconStyle = {
    WebkitMaskImage: `url(${isPlaying ? "/svg/pause.svg" : "/svg/play.svg"})`,
    maskImage: `url(${isPlaying ? "/svg/pause.svg" : "/svg/play.svg"})`,
    WebkitMaskPosition: "center",
    maskPosition: "center",
    WebkitMaskRepeat: "no-repeat",
    maskRepeat: "no-repeat",
    WebkitMaskSize: "contain",
    maskSize: "contain",
  } satisfies CSSProperties;

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
      className="relative hidden h-[96px] w-[360px] shrink-0 justify-self-end text-[var(--app-text)] xl:w-[420px] lg:block"
    >
      <audio ref={audioRef} onEnded={handleEnded} preload="none" />
      <div
        className={
          isPlaying
            ? "absolute top-1/2 right-[60px] flex min-h-[96px] max-w-[288px] -translate-y-1/2 translate-x-0 items-center overflow-hidden py-2.5 pr-6 pl-3 opacity-100 transition-[max-width,opacity,transform,padding] duration-300 ease-out xl:max-w-[348px]"
            : "pointer-events-none absolute top-1/2 right-[60px] flex min-h-[96px] max-w-0 -translate-y-1/2 translate-x-4 items-center overflow-hidden py-2.5 pr-0 pl-0 opacity-0 transition-[max-width,opacity,transform,padding] duration-300 ease-out"
        }
        aria-hidden={!isPlaying}
      >
        <div className="w-[248px] min-w-0 text-right xl:w-[308px]">
          <p className="truncate text-[11px] font-semibold tracking-[0.12em] text-[var(--app-text-secondary)] uppercase">
            Ropejumping радио
          </p>
          <p className="mt-0.5 text-[11px] text-[var(--app-text-muted)]">
            Сейчас в эфире
          </p>
          <p className="mt-1 truncate text-sm font-semibold text-[var(--app-text)]">
            {isLoading
              ? "Загрузка..."
              : currentTrack
                ? getTrackTitle(currentTrack)
                : "Нет треков"}
          </p>
          <div className="mt-2 flex justify-end gap-1.5">
            {moods.map((mood) => (
              <button
                key={mood}
                type="button"
                onClick={() => handleMoodChange(mood)}
                aria-pressed={mood === selectedMood}
                tabIndex={isPlaying ? 0 : -1}
                className={
                  mood === selectedMood
                    ? "rounded-full border border-[var(--app-text)] bg-[var(--app-text)] px-2.5 py-1 text-xs font-medium text-[var(--app-bg)]"
                    : "rounded-full border border-[var(--app-border)] bg-transparent px-2.5 py-1 text-xs text-[var(--app-text-secondary)] hover:border-[var(--app-border-strong)] hover:text-[var(--app-text)]"
                }
              >
                {radioMoodLabels[mood]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="absolute top-1/2 right-0 z-10 h-[72px] w-[72px] -translate-y-1/2">
        <TrackCover track={currentTrack} />
        <button
          type="button"
          onClick={handleTogglePlayback}
          disabled={!currentTrack}
          className="absolute inset-0 m-auto flex h-12 w-12 items-center justify-center bg-transparent p-0 text-white transition hover:scale-105 hover:opacity-90 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-50"
          aria-label={
            isPlaying ? "Поставить радио на паузу" : "Включить радио"
          }
        >
          <span
            aria-hidden="true"
            className={
              isPlaying
                ? "h-6 w-6 bg-current"
                : "h-7 w-7 translate-x-0.5 bg-current"
            }
            style={iconStyle}
          />
        </button>
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
      className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-full border border-[var(--app-border-strong)] bg-[var(--app-surface-muted)] bg-cover bg-center text-xl font-medium text-[var(--app-text-muted)] shadow-lg shadow-black/10"
      style={imageStyle}
    >
      {track?.coverUrl ? null : "♪"}
    </span>
  );
}

function getTrackTitle(track: RadioTrack) {
  return track.artist ? `${track.artist} — ${track.title}` : track.title;
}
