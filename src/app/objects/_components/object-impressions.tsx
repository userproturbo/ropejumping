"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { api, type RouterOutputs } from "@/trpc/react";

type ObjectDetail = NonNullable<RouterOutputs["object"]["getBySlug"]>;
type ObjectImpression = ObjectDetail["impressions"][number];

type ObjectImpressionsProps = {
  objectId: string;
  objectName: string;
  impressions: ObjectImpression[];
  myImpression: ObjectImpression | null;
  impressionsCount: number;
  isAuthenticated: boolean;
};

const safetyText =
  "Не публикуйте точные координаты, точки крепления, маршруты доступа и технические детали организации прыжков.";

export function ObjectImpressions({
  objectId,
  objectName,
  impressions,
  myImpression,
  impressionsCount,
  isAuthenticated,
}: ObjectImpressionsProps) {
  const router = useRouter();
  const [body, setBody] = useState(myImpression?.body ?? "");
  const [isEditing, setIsEditing] = useState(!myImpression);
  const createImpression = api.objectImpression.create.useMutation({
    onSuccess: () => {
      router.refresh();
      setIsEditing(false);
    },
  });
  const updateImpression = api.objectImpression.update.useMutation({
    onSuccess: () => {
      router.refresh();
      setIsEditing(false);
    },
  });
  const deleteImpression = api.objectImpression.deleteMine.useMutation({
    onSuccess: () => {
      setBody("");
      router.refresh();
    },
  });
  const error =
    createImpression.error ?? updateImpression.error ?? deleteImpression.error;
  const isPending =
    createImpression.isPending ||
    updateImpression.isPending ||
    deleteImpression.isPending;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (myImpression) {
      updateImpression.mutate({
        impressionId: myImpression.id,
        body,
      });
      return;
    }

    createImpression.mutate({
      objectId,
      body,
    });
  };

  return (
    <section className="mt-6 border border-zinc-200 bg-white p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-zinc-950">
            Впечатления об объекте
          </h2>
          <p className="mt-2 text-sm text-zinc-600">
            {impressionsCount} всего
          </p>
        </div>
        {!isAuthenticated ? (
          <Link
            href="/api/auth/signin"
            className="border border-zinc-300 px-4 py-2 text-sm text-zinc-800 hover:border-zinc-950"
          >
            Войдите, чтобы оставить впечатление
          </Link>
        ) : null}
      </div>

      {isAuthenticated ? (
        <div className="mt-6 border border-zinc-200 p-4">
          {myImpression && !isEditing ? (
            <div>
              <p className="text-sm font-medium text-zinc-950">
                Ваше впечатление
              </p>
              <p className="mt-3 text-sm leading-6 whitespace-pre-wrap text-zinc-600">
                {myImpression.body}
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="border border-zinc-300 px-4 py-2 text-sm text-zinc-800 hover:border-zinc-950"
                >
                  Редактировать
                </button>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() =>
                    deleteImpression.mutate({
                      impressionId: myImpression.id,
                    })
                  }
                  className="border border-zinc-300 px-4 py-2 text-sm text-zinc-800 hover:border-zinc-950 disabled:cursor-not-allowed disabled:text-zinc-400"
                >
                  Удалить
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="grid gap-3">
              <label
                htmlFor="objectImpressionBody"
                className="text-sm font-medium text-zinc-950"
              >
                {myImpression ? "Редактировать впечатление" : "Оставить впечатление"}
              </label>
              <textarea
                id="objectImpressionBody"
                value={body}
                onChange={(event) => setBody(event.target.value)}
                minLength={20}
                maxLength={2000}
                rows={6}
                className="resize-y border border-zinc-300 px-3 py-2 text-sm text-zinc-950 outline-none focus:border-zinc-950"
                placeholder={`Расскажите, каким вам запомнился объект «${objectName}».`}
              />
              <p className="text-xs leading-5 text-zinc-500">
                Расскажите об общих впечатлениях: атмосфера, вид, удобство для
                зрителей, что стоит учесть участникам.
              </p>
              <p className="text-xs leading-5 text-amber-800">{safetyText}</p>
              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={isPending}
                  className="bg-zinc-950 px-4 py-2 text-sm text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
                >
                  {myImpression ? "Сохранить" : "Оставить впечатление"}
                </button>
                {myImpression ? (
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => {
                      setBody(myImpression.body);
                      setIsEditing(false);
                    }}
                    className="border border-zinc-300 px-4 py-2 text-sm text-zinc-800 hover:border-zinc-950 disabled:cursor-not-allowed disabled:text-zinc-400"
                  >
                    Отмена
                  </button>
                ) : null}
              </div>
            </form>
          )}
          {error ? <p className="mt-3 text-sm text-red-700">{error.message}</p> : null}
        </div>
      ) : null}

      {impressions.length > 0 ? (
        <div className="mt-6 grid gap-4">
          {impressions.map((impression) => (
            <article key={impression.id} className="border border-zinc-200 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  {impression.author.profile?.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={impression.author.profile.avatarUrl}
                      alt={
                        impression.author.profile.avatarMedia?.alt ??
                        impression.author.profile.displayName ??
                        impression.author.profile.username ??
                        "Аватар пользователя"
                      }
                      className="h-10 w-10 border border-zinc-200 object-cover"
                    />
                  ) : null}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-zinc-950">
                      {getAuthorName(impression)}
                    </p>
                    {impression.author.profile?.username ? (
                      <Link
                        href={`/u/${impression.author.profile.username}`}
                        className="text-sm text-zinc-500 hover:text-zinc-950"
                      >
                        @{impression.author.profile.username}
                      </Link>
                    ) : null}
                  </div>
                </div>
                <p className="text-xs text-zinc-500">
                  {formatImpressionDate(impression.createdAt)}
                  {impression.editedAt ? " · отредактировано" : ""}
                </p>
              </div>
              <p className="mt-3 text-sm leading-6 whitespace-pre-wrap text-zinc-600">
                {impression.body}
              </p>
            </article>
          ))}
        </div>
      ) : (
        <p className="mt-5 text-sm text-zinc-600">
          Пока нет впечатлений об этом объекте.
        </p>
      )}
    </section>
  );
}

const getAuthorName = (impression: ObjectImpression) =>
  impression.author.profile?.displayName ??
  impression.author.profile?.username ??
  "Участник";

const formatImpressionDate = (date: Date) =>
  new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
  }).format(date);
