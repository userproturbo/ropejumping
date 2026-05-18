import type { BadgeCategory } from "@/generated/prisma/enums";
import {
  getBadgeCategoryLabel,
  getBadgeCategorySortOrder,
} from "@/lib/display";

export type BadgeListItem = {
  id: string;
  awardedAt: Date;
  badge: {
    name: string;
    description: string | null;
    category: BadgeCategory;
    iconUrl: string | null;
  };
};

type BadgeListProps = {
  badges: BadgeListItem[];
  emptyText?: string;
  emptyHint?: string;
  maxItems?: number;
  compact?: boolean;
};

export function BadgeList({
  badges,
  emptyText = "Бейджей пока нет.",
  emptyHint,
  maxItems,
  compact = false,
}: BadgeListProps) {
  const visibleBadges = badges
    .slice()
    .sort((left, right) => right.awardedAt.getTime() - left.awardedAt.getTime())
    .slice(0, maxItems ?? badges.length);
  const groupedBadges = groupBadgesByCategory(visibleBadges);

  if (visibleBadges.length === 0) {
    return (
      <div className="mt-4 text-sm text-zinc-600">
        <p>{emptyText}</p>
        {emptyHint ? <p className="mt-1">{emptyHint}</p> : null}
      </div>
    );
  }

  return (
    <div className="mt-5 space-y-6">
      {groupedBadges.map(({ category, badges: categoryBadges }) => (
        <section key={category}>
          <h3 className="text-sm font-semibold text-zinc-950">
            {getBadgeCategoryLabel(category)}
          </h3>
          <div
            className={
              compact
                ? "mt-3 grid gap-3 md:grid-cols-2"
                : "mt-3 grid gap-4 sm:grid-cols-2"
            }
          >
            {categoryBadges.map((userBadge) => (
              <BadgeCard
                key={userBadge.id}
                userBadge={userBadge}
                compact={compact}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function BadgeCard({
  userBadge,
  compact,
}: {
  userBadge: BadgeListItem;
  compact: boolean;
}) {
  return (
    <article className="border border-zinc-200 p-4">
      <div className="flex items-start gap-3">
        {userBadge.badge.iconUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={userBadge.badge.iconUrl}
            alt=""
            className="h-10 w-10 border border-zinc-200 object-cover"
          />
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h4 className="font-medium text-zinc-950">
                {userBadge.badge.name}
              </h4>
              <p className="mt-1 text-xs text-zinc-500">
                {getBadgeCategoryLabel(userBadge.badge.category)}
              </p>
            </div>
            <time
              dateTime={userBadge.awardedAt.toISOString()}
              className="text-xs text-zinc-500"
            >
              {formatBadgeDate(userBadge.awardedAt)}
            </time>
          </div>
          {userBadge.badge.description && !compact ? (
            <p className="mt-3 text-sm leading-6 text-zinc-600">
              {userBadge.badge.description}
            </p>
          ) : null}
          {userBadge.badge.description && compact ? (
            <p className="mt-2 line-clamp-2 text-sm leading-6 text-zinc-600">
              {userBadge.badge.description}
            </p>
          ) : null}
        </div>
      </div>
    </article>
  );
}

const groupBadgesByCategory = (badges: BadgeListItem[]) => {
  const groupedBadges = new Map<BadgeCategory, BadgeListItem[]>();

  badges.forEach((userBadge) => {
    const categoryBadges = groupedBadges.get(userBadge.badge.category) ?? [];
    categoryBadges.push(userBadge);
    groupedBadges.set(userBadge.badge.category, categoryBadges);
  });

  return Array.from(groupedBadges.entries())
    .sort(
      ([leftCategory], [rightCategory]) =>
        getBadgeCategorySortOrder(leftCategory) -
        getBadgeCategorySortOrder(rightCategory),
    )
    .map(([category, categoryBadges]) => ({
      category,
      badges: categoryBadges,
    }));
};

const formatBadgeDate = (date: Date) =>
  new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
  }).format(date);
