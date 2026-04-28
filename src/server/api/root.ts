import { applicationRouter } from "@/server/api/routers/application";
import { eventRouter } from "@/server/api/routers/event";
import { profileRouter } from "@/server/api/routers/profile";
import { systemRouter } from "@/server/api/routers/system";
import { teamRouter } from "@/server/api/routers/team";
import { createCallerFactory, createTRPCRouter } from "@/server/api/trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  application: applicationRouter,
  event: eventRouter,
  profile: profileRouter,
  system: systemRouter,
  team: teamRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 */
export const createCaller = createCallerFactory(appRouter);
