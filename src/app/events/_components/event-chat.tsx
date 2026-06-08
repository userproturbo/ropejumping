"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";

import { api, type RouterOutputs } from "@/trpc/react";

type EventChatMessage = RouterOutputs["eventChat"]["list"]["messages"][number];

type EventChatProps = {
  eventId: string;
  eventSlug: string;
  eventTitle: string;
  canAccess: boolean;
  canModerate: boolean;
  currentUserId: string | null;
  isAuthenticated: boolean;
  isReadOnly: boolean;
};

export function EventChat({
  eventId,
  eventSlug,
  eventTitle,
  canAccess,
  canModerate,
  currentUserId,
  isAuthenticated,
  isReadOnly: initialIsReadOnly,
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
  const isReadOnly = messagesQuery.data?.isReadOnly ?? initialIsReadOnly;
  const [markedReadMessageId, setMarkedReadMessageId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (!isReadOnly) return;

    setReplyTo(null);
    setEditingMessageId(null);
    setEditingBody("");
  }, [isReadOnly]);

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
    <section
      id="event-chat"
      className="mt-6 border border-[rgba(199,217,136,0.25)] bg-[#10150e] p-4 text-[#d7dcc5] sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-[#e9eddc]">
            Чат мероприятия
          </h2>
          <p className="mt-2 text-sm text-[#aab497]">
            Здесь организаторы и участники могут обсудить вопросы по
            мероприятию.
          </p>
        </div>
      </div>

      <p className="mt-4 border border-[rgba(199,217,136,0.22)] bg-[rgba(255,255,255,0.04)] p-3 text-xs leading-5 text-[#aab497]">
        Не публикуйте точные координаты, точки крепления и технические детали
        организации прыжков.
      </p>

      {canAccess && isReadOnly ? (
        <div className="mt-4 border border-[rgba(199,217,136,0.22)] bg-[rgba(255,255,255,0.04)] p-3">
          <p className="text-sm font-medium text-[#e9eddc]">Чат в архиве</p>
          <p className="mt-1 text-sm leading-6 text-[#aab497]">
            Мероприятие завершено или закрыто. История чата доступна для чтения,
            новые сообщения отправлять нельзя.
          </p>
        </div>
      ) : null}

      {!isAuthenticated ? (
        <div className="mt-5">
          <p className="text-sm text-[#aab497]">
            Войдите, чтобы увидеть чат мероприятия.
          </p>
          <Link
            href={`/login?callbackUrl=${encodeURIComponent(`/events/${eventSlug}`)}`}
            className="mt-4 inline-flex border border-[rgba(199,217,136,0.3)] px-4 py-2 text-sm text-[#e9eddc] hover:border-[rgba(199,217,136,0.65)] hover:text-[#c7d988]"
          >
            Войти
          </Link>
        </div>
      ) : !canAccess ? (
        <p className="mt-5 text-sm text-[#aab497]">
          Чат доступен организаторам и принятым участникам мероприятия.
        </p>
      ) : (
        <>
          <div className="mt-5 grid gap-4">
            {messagesQuery.isLoading ? (
              <p className="text-sm text-[#aab497]">Загрузка сообщений...</p>
            ) : messages.length > 0 ? (
              messages.map((message) => {
                const isOwnMessage = message.authorId === currentUserId;
                const isEditing = editingMessageId === message.id;

                return (
                  <article
                    key={message.id}
                    className="border border-[rgba(199,217,136,0.22)] bg-[rgba(255,255,255,0.04)] p-4"
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
                            className="h-9 w-9 border border-[rgba(199,217,136,0.28)] object-cover"
                          />
                        ) : null}
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-[#e9eddc]">
                            {getAuthorName(message)}
                          </p>
                          <p className="text-xs text-[#aab497]">
                            {formatChatDate(message.createdAt)}
                            {message.editedAt ? " · отредактировано" : ""}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap justify-end gap-3 text-xs">
                        {isOwnMessage && !isEditing && !isReadOnly ? (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingMessageId(message.id);
                              setEditingBody(message.body);
                            }}
                            className="text-[#aab497] hover:text-[#c7d988]"
                          >
                            Редактировать
                          </button>
                        ) : null}
                        {!isEditing && !isReadOnly ? (
                          <button
                            type="button"
                            onClick={() => setReplyTo(message)}
                            className="text-[#aab497] hover:text-[#c7d988]"
                          >
                            Ответить
                          </button>
                        ) : null}
                        {isAuthenticated && canAccess && !isOwnMessage ? (
                          <Link
                            href={`/reports/new?targetType=EVENT_CHAT_MESSAGE&targetId=${message.id}`}
                            className="text-[#aab497] hover:text-[#c7d988]"
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
                            className="text-[#aab497] hover:text-[#c7d988] disabled:cursor-not-allowed disabled:text-[#5f6f38]"
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
                            className="text-[#aab497] hover:text-[#c7d988] disabled:cursor-not-allowed disabled:text-[#5f6f38]"
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
                          className="resize-y border border-[rgba(199,217,136,0.3)] bg-[#151a12] px-3 py-2 text-sm text-[#e9eddc] outline-none focus:border-[rgba(199,217,136,0.65)]"
                        />
                        <div className="flex flex-wrap gap-3">
                          <button
                            type="submit"
                            disabled={isPending}
                            className="border border-[rgba(199,217,136,0.3)] px-4 py-2 text-sm text-[#e9eddc] hover:border-[rgba(199,217,136,0.65)] hover:text-[#c7d988] disabled:cursor-not-allowed disabled:text-[#aab497]"
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
                            className="border border-[rgba(199,217,136,0.3)] px-4 py-2 text-sm text-[#e9eddc] hover:border-[rgba(199,217,136,0.65)] hover:text-[#c7d988] disabled:cursor-not-allowed disabled:text-[#5f6f38]"
                          >
                            Отмена
                          </button>
                        </div>
                      </form>
                    ) : (
                      <>
                        <ReplyPreview message={message} />
                        <p className="mt-3 text-sm leading-6 whitespace-pre-wrap text-[#d7dcc5]">
                          {message.body}
                        </p>
                      </>
                    )}
                  </article>
                );
              })
            ) : (
              <p className="text-sm text-[#aab497]">
                В чате пока нет сообщений.
              </p>
            )}
          </div>

          {!isReadOnly ? (
            <form onSubmit={handleSend} className="mt-5 grid gap-3">
              <label
                htmlFor="eventChatMessage"
                className="text-sm font-medium text-[#e9eddc]"
              >
                Сообщение для участников «{eventTitle}»
              </label>
              {replyTo ? (
                <div className="border border-[rgba(199,217,136,0.22)] bg-[rgba(255,255,255,0.04)] p-3 text-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-[#e9eddc]">
                        Ответ на сообщение
                      </p>
                      <p className="mt-1 text-[#aab497]">
                        {getAuthorName(replyTo)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setReplyTo(null)}
                      className="text-xs text-[#aab497] hover:text-[#c7d988]"
                    >
                      Отменить
                    </button>
                  </div>
                  <p className="mt-2 text-[#d7dcc5]">
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
                className="resize-y border border-[rgba(199,217,136,0.3)] bg-[#151a12] px-3 py-2 text-sm text-[#e9eddc] outline-none focus:border-[rgba(199,217,136,0.65)]"
              />
              <div>
                <button
                  type="submit"
                  disabled={isPending}
                  className="border border-[rgba(199,217,136,0.3)] px-4 py-2 text-sm text-[#e9eddc] hover:border-[rgba(199,217,136,0.65)] hover:text-[#c7d988] disabled:cursor-not-allowed disabled:text-[#aab497]"
                >
                  {sendMessage.isPending ? "Отправка..." : "Отправить"}
                </button>
              </div>
            </form>
          ) : null}
        </>
      )}

      {error ? (
        <p className="mt-4 text-sm text-red-300">{error.message}</p>
      ) : null}
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
      <div className="mt-3 border-l-2 border-[rgba(199,217,136,0.3)] bg-[rgba(255,255,255,0.04)] px-3 py-2 text-sm text-[#aab497]">
        Ответ на сообщение: сообщение недоступно
      </div>
    );
  }

  return (
    <div className="mt-3 border-l-2 border-[rgba(199,217,136,0.3)] bg-[rgba(255,255,255,0.04)] px-3 py-2 text-sm">
      <p className="font-medium text-[#c7d988]">
        Ответ на сообщение {getParentAuthorName(message.parentMessage)}
      </p>
      <p className="mt-1 text-[#d7dcc5]">
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
