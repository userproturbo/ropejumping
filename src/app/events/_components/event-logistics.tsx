"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

import {
  EventLogisticsStatus,
  EventLogisticsType,
} from "@/generated/prisma/enums";
import { api, type RouterOutputs } from "@/trpc/react";

type LogisticsPost =
  RouterOutputs["eventLogistics"]["list"]["posts"][number];

type EventLogisticsProps = {
  eventId: string;
  eventTitle: string;
  canAccess: boolean;
  canManage: boolean;
  currentUserId: string | null;
};

type FormState = {
  type: EventLogisticsType;
  fromLocation: string;
  departureTimeText: string;
  seatsAvailable: string;
  baggageNote: string;
  body: string;
};

const initialFormState: FormState = {
  type: EventLogisticsType.NEED_SEAT,
  fromLocation: "",
  departureTimeText: "",
  seatsAvailable: "",
  baggageNote: "",
  body: "",
};

export function EventLogistics({
  eventId,
  eventTitle,
  canAccess,
  canManage,
  currentUserId,
}: EventLogisticsProps) {
  const [form, setForm] = useState<FormState>(initialFormState);
  const [editingPost, setEditingPost] = useState<LogisticsPost | null>(null);
  const logisticsQuery = api.eventLogistics.list.useQuery(
    { eventId },
    {
      enabled: canAccess,
    },
  );
  const createPost = api.eventLogistics.create.useMutation({
    onSuccess: async () => {
      setForm(initialFormState);
      await logisticsQuery.refetch();
    },
  });
  const updatePost = api.eventLogistics.updateMine.useMutation({
    onSuccess: async () => {
      setEditingPost(null);
      await logisticsQuery.refetch();
    },
  });
  const closePost = api.eventLogistics.closeMine.useMutation({
    onSuccess: async () => logisticsQuery.refetch(),
  });
  const reopenPost = api.eventLogistics.reopenMine.useMutation({
    onSuccess: async () => logisticsQuery.refetch(),
  });
  const hidePost = api.eventLogistics.hidePost.useMutation({
    onSuccess: async () => logisticsQuery.refetch(),
  });

  if (!canAccess) return null;

  const posts = logisticsQuery.data?.posts ?? [];
  const isReadOnly = logisticsQuery.data?.isReadOnly ?? false;
  const error =
    createPost.error ??
    updatePost.error ??
    closePost.error ??
    reopenPost.error ??
    hidePost.error ??
    logisticsQuery.error;
  const isPending =
    createPost.isPending ||
    updatePost.isPending ||
    closePost.isPending ||
    reopenPost.isPending ||
    hidePost.isPending;

  const handleCreate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    createPost.mutate({
      eventId,
      ...toMutationInput(form),
    });
  };

  const handleUpdate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!editingPost) return;

    updatePost.mutate({
      postId: editingPost.id,
      ...toMutationInput(form),
    });
  };

  const startEditing = (post: LogisticsPost) => {
    setEditingPost(post);
    setForm({
      type: post.type,
      fromLocation: post.fromLocation ?? "",
      departureTimeText: post.departureTimeText ?? "",
      seatsAvailable: post.seatsAvailable?.toString() ?? "",
      baggageNote: post.baggageNote ?? "",
      body: post.body,
    });
  };

  const cancelEditing = () => {
    setEditingPost(null);
    setForm(initialFormState);
  };

  return (
    <section className="mt-6 border border-zinc-200 bg-white p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-zinc-950">
            Как добраться / Попутки
          </h2>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            Здесь участники могут предложить места в машине, найти попутчиков
            или договориться, как добраться до мероприятия «{eventTitle}».
          </p>
        </div>
        <Link
          href="#event-chat"
          className="text-sm text-zinc-600 hover:text-zinc-950"
        >
          Перейти в чат мероприятия
        </Link>
      </div>

      <p className="mt-4 border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
        Не публикуйте точные координаты объекта, точки крепления, маршруты
        доступа и технические детали. Для договорённостей используйте общие
        ориентиры и чат мероприятия.
      </p>

      {isReadOnly ? (
        <p className="mt-4 border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-600">
          Мероприятие закрыто. Записи по логистике доступны только для чтения.
        </p>
      ) : (
        <LogisticsForm
          form={form}
          isEditing={Boolean(editingPost)}
          isPending={isPending}
          onCancel={cancelEditing}
          onChange={setForm}
          onSubmit={editingPost ? handleUpdate : handleCreate}
        />
      )}

      {error ? <p className="mt-4 text-sm text-red-700">{error.message}</p> : null}

      <div className="mt-5 grid gap-4">
        {logisticsQuery.isLoading ? (
          <p className="text-sm text-zinc-600">Загрузка записей...</p>
        ) : posts.length > 0 ? (
          posts.map((post) => {
            const isOwnPost = post.authorId === currentUserId;
            const isClosed = post.status === EventLogisticsStatus.CLOSED;

            return (
              <article key={post.id} className="border border-zinc-200 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <span className="border border-zinc-200 px-2 py-1 text-xs font-medium text-zinc-700">
                        {getTypeLabel(post.type)}
                      </span>
                      <span className="border border-zinc-200 px-2 py-1 text-xs font-medium text-zinc-700">
                        {getStatusLabel(post.status)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-zinc-500">
                      {getAuthorName(post)} · {formatLogisticsDate(post.createdAt)}
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-end gap-3 text-xs">
                    {isOwnPost && !isClosed && !isReadOnly ? (
                      <button
                        type="button"
                        onClick={() => startEditing(post)}
                        className="text-zinc-500 hover:text-zinc-950"
                      >
                        Редактировать
                      </button>
                    ) : null}
                    {isOwnPost && !isClosed ? (
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => closePost.mutate({ postId: post.id })}
                        className="text-zinc-500 hover:text-zinc-950 disabled:cursor-not-allowed disabled:text-zinc-400"
                      >
                        Закрыть
                      </button>
                    ) : null}
                    {isOwnPost && isClosed && !isReadOnly ? (
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => reopenPost.mutate({ postId: post.id })}
                        className="text-zinc-500 hover:text-zinc-950 disabled:cursor-not-allowed disabled:text-zinc-400"
                      >
                        Открыть снова
                      </button>
                    ) : null}
                    {canManage && !isOwnPost ? (
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => hidePost.mutate({ postId: post.id })}
                        className="text-zinc-500 hover:text-zinc-950 disabled:cursor-not-allowed disabled:text-zinc-400"
                      >
                        Скрыть
                      </button>
                    ) : null}
                  </div>
                </div>

                <dl className="mt-4 grid gap-2 text-sm text-zinc-600 sm:grid-cols-2">
                  {post.fromLocation ? (
                    <div>
                      <dt className="font-medium text-zinc-950">Откуда</dt>
                      <dd className="mt-1">{post.fromLocation}</dd>
                    </div>
                  ) : null}
                  {post.departureTimeText ? (
                    <div>
                      <dt className="font-medium text-zinc-950">Время выезда</dt>
                      <dd className="mt-1">{post.departureTimeText}</dd>
                    </div>
                  ) : null}
                  {post.seatsAvailable !== null ? (
                    <div>
                      <dt className="font-medium text-zinc-950">
                        Свободных мест
                      </dt>
                      <dd className="mt-1">{post.seatsAvailable}</dd>
                    </div>
                  ) : null}
                  {post.baggageNote ? (
                    <div>
                      <dt className="font-medium text-zinc-950">Багаж</dt>
                      <dd className="mt-1">{post.baggageNote}</dd>
                    </div>
                  ) : null}
                </dl>
                <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-zinc-600">
                  {post.body}
                </p>
                <p className="mt-3 text-xs text-zinc-500">
                  Для деталей договоритесь в чате мероприятия.
                </p>
              </article>
            );
          })
        ) : (
          <p className="text-sm text-zinc-600">
            Пока нет записей по логистике.
          </p>
        )}
      </div>
    </section>
  );
}

function LogisticsForm({
  form,
  isEditing,
  isPending,
  onCancel,
  onChange,
  onSubmit,
}: {
  form: FormState;
  isEditing: boolean;
  isPending: boolean;
  onCancel: () => void;
  onChange: (form: FormState) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form onSubmit={onSubmit} className="mt-5 grid gap-4">
      <div className="grid gap-4 md:grid-cols-3">
        <label className="grid gap-2 text-sm font-medium text-zinc-950">
          Тип
          <select
            value={form.type}
            onChange={(event) =>
              onChange({ ...form, type: event.target.value as EventLogisticsType })
            }
            className="border border-zinc-300 px-3 py-2 text-sm font-normal text-zinc-950 outline-none focus:border-zinc-950"
          >
            <option value={EventLogisticsType.OFFER_SEAT}>
              Предлагаю место
            </option>
            <option value={EventLogisticsType.NEED_SEAT}>Ищу место</option>
            <option value={EventLogisticsType.GOING_TOGETHER}>
              Еду своим ходом / ищу компанию
            </option>
          </select>
        </label>
        <TextInput
          label="Откуда"
          placeholder="Например: Москва, север / м. Тушинская"
          value={form.fromLocation}
          onChange={(value) => onChange({ ...form, fromLocation: value })}
        />
        <TextInput
          label="Время выезда"
          placeholder="Например: суббота 06:30"
          value={form.departureTimeText}
          onChange={(value) => onChange({ ...form, departureTimeText: value })}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <TextInput
          label="Свободных мест"
          placeholder="Например: 2"
          value={form.seatsAvailable}
          onChange={(value) => onChange({ ...form, seatsAvailable: value })}
          type="number"
        />
        <TextInput
          label="Багаж"
          placeholder="Например: рюкзак можно, крупный груз — по договорённости"
          value={form.baggageNote}
          onChange={(value) => onChange({ ...form, baggageNote: value })}
        />
      </div>

      <label className="grid gap-2 text-sm font-medium text-zinc-950">
        Комментарий
        <textarea
          value={form.body}
          onChange={(event) => onChange({ ...form, body: event.target.value })}
          placeholder="Коротко опишите условия, маршрут в общих чертах или что ищете."
          rows={4}
          maxLength={1000}
          className="resize-y border border-zinc-300 px-3 py-2 text-sm font-normal text-zinc-950 outline-none focus:border-zinc-950"
        />
      </label>

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="bg-zinc-950 px-4 py-2 text-sm text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
        >
          {isEditing ? "Сохранить" : "Добавить запись"}
        </button>
        {isEditing ? (
          <button
            type="button"
            disabled={isPending}
            onClick={onCancel}
            className="border border-zinc-300 px-4 py-2 text-sm text-zinc-800 hover:border-zinc-950 disabled:cursor-not-allowed disabled:text-zinc-400"
          >
            Отмена
          </button>
        ) : null}
      </div>
    </form>
  );
}

function TextInput({
  label,
  onChange,
  placeholder,
  type = "text",
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: "number" | "text";
  value: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium text-zinc-950">
      {label}
      <input
        type={type}
        min={type === "number" ? 0 : undefined}
        max={type === "number" ? 20 : undefined}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="border border-zinc-300 px-3 py-2 text-sm font-normal text-zinc-950 outline-none focus:border-zinc-950"
      />
    </label>
  );
}

const toMutationInput = (form: FormState) => ({
  type: form.type,
  fromLocation: form.fromLocation,
  departureTimeText: form.departureTimeText,
  seatsAvailable:
    form.seatsAvailable.trim() === "" ? null : Number(form.seatsAvailable),
  baggageNote: form.baggageNote,
  body: form.body,
});

const getTypeLabel = (type: EventLogisticsType) => {
  if (type === EventLogisticsType.OFFER_SEAT) return "Предлагает место";
  if (type === EventLogisticsType.NEED_SEAT) return "Ищет место";

  return "Едет своим ходом / ищет компанию";
};

const getStatusLabel = (status: EventLogisticsStatus) =>
  status === EventLogisticsStatus.ACTIVE ? "Актуально" : "Закрыто";

const getAuthorName = (post: LogisticsPost) =>
  post.author.profile?.displayName ??
  post.author.profile?.username ??
  "Участник";

const formatLogisticsDate = (date: Date) =>
  new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
