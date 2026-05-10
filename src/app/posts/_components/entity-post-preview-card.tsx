import Link from "next/link";

type EntityPostPreviewCardProps = {
  isPinned: boolean;
  post: {
    id: string;
    content: string;
    imageUrl: string | null;
    createdAt: Date;
    author: {
      name: string | null;
      image: string | null;
      profile: {
        username: string | null;
        displayName: string | null;
        avatarUrl: string | null;
      } | null;
    };
    team?: {
      name: string;
    } | null;
    event?: {
      title: string;
    } | null;
    object?: {
      name: string;
    } | null;
    _count: {
      likes: number;
      comments: number;
    };
  };
  showLinkedEntities?: boolean;
};

const formatPostDate = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const getPostPreview = (content: string) => {
  const normalizedContent = content.trim();

  return normalizedContent.length > 240
    ? `${normalizedContent.slice(0, 240)}...`
    : normalizedContent;
};

export const EntityPostPreviewCard = ({
  isPinned,
  post,
  showLinkedEntities = true,
}: EntityPostPreviewCardProps) => {
  const profile = post.author.profile;
  const authorDisplayName =
    profile?.displayName ??
    profile?.username ??
    post.author.name ??
    "Участник без имени";

  return (
    <Link
      href={`/posts/${post.id}`}
      className="block border border-zinc-200 p-4 hover:border-zinc-950"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium text-zinc-950">
              {authorDisplayName}
            </p>
            {isPinned ? (
              <span className="border border-amber-200 px-2 py-1 text-xs text-amber-800">
                Закреплено
              </span>
            ) : null}
          </div>
          <div className="mt-1 flex flex-wrap gap-2 text-xs text-zinc-500">
            {profile?.username ? <span>@{profile.username}</span> : null}
            <span>{formatPostDate.format(post.createdAt)}</span>
          </div>
        </div>
        <span className="text-xs text-zinc-500">
          {post._count.likes} лайков · {post._count.comments} комментариев
        </span>
      </div>

      <p className="mt-3 text-sm leading-6 whitespace-pre-wrap text-zinc-600">
        {getPostPreview(post.content)}
      </p>

      {post.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.imageUrl}
          alt=""
          className="mt-4 h-48 w-full border border-zinc-200 object-cover"
        />
      ) : null}

      {showLinkedEntities && (post.team || post.event || post.object) ? (
        <div className="mt-4 flex flex-wrap gap-3 text-sm text-zinc-600">
          {post.team ? <span>Команда: {post.team.name}</span> : null}
          {post.event ? <span>Мероприятие: {post.event.title}</span> : null}
          {post.object ? <span>Объект: {post.object.name}</span> : null}
        </div>
      ) : null}
    </Link>
  );
};
