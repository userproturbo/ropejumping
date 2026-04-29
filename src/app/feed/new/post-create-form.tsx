"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { api, type RouterOutputs } from "@/trpc/react";

type TeamOption = RouterOutputs["team"]["getMine"][number];
type EventOption = RouterOutputs["event"]["listPublic"][number];
type ObjectOption = RouterOutputs["object"]["listPublic"][number];

type PostCreateFormProps = {
  events: EventOption[];
  objects: ObjectOption[];
  teams: TeamOption[];
};

export function PostCreateForm({
  events,
  objects,
  teams,
}: PostCreateFormProps) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [teamId, setTeamId] = useState("");
  const [eventId, setEventId] = useState("");
  const [objectId, setObjectId] = useState("");

  const createPost = api.post.create.useMutation({
    onSuccess: (post) => {
      router.push(`/posts/${post.id}`);
      router.refresh();
    },
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    createPost.mutate({
      content,
      imageUrl,
      teamId,
      eventId,
      objectId,
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 border border-zinc-200 bg-white p-6"
    >
      <p className="border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
        Не публикуйте точные координаты, способы доступа, точки крепления,
        технические схемы и инструкции для самостоятельных прыжков.
      </p>

      <div className="grid gap-2">
        <label htmlFor="content" className="text-sm font-medium text-zinc-950">
          Текст поста
        </label>
        <textarea
          id="content"
          name="content"
          value={content}
          onChange={(event) => setContent(event.target.value)}
          required
          maxLength={2000}
          rows={8}
          className="resize-y border border-zinc-300 px-3 py-2 text-zinc-950 outline-none focus:border-zinc-950"
        />
      </div>

      <div className="grid gap-2">
        <label htmlFor="imageUrl" className="text-sm font-medium text-zinc-950">
          Ссылка на изображение
        </label>
        <input
          id="imageUrl"
          name="imageUrl"
          value={imageUrl}
          onChange={(event) => setImageUrl(event.target.value)}
          type="url"
          className="border border-zinc-300 px-3 py-2 text-zinc-950 outline-none focus:border-zinc-950"
          placeholder="https://example.com/image.jpg"
        />
      </div>

      <div className="grid gap-2">
        <label htmlFor="teamId" className="text-sm font-medium text-zinc-950">
          Связанная команда
        </label>
        <select
          id="teamId"
          name="teamId"
          value={teamId}
          onChange={(event) => setTeamId(event.target.value)}
          className="border border-zinc-300 px-3 py-2 text-zinc-950 outline-none focus:border-zinc-950"
        >
          <option value="">Без команды</option>
          {teams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-2">
        <label htmlFor="eventId" className="text-sm font-medium text-zinc-950">
          Связанное мероприятие
        </label>
        <select
          id="eventId"
          name="eventId"
          value={eventId}
          onChange={(event) => setEventId(event.target.value)}
          className="border border-zinc-300 px-3 py-2 text-zinc-950 outline-none focus:border-zinc-950"
        >
          <option value="">Без мероприятия</option>
          {events.map((event) => (
            <option key={event.id} value={event.id}>
              {event.title}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-2">
        <label htmlFor="objectId" className="text-sm font-medium text-zinc-950">
          Связанный объект
        </label>
        <select
          id="objectId"
          name="objectId"
          value={objectId}
          onChange={(event) => setObjectId(event.target.value)}
          className="border border-zinc-300 px-3 py-2 text-zinc-950 outline-none focus:border-zinc-950"
        >
          <option value="">Без объекта</option>
          {objects.map((object) => (
            <option key={object.id} value={object.id}>
              {getObjectOptionLabel(object)}
            </option>
          ))}
        </select>
      </div>

      {createPost.error ? (
        <p className="text-sm text-red-700">{createPost.error.message}</p>
      ) : null}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={createPost.isPending}
          className="bg-zinc-950 px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:bg-zinc-400"
        >
          {createPost.isPending ? "Публикация..." : "Опубликовать"}
        </button>
        <Link href="/feed" className="text-sm text-zinc-600 hover:text-zinc-950">
          Отмена
        </Link>
      </div>
    </form>
  );
}

const getObjectOptionLabel = (object: ObjectOption) => {
  const details = [object.heightMeters ? `${object.heightMeters} м` : null, object.region]
    .filter(Boolean)
    .join(", ");

  return details ? `${object.name} (${details})` : object.name;
};
