"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { ObjectType } from "@/generated/prisma/enums";
import { getObjectTypeLabel } from "@/lib/display";
import { api, type RouterOutputs } from "@/trpc/react";

type ObjectForEdit = RouterOutputs["object"]["getForEdit"];
type ManageableTeam = RouterOutputs["team"]["getMine"][number];

type ObjectFormProps = {
  object?: ObjectForEdit;
  teams?: ManageableTeam[];
};

const objectTypes = Object.values(ObjectType);

export function ObjectForm({ object, teams = [] }: ObjectFormProps) {
  const router = useRouter();
  const [teamId, setTeamId] = useState(object?.createdByTeamId ?? teams[0]?.id ?? "");
  const [name, setName] = useState(object?.name ?? "");
  const [slug, setSlug] = useState(object?.slug ?? "");
  const [type, setType] = useState<ObjectType>(object?.type ?? ObjectType.BRIDGE);
  const [heightMeters, setHeightMeters] = useState(
    object?.heightMeters?.toString() ?? "",
  );
  const [region, setRegion] = useState(object?.region ?? "");
  const [description, setDescription] = useState(object?.description ?? "");
  const [coverImageUrl, setCoverImageUrl] = useState(
    object?.coverImageUrl ?? "",
  );
  const [saved, setSaved] = useState(false);

  const createObject = api.object.create.useMutation({
    onSuccess: (createdObject) => {
      router.push(`/objects/${createdObject.slug}`);
      router.refresh();
    },
  });
  const updateObject = api.object.update.useMutation({
    onSuccess: () => {
      setSaved(true);
      router.refresh();
    },
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaved(false);

    const objectPayload = {
      name,
      slug,
      type,
      heightMeters,
      region,
      description,
      coverImageUrl,
    };

    if (object) {
      updateObject.mutate(objectPayload);
      return;
    }

    createObject.mutate({
      ...objectPayload,
      teamId,
    });
  };

  const isPending = createObject.isPending || updateObject.isPending;
  const error = createObject.error ?? updateObject.error;

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 border border-zinc-200 bg-white p-6"
    >
      <p className="border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
        Не публикуйте точные координаты, способы доступа, точки крепления и
        технические детали. Объект должен описываться безопасно и в общих
        чертах.
      </p>

      <div className="grid gap-2">
        <label htmlFor="teamId" className="text-sm font-medium text-zinc-950">
          Команда
        </label>
        {object ? (
          <input
            id="teamId"
            name="teamId"
            value={object.createdByTeam?.name ?? "Не указана"}
            disabled
            className="border border-zinc-200 bg-zinc-50 px-3 py-2 text-zinc-500"
          />
        ) : (
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
        )}
      </div>

      <div className="grid gap-2">
        <label htmlFor="name" className="text-sm font-medium text-zinc-950">
          Название
        </label>
        <input
          id="name"
          name="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
          minLength={2}
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
          disabled={Boolean(object)}
          required
          minLength={3}
          maxLength={80}
          pattern="[a-z0-9-]*"
          className="border border-zinc-300 px-3 py-2 text-zinc-950 outline-none focus:border-zinc-950 disabled:border-zinc-200 disabled:bg-zinc-50 disabled:text-zinc-500"
          placeholder="object-name"
        />
        <p className="text-xs text-zinc-500">
          Латинские строчные буквы, цифры и дефисы. Это поле нельзя изменить
          после создания.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <label htmlFor="type" className="text-sm font-medium text-zinc-950">
            Тип
          </label>
          <select
            id="type"
            name="type"
            value={type}
            onChange={(event) => setType(event.target.value as ObjectType)}
            required
            className="border border-zinc-300 px-3 py-2 text-zinc-950 outline-none focus:border-zinc-950"
          >
            {objectTypes.map((objectType) => (
              <option key={objectType} value={objectType}>
                {getObjectTypeLabel(objectType)}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-2">
          <label
            htmlFor="heightMeters"
            className="text-sm font-medium text-zinc-950"
          >
            Высота, м
          </label>
          <input
            id="heightMeters"
            name="heightMeters"
            value={heightMeters}
            onChange={(event) => setHeightMeters(event.target.value)}
            type="number"
            min={1}
            max={10000}
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
          maxLength={2000}
          rows={6}
          className="resize-y border border-zinc-300 px-3 py-2 text-zinc-950 outline-none focus:border-zinc-950"
        />
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

      {error ? <p className="text-sm text-red-700">{error.message}</p> : null}
      {saved ? <p className="text-sm text-emerald-700">Сохранено.</p> : null}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="bg-zinc-950 px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:bg-zinc-400"
        >
          {isPending
            ? "Сохранение..."
            : object
              ? "Сохранить объект"
              : "Создать объект"}
        </button>
        <Link
          href={object ? `/objects/${object.slug}` : "/objects"}
          className="text-sm text-zinc-600 hover:text-zinc-950"
        >
          Отмена
        </Link>
      </div>
    </form>
  );
}
