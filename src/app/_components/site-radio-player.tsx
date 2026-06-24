"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

import { RadioMood } from "@/generated/prisma/enums";
import { radioMoodLabels } from "@/lib/validation/radio";
import type { RouterOutputs } from "@/trpc/react";

import { useRadioPlayer } from "./radio-provider";

type RadioTrack = RouterOutputs["radio"]["listActive"][number];

const moods = [RadioMood.RELAX, RadioMood.ENERGETIC, RadioMood.FUN] as const;
const radioProgressColor = "var(--iron-accent)";

type SiteRadioPlayerProps = {
  variant?: "desktop" | "mobile";
};

export function SiteRadioPlayer({ variant = "desktop" }: SiteRadioPlayerProps) {
  const {
    currentTrack,
    hasTracks,
    isError,
    isLoading,
    isPlaying,
    playbackError,
    progress,
    selectedMood,
    setMood,
    togglePlayback,
    tracksByMood,
  } = useRadioPlayer();
  const [hasInteracted, setHasInteracted] = useState(false);
  const statusText = isLoading
    ? "Загрузка..."
    : isError
      ? "Радио временно недоступно"
      : currentTrack
        ? getTrackTitle(currentTrack)
        : "Нет треков";
  const isDesktopDrawerOpen =
    hasInteracted || isPlaying || Boolean(playbackError);
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
  const handleTogglePlayback = () => {
    setHasInteracted(true);
    togglePlayback();
  };

  if (variant === "mobile") {
    if (!isLoading && !isError && !hasTracks) return null;

    return (
      <section
        aria-label="Радио"
        className="border-t border-[var(--app-border-strong)] bg-[rgb(9_8_6/0.64)] px-4 py-2 text-[var(--app-text)] backdrop-blur-[1px] lg:hidden"
      >
        <div className="flex min-h-12 min-w-0 items-center gap-3">
          <CoverButton
            currentTrack={currentTrack}
            iconStyle={iconStyle}
            isLoading={isLoading}
            isPlaying={isPlaying}
            progress={progress}
            size="sm"
            togglePlayback={handleTogglePlayback}
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-semibold tracking-[0.08em] text-[var(--app-text-secondary)] uppercase">
              Ropejumping радио
            </p>
            <MarqueeText className="text-sm font-medium text-[var(--app-text)]">
              {statusText}
            </MarqueeText>
            {playbackError ? (
              <p className="truncate text-xs text-red-600">{playbackError}</p>
            ) : null}
          </div>
          <div className="flex shrink-0 flex-wrap justify-end gap-1">
            {moods.map((mood) => (
              <MoodChip
                key={mood}
                compact
                disabled={tracksByMood[mood].length === 0}
                isSelected={mood === selectedMood}
                mood={mood}
                onClick={() => setMood(mood)}
              />
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      aria-label="Радио"
      className="relative ml-auto hidden h-[96px] w-[360px] shrink-0 justify-self-end text-[var(--app-text)] lg:block xl:w-[420px]"
    >
      <div
        className={
          isDesktopDrawerOpen
            ? "absolute top-1/2 right-[60px] flex min-h-[96px] max-w-[288px] translate-x-0 -translate-y-1/2 items-center overflow-hidden py-2.5 pr-6 pl-3 opacity-100 transition-[max-width,opacity,transform,padding] duration-[450ms] ease-out xl:max-w-[348px]"
            : "pointer-events-none absolute top-1/2 right-[60px] flex min-h-[96px] max-w-0 translate-x-3 -translate-y-1/2 items-center overflow-hidden py-2.5 pr-0 pl-0 opacity-0 transition-[max-width,opacity,transform,padding] duration-[450ms] ease-out"
        }
        aria-hidden={!isDesktopDrawerOpen}
      >
        <div
          className={
            isDesktopDrawerOpen
              ? "iron-panel w-[248px] min-w-0 translate-x-0 px-3 py-2 text-right opacity-100 shadow-lg shadow-black/25 transition-[opacity,transform] delay-75 duration-[350ms] ease-out xl:w-[308px]"
              : "iron-panel w-[248px] min-w-0 translate-x-2 px-3 py-2 text-right opacity-0 shadow-lg shadow-black/25 transition-[opacity,transform] duration-200 ease-out xl:w-[308px]"
          }
        >
          <p className="truncate text-[11px] font-semibold tracking-[0.12em] text-[var(--app-text-secondary)] uppercase">
            Ropejumping радио
          </p>
          <p className="mt-0.5 text-[11px] text-[var(--app-text-muted)]">
            Сейчас в эфире
          </p>
          <MarqueeText className="mt-1 text-sm font-semibold text-[var(--app-text)]">
            {statusText}
          </MarqueeText>
          {playbackError ? (
            <p className="mt-1 truncate text-xs text-red-600">
              {playbackError}
            </p>
          ) : null}
          <div className="mt-2 flex flex-wrap justify-end gap-1.5">
            {moods.map((mood) => (
              <MoodChip
                key={mood}
                disabled={tracksByMood[mood].length === 0}
                isSelected={mood === selectedMood}
                mood={mood}
                onClick={() => setMood(mood)}
                tabIndex={isDesktopDrawerOpen ? 0 : -1}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="absolute top-1/2 right-0 z-10 h-[72px] w-[72px] -translate-y-1/2">
        <CoverButton
          currentTrack={currentTrack}
          iconStyle={iconStyle}
          isLoading={isLoading}
          isPlaying={isPlaying}
          progress={progress}
          size="md"
          togglePlayback={handleTogglePlayback}
        />
      </div>
    </section>
  );
}

function CoverButton({
  currentTrack,
  iconStyle,
  isLoading,
  isPlaying,
  progress,
  size,
  togglePlayback,
}: {
  currentTrack: RadioTrack | null;
  iconStyle: CSSProperties;
  isLoading: boolean;
  isPlaying: boolean;
  progress: number;
  size: "md" | "sm";
  togglePlayback: () => void;
}) {
  const diameter = size === "sm" ? 44 : 72;
  const radius = size === "sm" ? 20 : 34;
  const strokeWidth = size === "sm" ? 2 : 2.5;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - progress);

  return (
    <div
      className={
        size === "sm"
          ? "relative h-11 w-11 shrink-0"
          : "relative h-[72px] w-[72px] shrink-0"
      }
    >
      <TrackCover track={currentTrack} size={size} />
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -rotate-90"
        height={diameter}
        viewBox={`0 0 ${diameter} ${diameter}`}
        width={diameter}
      >
        <circle
          cx={diameter / 2}
          cy={diameter / 2}
          fill="none"
          r={radius}
          stroke="var(--app-border-strong)"
          strokeOpacity="0.45"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={diameter / 2}
          cy={diameter / 2}
          fill="none"
          r={radius}
          stroke="currentColor"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          strokeWidth={strokeWidth}
          className="transition-[stroke-dashoffset] duration-300"
          style={{ color: radioProgressColor }}
        />
      </svg>
      <button
        type="button"
        onClick={togglePlayback}
        disabled={!currentTrack || isLoading}
        className={`absolute inset-0 m-auto flex items-center justify-center rounded-full border border-[var(--app-border-strong)] bg-black/60 p-0 text-[var(--app-text)] shadow-lg shadow-black/40 backdrop-blur-[1px] transition hover:scale-105 hover:border-[var(--iron-accent)] hover:bg-black/70 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--iron-accent)] disabled:cursor-not-allowed disabled:opacity-55 ${
          size === "sm" ? "h-8 w-8" : "h-12 w-12"
        }`}
        aria-label={isPlaying ? "Поставить радио на паузу" : "Включить радио"}
      >
        <span
          aria-hidden="true"
          className={
            isPlaying
              ? size === "sm"
                ? "h-4 w-4 bg-current drop-shadow"
                : "h-6 w-6 bg-current drop-shadow"
              : size === "sm"
                ? "h-5 w-5 translate-x-0.5 bg-current drop-shadow"
                : "h-7 w-7 translate-x-0.5 bg-current drop-shadow"
          }
          style={iconStyle}
        />
      </button>
    </div>
  );
}

function MoodChip({
  compact = false,
  disabled,
  isSelected,
  mood,
  onClick,
  tabIndex,
}: {
  compact?: boolean;
  disabled: boolean;
  isSelected: boolean;
  mood: RadioMood;
  onClick: () => void;
  tabIndex?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={radioMoodLabels[mood]}
      aria-pressed={isSelected}
      title={radioMoodLabels[mood]}
      tabIndex={tabIndex}
      className={
        isSelected
          ? `rounded-full border border-[var(--iron-accent)] bg-[var(--iron-accent)] font-medium text-[var(--iron-bg)] shadow-[0_0_18px_rgba(224,106,36,0.16)] ${
              compact ? "h-7 min-w-7 px-2 text-xs" : "px-2.5 py-1 text-xs"
            }`
          : `rounded-full border border-[var(--app-border)] bg-[rgb(9_8_6/0.28)] text-[var(--app-text-secondary)] hover:border-[var(--iron-accent)] hover:text-[var(--app-text)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-[var(--app-border)] disabled:hover:text-[var(--app-text-secondary)] ${
              compact ? "h-7 min-w-7 px-2 text-xs" : "px-2.5 py-1 text-xs"
            }`
      }
    >
      {compact ? getCompactMoodEmoji(mood) : radioMoodLabels[mood]}
    </button>
  );
}

function TrackCover({
  size = "md",
  track,
}: {
  size?: "md" | "sm";
  track: RadioTrack | null;
}) {
  const imageStyle = track?.coverUrl
    ? ({
        backgroundImage: `url(${JSON.stringify(track.coverUrl)})`,
      } satisfies CSSProperties)
    : undefined;

  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-full border border-[var(--app-border-strong)] bg-[var(--app-surface-muted)] bg-cover bg-center font-medium text-[var(--app-text-muted)] shadow-lg shadow-black/30 ${
        size === "sm" ? "h-11 w-11 text-base" : "h-[72px] w-[72px] text-xl"
      }`}
      style={imageStyle}
    >
      {track?.coverUrl ? null : "♪"}
    </span>
  );
}

function MarqueeText({
  children,
  className,
}: {
  children: ReactNode;
  className: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLSpanElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  useEffect(() => {
    const updateOverflow = () => {
      const container = containerRef.current;
      const content = contentRef.current;
      if (!container || !content) return;

      setIsOverflowing(content.scrollWidth > container.clientWidth + 1);
    };

    updateOverflow();

    const resizeObserver = new ResizeObserver(updateOverflow);
    if (containerRef.current) resizeObserver.observe(containerRef.current);
    if (contentRef.current) resizeObserver.observe(contentRef.current);

    return () => resizeObserver.disconnect();
  }, [children]);

  return (
    <div ref={containerRef} className={`overflow-hidden ${className}`}>
      <span
        ref={contentRef}
        className={
          isOverflowing
            ? "animate-radio-marquee inline-flex min-w-max whitespace-nowrap"
            : "block truncate whitespace-nowrap"
        }
      >
        <span>{children}</span>
        {isOverflowing ? (
          <span aria-hidden="true" className="pl-8">
            {children}
          </span>
        ) : null}
      </span>
    </div>
  );
}

function getCompactMoodEmoji(mood: RadioMood) {
  if (mood === RadioMood.RELAX) return "😇";
  if (mood === RadioMood.ENERGETIC) return "😈";
  return "🙃";
}

function getTrackTitle(track: RadioTrack) {
  return track.artist ? `${track.artist} — ${track.title}` : track.title;
}
