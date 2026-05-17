import Link from "next/link";

import { getEventStatusLabel, getTeamStatusLabel } from "@/lib/display";
import { requireCurrentUser } from "@/server/auth/session";
import { api } from "@/trpc/server";

export default async function ProfileChatsPage() {
  await requireCurrentUser("/profile/chats");

  const [eventChats, teamChats] = await Promise.all([
    api.eventChat.getMyChats(),
    api.teamChat.getMyChats(),
  ]);

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-zinc-50">
      <div className="mx-auto w-full max-w-4xl px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">
            Мои чаты
          </h1>
          <p className="mt-2 text-sm text-zinc-600">
            Чаты мероприятий и команд, к которым у вас есть доступ.
          </p>
        </div>

        <section className="border border-zinc-200 bg-white p-6">
          <h2 className="text-xl font-semibold text-zinc-950">Мероприятия</h2>
          {eventChats.length > 0 ? (
            <div className="mt-5 grid gap-4">
              {eventChats.map((chat) => (
                <article key={chat.eventId} className="border border-zinc-200 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="text-base font-semibold text-zinc-950">
                        {chat.eventTitle}
                      </h3>
                      <p className="mt-1 text-xs text-zinc-500">
                        {getEventStatusLabel(chat.eventStatus)}
                      </p>
                    </div>
                    {chat.unreadCount > 0 ? (
                      <span className="border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-900">
                        Новых: {chat.unreadCount}
                      </span>
                    ) : null}
                  </div>

                  <ChatPreview lastMessage={chat.lastMessage} />

                  <Link
                    href={`/events/${chat.eventSlug}#event-chat`}
                    className="mt-4 inline-flex border border-zinc-300 px-4 py-2 text-sm text-zinc-800 hover:border-zinc-950"
                  >
                    Открыть чат
                  </Link>
                </article>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-zinc-600">
              У вас пока нет доступных чатов мероприятий.
            </p>
          )}
        </section>

        <section className="mt-6 border border-zinc-200 bg-white p-6">
          <h2 className="text-xl font-semibold text-zinc-950">Команды</h2>
          {teamChats.length > 0 ? (
            <div className="mt-5 grid gap-4">
              {teamChats.map((chat) => (
                <article key={chat.teamId} className="border border-zinc-200 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="text-base font-semibold text-zinc-950">
                        {chat.teamName}
                      </h3>
                      <p className="mt-1 text-xs text-zinc-500">
                        {getTeamStatusLabel(chat.teamStatus)}
                      </p>
                    </div>
                    {chat.unreadCount > 0 ? (
                      <span className="border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-900">
                        Новых: {chat.unreadCount}
                      </span>
                    ) : null}
                  </div>

                  <ChatPreview lastMessage={chat.lastMessage} />

                  <Link
                    href={`/teams/${chat.teamSlug}#team-chat`}
                    className="mt-4 inline-flex border border-zinc-300 px-4 py-2 text-sm text-zinc-800 hover:border-zinc-950"
                  >
                    Открыть чат
                  </Link>
                </article>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-zinc-600">
              У вас пока нет доступных чатов команд.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}

type LastMessage = {
  id: string;
  body: string;
  createdAt: Date;
  authorName: string;
} | null;

function ChatPreview({ lastMessage }: { lastMessage: LastMessage }) {
  if (!lastMessage) {
    return (
      <p className="mt-4 text-sm text-zinc-600">Сообщений пока нет.</p>
    );
  }

  return (
    <div className="mt-4 text-sm text-zinc-600">
      <p className="font-medium text-zinc-950">{lastMessage.authorName}</p>
      <p className="mt-1 leading-6 whitespace-pre-wrap">
        {getMessagePreview(lastMessage.body)}
      </p>
      <p className="mt-2 text-xs text-zinc-500">
        {formatChatDate(lastMessage.createdAt)}
      </p>
    </div>
  );
}

const getMessagePreview = (body: string) => {
  const normalized = body.replace(/\s+/g, " ").trim();

  return normalized.length > 160
    ? `${normalized.slice(0, 157).trimEnd()}...`
    : normalized;
};

const formatChatDate = (date: Date) =>
  new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
