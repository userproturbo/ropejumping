"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { api, type RouterOutputs } from "@/trpc/react";

type Profile = RouterOutputs["profile"]["getMine"];

type ProfileFormProps = {
  profile: Profile;
};

export function ProfileForm({ profile }: ProfileFormProps) {
  const router = useRouter();
  const [username, setUsername] = useState(profile?.username ?? "");
  const [displayName, setDisplayName] = useState(profile?.displayName ?? "");
  const [city, setCity] = useState(profile?.city ?? "");
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatarUrl ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [externalExperience, setExternalExperience] = useState(
    profile?.externalExperience ?? "",
  );

  const upsertProfile = api.profile.upsertMine.useMutation({
    onSuccess: () => {
      router.push("/profile");
      router.refresh();
    },
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    upsertProfile.mutate({
      username,
      displayName,
      city,
      avatarUrl,
      bio,
      externalExperience,
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 border border-zinc-200 bg-white p-6"
    >
      <div className="grid gap-2">
        <label htmlFor="username" className="text-sm font-medium text-zinc-950">
          Username
        </label>
        <input
          id="username"
          name="username"
          value={username}
          onChange={(event) => setUsername(event.target.value.toLowerCase())}
          minLength={3}
          maxLength={32}
          pattern="[a-z0-9_-]*"
          className="border border-zinc-300 px-3 py-2 text-zinc-950 outline-none focus:border-zinc-950"
          placeholder="lowercase-name"
        />
        <p className="text-xs text-zinc-500">
          Lowercase letters, numbers, underscore, and dash. Enables /u/username.
        </p>
      </div>

      <div className="grid gap-2">
        <label
          htmlFor="displayName"
          className="text-sm font-medium text-zinc-950"
        >
          Display name
        </label>
        <input
          id="displayName"
          name="displayName"
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          maxLength={80}
          className="border border-zinc-300 px-3 py-2 text-zinc-950 outline-none focus:border-zinc-950"
        />
      </div>

      <div className="grid gap-2">
        <label htmlFor="city" className="text-sm font-medium text-zinc-950">
          City
        </label>
        <input
          id="city"
          name="city"
          value={city}
          onChange={(event) => setCity(event.target.value)}
          maxLength={80}
          className="border border-zinc-300 px-3 py-2 text-zinc-950 outline-none focus:border-zinc-950"
        />
      </div>

      <div className="grid gap-2">
        <label
          htmlFor="avatarUrl"
          className="text-sm font-medium text-zinc-950"
        >
          Avatar URL
        </label>
        <input
          id="avatarUrl"
          name="avatarUrl"
          value={avatarUrl}
          onChange={(event) => setAvatarUrl(event.target.value)}
          type="url"
          className="border border-zinc-300 px-3 py-2 text-zinc-950 outline-none focus:border-zinc-950"
          placeholder="https://example.com/avatar.jpg"
        />
      </div>

      <div className="grid gap-2">
        <label htmlFor="bio" className="text-sm font-medium text-zinc-950">
          Bio
        </label>
        <textarea
          id="bio"
          name="bio"
          value={bio}
          onChange={(event) => setBio(event.target.value)}
          maxLength={500}
          rows={5}
          className="resize-y border border-zinc-300 px-3 py-2 text-zinc-950 outline-none focus:border-zinc-950"
        />
      </div>

      <div className="grid gap-2">
        <label
          htmlFor="externalExperience"
          className="text-sm font-medium text-zinc-950"
        >
          External experience
        </label>
        <textarea
          id="externalExperience"
          name="externalExperience"
          value={externalExperience}
          onChange={(event) => setExternalExperience(event.target.value)}
          maxLength={1000}
          rows={6}
          className="resize-y border border-zinc-300 px-3 py-2 text-zinc-950 outline-none focus:border-zinc-950"
        />
      </div>

      {upsertProfile.error ? (
        <p className="text-sm text-red-700">{upsertProfile.error.message}</p>
      ) : null}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={upsertProfile.isPending}
          className="bg-zinc-950 px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:bg-zinc-400"
        >
          {upsertProfile.isPending ? "Saving..." : "Save profile"}
        </button>
        <Link
          href="/profile"
          className="text-sm text-zinc-600 hover:text-zinc-950"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
