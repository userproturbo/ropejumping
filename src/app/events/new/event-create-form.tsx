"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { api, type RouterOutputs } from "@/trpc/react";

import { datetimeLocalToIso } from "../_components/date-format";

type ManageableTeam = RouterOutputs["team"]["getMine"][number];

type EventCreateFormProps = {
  teams: ManageableTeam[];
};

export function EventCreateForm({ teams }: EventCreateFormProps) {
  const router = useRouter();
  const [teamId, setTeamId] = useState(teams[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [requirementsText, setRequirementsText] = useState("");
  const [region, setRegion] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [capacity, setCapacity] = useState("");
  const [priceText, setPriceText] = useState("");
  const [levelText, setLevelText] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");

  const createEvent = api.event.create.useMutation({
    onSuccess: (event) => {
      router.push(`/events/${event.slug}`);
      router.refresh();
    },
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    createEvent.mutate({
      teamId,
      title,
      slug,
      description,
      requirementsText,
      region,
      startsAt: datetimeLocalToIso(startsAt),
      endsAt: datetimeLocalToIso(endsAt),
      capacity,
      priceText,
      levelText,
      coverImageUrl,
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 border border-zinc-200 bg-white p-6"
    >
      <div className="grid gap-2">
        <label htmlFor="teamId" className="text-sm font-medium text-zinc-950">
          Команда
        </label>
        <select
          id="teamId"
          name="teamId"
          value={teamId}
          onChange={(event) => setTeamId(event.target.value)}
          required
          className="border border-zinc-300 px-3 py-2 text-zinc-950 outline-none focus:border-zinc-950"
        >
          {teams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-2">
        <label htmlFor="title" className="text-sm font-medium text-zinc-950">
          Название
        </label>
        <input
          id="title"
          name="title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          required
          minLength={3}
          maxLength={120}
          className="border border-zinc-300 px-3 py-2 text-zinc-950 outline-none focus:border-zinc-950"
        />
      </div>

      <div className="grid gap-2">
        <label htmlFor="slug" className="text-sm font-medium text-zinc-950">
          Slug
        </label>
        <input
          id="slug"
          name="slug"
          value={slug}
          onChange={(event) => setSlug(event.target.value.toLowerCase())}
          required
          minLength={3}
          maxLength={80}
          pattern="[a-z0-9-]*"
          className="border border-zinc-300 px-3 py-2 text-zinc-950 outline-none focus:border-zinc-950"
          placeholder="event-name"
        />
        <p className="text-xs text-zinc-500">
          Латинские строчные буквы, цифры и дефисы. Это поле пока нельзя изменить.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <label
            htmlFor="startsAt"
            className="text-sm font-medium text-zinc-950"
          >
            Начало
          </label>
          <input
            id="startsAt"
            name="startsAt"
            value={startsAt}
            onChange={(event) => setStartsAt(event.target.value)}
            type="datetime-local"
            required
            className="border border-zinc-300 px-3 py-2 text-zinc-950 outline-none focus:border-zinc-950"
          />
        </div>

        <div className="grid gap-2">
          <label
            htmlFor="endsAt"
            className="text-sm font-medium text-zinc-950"
          >
            Окончание
          </label>
          <input
            id="endsAt"
            name="endsAt"
            value={endsAt}
            onChange={(event) => setEndsAt(event.target.value)}
            type="datetime-local"
            className="border border-zinc-300 px-3 py-2 text-zinc-950 outline-none focus:border-zinc-950"
          />
        </div>
      </div>

      <div className="grid gap-2">
        <label htmlFor="region" className="text-sm font-medium text-zinc-950">
          Регион
        </label>
        <input
          id="region"
          name="region"
          value={region}
          onChange={(event) => setRegion(event.target.value)}
          maxLength={80}
          className="border border-zinc-300 px-3 py-2 text-zinc-950 outline-none focus:border-zinc-950"
        />
      </div>

      <div className="grid gap-2">
        <label
          htmlFor="description"
          className="text-sm font-medium text-zinc-950"
        >
          Описание
        </label>
        <textarea
          id="description"
          name="description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          maxLength={3000}
          rows={6}
          className="resize-y border border-zinc-300 px-3 py-2 text-zinc-950 outline-none focus:border-zinc-950"
        />
      </div>

      <div className="grid gap-2">
        <label
          htmlFor="requirementsText"
          className="text-sm font-medium text-zinc-950"
        >
          Требования
        </label>
        <textarea
          id="requirementsText"
          name="requirementsText"
          value={requirementsText}
          onChange={(event) => setRequirementsText(event.target.value)}
          maxLength={1500}
          rows={5}
          className="resize-y border border-zinc-300 px-3 py-2 text-zinc-950 outline-none focus:border-zinc-950"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="grid gap-2">
          <label
            htmlFor="capacity"
            className="text-sm font-medium text-zinc-950"
          >
            Количество мест
          </label>
          <input
            id="capacity"
            name="capacity"
            value={capacity}
            onChange={(event) => setCapacity(event.target.value)}
            type="number"
            min={1}
            max={10000}
            className="border border-zinc-300 px-3 py-2 text-zinc-950 outline-none focus:border-zinc-950"
          />
        </div>

        <div className="grid gap-2">
          <label
            htmlFor="priceText"
            className="text-sm font-medium text-zinc-950"
          >
            Цена
          </label>
          <input
            id="priceText"
            name="priceText"
            value={priceText}
            onChange={(event) => setPriceText(event.target.value)}
            maxLength={120}
            className="border border-zinc-300 px-3 py-2 text-zinc-950 outline-none focus:border-zinc-950"
          />
        </div>

        <div className="grid gap-2">
          <label
            htmlFor="levelText"
            className="text-sm font-medium text-zinc-950"
          >
            Уровень
          </label>
          <input
            id="levelText"
            name="levelText"
            value={levelText}
            onChange={(event) => setLevelText(event.target.value)}
            maxLength={120}
            className="border border-zinc-300 px-3 py-2 text-zinc-950 outline-none focus:border-zinc-950"
          />
        </div>
      </div>

      <div className="grid gap-2">
        <label
          htmlFor="coverImageUrl"
          className="text-sm font-medium text-zinc-950"
        >
          Ссылка на обложку
        </label>
        <input
          id="coverImageUrl"
          name="coverImageUrl"
          value={coverImageUrl}
          onChange={(event) => setCoverImageUrl(event.target.value)}
          type="url"
          className="border border-zinc-300 px-3 py-2 text-zinc-950 outline-none focus:border-zinc-950"
          placeholder="https://example.com/cover.jpg"
        />
      </div>

      {createEvent.error ? (
        <p className="text-sm text-red-700">{createEvent.error.message}</p>
      ) : null}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={createEvent.isPending}
          className="bg-zinc-950 px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:bg-zinc-400"
        >
          {createEvent.isPending ? "Создание..." : "Создать мероприятие"}
        </button>
        <Link
          href="/events"
          className="text-sm text-zinc-600 hover:text-zinc-950"
        >
          Отмена
        </Link>
      </div>
    </form>
  );
}
