"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { api, type RouterOutputs } from "@/trpc/react";

import {
  datetimeLocalToIso,
  toDatetimeLocalValue,
} from "../../_components/date-format";

type EventForEdit = NonNullable<RouterOutputs["event"]["getForEdit"]>;
type ObjectOption = RouterOutputs["object"]["listPublic"][number];

type EventEditFormProps = {
  event: EventForEdit;
  objects: ObjectOption[];
};

const getObjectOptionLabel = (object: ObjectOption) => {
  const details = [object.heightMeters ? `${object.heightMeters} м` : null, object.region]
    .filter(Boolean)
    .join(", ");

  return details ? `${object.name} (${details})` : object.name;
};

export function EventEditForm({ event, objects }: EventEditFormProps) {
  const router = useRouter();
  const [objectId, setObjectId] = useState(event.objectId ?? "");
  const [title, setTitle] = useState(event.title);
  const [description, setDescription] = useState(event.description ?? "");
  const [requirementsText, setRequirementsText] = useState(
    event.requirementsText ?? "",
  );
  const [region, setRegion] = useState(event.region ?? "");
  const [startsAt, setStartsAt] = useState(
    toDatetimeLocalValue(event.startsAt),
  );
  const [endsAt, setEndsAt] = useState(toDatetimeLocalValue(event.endsAt));
  const [capacity, setCapacity] = useState(event.capacity?.toString() ?? "");
  const [priceText, setPriceText] = useState(event.priceText ?? "");
  const [levelText, setLevelText] = useState(event.levelText ?? "");
  const [coverImageUrl, setCoverImageUrl] = useState(
    event.coverImageUrl ?? "",
  );
  const [saved, setSaved] = useState(false);

  const updateEvent = api.event.update.useMutation({
    onSuccess: () => {
      setSaved(true);
      router.refresh();
    },
  });

  const handleSubmit = (submitEvent: FormEvent<HTMLFormElement>) => {
    submitEvent.preventDefault();
    setSaved(false);

    updateEvent.mutate({
      slug: event.slug,
      objectId,
      title,
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
        <label htmlFor="team" className="text-sm font-medium text-zinc-950">
          Команда
        </label>
        <input
          id="team"
          name="team"
          value={event.team.name}
          disabled
          className="border border-zinc-200 bg-zinc-50 px-3 py-2 text-zinc-500"
        />
      </div>

      <div className="grid gap-2">
        <label htmlFor="slug" className="text-sm font-medium text-zinc-950">
          Slug
        </label>
        <input
          id="slug"
          name="slug"
          value={event.slug}
          disabled
          className="border border-zinc-200 bg-zinc-50 px-3 py-2 text-zinc-500"
        />
      </div>

      <div className="grid gap-2">
        <label htmlFor="objectId" className="text-sm font-medium text-zinc-950">
          Объект
        </label>
        <select
          id="objectId"
          name="objectId"
          value={objectId}
          onChange={(inputEvent) => setObjectId(inputEvent.target.value)}
          className="border border-zinc-300 px-3 py-2 text-zinc-950 outline-none focus:border-zinc-950"
        >
          <option value="">Без объекта</option>
          {objects.map((object) => (
            <option key={object.id} value={object.id}>
              {getObjectOptionLabel(object)}
            </option>
          ))}
        </select>
        <p className="text-xs text-zinc-500">
          Нужно добавить объект?{" "}
          <Link href="/objects/new" className="text-zinc-800 hover:text-zinc-950">
            Создать объект
          </Link>
        </p>
      </div>

      <div className="grid gap-2">
        <label htmlFor="title" className="text-sm font-medium text-zinc-950">
          Название
        </label>
        <input
          id="title"
          name="title"
          value={title}
          onChange={(inputEvent) => setTitle(inputEvent.target.value)}
          required
          minLength={3}
          maxLength={120}
          className="border border-zinc-300 px-3 py-2 text-zinc-950 outline-none focus:border-zinc-950"
        />
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
            onChange={(inputEvent) => setStartsAt(inputEvent.target.value)}
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
            onChange={(inputEvent) => setEndsAt(inputEvent.target.value)}
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
          onChange={(inputEvent) => setRegion(inputEvent.target.value)}
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
          onChange={(inputEvent) => setDescription(inputEvent.target.value)}
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
          onChange={(inputEvent) =>
            setRequirementsText(inputEvent.target.value)
          }
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
            onChange={(inputEvent) => setCapacity(inputEvent.target.value)}
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
            onChange={(inputEvent) => setPriceText(inputEvent.target.value)}
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
            onChange={(inputEvent) => setLevelText(inputEvent.target.value)}
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
          onChange={(inputEvent) => setCoverImageUrl(inputEvent.target.value)}
          type="url"
          className="border border-zinc-300 px-3 py-2 text-zinc-950 outline-none focus:border-zinc-950"
          placeholder="https://example.com/cover.jpg"
        />
      </div>

      {updateEvent.error ? (
        <p className="text-sm text-red-700">{updateEvent.error.message}</p>
      ) : null}
      {saved ? <p className="text-sm text-emerald-700">Сохранено.</p> : null}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={updateEvent.isPending}
          className="bg-zinc-950 px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:bg-zinc-400"
        >
          {updateEvent.isPending ? "Сохранение..." : "Сохранить мероприятие"}
        </button>
        <Link
          href={`/events/${event.slug}`}
          className="text-sm text-zinc-600 hover:text-zinc-950"
        >
          Отмена
        </Link>
      </div>
    </form>
  );
}
