import Link from "next/link";

import { requireCurrentUser } from "@/server/auth/session";
import { api } from "@/trpc/server";

export default async function ProfilePage() {
  await requireCurrentUser("/profile");

  const profile = await api.profile.getMine();

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-zinc-50">
      <div className="mx-auto w-full max-w-3xl px-6 py-10">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">
              Your profile
            </h1>
            <p className="mt-2 text-sm text-zinc-600">
              Basic information shown on your public profile.
            </p>
          </div>
          <Link
            href="/profile/edit"
            className="border border-zinc-300 px-4 py-2 text-sm text-zinc-800 hover:border-zinc-950"
          >
            {profile ? "Edit" : "Create"}
          </Link>
        </div>

        {profile ? (
          <section className="space-y-6 border border-zinc-200 bg-white p-6">
            <div className="flex items-start gap-4">
              {profile.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatarUrl}
                  alt=""
                  className="h-20 w-20 border border-zinc-200 object-cover"
                />
              ) : null}
              <div>
                <h2 className="text-2xl font-semibold text-zinc-950">
                  {profile.displayName ?? profile.username ?? "Unnamed profile"}
                </h2>
                {profile.username ? (
                  <Link
                    href={`/u/${profile.username}`}
                    className="text-sm text-zinc-500 hover:text-zinc-950"
                  >
                    @{profile.username}
                  </Link>
                ) : (
                  <p className="text-sm text-zinc-500">
                    Add a username to enable a public profile URL.
                  </p>
                )}
              </div>
            </div>

            <dl className="grid gap-5 text-sm">
              <div>
                <dt className="font-medium text-zinc-950">City</dt>
                <dd className="mt-1 whitespace-pre-wrap text-zinc-600">
                  {profile.city ?? "Not set"}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-zinc-950">Bio</dt>
                <dd className="mt-1 whitespace-pre-wrap text-zinc-600">
                  {profile.bio ?? "Not set"}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-zinc-950">
                  External experience
                </dt>
                <dd className="mt-1 whitespace-pre-wrap text-zinc-600">
                  {profile.externalExperience ?? "Not set"}
                </dd>
              </div>
            </dl>
          </section>
        ) : (
          <section className="border border-zinc-200 bg-white p-6">
            <h2 className="text-xl font-semibold text-zinc-950">
              No profile yet
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-600">
              Create a basic profile with a username, display name, city, bio,
              and external ropejumping experience.
            </p>
            <Link
              href="/profile/edit"
              className="mt-5 inline-flex border border-zinc-300 px-4 py-2 text-sm text-zinc-800 hover:border-zinc-950"
            >
              Create profile
            </Link>
          </section>
        )}
      </div>
    </main>
  );
}
