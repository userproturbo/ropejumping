import { TRPCError } from "@trpc/server";

import { env } from "@/env";

type ModerationUser = {
  email?: string | null;
};

type ModerationContext = {
  session?: {
    user?: ModerationUser | null;
  } | null;
};

const getModeratorEmails = () =>
  (env.MODERATOR_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

export const isModeratorUser = (user: ModerationUser | null | undefined) => {
  if (!user?.email) return false;

  return getModeratorEmails().includes(user.email.toLowerCase());
};

export const requireModerator = (ctx: ModerationContext) => {
  if (!isModeratorUser(ctx.session?.user)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "У вас нет прав модератора.",
    });
  }
};
