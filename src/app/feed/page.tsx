import Link from "next/link";

import { getCurrentUser } from "@/server/auth/session";
import { api } from "@/trpc/server";

import { PostCard } from "./_components/post-card";

export default async function FeedPage() {
  const user = await getCurrentUser();
  const posts = await api.post.listPublic();

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-zinc-50">
      <div className="mx-auto w-full max-w-3xl px-6 py-10">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">
              Лента
            </h1>
            <p className="mt-2 text-sm text-zinc-600">
              Простая хронологическая лента сообщества.
            </p>
          </div>
          <Link
            href="/feed/new"
            className="border border-zinc-300 px-4 py-2 text-sm text-zinc-800 hover:border-zinc-950"
          >
            Создать пост
          </Link>
        </div>

        {posts.length > 0 ? (
          <div className="grid gap-4">
            {posts.map((post) => (
              <PostCard key={post.id} isLoggedIn={Boolean(user)} post={post} />
            ))}
          </div>
        ) : (
          <section className="border border-zinc-200 bg-white p-6">
            <h2 className="text-xl font-semibold text-zinc-950">
              Пока нет постов
            </h2>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              Первые публикации появятся здесь после создания участниками.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
