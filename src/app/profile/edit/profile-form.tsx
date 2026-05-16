"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import {
  ImageUploadField,
  type ImageUploadValue,
} from "@/app/_components/image-upload-field";
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
  const [avatar, setAvatar] = useState<ImageUploadValue>({
    mediaId: profile?.avatarMediaId ?? null,
    url: profile?.avatarUrl ?? "",
  });
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [externalExperience, setExternalExperience] = useState(
    profile?.externalExperience ?? "",
  );
  const [selfReportedJumpCount, setSelfReportedJumpCount] = useState(
    profile?.selfReportedJumpCount?.toString() ?? "",
  );
  const [selfReportedMaxHeightMeters, setSelfReportedMaxHeightMeters] =
    useState(profile?.selfReportedMaxHeightMeters?.toString() ?? "");
  const [selfReportedExperience, setSelfReportedExperience] = useState(
    profile?.selfReportedExperience ?? "",
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
      avatarMediaId: avatar.mediaId,
      avatarUrl: avatar.url,
      bio,
      externalExperience,
      selfReportedJumpCount,
      selfReportedMaxHeightMeters,
      selfReportedExperience,
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 border border-zinc-200 bg-white p-6"
    >
      <div className="grid gap-2">
        <label htmlFor="username" className="text-sm font-medium text-zinc-950">
          Имя пользователя
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
          Латинские строчные буквы, цифры, подчеркивание и дефис. Открывает
          адрес /u/username.
        </p>
      </div>

      <div className="grid gap-2">
        <label
          htmlFor="displayName"
          className="text-sm font-medium text-zinc-950"
        >
          Отображаемое имя
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
          Город
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

      <div className="grid gap-3">
        <p className="text-sm font-medium text-zinc-950">Аватар</p>
        <ImageUploadField
          id="avatarUpload"
          value={avatar}
          onChange={setAvatar}
        />
      </div>

      <div className="grid gap-2">
        <label htmlFor="bio" className="text-sm font-medium text-zinc-950">
          О себе
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
          Опыт вне платформы
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

      <section className="grid gap-4 border-t border-zinc-200 pt-6">
        <div>
          <h2 className="text-base font-semibold text-zinc-950">
            Опыт в роупджампинге
          </h2>
          <p className="mt-1 text-sm leading-6 text-zinc-600">
            Эти данные заполняет сам пользователь. Они не подтверждаются
            автоматически и не влияют на бейджи.
          </p>
        </div>

        <div className="grid gap-2">
          <label
            htmlFor="selfReportedJumpCount"
            className="text-sm font-medium text-zinc-950"
          >
            Количество прыжков
          </label>
          <input
            id="selfReportedJumpCount"
            name="selfReportedJumpCount"
            type="number"
            value={selfReportedJumpCount}
            onChange={(event) => setSelfReportedJumpCount(event.target.value)}
            min={0}
            max={100000}
            step={1}
            className="border border-zinc-300 px-3 py-2 text-zinc-950 outline-none focus:border-zinc-950"
          />
          <p className="text-xs text-zinc-500">
            Можно указать примерное количество прыжков. Это не влияет на бейджи
            и заявки.
          </p>
        </div>

        <div className="grid gap-2">
          <label
            htmlFor="selfReportedMaxHeightMeters"
            className="text-sm font-medium text-zinc-950"
          >
            Максимальная высота, м
          </label>
          <input
            id="selfReportedMaxHeightMeters"
            name="selfReportedMaxHeightMeters"
            type="number"
            value={selfReportedMaxHeightMeters}
            onChange={(event) =>
              setSelfReportedMaxHeightMeters(event.target.value)
            }
            min={0}
            max={1000}
            step={1}
            className="border border-zinc-300 px-3 py-2 text-zinc-950 outline-none focus:border-zinc-950"
          />
          <p className="text-xs text-zinc-500">
            Укажите максимальную высоту объекта, с которого вы прыгали.
          </p>
        </div>

        <div className="grid gap-2">
          <label
            htmlFor="selfReportedExperience"
            className="text-sm font-medium text-zinc-950"
          >
            Описание опыта
          </label>
          <textarea
            id="selfReportedExperience"
            name="selfReportedExperience"
            value={selfReportedExperience}
            onChange={(event) => setSelfReportedExperience(event.target.value)}
            maxLength={1000}
            rows={4}
            placeholder="Например: прыгаю с 2015 года, был на мостах 30–100 м, участвовал в выездах с разными командами."
            className="resize-y border border-zinc-300 px-3 py-2 text-zinc-950 outline-none focus:border-zinc-950"
          />
        </div>
      </section>

      {upsertProfile.error ? (
        <p className="text-sm text-red-700">{upsertProfile.error.message}</p>
      ) : null}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={upsertProfile.isPending}
          className="bg-zinc-950 px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:bg-zinc-400"
        >
          {upsertProfile.isPending ? "Сохранение..." : "Сохранить профиль"}
        </button>
        <Link
          href="/profile"
          className="text-sm text-zinc-600 hover:text-zinc-950"
        >
          Отмена
        </Link>
      </div>
    </form>
  );
}
