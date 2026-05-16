import {
  NotificationType,
  ObjectVisibility,
  TeamStatus,
} from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";
import type { db as database } from "@/server/db";

type NotificationDb =
  | Pick<typeof database, "notification">
  | Pick<Prisma.TransactionClient, "notification">;

type FollowNotificationDb =
  | Pick<typeof database, "jumpObject" | "notification" | "team">
  | Pick<Prisma.TransactionClient, "jumpObject" | "notification" | "team">;

type NotificationInput = {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string | null;
  href?: string | null;
};

const publicTeamStatuses = [TeamStatus.REGULAR, TeamStatus.VERIFIED];

const getUniqueRecipientIds = (
  userIds: string[],
  excludedUserIds: string[],
) => {
  const excludedUserIdSet = new Set(excludedUserIds);

  return Array.from(new Set(userIds)).filter(
    (userId) => !excludedUserIdSet.has(userId),
  );
};

export const createNotification = async (
  db: NotificationDb,
  input: NotificationInput,
) => {
  return db.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      href: input.href ?? null,
    },
  });
};

export const createNotifications = async (
  db: NotificationDb,
  inputs: NotificationInput[],
) => {
  if (inputs.length === 0) return { count: 0 };

  return db.notification.createMany({
    data: inputs.map((input) => ({
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      href: input.href ?? null,
    })),
  });
};

export const createNotificationsForUsers = async (
  db: NotificationDb,
  userIds: string[],
  input: {
    type: NotificationType;
    title: string;
    body?: string | null;
    href?: string | null;
    excludeUserId?: string;
  },
) => {
  const recipientIds = Array.from(new Set(userIds)).filter(
    (userId) => userId !== input.excludeUserId,
  );

  if (recipientIds.length === 0) return { count: 0 };

  return createNotifications(
    db,
    recipientIds.map((userId) => ({
      userId,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      href: input.href ?? null,
    })),
  );
};

export const notifyTeamFollowersAboutEvent = async (
  db: FollowNotificationDb,
  input: {
    teamId: string;
    eventTitle: string;
    eventSlug: string;
    actorUserId: string;
    excludeUserIds?: string[];
  },
) => {
  const team = await db.team.findFirst({
    where: {
      id: input.teamId,
      status: {
        in: publicTeamStatuses,
      },
    },
    select: {
      name: true,
      followers: {
        select: {
          userId: true,
        },
      },
    },
  });

  if (!team) return [];

  const recipientIds = getUniqueRecipientIds(
    team.followers.map((follow) => follow.userId),
    [input.actorUserId, ...(input.excludeUserIds ?? [])],
  );

  await createNotifications(
    db,
    recipientIds.map((userId) => ({
      userId,
      type: NotificationType.FOLLOWED_TEAM_EVENT_CREATED,
      title: "Новое мероприятие",
      body: `Команда «${team.name}» опубликовала мероприятие «${input.eventTitle}».`,
      href: `/events/${input.eventSlug}`,
    })),
  );

  return recipientIds;
};

export const notifyObjectFollowersAboutEvent = async (
  db: FollowNotificationDb,
  input: {
    objectId: string;
    teamId: string;
    eventTitle: string;
    eventSlug: string;
    actorUserId: string;
    excludeUserIds?: string[];
  },
) => {
  const team = await db.team.findFirst({
    where: {
      id: input.teamId,
      status: {
        in: publicTeamStatuses,
      },
    },
    select: {
      id: true,
    },
  });

  if (!team) return [];

  const object = await db.jumpObject.findFirst({
    where: {
      id: input.objectId,
      visibility: ObjectVisibility.PUBLIC,
    },
    select: {
      name: true,
      followers: {
        select: {
          userId: true,
        },
      },
    },
  });

  if (!object) return [];

  const recipientIds = getUniqueRecipientIds(
    object.followers.map((follow) => follow.userId),
    [input.actorUserId, ...(input.excludeUserIds ?? [])],
  );

  await createNotifications(
    db,
    recipientIds.map((userId) => ({
      userId,
      type: NotificationType.FOLLOWED_OBJECT_EVENT_CREATED,
      title: "Новое мероприятие на объекте",
      body: `На объекте «${object.name}» появилось мероприятие «${input.eventTitle}».`,
      href: `/events/${input.eventSlug}`,
    })),
  );

  return recipientIds;
};

export const notifyTeamFollowersAboutPost = async (
  db: FollowNotificationDb,
  input: {
    teamId: string;
    postId: string;
    actorUserId: string;
    excludeUserIds?: string[];
  },
) => {
  const team = await db.team.findFirst({
    where: {
      id: input.teamId,
      status: {
        in: publicTeamStatuses,
      },
    },
    select: {
      name: true,
      followers: {
        select: {
          userId: true,
        },
      },
    },
  });

  if (!team) return [];

  const recipientIds = getUniqueRecipientIds(
    team.followers.map((follow) => follow.userId),
    [input.actorUserId, ...(input.excludeUserIds ?? [])],
  );

  await createNotifications(
    db,
    recipientIds.map((userId) => ({
      userId,
      type: NotificationType.FOLLOWED_TEAM_POST_CREATED,
      title: "Новая публикация команды",
      body: `Команда «${team.name}» опубликовала новый пост.`,
      href: `/posts/${input.postId}`,
    })),
  );

  return recipientIds;
};

export const notifyObjectFollowersAboutPost = async (
  db: FollowNotificationDb,
  input: {
    objectId: string;
    postId: string;
    actorUserId: string;
    excludeUserIds?: string[];
  },
) => {
  const object = await db.jumpObject.findFirst({
    where: {
      id: input.objectId,
      visibility: ObjectVisibility.PUBLIC,
    },
    select: {
      name: true,
      followers: {
        select: {
          userId: true,
        },
      },
    },
  });

  if (!object) return [];

  const recipientIds = getUniqueRecipientIds(
    object.followers.map((follow) => follow.userId),
    [input.actorUserId, ...(input.excludeUserIds ?? [])],
  );

  await createNotifications(
    db,
    recipientIds.map((userId) => ({
      userId,
      type: NotificationType.FOLLOWED_OBJECT_POST_CREATED,
      title: "Новая публикация об объекте",
      body: `Появилась новая публикация об объекте «${object.name}».`,
      href: `/posts/${input.postId}`,
    })),
  );

  return recipientIds;
};
