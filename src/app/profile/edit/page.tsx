import { requireCurrentUser } from "@/server/auth/session";
import { api } from "@/trpc/server";

import { ProfileForm } from "./profile-form";

export default async function EditProfilePage() {
  await requireCurrentUser("/profile/edit");

  const profile = await api.profile.getMine();

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-zinc-50">
      <div className="mx-auto w-full max-w-3xl px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">
            {profile ? "Edit profile" : "Create profile"}
          </h1>
          <p className="mt-2 text-sm text-zinc-600">
            Keep this simple for now. Avatar upload is not implemented yet.
          </p>
        </div>

        <ProfileForm profile={profile} />
      </div>
    </main>
  );
}
