"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";

import { api, type RouterOutputs } from "@/trpc/react";

type EventChatMessage =
  RouterOutputs["eventChat"]["list"]["messages"][number];

type EventChatProps = {
  eventId: string;
  eventSlug: string;
  eventTitle: string;
  canAccess: boolean;
  canModerate: boolean;
  currentUserId: string | null;
  isAuthenticated: boolean;
};

export function EventChat({
  eventId,
  eventSlug,
  eventTitle,
  canAccess,
  canModerate,
  currentUserId,
  isAuthenticated,
}: EventChatProps) {
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState<EventChatMessage | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingBody, setEditingBody] = useState("");
  const messagesQuery = api.eventChat.list.useQuery(
    { eventId },
    {
      enabled: canAccess,
      refetchInterval: canAccess ? 5000 : false,
    },
  );
  const markRead = api.eventChat.markRead.useMutation();
  const sendMessage = api.eventChat.send.useMutation({
    onSuccess: async () => {
      setBody("");
      setReplyTo(null);
      await messagesQuery.refetch();
    },
  });
  const updateMessage = api.eventChat.updateMine.useMutation({
    onSuccess: async () => {
      setEditingMessageId(null);
      setEditingBody("");
      await messagesQuery.refetch();
    },
  });
  const deleteMessage = api.eventChat.deleteMine.useMutation({
    onSuccess: async () => {
      await messagesQuery.refetch();
    },
  });
  const hideMessage = api.eventChat.hideMessage.useMutation({
    onSuccess: async () => {
      await messagesQuery.refetch();
    },
  });
  const error =
    sendMessage.error ??
    updateMessage.error ??
    deleteMessage.error ??
    hideMessage.error ??
    messagesQuery.error;
  const isPending =
    sendMessage.isPending ||
    updateMessage.isPending ||
    deleteMessage.isPending ||
    hideMessage.isPending;
  const messages = [...(messagesQuery.data?.messages ?? [])].reverse();
  const latestMessageId = messagesQuery.data?.messages[0]?.id ?? null;
  const [markedReadMessageId, setMarkedReadMessageId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (
      !canAccess ||
      !latestMessageId ||
      markedReadMessageId === latestMessageId
    ) {
      return;
    }

    setMarkedReadMessageId(latestMessageId);
    void markRead
      .mutateAsync({ eventId })
      .then(() => messagesQuery.refetch())
      .catch(() => undefined);
  }, [
    canAccess,
    eventId,
    latestMessageId,
    markRead,
    markedReadMessageId,
    messagesQuery,
  ]);

  const handleSend = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    sendMessage.mutate({
      eventId,
      body,
      replyToMessageId: replyTo?.id,
    });
  };

  const handleUpdate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!editingMessageId) return;

    updateMessage.mutate({
      messageId: editingMessageId,
      body: editingBody,
    });
  };

  return (
    <section id="event-chat" className="mt-6 border border-zinc-200 bg-white p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-zinc-950">
            Чат мероприятия
          </h2>
          <p className="mt-2 text-sm text-zinc-600">
            Здесь организаторы и участники могут обсудить вопросы по
            мероприятию.
          </p>
        </div>
      </div>

      <p className="mt-4 border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
        Не публикуйте точные координаты, точки крепления и технические детали
        организации прыжков.
      </p>

      {!isAuthenticated ? (
        <div className="mt-5">
          <p className="text-sm text-zinc-600">
            Войдите, чтобы увидеть чат мероприятия.
          </p>
          <Link
            href={`/api/auth/signin?callbackUrl=${encodeURIComponent(`/events/${eventSlug}`)}`}
            className="mt-4 inline-flex border border-zinc-300 px-4 py-2 text-sm text-zinc-800 hover:border-zinc-950"
          >
            Войти
          </Link>
        </div>
      ) : !canAccess ? (
        <p className="mt-5 text-sm text-zinc-600">
          Чат доступен организаторам и принятым участникам мероприятия.
        </p>
      ) : (
        <>
          <div className="mt-5 grid gap-4">
            {messagesQuery.isLoading ? (
              <p className="text-sm text-zinc-600">Загрузка сообщений...</p>
            ) : messages.length > 0 ? (
              messages.map((message) => {
                const isOwnMessage = message.authorId === currentUserId;
                const isEditing = editingMessageId === message.id;

                return (
                  <article
                    key={message.id}
                    className="border border-zinc-200 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        {message.author.profile?.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={message.author.profile.avatarUrl}
                            alt={
                              message.author.profile.avatarMedia?.alt ??
                              message.author.profile.displayName ??
                              message.author.profile.username ??
                              "Аватар пользователя"
                            }
                            className="h-9 w-9 border border-zinc-200 object-cover"
                          />
                        ) : null}
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-zinc-950">
                            {getAuthorName(message)}
                          </p>
                          <p className="text-xs text-zinc-500">
                            {formatChatDate(message.createdAt)}
                            {message.editedAt ? " · отредактировано" : ""}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap justify-end gap-3 text-xs">
                        {isOwnMessage && !isEditing ? (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingMessageId(message.id);
                              setEditingBody(message.body);
                            }}
                            className="text-zinc-500 hover:text-zinc-950"
                          >
                            Редактировать
                          </button>
                        ) : null}
                        {!isEditing ? (
                          <button
                            type="button"
                            onClick={() => setReplyTo(message)}
                            className="text-zinc-500 hover:text-zinc-950"
                          >
                            Ответить
                          </button>
                        ) : null}
                        {isAuthenticated && canAccess && !isOwnMessage ? (
                          <Link
                            href={`/reports/new?targetType=EVENT_CHAT_MESSAGE&targetId=${message.id}`}
                            className="text-zinc-500 hover:text-zinc-950"
                          >
                            Пожаловаться
                          </Link>
                        ) : null}
                        {isOwnMessage ? (
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() =>
                              deleteMessage.mutate({
                                messageId: message.id,
                              })
                            }
                            className="text-zinc-500 hover:text-zinc-950 disabled:cursor-not-allowed disabled:text-zinc-400"
                          >
                            Удалить
                          </button>
                        ) : null}
                        {canModerate && !isOwnMessage ? (
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() =>
                              hideMessage.mutate({
                                messageId: message.id,
                              })
                            }
                            className="text-zinc-500 hover:text-zinc-950 disabled:cursor-not-allowed disabled:text-zinc-400"
                          >
                            Скрыть
                          </button>
                        ) : null}
                      </div>
                    </div>

                    {isEditing ? (
                      <form onSubmit={handleUpdate} className="mt-3 grid gap-3">
                        <textarea
                          value={editingBody}
                          onChange={(event) =>
                            setEditingBody(event.target.value)
                          }
                          rows={4}
                          maxLength={2000}
                          className="resize-y border border-zinc-300 px-3 py-2 text-sm text-zinc-950 outline-none focus:border-zinc-950"
                        />
                        <div className="flex flex-wrap gap-3">
                          <button
                            type="submit"
                            disabled={isPending}
                            className="bg-zinc-950 px-4 py-2 text-sm text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
                          >
                            Сохранить
                          </button>
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => {
                              setEditingMessageId(null);
                              setEditingBody("");
                            }}
                            className="border border-zinc-300 px-4 py-2 text-sm text-zinc-800 hover:border-zinc-950 disabled:cursor-not-allowed disabled:text-zinc-400"
                          >
                            Отмена
                          </button>
                        </div>
                      </form>
                    ) : (
                      <>
                        <ReplyPreview message={message} />
                        <p className="mt-3 text-sm leading-6 whitespace-pre-wrap text-zinc-600">
                          {message.body}
                        </p>
                      </>
                    )}
                  </article>
                );
              })
            ) : (
              <p className="text-sm text-zinc-600">
                В чате пока нет сообщений.
              </p>
            )}
          </div>

          <form onSubmit={handleSend} className="mt-5 grid gap-3">
            <label
              htmlFor="eventChatMessage"
              className="text-sm font-medium text-zinc-950"
            >
              Сообщение для участников «{eventTitle}»
            </label>
            {replyTo ? (
              <div className="border border-zinc-200 bg-zinc-50 p-3 text-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-zinc-950">
                      Ответ на сообщение
                    </p>
                    <p className="mt-1 text-zinc-500">
                      {getAuthorName(replyTo)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReplyTo(null)}
                    className="text-xs text-zinc-500 hover:text-zinc-950"
                  >
                    Отменить
                  </button>
                </div>
                <p className="mt-2 text-zinc-600">
                  {getMessagePreview(replyTo.body)}
                </p>
              </div>
            ) : null}
            <textarea
              id="eventChatMessage"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              rows={4}
              maxLength={2000}
              className="resize-y border border-zinc-300 px-3 py-2 text-sm text-zinc-950 outline-none focus:border-zinc-950"
            />
            <div>
              <button
                type="submit"
                disabled={isPending}
                className="bg-zinc-950 px-4 py-2 text-sm text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
              >
                {sendMessage.isPending ? "Отправка..." : "Отправить"}
              </button>
            </div>
          </form>
        </>
      )}

      {error ? <p className="mt-4 text-sm text-red-700">{error.message}</p> : null}
    </section>
  );
}

const getAuthorName = (message: EventChatMessage) =>
  message.author.profile?.displayName ??
  message.author.profile?.username ??
  "Участник";

const getParentAuthorName = (
  parentMessage: NonNullable<EventChatMessage["parentMessage"]>,
) =>
  parentMessage.author.profile?.displayName ??
  parentMessage.author.profile?.username ??
  "Участник";

const getMessagePreview = (body: string) => {
  const normalized = body.replace(/\s+/g, " ").trim();

  return normalized.length > 160
    ? `${normalized.slice(0, 157).trimEnd()}...`
    : normalized;
};

function ReplyPreview({ message }: { message: EventChatMessage }) {
  if (!message.parentMessage) return null;

  if (message.parentMessage.deletedAt || message.parentMessage.hiddenAt) {
    return (
      <div className="mt-3 border-l-2 border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-500">
        Ответ на сообщение: сообщение недоступно
      </div>
    );
  }

  return (
    <div className="mt-3 border-l-2 border-zinc-300 bg-zinc-50 px-3 py-2 text-sm">
      <p className="font-medium text-zinc-700">
        Ответ на сообщение {getParentAuthorName(message.parentMessage)}
      </p>
      <p className="mt-1 text-zinc-600">
        {getMessagePreview(message.parentMessage.body)}
      </p>
    </div>
  );
}

const formatChatDate = (date: Date) =>
  new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
