"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { ImageUploadField } from "@/app/_components/image-upload-field";
import { api } from "@/trpc/react";

export function TeamCreateForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [region, setRegion] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [description, setDescription] = useState("");

  const createTeam = api.team.create.useMutation({
    onSuccess: (team) => {
      router.push(`/teams/${team.slug}`);
      router.refresh();
    },
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    createTeam.mutate({
      name,
      slug,
      region,
      logoUrl,
      description,
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 border border-zinc-200 bg-white p-6"
    >
      <div className="grid gap-2">
        <label htmlFor="name" className="text-sm font-medium text-zinc-950">
          Название команды
        </label>
        <input
          id="name"
          name="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
          minLength={2}
          maxLength={80}
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
          maxLength={40}
          pattern="[a-z0-9-]*"
          className="border border-zinc-300 px-3 py-2 text-zinc-950 outline-none focus:border-zinc-950"
          placeholder="team-name"
        />
        <p className="text-xs text-zinc-500">
          Латинские строчные буквы, цифры и дефисы. Это поле пока нельзя изменить.
        </p>
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

      <div className="grid gap-3">
        <p className="text-sm font-medium text-zinc-950">Логотип команды</p>
        <ImageUploadField
          id="teamCreateLogoUpload"
          value={logoUrl}
          onChange={setLogoUrl}
        />
      </div>

      <div className="grid gap-2">
        <label htmlFor="logoUrl" className="text-sm font-medium text-zinc-950">
          Ссылка на логотип вручную
        </label>
        <input
          id="logoUrl"
          name="logoUrl"
          value={logoUrl}
          onChange={(event) => setLogoUrl(event.target.value)}
          type="url"
          className="border border-zinc-300 px-3 py-2 text-zinc-950 outline-none focus:border-zinc-950"
          placeholder="https://example.com/logo.jpg"
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
          maxLength={1000}
          rows={6}
          className="resize-y border border-zinc-300 px-3 py-2 text-zinc-950 outline-none focus:border-zinc-950"
        />
      </div>

      {createTeam.error ? (
        <p className="text-sm text-red-700">{createTeam.error.message}</p>
      ) : null}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={createTeam.isPending}
          className="bg-zinc-950 px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:bg-zinc-400"
        >
          {createTeam.isPending ? "Создание..." : "Создать команду"}
        </button>
        <Link
          href="/teams"
          className="text-sm text-zinc-600 hover:text-zinc-950"
        >
          Отмена
        </Link>
      </div>
    </form>
  );
}
