"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { api, type RouterOutputs } from "@/trpc/react";

type TeamForSettings = NonNullable<RouterOutputs["team"]["getForSettings"]>;

type TeamSettingsFormProps = {
  team: TeamForSettings;
};

export function TeamSettingsForm({ team }: TeamSettingsFormProps) {
  const router = useRouter();
  const [name, setName] = useState(team.name);
  const [region, setRegion] = useState(team.region ?? "");
  const [logoUrl, setLogoUrl] = useState(team.logoUrl ?? "");
  const [description, setDescription] = useState(team.description ?? "");
  const [saved, setSaved] = useState(false);

  const updateTeam = api.team.update.useMutation({
    onSuccess: () => {
      setSaved(true);
      router.refresh();
    },
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaved(false);

    updateTeam.mutate({
      slug: team.slug,
      name,
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
        <label htmlFor="slug" className="text-sm font-medium text-zinc-950">
          Slug
        </label>
        <input
          id="slug"
          name="slug"
          value={team.slug}
          disabled
          className="border border-zinc-200 bg-zinc-50 px-3 py-2 text-zinc-500"
        />
      </div>

      <div className="grid gap-2">
        <label htmlFor="name" className="text-sm font-medium text-zinc-950">
          Team name
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
        <label htmlFor="region" className="text-sm font-medium text-zinc-950">
          Region
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
        <label htmlFor="logoUrl" className="text-sm font-medium text-zinc-950">
          Logo URL
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
          Description
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

      {updateTeam.error ? (
        <p className="text-sm text-red-700">{updateTeam.error.message}</p>
      ) : null}
      {saved ? <p className="text-sm text-emerald-700">Saved.</p> : null}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={updateTeam.isPending}
          className="bg-zinc-950 px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:bg-zinc-400"
        >
          {updateTeam.isPending ? "Saving..." : "Save settings"}
        </button>
        <Link
          href={`/teams/${team.slug}`}
          className="text-sm text-zinc-600 hover:text-zinc-950"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
