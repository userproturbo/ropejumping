"use client";

import { useRef, useState, type ChangeEvent, type FormEvent } from "react";

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
  sortOrder: "0",
  isActive: true,
};

export function RadioAdminPanel({ initialTracks }: RadioAdminPanelProps) {
  const [tracks, setTracks] = useState(initialTracks);
  const [createForm, setCreateForm] = useState<RadioFormState>(emptyForm);
  const [editingTrackId, setEditingTrackId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<RadioFormState>(emptyForm);

  const createTrack = api.radio.create.useMutation({
    onSuccess: (track) => {
      setTracks((currentTracks) => sortTracks([...currentTracks, track]));
      setCreateForm(emptyForm);
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
    },
  });

  const handleCreate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    createTrack.mutate(toRadioInput(createForm));
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

  return (
    <div className="grid gap-6">
      <section className="border border-zinc-200 bg-white p-6">
        <h2 className="text-xl font-semibold text-zinc-950">Новый трек</h2>
        <RadioTrackForm
          formId="radio-create"
          state={createForm}
          submitLabel={createTrack.isPending ? "Сохранение..." : "Добавить"}
          disabled={createTrack.isPending}
          onChange={setCreateForm}
          onSubmit={handleCreate}
        />
        {createTrack.error ? (
          <p className="mt-3 text-sm text-red-700">
            {createTrack.error.message}
          </p>
        ) : null}
      </section>

      <section className="border border-zinc-200 bg-white p-6">
        <h2 className="text-xl font-semibold text-zinc-950">Треки</h2>
        {tracks.length > 0 ? (
          <div className="mt-5 grid gap-4">
            {tracks.map((track) => (
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
                        <span className="border border-zinc-200 px-2 py-1 text-xs text-zinc-500">
                          {radioMoodLabels[track.mood]}
                        </span>
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
                        {track.audioUrl}
                      </p>
                      {track.coverUrl ? (
                        <p className="mt-1 break-all text-sm text-zinc-500">
                          Обложка: {track.coverUrl}
                        </p>
                      ) : null}
                      <p className="mt-1 text-sm text-zinc-500">
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
                    </div>
                  </div>
                )}
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-zinc-600">Треков пока нет.</p>
        )}
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
          Настроение
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
        <TextField
          id={`${formId}-sortOrder`}
          label="Порядок"
          value={state.sortOrder}
          type="number"
          onChange={(sortOrder) => onChange({ ...state, sortOrder })}
        />
      </div>
      <TextField
        id={`${formId}-audioUrl`}
        label="Ссылка на аудио или загруженный файл"
        value={state.audioUrl}
        type="url"
        required
        onChange={(audioUrl) => onChange({ ...state, audioUrl })}
      />
      <RadioAudioUploadField
        id={`${formId}-audio-upload`}
        onUploaded={(audioUrl) => onChange({ ...state, audioUrl })}
      />
      <TextField
        id={`${formId}-coverUrl`}
        label="Ссылка на обложку или загруженный файл"
        value={state.coverUrl}
        type="url"
        onChange={(coverUrl) => onChange({ ...state, coverUrl })}
      />
      <RadioCoverUploadField
        coverUrl={state.coverUrl}
        id={`${formId}-cover-upload`}
        onUploaded={(coverUrl) => onChange({ ...state, coverUrl })}
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
      <button
        type="submit"
        disabled={disabled}
        className="w-fit bg-zinc-950 px-4 py-2 text-sm text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
      >
        {submitLabel}
      </button>
    </form>
  );
}

function RadioAudioUploadField({
  id,
  onUploaded,
}: {
  id: string;
  onUploaded: (url: string) => void;
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
      event.target.value = "";
    }
  };

  return (
    <div className="grid gap-3">
      <p className="text-sm font-medium text-zinc-950">Аудиофайл</p>
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
            Загружено: {uploadedFileName}
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
        Поддерживаются MP3, M4A, WAV и OGG. Максимум 80 МБ. Можно оставить
        ручную ссылку выше как fallback.
      </p>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </div>
  );
}

function RadioCoverUploadField({
  coverUrl,
  id,
  onUploaded,
}: {
  coverUrl: string;
  id: string;
  onUploaded: (url: string) => void;
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
            Загружено: {uploadedFileName}
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
        Поддерживаются JPEG, PNG, WebP и GIF. Максимум 10 МБ. Можно оставить
        ручную ссылку выше как fallback.
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
      {label}
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

function getTrackTitle(track: RadioTrack) {
  return track.artist ? `${track.artist} — ${track.title}` : track.title;
}

function getUploadErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}
