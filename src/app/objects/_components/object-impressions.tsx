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
  const [reportedImpressionIds, setReportedImpressionIds] = useState<
    Set<string>
  >(new Set());
  const reportImpression = api.report.create.useMutation({
    onSuccess: (_report, variables) => {
      setReportedImpressionIds((current) => {
        const next = new Set(current);
        next.add(variables.targetId);
        return next;
      });
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
    <section className="mt-6 border border-[rgba(199,217,136,0.25)] bg-[#10150e] p-4 text-[#d7dcc5] sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-[#e9eddc]">
            Впечатления об объекте
          </h2>
          <p className="mt-2 text-sm text-[#aab497]">
            {impressionsCount} всего
          </p>
        </div>
        {!isAuthenticated ? (
          <Link
            href="/login"
            className="border border-[rgba(199,217,136,0.3)] px-4 py-2 text-sm text-[#e9eddc] hover:border-[rgba(199,217,136,0.65)] hover:text-[#c7d988]"
          >
            Войдите, чтобы оставить впечатление
          </Link>
        ) : null}
      </div>

      {isAuthenticated ? (
        <div className="mt-6 border border-[rgba(199,217,136,0.22)] bg-[rgba(255,255,255,0.04)] p-4">
          {myImpression && !isEditing ? (
            <div>
              <p className="text-sm font-medium text-[#e9eddc]">
                Ваше впечатление
              </p>
              <p className="mt-3 text-sm leading-6 whitespace-pre-wrap text-[#d7dcc5]">
                {myImpression.body}
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="border border-[rgba(199,217,136,0.3)] px-4 py-2 text-sm text-[#e9eddc] hover:border-[rgba(199,217,136,0.65)] hover:text-[#c7d988]"
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
                  className="border border-[rgba(199,217,136,0.3)] px-4 py-2 text-sm text-[#e9eddc] hover:border-[rgba(199,217,136,0.65)] hover:text-[#c7d988] disabled:cursor-not-allowed disabled:text-[#aab497]"
                >
                  Удалить
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="grid gap-3">
              <label
                htmlFor="objectImpressionBody"
                className="text-sm font-medium text-[#c7d988]"
              >
                {myImpression
                  ? "Редактировать впечатление"
                  : "Оставить впечатление"}
              </label>
              <textarea
                id="objectImpressionBody"
                value={body}
                onChange={(event) => setBody(event.target.value)}
                minLength={20}
                maxLength={2000}
                rows={6}
                className="resize-y border border-[rgba(199,217,136,0.3)] bg-[#151a12] px-3 py-2 text-sm text-[#e9eddc] outline-none placeholder:text-[#5f6f38] focus:border-[rgba(199,217,136,0.65)]"
                placeholder={`Расскажите, каким вам запомнился объект «${objectName}».`}
              />
              <p className="text-xs leading-5 text-[#aab497]">
                Расскажите об общих впечатлениях: атмосфера, вид, удобство для
                зрителей, что стоит учесть участникам.
              </p>
              <p className="text-xs leading-5 text-[#c7d988]">{safetyText}</p>
              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={isPending}
                  className="border border-[rgba(199,217,136,0.3)] px-4 py-2 text-sm text-[#e9eddc] hover:border-[rgba(199,217,136,0.65)] hover:text-[#c7d988] disabled:cursor-not-allowed disabled:text-[#aab497]"
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
                    className="border border-[rgba(199,217,136,0.3)] px-4 py-2 text-sm text-[#e9eddc] hover:border-[rgba(199,217,136,0.65)] hover:text-[#c7d988] disabled:cursor-not-allowed disabled:text-[#aab497]"
                  >
                    Отмена
                  </button>
                ) : null}
              </div>
            </form>
          )}
          {error ? (
            <p className="mt-3 text-sm text-red-300">{error.message}</p>
          ) : null}
        </div>
      ) : null}

      {impressions.length > 0 ? (
        <div className="mt-6 grid gap-4">
          {impressions.map((impression) => (
            <article
              key={impression.id}
              className="border border-[rgba(199,217,136,0.22)] bg-[rgba(255,255,255,0.04)] p-4"
            >
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
                      className="h-10 w-10 border border-[rgba(199,217,136,0.28)] object-cover"
                    />
                  ) : null}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[#e9eddc]">
                      {getAuthorName(impression)}
                    </p>
                    {impression.author.profile?.username ? (
                      <Link
                        href={`/u/${impression.author.profile.username}`}
                        className="text-sm text-[#aab497] hover:text-[#c7d988]"
                      >
                        @{impression.author.profile.username}
                      </Link>
                    ) : null}
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-3">
                  <p className="text-xs text-[#aab497]">
                    {formatImpressionDate(impression.createdAt)}
                    {impression.editedAt ? " · отредактировано" : ""}
                  </p>
                  {isAuthenticated &&
                  impression.authorId !== myImpression?.authorId ? (
                    <button
                      type="button"
                      disabled={
                        reportImpression.isPending ||
                        reportedImpressionIds.has(impression.id)
                      }
                      onClick={() =>
                        reportImpression.mutate({
                          targetType: "OBJECT_IMPRESSION",
                          targetId: impression.id,
                          reason:
                            "Нарушение правил безопасности или сообщества",
                          details: null,
                        })
                      }
                      className="text-xs text-[#aab497] hover:text-[#c7d988] disabled:cursor-not-allowed disabled:text-[#5f6f38]"
                    >
                      {reportedImpressionIds.has(impression.id)
                        ? "Жалоба отправлена"
                        : "Пожаловаться"}
                    </button>
                  ) : null}
                </div>
              </div>
              <p className="mt-3 text-sm leading-6 whitespace-pre-wrap text-[#d7dcc5]">
                {impression.body}
              </p>
            </article>
          ))}
          {reportImpression.error ? (
            <p className="text-sm text-red-300">
              {reportImpression.error.message}
            </p>
          ) : null}
        </div>
      ) : (
        <p className="mt-5 border border-[rgba(199,217,136,0.22)] bg-[rgba(255,255,255,0.04)] p-4 text-sm text-[#d7dcc5]">
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
