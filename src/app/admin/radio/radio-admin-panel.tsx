"use client";

import {
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";

import { RadioMood } from "@/generated/prisma/enums";
import {
  allowedImageContentTypes,
  allowedRadioAudioContentTypes,
  maxImageUploadSizeBytes,
  maxRadioAudioUploadSizeBytes,
} from "@/lib/validation/upload";
import { radioMoodLabels } from "@/lib/validation/radio";
import { api, type RouterOutputs } from "@/trpc/react";

type RadioTrack = RouterOutputs["radio"]["listForAdmin"][number];

type RadioFormState = {
  title: string;
  artist: string;
  mood: RadioMood;
  audioUrl: string;
  coverUrl: string;
  sortOrder: string;
  isActive: boolean;
};

type RadioAdminPanelProps = {
  initialTracks: RadioTrack[];
};

const moods = [RadioMood.RELAX, RadioMood.ENERGETIC, RadioMood.FUN] as const;
const supportedAudioTypes = new Set<string>(allowedRadioAudioContentTypes);
const supportedImageTypes = new Set<string>(allowedImageContentTypes);

const emptyForm: RadioFormState = {
  title: "",
  artist: "",
  mood: RadioMood.RELAX,
  audioUrl: "",
  coverUrl: "",
  sortOrder: "",
  isActive: true,
};

export function RadioAdminPanel({ initialTracks }: RadioAdminPanelProps) {
  const utils = api.useUtils();
  const [tracks, setTracks] = useState(initialTracks);
  const [selectedPlaylist, setSelectedPlaylist] = useState<RadioMood>(
    RadioMood.RELAX,
  );
  const [createForm, setCreateForm] = useState<RadioFormState>(emptyForm);
  const [editingTrackId, setEditingTrackId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<RadioFormState>(emptyForm);
  const [playlistMessage, setPlaylistMessage] = useState<string | null>(null);
  const tracksByMood = useMemo(() => groupTracksByMood(tracks), [tracks]);
  const selectedTracks = tracksByMood[selectedPlaylist];

  const createTrack = api.radio.create.useMutation({
    onSuccess: (track) => {
      setTracks((currentTracks) => sortTracks([...currentTracks, track]));
      setCreateForm({ ...emptyForm, mood: selectedPlaylist });
      setPlaylistMessage(null);
      void utils.radio.listActive.invalidate();
    },
  });
  const updateTrack = api.radio.update.useMutation({
    onSuccess: (track) => {
      setTracks((currentTracks) =>
        sortTracks(
          currentTracks.map((currentTrack) =>
            currentTrack.id === track.id ? track : currentTrack,
          ),
        ),
      );
      setEditingTrackId(null);
      setPlaylistMessage(null);
      void utils.radio.listActive.invalidate();
    },
  });
  const setActive = api.radio.setActive.useMutation({
    onSuccess: (track) => {
      setTracks((currentTracks) =>
        sortTracks(
          currentTracks.map((currentTrack) =>
            currentTrack.id === track.id ? track : currentTrack,
          ),
        ),
      );
      setPlaylistMessage(null);
      void utils.radio.listActive.invalidate();
    },
  });
  const deleteTrack = api.radio.delete.useMutation({
    onSuccess: (track) => {
      setTracks((currentTracks) =>
        currentTracks.filter((currentTrack) => currentTrack.id !== track.id),
      );
      if (editingTrackId === track.id) {
        setEditingTrackId(null);
      }
      setPlaylistMessage(null);
      void utils.radio.listActive.invalidate();
    },
  });
  const shufflePlaylist = api.radio.shufflePlaylist.useMutation({
    onSuccess: (updatedTracks) => {
      setTracks((currentTracks) =>
        sortTracks(
          currentTracks.map((currentTrack) => {
            const updatedTrack = updatedTracks.find(
              (track) => track.id === currentTrack.id,
            );
            return updatedTrack ?? currentTrack;
          }),
        ),
      );
      setPlaylistMessage("Порядок плейлиста обновлён.");
      void utils.radio.listActive.invalidate();
    },
  });

  const handleCreate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    createTrack.mutate(
      toRadioInput({
        ...createForm,
        mood: selectedPlaylist,
        sortOrder:
          createForm.sortOrder ||
          String(getNextSortOrder(tracks, selectedPlaylist)),
      }),
    );
  };

  const selectPlaylist = (mood: RadioMood) => {
    setSelectedPlaylist(mood);
    setCreateForm((currentForm) => ({ ...currentForm, mood }));
    setEditingTrackId(null);
    setPlaylistMessage(null);
  };

  const startEditing = (track: RadioTrack) => {
    setEditingTrackId(track.id);
    setEditForm({
      title: track.title,
      artist: track.artist ?? "",
      mood: track.mood,
      audioUrl: track.audioUrl,
      coverUrl: track.coverUrl ?? "",
      sortOrder: String(track.sortOrder),
      isActive: track.isActive,
    });
  };

  const handleUpdate = (event: FormEvent<HTMLFormElement>, id: string) => {
    event.preventDefault();
    updateTrack.mutate({ id, ...toRadioInput(editForm) });
  };

  const handleDelete = (track: RadioTrack) => {
    const confirmed = window.confirm(
      `Удалить трек «${getTrackTitle(track)}»? Это действие нельзя отменить.`,
    );
    if (!confirmed) return;

    deleteTrack.mutate({ id: track.id });
  };

  const handleShufflePlaylist = () => {
    shufflePlaylist.mutate(selectedPlaylist);
  };

  return (
    <div className="grid gap-6">
      <section className="border border-zinc-200 bg-white p-4 sm:p-6">
        <h2 className="text-xl font-semibold text-zinc-950">Плейлисты радио</h2>
        <div
          className="mt-4 flex flex-wrap gap-2"
          role="tablist"
          aria-label="Плейлисты радио"
        >
          {moods.map((mood) => (
            <button
              key={mood}
              type="button"
              role="tab"
              aria-selected={mood === selectedPlaylist}
              onClick={() => selectPlaylist(mood)}
              className={
                mood === selectedPlaylist
                  ? "border border-zinc-950 bg-zinc-950 px-4 py-2 text-sm font-medium text-white"
                  : "border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:border-zinc-950 hover:text-zinc-950"
              }
            >
              {radioMoodLabels[mood]}
            </button>
          ))}
        </div>
      </section>

      <section className="border border-zinc-200 bg-white p-6">
        <h2 className="text-xl font-semibold text-zinc-950">Новый трек</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Плейлист: {radioMoodLabels[selectedPlaylist]}
        </p>
        <RadioTrackForm
          formId="radio-create"
          state={{ ...createForm, mood: selectedPlaylist }}
          submitLabel={createTrack.isPending ? "Сохранение..." : "Добавить"}
          disabled={createTrack.isPending}
          onChange={(state) => {
            if (state.mood !== selectedPlaylist) {
              selectPlaylist(state.mood);
              return;
            }

            setCreateForm(state);
          }}
          onSubmit={handleCreate}
        />
        {createTrack.error ? (
          <p className="mt-3 text-sm text-red-700">
            {createTrack.error.message}
          </p>
        ) : null}
      </section>

      <section className="border border-zinc-200 bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-zinc-950">
              Треки плейлиста
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              {radioMoodLabels[selectedPlaylist]} · {selectedTracks.length}{" "}
              трек(ов)
            </p>
          </div>
          <button
            type="button"
            onClick={handleShufflePlaylist}
            disabled={shufflePlaylist.isPending || selectedTracks.length === 0}
            className="border border-zinc-300 px-3 py-2 text-sm text-zinc-800 hover:border-zinc-950 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {shufflePlaylist.isPending ? "Перемешиваем..." : "Перемешать"}
          </button>
        </div>
        {playlistMessage ? (
          <p className="mt-3 text-sm text-emerald-700">{playlistMessage}</p>
        ) : null}
        {selectedTracks.length > 0 ? (
          <div className="mt-5 grid gap-3">
            {selectedTracks.map((track) => (
              <article key={track.id} className="border border-zinc-200 p-4">
                {editingTrackId === track.id ? (
                  <>
                    <RadioTrackForm
                      formId={`radio-edit-${track.id}`}
                      state={editForm}
                      submitLabel={
                        updateTrack.isPending ? "Сохранение..." : "Сохранить"
                      }
                      disabled={updateTrack.isPending}
                      onChange={setEditForm}
                      onSubmit={(event) => handleUpdate(event, track.id)}
                    />
                    <button
                      type="button"
                      onClick={() => setEditingTrackId(null)}
                      className="mt-3 text-sm text-zinc-600 hover:text-zinc-950"
                    >
                      Отмена
                    </button>
                    {updateTrack.error ? (
                      <p className="mt-3 text-sm text-red-700">
                        {updateTrack.error.message}
                      </p>
                    ) : null}
                  </>
                ) : (
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-medium text-zinc-950">
                          {getTrackTitle(track)}
                        </h3>
                        <span
                          className={
                            track.isActive
                              ? "border border-emerald-200 px-2 py-1 text-xs text-emerald-800"
                              : "border border-zinc-200 px-2 py-1 text-xs text-zinc-500"
                          }
                        >
                          {track.isActive ? "Активен" : "Выключен"}
                        </span>
                      </div>
                      <p className="mt-2 break-all text-sm text-zinc-600">
                        Аудио: {track.audioUrl}
                      </p>
                      {track.coverUrl ? (
                        <p className="mt-1 break-all text-sm text-zinc-500">
                          Обложка: {track.coverUrl}
                        </p>
                      ) : null}
                      <p className="mt-1 text-xs text-zinc-400">
                        Порядок: {track.sortOrder}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => startEditing(track)}
                        className="border border-zinc-300 px-3 py-2 text-sm text-zinc-800 hover:border-zinc-950"
                      >
                        Редактировать
                      </button>
                      <button
                        type="button"
                        disabled={setActive.isPending}
                        onClick={() =>
                          setActive.mutate({
                            id: track.id,
                            isActive: !track.isActive,
                          })
                        }
                        className="border border-zinc-300 px-3 py-2 text-sm text-zinc-800 hover:border-zinc-950 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {track.isActive ? "Выключить" : "Включить"}
                      </button>
                      <button
                        type="button"
                        disabled={deleteTrack.isPending}
                        onClick={() => handleDelete(track)}
                        className="border border-red-200 px-3 py-2 text-sm text-red-700 hover:border-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Удалить
                      </button>
                    </div>
                  </div>
                )}
              </article>
            ))}
          </div>
        ) : tracks.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-600">
            Треков пока нет. Добавьте первый трек для радио.
          </p>
        ) : (
          <p className="mt-3 text-sm text-zinc-600">
            В этом плейлисте пока нет треков.
          </p>
        )}
        {deleteTrack.error ? (
          <p className="mt-3 text-sm text-red-700">
            {deleteTrack.error.message}
          </p>
        ) : null}
        {shufflePlaylist.error ? (
          <p className="mt-3 text-sm text-red-700">
            {shufflePlaylist.error.message}
          </p>
        ) : null}
      </section>
    </div>
  );
}

function RadioTrackForm({
  disabled,
  formId,
  onChange,
  onSubmit,
  state,
  submitLabel,
}: {
  disabled: boolean;
  formId: string;
  onChange: (state: RadioFormState) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  state: RadioFormState;
  submitLabel: string;
}) {
  const [isAudioUploading, setIsAudioUploading] = useState(false);
  const [isCoverUploading, setIsCoverUploading] = useState(false);
  const hasAudio = state.audioUrl.trim().length > 0;
  const isSubmitDisabled =
    disabled || isAudioUploading || isCoverUploading || !hasAudio;
  const resolvedSubmitLabel =
    isAudioUploading || isCoverUploading ? "Дождитесь загрузки..." : submitLabel;

  return (
    <form onSubmit={onSubmit} className="mt-5 grid gap-4">
      <div className="grid gap-2 sm:grid-cols-2">
        <TextField
          id={`${formId}-title`}
          label="Название"
          value={state.title}
          required
          onChange={(title) => onChange({ ...state, title })}
        />
        <TextField
          id={`${formId}-artist`}
          label="Исполнитель"
          value={state.artist}
          onChange={(artist) => onChange({ ...state, artist })}
        />
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <label
          htmlFor={`${formId}-mood`}
          className="grid gap-2 text-sm font-medium text-zinc-950"
        >
          Настроение / альбом
          <select
            id={`${formId}-mood`}
            value={state.mood}
            onChange={(event) =>
              onChange({ ...state, mood: event.target.value as RadioMood })
            }
            className="border border-zinc-300 px-3 py-2 text-zinc-950 outline-none focus:border-zinc-950"
          >
            {moods.map((mood) => (
              <option key={mood} value={mood}>
                {radioMoodLabels[mood]}
              </option>
            ))}
          </select>
        </label>
      </div>
      <RadioAudioUploadField
        hasAudio={hasAudio}
        id={`${formId}-audio-upload`}
        onUploaded={(audioUrl) => onChange({ ...state, audioUrl })}
        onUploadStateChange={setIsAudioUploading}
      />
      <RadioCoverUploadField
        coverUrl={state.coverUrl}
        id={`${formId}-cover-upload`}
        onUploaded={(coverUrl) => onChange({ ...state, coverUrl })}
        onUploadStateChange={setIsCoverUploading}
      />
      <label className="flex items-center gap-3 text-sm text-zinc-700">
        <input
          type="checkbox"
          checked={state.isActive}
          onChange={(event) =>
            onChange({ ...state, isActive: event.target.checked })
          }
          className="h-4 w-4 border-zinc-300 text-zinc-950"
        />
        Активен
      </label>
      {!hasAudio ? (
        <p className="text-sm text-zinc-500">
          Загрузите аудиофайл перед сохранением трека.
        </p>
      ) : null}
      <button
        type="submit"
        disabled={isSubmitDisabled}
        className="w-fit bg-zinc-950 px-4 py-2 text-sm text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
      >
        {resolvedSubmitLabel}
      </button>
    </form>
  );
}

function RadioAudioUploadField({
  hasAudio,
  id,
  onUploaded,
  onUploadStateChange,
}: {
  hasAudio: boolean;
  id: string;
  onUploaded: (url: string) => void;
  onUploadStateChange: (isUploading: boolean) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [isPuttingFile, setIsPuttingFile] = useState(false);
  const createRadioAudioUpload = api.upload.createRadioAudioUpload.useMutation();
  const isUploading = createRadioAudioUpload.isPending || isPuttingFile;

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setUploadedFileName(null);

    if (!supportedAudioTypes.has(file.type)) {
      setError("Поддерживаются MP3, M4A, WAV и OGG.");
      event.target.value = "";
      return;
    }

    if (file.size > maxRadioAudioUploadSizeBytes) {
      setError("Файл слишком большой. Максимум 80 МБ.");
      event.target.value = "";
      return;
    }

    try {
      setIsPuttingFile(true);
      onUploadStateChange(true);
      const upload = await createRadioAudioUpload.mutateAsync({
        contentType: file.type as (typeof allowedRadioAudioContentTypes)[number],
        fileName: file.name,
        sizeBytes: file.size,
      });
      const response = await fetch(upload.uploadUrl, {
        body: file,
        headers: upload.headers,
        method: upload.method,
      });

      if (!response.ok) {
        throw new Error("Не удалось загрузить аудио. Попробуйте ещё раз.");
      }

      onUploaded(upload.publicUrl);
      setUploadedFileName(file.name);
    } catch (uploadError) {
      setError(getUploadErrorMessage(uploadError, "Не удалось загрузить аудио."));
    } finally {
      setIsPuttingFile(false);
      onUploadStateChange(false);
      event.target.value = "";
    }
  };

  return (
    <div className="grid gap-3">
      <p className="text-sm font-medium text-zinc-950">
        Аудиофайл{" "}
        <span className="text-xs font-normal text-zinc-500">обязательно</span>
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <label
          htmlFor={id}
          aria-disabled={isUploading}
          className={`inline-flex items-center px-4 py-2 text-sm text-white ${
            isUploading
              ? "cursor-not-allowed bg-zinc-400"
              : "cursor-pointer bg-zinc-950 hover:bg-zinc-800"
          }`}
        >
          {isUploading ? "Аудио загружается..." : "Загрузить аудио"}
        </label>
        {uploadedFileName ? (
          <span className="text-sm text-emerald-700">
            Аудио загружено, ссылка подставлена: {uploadedFileName}
          </span>
        ) : null}
      </div>
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={[...allowedRadioAudioContentTypes, ".mp3", ".m4a", ".wav", ".ogg"].join(",")}
        disabled={isUploading}
        onChange={handleFileChange}
        className="sr-only"
      />
      <p className="text-xs text-zinc-500">
        Поддерживаются MP3, M4A, WAV и OGG. Максимум 80 МБ.
      </p>
      {hasAudio && !uploadedFileName ? (
        <p className="text-sm text-emerald-700">Аудио выбрано.</p>
      ) : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </div>
  );
}

function RadioCoverUploadField({
  coverUrl,
  id,
  onUploaded,
  onUploadStateChange,
}: {
  coverUrl: string;
  id: string;
  onUploaded: (url: string) => void;
  onUploadStateChange: (isUploading: boolean) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [isPuttingFile, setIsPuttingFile] = useState(false);
  const createRadioCoverUpload = api.upload.createRadioCoverUpload.useMutation();
  const isUploading = createRadioCoverUpload.isPending || isPuttingFile;
  const coverStyle = coverUrl
    ? {
        backgroundImage: `url(${JSON.stringify(coverUrl)})`,
      }
    : undefined;

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setUploadedFileName(null);

    if (!supportedImageTypes.has(file.type)) {
      setError("Поддерживаются JPEG, PNG, WebP и GIF.");
      event.target.value = "";
      return;
    }

    if (file.size > maxImageUploadSizeBytes) {
      setError("Файл слишком большой. Максимум 10 МБ.");
      event.target.value = "";
      return;
    }

    try {
      setIsPuttingFile(true);
      onUploadStateChange(true);
      const upload = await createRadioCoverUpload.mutateAsync({
        contentType: file.type as (typeof allowedImageContentTypes)[number],
        fileName: file.name,
        sizeBytes: file.size,
      });
      const response = await fetch(upload.uploadUrl, {
        body: file,
        headers: upload.headers,
        method: upload.method,
      });

      if (!response.ok) {
        throw new Error("Не удалось загрузить обложку. Попробуйте ещё раз.");
      }

      onUploaded(upload.publicUrl);
      setUploadedFileName(file.name);
    } catch (uploadError) {
      setError(
        getUploadErrorMessage(uploadError, "Не удалось загрузить обложку."),
      );
    } finally {
      setIsPuttingFile(false);
      onUploadStateChange(false);
      event.target.value = "";
    }
  };

  return (
    <div className="grid gap-3">
      <p className="text-sm font-medium text-zinc-950">Обложка</p>
      <div className="flex flex-wrap items-center gap-3">
        <label
          htmlFor={id}
          aria-disabled={isUploading}
          className={`inline-flex items-center px-4 py-2 text-sm text-white ${
            isUploading
              ? "cursor-not-allowed bg-zinc-400"
              : "cursor-pointer bg-zinc-950 hover:bg-zinc-800"
          }`}
        >
          {isUploading ? "Обложка загружается..." : "Загрузить обложку"}
        </label>
        {uploadedFileName ? (
          <span className="text-sm text-emerald-700">
            Обложка загружена, ссылка подставлена: {uploadedFileName}
          </span>
        ) : null}
      </div>
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={[...allowedImageContentTypes, ".jpg", ".jpeg", ".png", ".webp"].join(",")}
        disabled={isUploading}
        onChange={handleFileChange}
        className="sr-only"
      />
      <p className="text-xs text-zinc-500">
        Поддерживаются JPEG, PNG, WebP и GIF. Максимум 10 МБ.
      </p>
      {coverUrl ? (
        <span
          aria-label="Предпросмотр обложки"
          role="img"
          className="h-32 w-32 border border-zinc-200 bg-zinc-50 bg-cover bg-center"
          style={coverStyle}
        />
      ) : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </div>
  );
}

function TextField({
  id,
  label,
  onChange,
  required = false,
  type = "text",
  value,
}: {
  id: string;
  label: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: "number" | "text" | "url";
  value: string;
}) {
  return (
    <label htmlFor={id} className="grid gap-2 text-sm font-medium text-zinc-950">
      <span>
        {label}
        {required ? (
          <span className="ml-1 text-xs font-normal text-zinc-500">
            обязательно
          </span>
        ) : null}
      </span>
      <input
        id={id}
        type={type}
        value={value}
        required={required}
        onChange={(event) => onChange(event.target.value)}
        className="border border-zinc-300 px-3 py-2 text-zinc-950 outline-none focus:border-zinc-950"
      />
    </label>
  );
}

function toRadioInput(state: RadioFormState) {
  return {
    title: state.title,
    artist: state.artist,
    mood: state.mood,
    audioUrl: state.audioUrl,
    coverUrl: state.coverUrl,
    sortOrder: Number(state.sortOrder || 0),
    isActive: state.isActive,
  };
}

function sortTracks(tracks: RadioTrack[]) {
  return [...tracks].sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.createdAt.getTime() - b.createdAt.getTime();
  });
}

function groupTracksByMood(tracks: RadioTrack[]) {
  return moods.reduce(
    (accumulator, mood) => {
      accumulator[mood] = sortTracks(
        tracks.filter((track) => track.mood === mood),
      );
      return accumulator;
    },
    {
      [RadioMood.RELAX]: [],
      [RadioMood.ENERGETIC]: [],
      [RadioMood.FUN]: [],
    } as Record<RadioMood, RadioTrack[]>,
  );
}

function getNextSortOrder(tracks: RadioTrack[], mood: RadioMood) {
  const moodTracks = tracks.filter((track) => track.mood === mood);
  if (moodTracks.length === 0) return 0;

  return Math.max(...moodTracks.map((track) => track.sortOrder)) + 1;
}

function getTrackTitle(track: RadioTrack) {
  return track.artist ? `${track.artist} — ${track.title}` : track.title;
}

function getUploadErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}
