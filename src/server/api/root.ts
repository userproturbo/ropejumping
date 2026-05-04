import { applicationRouter } from "@/server/api/routers/application";
import { badgeRouter } from "@/server/api/routers/badge";
import { eventRouter } from "@/server/api/routers/event";
import { objectRouter } from "@/server/api/routers/object";
import { postRouter } from "@/server/api/routers/post";
import { profileRouter } from "@/server/api/routers/profile";
import { reportRouter } from "@/server/api/routers/report";
import { systemRouter } from "@/server/api/routers/system";
import { teamJoinRequestRouter } from "@/server/api/routers/team-join-request";
import { teamRouter } from "@/server/api/routers/team";
import { uploadRouter } from "@/server/api/routers/upload";
import { createCallerFactory, createTRPCRouter } from "@/server/api/trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  application: applicationRouter,
  badge: badgeRouter,
  event: eventRouter,
  object: objectRouter,
  post: postRouter,
  profile: profileRouter,
  report: reportRouter,
  system: systemRouter,
  teamJoinRequest: teamJoinRequestRouter,
  team: teamRouter,
  upload: uploadRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 */
export const createCaller = createCallerFactory(appRouter);
